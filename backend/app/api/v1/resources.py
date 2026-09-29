"""Resource & Model Lifecycle REST Endpoints for Phase 7 Stage 7.6.

Exposes REST APIs for:
- System Resource & Hardware Discovery
- Resource Ledger & Active Leases
- Model Lifecycle (Load, Unload, LRU Cache, State)
- Operating Mode Selection (BALANCED, PERFORMANCE, CONSERVATIVE, RESOURCE_SAVER)
- Workload Admission & Preemption Arbitration
- Worker Process & Orphan Reconciliation
- Structured Telemetry Events
"""

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from backend.app.runtime.resources import (
    resource_manager,
    OperatingMode,
    WorkloadPriority,
    ResourceProfile,
    WorkloadRequest,
    DeviceType,
)

router = APIRouter(prefix="/resources", tags=["resources"])


class ModeChangeRequest(BaseModel):
    mode: OperatingMode


class WorkloadAdmissionDTO(BaseModel):
    owner_type: str = "task"
    owner_id: str
    workload_name: str
    priority: WorkloadPriority = WorkloadPriority.P2_ACTIVE_TASK
    cpu_percent: float = 10.0
    ram_mb: float = 512.0
    vram_mb: float = 0.0
    gpu_compute_percent: float = 0.0
    target_device: Optional[DeviceType] = None
    timeout_sec: float = 60.0


@router.get("")
def get_resource_summary() -> Dict[str, Any]:
    """Retrieve full system resource, hardware, model, and worker summary."""
    return resource_manager.get_system_summary()


@router.get("/hardware")
def get_hardware_info(force_refresh: bool = False) -> Dict[str, Any]:
    """Retrieve hardware inventory and versioned hardware profile."""
    inv = resource_manager.hardware_engine.discover_inventory(force_refresh=force_refresh)
    prof = resource_manager.hardware_engine.create_or_get_profile(force_refresh=force_refresh)
    return {
        "inventory": inv.model_dump(),
        "profile": prof.model_dump()
    }


@router.get("/ledger")
def get_resource_ledger() -> Dict[str, Any]:
    """Retrieve per-resource ledger accounting entries."""
    ledger_snap = resource_manager.ledger.get_ledger_snapshot()
    return {k.value: v.model_dump() for k, v in ledger_snap.items()}


@router.get("/leases")
def get_active_leases() -> List[Dict[str, Any]]:
    """Retrieve all currently active / granted resource leases."""
    return [l.model_dump() for l in resource_manager.ledger.get_active_leases()]


@router.get("/models")
def get_managed_models() -> List[Dict[str, Any]]:
    """Retrieve all registered models, memory residency, device mapping, and health status."""
    return [m.model_dump() for m in resource_manager.model_manager.get_model_instances()]


@router.post("/models/{model_id}/load")
def load_model(model_id: str, priority: int = 80) -> Dict[str, Any]:
    """Request resource-gated load of a model into memory."""
    inv = resource_manager.hardware_engine.discover_inventory()
    p = WorkloadPriority(priority) if priority in [p.value for p in WorkloadPriority] else WorkloadPriority.P2_ACTIVE_TASK
    success, msg = resource_manager.model_manager.load_model(model_id, inv, priority=p)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return {"status": "SUCCESS", "message": msg, "model_id": model_id}


@router.post("/models/{model_id}/unload")
def unload_model(model_id: str, force: bool = False) -> Dict[str, Any]:
    """Request safe unloading of a model and release of its resources."""
    success, msg = resource_manager.model_manager.unload_model(model_id, force=force)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return {"status": "SUCCESS", "message": msg, "model_id": model_id}


@router.post("/mode")
def set_operating_mode(payload: ModeChangeRequest) -> Dict[str, Any]:
    """Dynamically switch system operating mode (BALANCED, PERFORMANCE, CONSERVATIVE, RESOURCE_SAVER)."""
    success, msg = resource_manager.set_operating_mode(payload.mode)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return {"status": "SUCCESS", "mode": payload.mode.value, "message": msg}


@router.post("/admit")
def test_admit_workload(dto: WorkloadAdmissionDTO) -> Dict[str, Any]:
    """Test admission controller evaluation for a workload request."""
    inv = resource_manager.hardware_engine.discover_inventory()
    req = WorkloadRequest(
        owner_type=dto.owner_type,
        owner_id=dto.owner_id,
        workload_name=dto.workload_name,
        priority=dto.priority,
        resource_profile=ResourceProfile(
            cpu_percent=dto.cpu_percent,
            ram_mb=dto.ram_mb,
            vram_mb=dto.vram_mb,
            gpu_compute_percent=dto.gpu_compute_percent
        ),
        target_device=dto.target_device,
        timeout_sec=dto.timeout_sec
    )
    admitted, leases, reason = resource_manager.admission_controller.admit_workload(req, inv)
    return {
        "admitted": admitted,
        "reason": reason,
        "granted_leases": [l.model_dump() for l in leases]
    }


@router.post("/reconcile")
def trigger_orphan_reconciliation() -> Dict[str, Any]:
    """Trigger scan and cleanup of orphaned worker processes."""
    pids = resource_manager.worker_manager.scan_and_reconcile_orphans()
    return {"status": "SUCCESS", "reconciled_pids": pids, "count": len(pids)}


@router.get("/telemetry")
def get_resource_telemetry(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve recent resource telemetry events."""
    return resource_manager.get_recent_telemetry(limit=limit)
