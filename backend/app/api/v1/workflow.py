"""Phase 7 Stage 7.4 — Workflow REST API Endpoints."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend.app.cognitive.workflow.engine import workflow_engine
from backend.app.cognitive.workflow.models import (
    AutonomyLevel,
    DataFlowRecord,
    GoalContract,
    GoalProgressEvaluation,
    HumanHandoffRequest,
    PlanSimulationResult,
    WorkflowJournalEntry,
    WorkflowPlan,
    WorkflowTaskPriority,
    WorkflowTaskQueueItem,
    WorkflowWorldState
)

workflow_router = APIRouter(prefix="/workflows", tags=["Workflows"])


class SubmitGoalRequest(BaseModel):
    goal: str
    task_id: Optional[str] = None
    priority: WorkflowTaskPriority = WorkflowTaskPriority.NORMAL
    autonomy_level: AutonomyLevel = AutonomyLevel.LEVEL_3_MULTI_STEP_LOCAL


class ResolveHandoffRequest(BaseModel):
    handoff_id: str
    resolution_notes: str = "Resolved by operator."


class WorkflowStatusResponse(BaseModel):
    task_id: str
    goal: Optional[GoalContract] = None
    active_plan: Optional[WorkflowPlan] = None
    plan_history: List[WorkflowPlan] = Field(default_factory=list)
    world_state: Optional[WorkflowWorldState] = None
    evaluation: Optional[GoalProgressEvaluation] = None
    handoff_requests: List[HumanHandoffRequest] = Field(default_factory=list)
    is_paused: bool = False


@workflow_router.post("/submit", response_model=Dict[str, Any])
async def submit_workflow_goal(req: SubmitGoalRequest) -> Dict[str, Any]:
    """Parse goal contract, extract constraints, and generate initial Plan v1 with simulation."""
    if not req.goal or not req.goal.strip():
        raise HTTPException(status_code=400, detail="Goal text cannot be empty.")

    task_id = req.task_id or f"wf_{int(time.time()*1000)}"
    goal = workflow_engine.parse_goal_contract(
        raw_request=req.goal,
        task_id=task_id,
        autonomy_level=req.autonomy_level
    )
    plan_v1 = workflow_engine.create_workflow_plan(task_id, goal, version=1)
    sim = workflow_engine.simulate_plan(plan_v1)

    return {
        "task_id": task_id,
        "goal_contract": goal.model_dump(),
        "plan_v1": plan_v1.model_dump(),
        "simulation": sim.model_dump()
    }


@workflow_router.get("/queue", response_model=List[Dict[str, Any]])
async def list_workflow_queue() -> List[Dict[str, Any]]:
    """List scheduled and active workflows in the task queue."""
    queue = []
    for tid, goal in workflow_engine._goals.items():
        plan = workflow_engine.get_active_plan(tid)
        queue.append({
            "task_id": tid,
            "goal": goal.original_request,
            "normalized_goal": goal.normalized_goal,
            "risk_level": goal.risk_level.value,
            "autonomy_level": goal.autonomy_level.value,
            "plan_version": plan.version if plan else 1,
            "nodes_count": len(plan.nodes) if plan else 0,
            "is_active": plan.is_active if plan else True,
            "created_at_ts": goal.created_at_ts
        })
    return queue


@workflow_router.get("/{task_id}", response_model=WorkflowStatusResponse)
async def get_workflow_status(task_id: str) -> WorkflowStatusResponse:
    """Retrieve comprehensive state of a workflow task."""
    goal = workflow_engine.get_goal(task_id)
    if not goal:
        raise HTTPException(status_code=404, detail=f"Workflow task '{task_id}' not found.")

    plan = workflow_engine.get_active_plan(task_id)
    history = workflow_engine.get_plan_history(task_id)
    world_state = workflow_engine.get_world_state(task_id) or WorkflowWorldState()
    eval_res = None
    if plan:
        eval_res = workflow_engine.evaluator.evaluate_progress(goal, plan, world_state)

    handoffs = workflow_engine.get_handoff_requests(task_id)
    is_paused = workflow_engine._is_paused.get(task_id, False)

    return WorkflowStatusResponse(
        task_id=task_id,
        goal=goal,
        active_plan=plan,
        plan_history=history,
        world_state=world_state,
        evaluation=eval_res,
        handoff_requests=handoffs,
        is_paused=is_paused
    )


@workflow_router.post("/{task_id}/start", response_model=GoalProgressEvaluation)
async def start_workflow(task_id: str) -> GoalProgressEvaluation:
    """Execute the active workflow plan for the given task."""
    goal = workflow_engine.get_goal(task_id)
    if not goal:
        raise HTTPException(status_code=404, detail=f"Workflow task '{task_id}' not found.")

    eval_res = await workflow_engine.execute_workflow(task_id)
    return eval_res


@workflow_router.post("/{task_id}/pause", response_model=Dict[str, Any])
async def pause_workflow(task_id: str) -> Dict[str, Any]:
    """Pause execution of the specified active workflow."""
    ok = workflow_engine.pause_workflow(task_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Workflow task '{task_id}' could not be paused.")
    return {"task_id": task_id, "status": "PAUSED"}


@workflow_router.post("/{task_id}/resume", response_model=Dict[str, Any])
async def resume_workflow(task_id: str) -> Dict[str, Any]:
    """Resume execution of a paused workflow."""
    ok = workflow_engine.resume_workflow(task_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Workflow task '{task_id}' could not be resumed.")
    return {"task_id": task_id, "status": "RESUMED"}


@workflow_router.post("/{task_id}/cancel", response_model=Dict[str, Any])
async def cancel_workflow(task_id: str) -> Dict[str, Any]:
    """Cancel execution of a workflow."""
    ok = workflow_engine.cancel_workflow(task_id)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Workflow task '{task_id}' could not be cancelled.")
    return {"task_id": task_id, "status": "CANCELLED"}


@workflow_router.post("/{task_id}/replan", response_model=Dict[str, Any])
async def trigger_replan(task_id: str, failure_node_id: str = "step_1", reason: str = "Manual operator replan") -> Dict[str, Any]:
    """Explicitly construct a successor plan version."""
    ok, new_p, err = workflow_engine.replan_workflow(task_id, failure_node_id, reason)
    if not ok or not new_p:
        raise HTTPException(status_code=400, detail=err or "Replanning failed.")
    return {
        "task_id": task_id,
        "new_plan_version": new_p.version,
        "new_plan_id": new_p.plan_id,
        "replan_reason": new_p.replan_reason
    }


@workflow_router.get("/{task_id}/data-flows", response_model=List[DataFlowRecord])
async def get_workflow_data_flows(task_id: str) -> List[DataFlowRecord]:
    """Retrieve cross-application data movement records."""
    return workflow_engine.get_data_flows(task_id)


@workflow_router.get("/{task_id}/journal", response_model=List[WorkflowJournalEntry])
async def get_workflow_journal(task_id: str) -> List[WorkflowJournalEntry]:
    """Retrieve immutable audit journal of all workflow events."""
    return workflow_engine.get_journal(task_id)


@workflow_router.post("/{task_id}/resolve-handoff", response_model=Dict[str, Any])
async def resolve_human_handoff(task_id: str, req: ResolveHandoffRequest) -> Dict[str, Any]:
    """Resolve an active human handoff request to unblock workflow automation."""
    ok = workflow_engine.resolve_handoff(task_id, req.handoff_id, req.resolution_notes)
    if not ok:
        raise HTTPException(status_code=404, detail=f"Handoff request '{req.handoff_id}' not found.")
    return {"task_id": task_id, "handoff_id": req.handoff_id, "resolved": True}

import time
