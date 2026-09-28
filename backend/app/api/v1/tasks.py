"""Task Dispatch, Status & Consent API Endpoints."""

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from backend.app.cognitive.supervisor.supervisor import TaskStatusResponse, central_supervisor
from backend.app.services.memory.repository import memory_repo

router = APIRouter(prefix="/tasks", tags=["Tasks & Cognitive Orchestration"])


class SubmitGoalRequest(BaseModel):
    goal: str = Field(..., min_length=1, description="Natural language goal for the AI system")
    task_id: Optional[str] = Field(default=None, description="Optional custom task UUID")


class ConsentRequest(BaseModel):
    node_id: str
    approved: bool


@router.post("", response_model=TaskStatusResponse)
async def submit_task(request: SubmitGoalRequest):
    """Submit a high-level user goal for planning and execution."""
    return await central_supervisor.submit_goal(goal=request.goal, task_id=request.task_id)


@router.get("/{task_id}", response_model=Dict[str, Any])
async def get_task_status(task_id: str):
    """Retrieve execution status and DAG details for a task."""
    mem_status = central_supervisor.get_task_status(task_id)
    if mem_status:
        return mem_status.model_dump()

    # Fallback to persistent SQLite record
    db_record = await memory_repo.get_task(task_id)
    if not db_record:
        raise HTTPException(status_code=404, detail=f"Task '{task_id}' not found.")

    return {
        "task_id": db_record.task_id,
        "goal": db_record.goal,
        "state": db_record.state,
        "dag": db_record.dag_data,
        "error_message": db_record.error_message,
        "duration_ms": db_record.duration_ms
    }


@router.post("/emergency-stop")
async def emergency_stop_all():
    """Trigger immediate emergency stop across all active cognitive & physical execution tasks."""
    from backend.app.automation.orchestration.orchestrator import supervisor_orchestrator
    await supervisor_orchestrator.emergency_stop()
    for tid in list(central_supervisor._active_tasks.keys()):
        await central_supervisor.cancel_task(tid)
    return {"status": "emergency_stopped", "success": True}


@router.post("/{task_id}/consent")
async def provide_consent(task_id: str, request: ConsentRequest):
    """Provide human consent approval/rejection for a Tier 3 Critical action or orchestrated execution."""
    from backend.app.automation.orchestration.orchestrator import supervisor_orchestrator
    success1 = await central_supervisor.provide_consent(
        task_id=task_id,
        node_id=request.node_id,
        approved=request.approved
    )
    success2 = await supervisor_orchestrator.provide_consent(
        task_id=task_id,
        approved=request.approved
    )
    if not success1 and not success2:
        raise HTTPException(status_code=400, detail="No pending consent found or task not waiting for consent.")
    return {"status": "ok", "task_id": task_id, "approved": request.approved}


@router.post("/{task_id}/cancel")
async def cancel_task(task_id: str):
    """Cancel an active task."""
    from backend.app.automation.orchestration.orchestrator import supervisor_orchestrator
    success1 = await central_supervisor.cancel_task(task_id)
    success2 = await supervisor_orchestrator.cancel_task(task_id)
    if not success1 and not success2:
        raise HTTPException(status_code=404, detail=f"Active task '{task_id}' not found.")
    return {"status": "cancelled", "task_id": task_id}

