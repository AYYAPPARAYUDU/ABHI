"""Unit & Integration Tests for Worker Lifecycle, Orphan Reconciliation, and REST APIs for Phase 7 Stage 7.6."""

import os
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.runtime.resources.models import (
    ProcessState,
    ResourceType,
    OperatingMode,
    OperatingModeConfig,
    WorkloadPriority,
    HardwareInventory,
)
from backend.app.runtime.resources.ledger import ResourceLedger
from backend.app.runtime.resources.worker_lifecycle import WorkerLifecycleManager
from backend.app.runtime.resources.manager import CentralResourceManager


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def worker_setup():
    config = OperatingModeConfig(mode=OperatingMode.BALANCED)
    ledger = ResourceLedger()
    mgr = WorkerLifecycleManager(ledger, config)
    return mgr, ledger, config


def test_worker_registration_and_heartbeat(worker_setup):
    mgr, ledger, _ = worker_setup
    current_pid = os.getpid()

    # Register worker
    w = mgr.register_worker(
        worker_id="worker_pw_1",
        pid=current_pid,
        worker_type="playwright",
        task_id="task_scrape_44"
    )
    assert w.worker_id == "worker_pw_1"
    assert w.state == ProcessState.RUNNING

    # Heartbeat
    mgr.record_heartbeat("worker_pw_1", cpu_percent=12.5, memory_mb=256.0)
    w_updated = mgr.get_all_workers()[0]
    assert w_updated.cpu_percent == 12.5
    assert w_updated.memory_mb == 256.0


def test_worker_stop_and_lease_cleanup(worker_setup):
    mgr, ledger, _ = worker_setup

    # Allocate lease to worker
    lease, _ = ledger.allocate_lease(
        owner_type="worker",
        owner_id="worker_pw_2",
        resource_type=ResourceType.PROCESS,
        amount=1.0
    )
    assert lease is not None
    assert ledger.get_ledger_snapshot()[ResourceType.PROCESS].allocated == 1.0

    # Register and stop
    mgr.register_worker("worker_pw_2", pid=9999999, worker_type="playwright")
    success, msg = mgr.stop_worker("worker_pw_2")
    assert success is True
    assert ledger.get_ledger_snapshot()[ResourceType.PROCESS].allocated == 0.0


def test_central_manager_operating_modes():
    crm = CentralResourceManager()
    startup_res = crm.startup()
    assert startup_res["status"] == "INITIALIZED"

    # Switch to PERFORMANCE mode
    ok_perf, _ = crm.set_operating_mode(OperatingMode.PERFORMANCE)
    assert ok_perf is True
    assert crm.config.mode == OperatingMode.PERFORMANCE
    assert crm.config.max_active_models == 3

    # Switch to CONSERVATIVE mode
    ok_cons, _ = crm.set_operating_mode(OperatingMode.CONSERVATIVE)
    assert ok_cons is True
    assert crm.config.mode == OperatingMode.CONSERVATIVE
    assert crm.config.max_active_models == 1

    # Switch back to BALANCED
    ok_bal, _ = crm.set_operating_mode(OperatingMode.BALANCED)
    assert ok_bal is True
    assert crm.config.mode == OperatingMode.BALANCED


def test_central_manager_telemetry():
    crm = CentralResourceManager()
    crm.emit_telemetry("CUSTOM_TEST_EVENT", delta=100.0, details={"test_key": "test_val"})
    recent = crm.get_recent_telemetry(limit=10)
    assert any(e["event_type"] == "CUSTOM_TEST_EVENT" for e in recent)


# --- REST API Endpoint Tests ---

def test_api_get_resource_summary(client):
    res = client.get("/api/v1/resources")
    assert res.status_code == 200
    data = res.json()
    assert "operating_mode" in data
    assert "hardware" in data
    assert "ledger" in data
    assert "pressure_level" in data


def test_api_get_hardware_info(client):
    res = client.get("/api/v1/resources/hardware")
    assert res.status_code == 200
    data = res.json()
    assert "inventory" in data
    assert "profile" in data
    assert data["inventory"]["cpu_logical_cores"] >= 1


def test_api_get_ledger(client):
    res = client.get("/api/v1/resources/ledger")
    assert res.status_code == 200
    data = res.json()
    assert "CPU" in data
    assert "RAM" in data
    assert "VRAM" in data


def test_api_get_models(client):
    res = client.get("/api/v1/resources/models")
    assert res.status_code == 200
    models = res.json()
    assert len(models) >= 3


def test_api_model_load_and_unload(client):
    # Load bge-m3
    load_res = client.post("/api/v1/resources/models/bge-m3/load?priority=80")
    assert load_res.status_code == 200
    assert load_res.json()["status"] == "SUCCESS"

    # Unload bge-m3
    unload_res = client.post("/api/v1/resources/models/bge-m3/unload")
    assert unload_res.status_code == 200
    assert unload_res.json()["status"] == "SUCCESS"


def test_api_set_operating_mode(client):
    res = client.post("/api/v1/resources/mode", json={"mode": "PERFORMANCE"})
    assert res.status_code == 200
    assert res.json()["mode"] == "PERFORMANCE"

    # Reset to BALANCED
    client.post("/api/v1/resources/mode", json={"mode": "BALANCED"})


def test_api_test_admit_workload(client):
    payload = {
        "owner_id": "api_test_task",
        "workload_name": "APITestWorkload",
        "priority": 80,
        "cpu_percent": 10.0,
        "ram_mb": 512.0,
        "vram_mb": 1000.0,
        "timeout_sec": 30.0
    }
    res = client.post("/api/v1/resources/admit", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "admitted" in data


def test_api_trigger_reconcile(client):
    res = client.post("/api/v1/resources/reconcile")
    assert res.status_code == 200
    assert res.json()["status"] == "SUCCESS"
