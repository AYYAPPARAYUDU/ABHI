"""Self-Healing and Autonomous Software Repair API Endpoints."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from backend.app.cognitive.self_healing.models import (
    DefectReport, DefectSource, DiagnosisHypothesis, CodePatch, RepairRecord, RepairStatus, RepairRiskTier
)
from backend.app.cognitive.self_healing.detection import defect_detector
from backend.app.cognitive.self_healing.diagnosis import diagnosis_engine
from backend.app.cognitive.self_healing.persistence import self_healing_repo
from backend.app.cognitive.self_healing.engine import self_healing_engine

router = APIRouter(prefix="/self-healing", tags=["Self-Healing Engineering Core"])


class IngestDefectRequest(BaseModel):
    source: DefectSource = DefectSource.FRONTEND_TELEMETRY
    error_type: str
    message: str
    stack_trace: Optional[str] = None
    component: str = "frontend"
    reproduction_command: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class InitiateRepairRequest(BaseModel):
    defect_id: str
    candidate_files: Optional[List[str]] = None


class ExecuteRepairRequest(BaseModel):
    repair_id: str
    patch: CodePatch
    test_command: Optional[str] = None
    is_approved: bool = False


class RollbackRequest(BaseModel):
    repair_id: str


@router.get("/status")
async def get_self_healing_status():
    """Retrieve self-healing operational status and active defect counts."""
    active = defect_detector.list_active_defects()
    records = await self_healing_repo.list_records(limit=10)
    return {
        "status": "active",
        "active_defects_count": len(active),
        "total_repairs_recorded": len(records),
        "recent_repairs": [r.model_dump() for r in records[:5]]
    }


@router.get("/defects", response_model=List[DefectReport])
async def list_active_defects():
    """List all currently active / unresolved defects."""
    return defect_detector.list_active_defects()


@router.post("/defects", response_model=DefectReport)
async def report_defect(req: IngestDefectRequest):
    """Ingest a runtime defect report with sanitization and deduplication."""
    return defect_detector.record_defect(
        source=req.source,
        error_type=req.error_type,
        message=req.message,
        stack_trace=req.stack_trace,
        component=req.component,
        reproduction_command=req.reproduction_command,
        context=req.context
    )


@router.get("/history", response_model=List[RepairRecord])
async def list_repair_history(limit: int = Query(50, ge=1, le=200)):
    """List historical self-healing repair attempts and outcomes."""
    return await self_healing_repo.list_records(limit=limit)


@router.post("/diagnose")
async def diagnose_defect(req: InitiateRepairRequest):
    """Diagnose defect using local LLM without applying changes."""
    defect = defect_detector.get_defect(req.defect_id)
    if not defect:
        raise HTTPException(status_code=404, detail=f"Defect '{req.defect_id}' not found.")

    record, diagnosis = await self_healing_engine.initiate_repair_workflow(
        defect=defect,
        candidate_files=req.candidate_files
    )
    return {
        "repair_record": record.model_dump(),
        "diagnosis": diagnosis.model_dump()
    }


@router.post("/execute", response_model=RepairRecord)
async def execute_repair(req: ExecuteRepairRequest):
    """Apply validated patch with automated tests and rollback safety."""
    try:
        return await self_healing_engine.execute_repair(
            repair_id=req.repair_id,
            patch=req.patch,
            test_command=req.test_command,
            is_approved=req.is_approved
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Self-repair execution failed: {str(e)}")


@router.post("/rollback")
async def rollback_repair(req: RollbackRequest):
    """Roll back a previous self-repair modification."""
    ok = await self_healing_engine.rollback_repair(req.repair_id)
    if not ok:
        raise HTTPException(status_code=400, detail=f"Rollback failed or no backup available for '{req.repair_id}'.")
    return {"status": "success", "repair_id": req.repair_id, "message": "Successfully rolled back."}
