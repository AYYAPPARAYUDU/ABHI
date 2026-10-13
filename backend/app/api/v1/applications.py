"""Phase 7 Stage 7.2 — Applications REST API Endpoints."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.services.skills.applications.models import ApplicationState
from backend.app.services.skills.applications.registry import application_registry


router = APIRouter(prefix="/applications", tags=["Applications"])


class LaunchApplicationRequest(BaseModel):
    params: Dict[str, Any] = Field(default_factory=dict)
    task_id: Optional[str] = "manual_api"


class ToggleApplicationRequest(BaseModel):
    enabled: bool


@router.get("", summary="List all supported Windows applications and their status")
async def list_applications():
    """Return all registered application adapters, capability counts, and operational status."""
    apps = application_registry.list_applications()
    return {"applications": apps, "total_count": len(apps)}


@router.get("/{application_id}", summary="Get application details and identity")
async def get_application(application_id: str):
    """Retrieve full identity specification and state for a specific application."""
    adapter = application_registry.get_adapter(application_id)
    if not adapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application adapter '{application_id}' not found."
        )
    ident = adapter.get_identity()
    caps = adapter.get_capabilities()
    state = adapter.get_state()
    return {
        "application_id": ident.application_id,
        "display_name": ident.display_name,
        "executable_names": ident.executable_names,
        "window_classes": ident.window_classes,
        "package_id": ident.package_id,
        "icon_name": ident.icon_name,
        "description": ident.description,
        "enabled": adapter.enabled,
        "state": state.value,
        "capabilities": [
            {
                "capability_name": c.capability_name,
                "skill_id": c.skill_id,
                "version": c.version,
                "risk_level": c.risk_level.value,
                "permissions": c.permissions,
                "description": c.description,
                "verification_policy": c.verification_policy
            }
            for c in caps
        ]
    }


@router.get("/{application_id}/capabilities", summary="List application capabilities")
async def get_application_capabilities(application_id: str):
    """Get the verified capability list for a specific application."""
    adapter = application_registry.get_adapter(application_id)
    if not adapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application adapter '{application_id}' not found."
        )
    caps = adapter.get_capabilities()
    return {
        "application_id": application_id,
        "capabilities_count": len(caps),
        "capabilities": [
            {
                "capability_name": c.capability_name,
                "skill_id": c.skill_id,
                "version": c.version,
                "risk_level": c.risk_level.value,
                "permissions": c.permissions,
                "input_schema": c.input_schema,
                "output_schema": c.output_schema,
                "description": c.description
            }
            for c in caps
        ]
    }


@router.get("/{application_id}/status", summary="Get live application status")
async def get_application_status(application_id: str):
    """Get current runtime status and observation state."""
    adapter = application_registry.get_adapter(application_id)
    if not adapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application adapter '{application_id}' not found."
        )
    state = adapter.get_state()
    return {
        "application_id": application_id,
        "state": state.value,
        "enabled": adapter.enabled,
        "is_available": adapter.is_available()
    }


@router.post("/{application_id}/launch", summary="Launch or open application")
async def launch_application(application_id: str, request: LaunchApplicationRequest):
    """Launch application process and bind session."""
    adapter = application_registry.get_adapter(application_id)
    if not adapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application adapter '{application_id}' not found."
        )
    if not adapter.enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Application '{application_id}' is currently disabled."
        )
    session = adapter.create_session(task_id=request.task_id or "manual_api")
    ok, err = await adapter.launch(session, request.params)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err or "Failed to launch application."
        )
    return {
        "success": True,
        "session_id": session.session_id,
        "application_id": application_id,
        "state": session.state.value,
        "window_title": session.window_title
    }


@router.post("/{application_id}/focus", summary="Bring application to foreground")
async def focus_application(application_id: str):
    """Focus active application window."""
    adapter = application_registry.get_adapter(application_id)
    if not adapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application adapter '{application_id}' not found."
        )
    # Reuse active session or create session
    session = None
    for s in adapter._sessions.values():
        if s.state in [ApplicationState.RUNNING, ApplicationState.FOCUSED, ApplicationState.EXECUTING]:
            session = s
            break
    if not session:
        session = adapter.create_session(task_id="focus_api")
        session.state = ApplicationState.RUNNING

    ok, err = await adapter.focus(session)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=err or "Failed to focus application."
        )
    return {
        "success": True,
        "application_id": application_id,
        "state": session.state.value
    }


@router.post("/{application_id}/toggle", summary="Enable or disable application adapter")
async def toggle_application(application_id: str, request: ToggleApplicationRequest):
    if request.enabled:
        ok = application_registry.enable_adapter(application_id)
    else:
        ok = application_registry.disable_adapter(application_id)

    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application adapter '{application_id}' not found."
        )
    return {"application_id": application_id, "enabled": request.enabled}


class ExecuteCapabilityRequest(BaseModel):
    capability_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    task_id: Optional[str] = "manual_api"


@router.post("/{application_id}/execute", summary="Execute application capability directly")
async def execute_application_capability(application_id: str, request: ExecuteCapabilityRequest):
    """Execute a verified capability directly on the target application adapter."""
    adapter = application_registry.get_adapter(application_id)
    if not adapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application adapter '{application_id}' not found."
        )
    if not adapter.enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Application adapter '{application_id}' is disabled."
        )

    session = None
    for s in adapter._sessions.values():
        if s.state in [ApplicationState.RUNNING, ApplicationState.FOCUSED, ApplicationState.EXECUTING]:
            session = s
            break
    if not session:
        session = adapter.create_session(task_id=request.task_id or "exec_api")
        session.state = ApplicationState.RUNNING

    import uuid
    action_id = f"act_api_{uuid.uuid4().hex[:8]}"
    res = await adapter.execute_capability(session, request.capability_name, request.arguments, action_id)

    return {
        "success": res.is_success,
        "application_id": application_id,
        "capability_name": request.capability_name,
        "action_id": action_id,
        "output_data": res.output_data,
        "observed_state": res.observed_state,
        "error_message": res.error_message,
        "duration_ms": res.duration_ms
    }


@router.post("/{application_id}/close", summary="Close application session and process")
async def close_application(application_id: str):
    """Gracefully terminate or close active application session."""
    adapter = application_registry.get_adapter(application_id)
    if not adapter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application adapter '{application_id}' not found."
        )

    session = None
    for s in adapter._sessions.values():
        if s.state in [ApplicationState.RUNNING, ApplicationState.FOCUSED, ApplicationState.EXECUTING]:
            session = s
            break
    if not session:
        session = adapter.create_session(task_id="close_api")

    # If adapter has a close capability, invoke it
    caps = [c.capability_name for c in adapter.get_capabilities()]
    if "close" in caps:
        import uuid
        res = await adapter.execute_capability(session, "close", {}, f"act_close_{uuid.uuid4().hex[:6]}")
        session.state = ApplicationState.STOPPED
        return {"success": res.is_success, "application_id": application_id, "state": session.state.value}

    session.state = ApplicationState.STOPPED
    return {"success": True, "application_id": application_id, "state": session.state.value}


@router.get("/active/window", summary="Inspect active Windows foreground window title")
async def get_active_window():
    """Read the current foreground window title via native Win32."""
    from backend.app.automation.desktop.windows_uia_driver import windows_uia_driver
    title = windows_uia_driver.get_foreground_window_title()
    return {"active_window": title, "is_windows": windows_uia_driver.is_windows}
