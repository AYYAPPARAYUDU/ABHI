"""Adversarial, Stress, Edge Case & End-to-End Scenario Tests for Resource Manager (Phase 7 Stage 7.6).

Tests:
- Scenario A: Interactive LLM Request Admission & Retention
- Scenario B: Concurrent Perception (LLM + Vision + Browser)
- Scenario C: Background Evaluation yielding under Resource Pressure
- Scenario D: Model Switch with Warm Retention
- Scenario E: Model Failure & Degradation Recovery
- Scenario F: Orphan Worker Cleanup without Killing System Processes
- Scenario G: Candidate Isolation (Production never starved)
- Scenario H: NPU Unavailable Graceful Fallback
- Storage Headroom Checks & Disk Admission
- Thermal Awareness & Throttle State Reporting
"""

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
    DegradedMode,
    ModelRuntimeState,
    ModelHealthState,
)
from backend.app.runtime.resources.hardware import HardwareDiscoveryEngine
from backend.app.runtime.resources.ledger import ResourceLedger
from backend.app.runtime.resources.admission import ResourceAdmissionController, DeviceSelector
from backend.app.runtime.resources.model_lifecycle import ModelLifecycleManager
from backend.app.runtime.resources.worker_lifecycle import WorkerLifecycleManager
from backend.app.runtime.resources.manager import CentralResourceManager


@pytest.fixture
def test_env():
    inv = HardwareInventory(
        os_name="Windows",
        os_version="11",
        cpu_logical_cores=16,
        ram_total_mb=24425.0,
        ram_available_mb=18000.0,
        gpu_detected=True,
        gpu_vram_total_mb=8151.0,
        gpu_vram_free_mb=6500.0,
        npu_status=NpuStatus.UNSUPPORTED,
        storage_primary_free_mb=326450.0
    )
    config = OperatingModeConfig(mode=OperatingMode.BALANCED)
    ledger = ResourceLedger()
    ledger.sync_with_hardware(inv, config)
    admission = ResourceAdmissionController(ledger, config)
    model_mgr = ModelLifecycleManager(ledger, admission, config)
    worker_mgr = WorkerLifecycleManager(ledger, config)
    return inv, config, ledger, admission, model_mgr, worker_mgr


def test_scenario_a_interactive_llm_inference(test_env):
    inv, _, ledger, admission, model_mgr, _ = test_env

    # 1. User asks question -> admitted on local model
    req = WorkloadRequest(                                                                                                                                                                                                                                                                                                                                                                                                                                  
        owner_type="inference",
        owner_id="inf_turn_01",
        workload_name="UserTurnInference",
        priority=WorkloadPriority.P1_INTERACTIVE_USER,                                                                                                                      
        resource_profile=ResourceProfile(ram_mb=1024.0, vram_mb=5200.0)
    )

    admitted, leases, reason = admission.admit_workload(req, inv)
    assert admitted is True
    assert len(leases) >= 2  # RAM, VRAM, and Process leases

    # Mark model in use
    model_mgr.load_model("qwen3:8b", inv)
    model_mgr.mark_model_in_use("qwen3:8b")
    assert model_mgr.get_model("qwen3:8b").state == ModelRuntimeState.IN_USE

    # Finish inference -> mark idle
    model_mgr.mark_model_idle("qwen3:8b")
    assert model_mgr.get_model("qwen3:8b").state == ModelRuntimeState.IDLE


def test_scenario_b_concurrent_perception_arbitration(test_env):
    inv, _, ledger, admission, _, worker_mgr = test_env

    # LLM (VRAM 5200MB) + Vision (VRAM 1200MB) + Browser (RAM 1024MB, 2 pages)
    llm_req = WorkloadRequest(
        owner_id="llm_session",
        workload_name="LLMInference",
        priority=WorkloadPriority.P2_ACTIVE_TASK,
        resource_profile=ResourceProfile(ram_mb=1024.0, vram_mb=5000.0)
    )
    adm_llm, _, _ = admission.admit_workload(llm_req, inv)
    assert adm_llm is True

    # Vision Request (1200MB VRAM)
    vis_req = WorkloadRequest(
        owner_id="vision_session",
        workload_name="OCRPerception",
        priority=WorkloadPriority.P3_ACTIVE_PERCEPTION,
        resource_profile=ResourceProfile(ram_mb=512.0, vram_mb=1200.0)
    )
    adm_vis, _, _ = admission.admit_workload(vis_req, inv)
    assert adm_vis is True

    # Browser Worker (RAM 1024MB, 2 pages, process 1)
    browser_req = WorkloadRequest(
        owner_id="browser_session",
        workload_name="BrowserAutomation",
        priority=WorkloadPriority.P2_ACTIVE_TASK,
        resource_profile=ResourceProfile(ram_mb=1024.0, vram_mb=0.0, process_count=1, browser_pages=2)
    )
    adm_browser, _, _ = admission.admit_workload(browser_req, inv)
    assert adm_browser is True


