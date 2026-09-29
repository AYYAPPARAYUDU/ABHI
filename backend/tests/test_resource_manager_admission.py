"""Unit & Integration Tests for Resource Ledger, Admission Controller & Preemption for Phase 7 Stage 7.6."""

import pytest
import time
from backend.app.runtime.resources.models import (
    ResourceType,
    WorkloadPriority,
    ResourcePressureLevel,
    OperatingMode,
    OperatingModeConfig,
    ResourceProfile,
    WorkloadRequest,
    HardwareInventory,
    DeviceType,
    NpuStatus,
    LeaseState,
)
from backend.app.runtime.resources.hardware import HardwareDiscoveryEngine
from backend.app.runtime.resources.ledger import ResourceLedger
from backend.app.runtime.resources.admission import ResourceAdmissionController, DeviceSelector


@pytest.fixture
def mock_inventory():
    return HardwareInventory(
        os_name="Windows",
        os_version="11",
        cpu_physical_cores=8,
        cpu_logical_cores=16,
        ram_total_mb=24425.0,
        ram_available_mb=16000.0,
        ram_used_mb=8425.0,
        gpu_detected=True,
        gpu_model="NVIDIA GeForce RTX 5050 Laptop GPU",
        gpu_vram_total_mb=8151.0,
        gpu_vram_free_mb=6500.0,
        gpu_driver_version="592.82",
        npu_present=False,
        npu_status=NpuStatus.UNSUPPORTED
    )


@pytest.fixture
def resource_setup(mock_inventory):
    config = OperatingModeConfig(mode=OperatingMode.BALANCED)
    ledger = ResourceLedger()
    ledger.sync_with_hardware(mock_inventory, config)
    controller = ResourceAdmissionController(ledger, config)
    return ledger, controller, config, mock_inventory


def test_hardware_discovery_and_profile():
    engine = HardwareDiscoveryEngine()
    inv = engine.discover_inventory(force_refresh=True)
    assert inv.cpu_logical_cores >= 1
    assert inv.ram_total_mb > 0

    prof = engine.create_or_get_profile()
    assert prof.profile_id.startswith("hw_prof_")
    assert DeviceType.CPU in prof.supported_devices


def test_ledger_allocation_and_release(resource_setup):
    ledger, _, _, _ = resource_setup

    # Allocate RAM lease
    lease, msg = ledger.allocate_lease(
        owner_type="task",
        owner_id="task_123",
        resource_type=ResourceType.RAM,
        amount=1024.0,
        duration_sec=30.0,
        priority=WorkloadPriority.P2_ACTIVE_TASK
    )
    assert lease is not None
    assert lease.state == LeaseState.GRANTED
    assert lease.granted_amount == 1024.0

    # Verify free RAM decreased
    snap = ledger.get_ledger_snapshot()
    assert snap[ResourceType.RAM].allocated == 1024.0

    # Release lease
    released = ledger.release_lease(lease.lease_id)
    assert released is True
    snap2 = ledger.get_ledger_snapshot()
    assert snap2[ResourceType.RAM].allocated == 0.0


def test_ledger_insufficient_resources_denial(resource_setup):
    ledger, _, _, _ = resource_setup

    # Try allocating more RAM than available
    lease, msg = ledger.allocate_lease(
        owner_type="task",
        owner_id="greedy_task",
        resource_type=ResourceType.RAM,
        amount=999999.0
    )
    assert lease is None
    assert "Insufficient free RAM" in msg

    snap = ledger.get_ledger_snapshot()
    assert snap[ResourceType.RAM].denied_count == 1


def test_lease_expiration_and_cleanup(resource_setup):
    ledger, _, _, _ = resource_setup

    # Allocate short lease
    lease, _ = ledger.allocate_lease(
        owner_type="task",
        owner_id="expiring_task",
        resource_type=ResourceType.RAM,
        amount=512.0,
        duration_sec=1.0
    )
    assert lease is not None

    # Simulate time passing
    future_time = time.time() + 5.0
    expired = ledger.cleanup_expired_leases(current_time=future_time)
    assert len(expired) == 1
    assert expired[0].lease_id == lease.lease_id
    assert ledger.get_ledger_snapshot()[ResourceType.RAM].allocated == 0.0


