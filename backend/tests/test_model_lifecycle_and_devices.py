"""Unit & Integration Tests for Model Lifecycle Manager, Model Cache, & Health Tracking."""

import pytest
import time
from backend.app.runtime.resources.models import (
    ModelRuntimeState,
    ModelHealthState,
    ResourceType,
    WorkloadPriority,
    OperatingMode,
    OperatingModeConfig,
    ResourceProfile,
    HardwareInventory,
    NpuStatus,
)
from backend.app.runtime.resources.ledger import ResourceLedger
from backend.app.runtime.resources.admission import ResourceAdmissionController
from backend.app.runtime.resources.model_lifecycle import ModelLifecycleManager


@pytest.fixture
def mock_inventory():
    return HardwareInventory(
        os_name="Windows",
        os_version="11",
        cpu_logical_cores=16,
        ram_total_mb=24425.0,
        ram_available_mb=18000.0,
        gpu_detected=True,
        gpu_vram_total_mb=8151.0,
        gpu_vram_free_mb=6500.0,
        npu_status=NpuStatus.UNSUPPORTED
    )


@pytest.fixture
def model_manager_setup(mock_inventory):
    config = OperatingModeConfig(mode=OperatingMode.BALANCED, max_active_models=2)
    ledger = ResourceLedger()
    ledger.sync_with_hardware(mock_inventory, config)
    admission = ResourceAdmissionController(ledger, config)
    mgr = ModelLifecycleManager(ledger, admission, config)
    return mgr, ledger, config, mock_inventory


def test_default_models_registered(model_manager_setup):
    mgr, _, _, _ = model_manager_setup
    models = mgr.get_model_instances()
    assert len(models) >= 3

    qwen = mgr.get_model("qwen3:8b")
    assert qwen is not None
    assert qwen.is_production is True
    assert qwen.state == ModelRuntimeState.REGISTERED


def test_model_load_and_unload_lifecycle(model_manager_setup):
    mgr, ledger, _, inv = model_manager_setup

    # Load BGE-M3 embedding model
    success, msg = mgr.load_model("bge-m3", inv)
    assert success is True
    bge = mgr.get_model("bge-m3")
    assert bge.state == ModelRuntimeState.LOADED
    assert bge.use_count == 1

    # Check VRAM allocated in ledger
    vram_alloc = ledger.get_ledger_snapshot()[ResourceType.VRAM].allocated
    assert vram_alloc > 0.0

    # Unload model
    unload_ok, u_msg = mgr.unload_model("bge-m3")
    assert unload_ok is True
    assert mgr.get_model("bge-m3").state == ModelRuntimeState.EVICTED

    # Ledger free again
    assert ledger.get_ledger_snapshot()[ResourceType.VRAM].allocated == 0.0


def test_model_in_use_protection(model_manager_setup):
    mgr, _, _, inv = model_manager_setup

    mgr.load_model("bge-m3", inv)
    mgr.mark_model_in_use("bge-m3")

    # Unload without force should fail
    success, msg = mgr.unload_model("bge-m3", force=False)
    assert success is False
    assert "currently in active inference use" in msg

    # Unload with force should succeed
    success_force, _ = mgr.unload_model("bge-m3", force=True)
    assert success_force is True


def test_lru_model_cache_eviction(model_manager_setup):
    mgr, _, config, inv = model_manager_setup
    config.max_active_models = 2

    # Register two secondary candidate models
    mgr.register_model("model_a", "tag_a", "sha256:111", resource_profile=ResourceProfile(ram_mb=512.0, vram_mb=1000.0))
    mgr.register_model("model_b", "tag_b", "sha256:222", resource_profile=ResourceProfile(ram_mb=512.0, vram_mb=1000.0))
    mgr.register_model("model_c", "tag_c", "sha256:333", resource_profile=ResourceProfile(ram_mb=512.0, vram_mb=1000.0))

    # Load Model A and Model B (fills 2 slots)
    mgr.load_model("model_a", inv)
    mgr.load_model("model_b", inv)
    mgr.mark_model_idle("model_a")
    mgr.mark_model_idle("model_b")
    mgr._models["model_a"].last_used = 1000.0
    mgr._models["model_b"].last_used = 2000.0

    # Now loading Model C should trigger LRU eviction of the oldest idle model (model_a)
    success, msg = mgr.load_model("model_c", inv)
    assert success is True
    assert mgr.get_model("model_c").state == ModelRuntimeState.LOADED

    # Model A was evicted
    assert mgr.get_model("model_a").state == ModelRuntimeState.EVICTED


def test_inference_telemetry_and_kv_cache(model_manager_setup):
    mgr, _, _, inv = model_manager_setup

    mgr.load_model("qwen3:8b", inv)
    mgr.record_inference_telemetry("qwen3:8b", prompt_tokens=2048, generated_tokens=512, latency_ms=1200.0)

    m = mgr.get_model("qwen3:8b")
    assert m.prompt_tokens_processed == 2048
    assert m.generated_tokens_produced == 512
    assert m.estimated_kv_cache_mb > 0.0


def test_model_health_failure_and_quarantine(model_manager_setup):
    mgr, _, _, inv = model_manager_setup

    mgr.load_model("bge-m3", inv)

    # 1st failure -> DEGRADED
    mgr.record_model_failure("bge-m3", "CUDA memory fragmentation error")
    assert mgr.get_model("bge-m3").health == ModelHealthState.DEGRADED

    # 2nd failure
    mgr.record_model_failure("bge-m3", "Driver timeout")
    assert mgr.get_model("bge-m3").health == ModelHealthState.DEGRADED

    # 3rd failure -> QUARANTINED and auto-unloaded
    mgr.record_model_failure("bge-m3", "Fatal backend crash")
    m = mgr.get_model("bge-m3")
    assert m.health == ModelHealthState.QUARANTINED
    assert m.state == ModelRuntimeState.QUARANTINED
    assert "Repeated runtime failure" in m.quarantine_reason

    # Attempting to load quarantined model fails
    success, err_msg = mgr.load_model("bge-m3", inv)
    assert success is False
    assert "Cannot load quarantined model" in err_msg