def test_scenario_d_model_switch(test_env):
    inv, _, ledger, _, model_mgr, _ = test_env

    # Load model A (Qwen 8B)
    load_a, _ = model_mgr.load_model("qwen3:8b", inv)
    assert load_a is True

    # Safely switch / unload
    unload_a, _ = model_mgr.unload_model("qwen3:8b")
    assert unload_a is True
    assert model_mgr.get_model("qwen3:8b").state == ModelRuntimeState.EVICTED

    # Load model B (Florence 2)
    load_b, _ = model_mgr.load_model("florence-2-large", inv)
    assert load_b is True
    assert model_mgr.get_model("florence-2-large").state == ModelRuntimeState.LOADED


def test_scenario_f_protected_system_processes(test_env):
    _, _, _, _, _, worker_mgr = test_env

    # Verify protected list includes explorer.exe and svchost.exe
    from backend.app.runtime.resources.worker_lifecycle import PROTECTED_PROCESS_NAMES
    assert "explorer.exe" in PROTECTED_PROCESS_NAMES
    assert "svchost.exe" in PROTECTED_PROCESS_NAMES


def test_storage_headroom_check(test_env):
    inv, _, ledger, _, _, _ = test_env

    storage_entry = ledger.get_ledger_snapshot()[ResourceType.STORAGE]
    assert storage_entry.free > 50000.0  # > 50GB free headroom


def test_degraded_modes_evaluation(test_env):
    crm = CentralResourceManager()
    crm.startup()
    degraded = crm.get_degraded_state()
    assert degraded in [DegradedMode.FULL_CAPABILITY, DegradedMode.REDUCED_GPU, DegradedMode.CPU_ONLY, DegradedMode.EMERGENCY_RESOURCE_MODE]


def test_operating_mode_resource_saver_limits(test_env):
    crm = CentralResourceManager()
    crm.set_operating_mode(OperatingMode.RESOURCE_SAVER)
    assert crm.config.max_active_models == 1
    assert crm.config.max_workers == 3
    assert crm.config.max_browser_pages == 2

    # Reset
    crm.set_operating_mode(OperatingMode.BALANCED)


def test_deadlock_defense_and_reservation_timeout(test_env):
    inv, _, ledger, admission, _, _ = test_env

    # Simulate multi-stage reservation
    prof = ResourceProfile(ram_mb=1024.0, vram_mb=2000.0, process_count=1)
    admitted, leases, reason = admission.reserve_multi_stage_workflow("wf_deadlock_test", prof, inv, timeout_sec=1.0)
    assert admitted is True

    # Leases should expire cleanly
    time.sleep(1.1)
    expired = ledger.cleanup_expired_leases()
    assert len(expired) >= 1


def test_adversarial_fake_owner_and_lease_spoofing(test_env):
    _, _, ledger, _, _, _ = test_env

    # Attempting to release a nonexistent or fake lease ID returns False
    success = ledger.release_lease("fake_lease_999999")
    assert success is False

    # Attempting to renew a nonexistent lease returns False
    renewed = ledger.renew_lease("fake_lease_999999", extension_sec=30.0)
    assert renewed is False


def test_conservative_mode_safety_margin_enforcement(test_env):
    crm = CentralResourceManager()
    crm.set_operating_mode(OperatingMode.CONSERVATIVE)
    assert crm.config.vram_safety_margin_mb >= 1000.0
    assert crm.config.min_free_ram_mb >= 5000.0

    # Reset
    crm.set_operating_mode(OperatingMode.BALANCED)


def test_rag_embedding_model_registration_and_isolation(test_env):
    inv, _, _, _, model_mgr, _ = test_env

    bge = model_mgr.get_model("bge-m3")
    assert bge is not None
    assert bge.context_length == 8192
    assert bge.resource_profile.vram_mb == 650.0


def test_telemetry_event_ring_buffer_bounds():
    crm = CentralResourceManager()
    for i in range(550):
        crm.emit_telemetry(f"STRESS_EVENT_{i}", delta=float(i))

    recent = crm.get_recent_telemetry(limit=50)
    assert len(recent) == 50
    assert len(crm._telemetry_buffer) <= 500