def test_device_selector_mapping(mock_inventory, resource_setup):
    ledger, _, _, _ = resource_setup

    # 1. Heavy VRAM fits on GPU
    prof_gpu = ResourceProfile(vram_mb=4000.0, ram_mb=1024.0)
    dev, reason = DeviceSelector.select_device(prof_gpu, mock_inventory, ledger)
    assert dev == DeviceType.GPU

    # 2. CPU-only task
    prof_cpu = ResourceProfile(vram_mb=0.0, ram_mb=512.0)
    dev2, _ = DeviceSelector.select_device(prof_cpu, mock_inventory, ledger)
    assert dev2 == DeviceType.CPU

    # 3. NPU unsupported returns REJECT when explicitly requested
    dev3, reason3 = DeviceSelector.select_device(prof_cpu, mock_inventory, ledger, requested_device=DeviceType.NPU)
    assert dev3 == DeviceType.REJECT
    assert "NPU status is UNSUPPORTED" in reason3


def test_admission_controller_standard_workload(resource_setup):
    ledger, controller, _, inv = resource_setup

    req = WorkloadRequest(
        owner_id="task_interactive",
        workload_name="UserChatInference",
        priority=WorkloadPriority.P1_INTERACTIVE_USER,
        resource_profile=ResourceProfile(ram_mb=1024.0, vram_mb=3000.0, process_count=1)
    )

    admitted, leases, reason = controller.admit_workload(req, inv)
    assert admitted is True
    assert len(leases) >= 2  # RAM and VRAM
    assert req.status == LeaseState.GRANTED


def test_candidate_isolation_under_pressure(resource_setup):
    ledger, controller, _, inv = resource_setup

    # Allocate all remaining free VRAM to simulate high pressure
    vram_entry = ledger.get_ledger_snapshot()[ResourceType.VRAM]
    ledger.allocate_lease(
        owner_type="production",
        owner_id="prod_llm",
        resource_type=ResourceType.VRAM,
        amount=vram_entry.free - 50.0,
        priority=WorkloadPriority.P1_INTERACTIVE_USER
    )

    assert ledger.get_pressure_level() in [ResourcePressureLevel.HIGH, ResourcePressureLevel.CRITICAL]

    # Candidate experiment admission should be DENIED immediately
    cand_req = WorkloadRequest(
        owner_id="cand_exp_1",
        workload_name="CandidateEvaluationRun",
        priority=WorkloadPriority.P6_CANDIDATE_EXPERIMENT,
        resource_profile=ResourceProfile(ram_mb=1024.0, vram_mb=2000.0)
    )

    admitted, leases, reason = controller.admit_workload(cand_req, inv)
    assert admitted is False
    assert "Candidate experiment rejected due to system resource pressure" in reason


def test_safe_preemption_of_background_work(resource_setup):
    ledger, controller, _, inv = resource_setup

    # 1. Start low-priority background evaluation holding VRAM
    bg_lease, _ = ledger.allocate_lease(
        owner_type="evaluation",
        owner_id="eval_run_99",
        resource_type=ResourceType.VRAM,
        amount=5000.0,
        priority=WorkloadPriority.P5_EVALUATION
    )
    assert bg_lease is not None

    # 2. High priority interactive request arrives requiring VRAM
    interactive_req = WorkloadRequest(
        owner_id="user_prompt_1",
        workload_name="InteractiveUserExecution",
        priority=WorkloadPriority.P1_INTERACTIVE_USER,
        resource_profile=ResourceProfile(ram_mb=1024.0, vram_mb=4500.0)
    )

    admitted, leases, reason = controller.admit_workload(interactive_req, inv)
    assert admitted is True
    assert bg_lease.state == LeaseState.PREEMPTED


def test_multi_stage_workflow_reservation(resource_setup):
    ledger, controller, _, inv = resource_setup

    workflow_prof = ResourceProfile(ram_mb=2048.0, vram_mb=3500.0, process_count=2, browser_pages=2)
    admitted, leases, msg = controller.reserve_multi_stage_workflow("wf_stage_test", workflow_prof, inv)
    assert admitted is True
    assert len(leases) == 4  # RAM, VRAM, Process, Browser
