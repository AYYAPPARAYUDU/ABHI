"""FastAPI Router for Four-Tier Cognitive Intelligence & 3D Virtual Agent Office."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.app.intelligence.four_tier_engine import four_tier_engine

router = APIRouter(prefix="/intelligence", tags=["Intelligence & 3D Office"])


class QueryRequest(BaseModel):
    query: str = Field(..., description="User query or prompt")


class GoalRequest(BaseModel):
    goal: str = Field(..., description="High-level autonomous objective")


class AgentStatusUpdate(BaseModel):
    agent_id: str
    status: str  # WORKING, IDLE
    task_desc: Optional[str] = None
    tool_name: Optional[str] = None


@router.get("/office-overview")
async def get_office_overview() -> Dict[str, Any]:
    """Return live work telemetry of humanoid agents for the 3D Virtual Office (Agent HQ)."""
    return four_tier_engine.get_office_overview()


@router.post("/llm")
async def execute_tier1_llm(req: QueryRequest) -> Dict[str, Any]:
    """Execute Tier 1 Raw LLM inference."""
    return await four_tier_engine.run_tier1_llm(req.query)


@router.post("/rag")
async def execute_tier2_rag(req: QueryRequest) -> Dict[str, Any]:
    """Execute Tier 2 RAG (Local Vector Retrieval + LLM Generation)."""
    return await four_tier_engine.run_tier2_rag(req.query)


@router.post("/orchestrate")
async def execute_tier4_orchestrator(req: GoalRequest) -> Dict[str, Any]:
    """Execute Tier 4 Multi-Agent Swarm Orchestrator."""
    return await four_tier_engine.run_tier4_orchestrator(req.goal)


@router.post("/agent/status")
async def update_agent_status(req: AgentStatusUpdate) -> Dict[str, Any]:
    """Update an individual agent's working or idle state in the virtual office."""
    worker = four_tier_engine.workers.get(req.agent_id)
    if not worker:
        raise HTTPException(status_code=404, detail=f"Agent '{req.agent_id}' not found.")

    if req.status.upper() == "WORKING":
        worker.set_working(req.task_desc or "Autonomous execution", req.tool_name or "SystemTool")
    else:
        worker.set_idle()

    return {"status": "SUCCESS", "worker": worker.to_dict()}
