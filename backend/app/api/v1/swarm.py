"""FastAPI Router for Sovereign Multi-LLM Collaborative Intelligence & Agent Swarm."""

import asyncio
import inspect
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query, status

from backend.app.core.event_bus import event_bus, EventCategory, ABHIEvent
from backend.app.intelligence.model_registry import model_capability_registry, ModelRole
from backend.app.cognitive.swarm.council import multi_llm_council, CouncilSessionRecord
from backend.app.perception.shared_pipeline import (
    shared_perception_pipeline,
    InputSourceType,
    PerceptionInputEnvelope
)
from backend.app.automation.orchestration.worker_lifecycle import worker_lifecycle_manager
from backend.app.jarvis_modules.mcp_registry import mcp_registry

router = APIRouter(prefix="/swarm", tags=["Multi-LLM Swarm & Council"])


class IntakeRequest(BaseModel):
    text: str
    source_type: InputSourceType = InputSourceType.TEXT
    speaker_id: str = "Ayyappa Rayudu (Mamu)"
    session_id: Optional[str] = None
    language_hint: Optional[str] = None


class DeliberateRequest(BaseModel):
    task_id: str
    goal: str
    context: Optional[Dict[str, Any]] = None


@router.get("/models")
async def get_model_registry() -> Dict[str, Any]:
    """Retrieve catalog of discovered local models, assigned logical roles, and hardware profile."""
    installed = model_capability_registry.discover_installed_models()
    profiles = [p.model_dump() for p in model_capability_registry.list_all_profiles()]
    roles = model_capability_registry.get_role_bindings()
    return {
        "installed_models": installed,
        "profiles": profiles,
        "role_assignments": roles,
        "total_models": len(profiles)
    }


@router.post("/council/deliberate", response_model=CouncilSessionRecord)
async def deliberate_goal(req: DeliberateRequest) -> CouncilSessionRecord:
    """Trigger bounded multi-model council deliberation (Proposal -> Plan -> Critique -> Revision -> Ratification)."""
    token = worker_lifecycle_manager.get_cancellation_token(req.task_id)
    session = await multi_llm_council.deliberate_goal(
        task_id=req.task_id,
        goal=req.goal,
        context=req.context,
        cancellation_token=token
    )
    return session


@router.get("/council/session/{session_id}")
async def get_council_session(session_id: str) -> Dict[str, Any]:
    """Get active or historical council deliberation session."""
    sess = multi_llm_council.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Council session not found")
    return sess.model_dump()


@router.post("/input", response_model=PerceptionInputEnvelope)
async def intake_multimodal_input(req: IntakeRequest) -> PerceptionInputEnvelope:
    """Shared input intake for voice, text, screen, or gesture. Canonicalizes and publishes to event bus."""
    envelope = await shared_perception_pipeline.intake_input(
        raw_text=req.text,
        source_type=req.source_type,
        speaker_id=req.speaker_id,
        session_id=req.session_id,
        language_hint=req.language_hint
    )
    return envelope


@router.get("/events")
async def get_recent_events(
    category: Optional[EventCategory] = None,
    limit: int = 50,
    correlation_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Query recent durable events from the shared event bus ring buffer."""
    events = event_bus.get_recent_events(category=category, limit=limit, correlation_id=correlation_id)
    return [e.model_dump() for e in events]


@router.post("/emergency-stop")
async def trigger_emergency_stop(reason: str = Query("Operator Override or Swarm Kill-Switch")) -> Dict[str, Any]:
    """Halt all active workers, cancel running tasks, and revoke execution leases."""
    from backend.app.automation.leases.lease_manager import lease_manager
    from backend.app.automation.orchestration.orchestrator import supervisor_orchestrator
    from backend.app.cognitive.supervisor.supervisor import central_supervisor
    from backend.app.core.security import security_audit

    # 1. Invalidate all active automation leases
    revoked_leases = lease_manager.invalidate_all_leases(reason=f"EMERGENCY_STOP: {reason}")

    # 2. Halt supervisor orchestrator & central cognitive supervisor
    await supervisor_orchestrator.emergency_stop(reason=reason)
    await central_supervisor.emergency_stop()

    # 3. Halt all background workers & cancellation tokens
    stopped_count = worker_lifecycle_manager.emergency_stop_all(reason=f"EMERGENCY_STOP: {reason}")

    # 4. Audit log event
    security_audit.log_event(
        event_type="EMERGENCY_STOP_TRIGGERED",
        actor="SAFETY_CONTROLLER",
        endpoint="/api/v1/swarm/emergency-stop",
        status="LOCKED",
        details={
            "reason": reason,
            "revoked_leases": revoked_leases,
            "stopped_workers_count": stopped_count,
        }
    )

    # 5. Broadcast security event
    evt = ABHIEvent(
        category=EventCategory.SECURITY,
        event_type="emergency_stop_triggered",
        source="SwarmAPI",
        data={
            "reason": reason,
            "revoked_leases": revoked_leases,
            "stopped_workers_count": stopped_count,
        }
    )
    await event_bus.publish(evt)

    return {
        "status": "EMERGENCY_STOP_EXECUTED",
        "success": True,
        "lockout_active": True,
        "revoked_leases": revoked_leases,
        "stopped_workers_count": stopped_count,
        "message": f"Deterministic emergency stop activated: {reason}. All workers terminated, leases invalidated, tokens cancelled."
    }


class MCPInvokeRequest(BaseModel):
    tool_name: str = Field(..., min_length=1, description="Registered MCP tool name")
    arguments: Dict[str, Any] = Field(default_factory=dict, description="Tool invocation arguments")


@router.get("/mcp/tools")
async def list_mcp_tools() -> Dict[str, Any]:
    """List all registered Model Context Protocol (MCP) tools."""
    tools = mcp_registry.list_tools()
    return {
        "tools": tools,
        "total": len(tools)
    }


@router.post("/mcp/invoke")
async def invoke_mcp_tool(req: MCPInvokeRequest) -> Dict[str, Any]:
    """Invoke a registered MCP tool by name with validated arguments."""
    if req.tool_name not in mcp_registry.tools:
        raise HTTPException(status_code=404, detail=f"MCP tool '{req.tool_name}' not found.")

    if hasattr(mcp_registry, "invoke_tool"):
        result = mcp_registry.invoke_tool(req.tool_name, req.arguments)
        if inspect.isawaitable(result):
            result = await result
        return {"status": "success", "tool_name": req.tool_name, "result": result}

    handler = mcp_registry.handlers.get(req.tool_name)
    if handler is None:
        raise HTTPException(
            status_code=501,
            detail=f"MCP tool '{req.tool_name}' is registered without an executable handler."
        )

    if inspect.iscoroutinefunction(handler):
        result = await handler(**req.arguments)
    else:
        result = handler(**req.arguments)
        if inspect.isawaitable(result):
            result = await result

    return {
        "status": "success",
        "tool_name": req.tool_name,
        "result": result
    }
