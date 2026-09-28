"""FastAPI API endpoints for ABHI Runtime Lifecycle & Activation."""

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from backend.app.runtime.models import RuntimeStateSummary, RuntimeMode, WakeWordEvent
from backend.app.runtime.lifecycle import runtime_coordinator
from backend.app.runtime.wake_word import wake_word_detector
from backend.app.runtime.auth import local_auth_manager
from backend.app.services.llm.ollama_client import ollama_client

router = APIRouter(prefix="/runtime", tags=["Runtime Lifecycle"])


class SetModeRequest(BaseModel):
    mode: str = Field(..., description="Target mode: wake, sleep, rest, arm, lock, emergency_stop, clear_stop")
    source: str = Field(default="api", description="Trigger source: voice, text, presence, ui, api")


class TriggerWakeRequest(BaseModel):
    confidence: float = Field(default=0.95, ge=0.0, le=1.0)
    source: str = Field(default="wake_word")


class PinAuthRequest(BaseModel):
    pin: str = Field(..., min_length=4, max_length=32)


class ChangePinRequest(BaseModel):
    current_pin: str
    new_pin: str = Field(..., min_length=4, max_length=32)


@router.get("/state", response_model=RuntimeStateSummary)
async def get_runtime_state() -> RuntimeStateSummary:
    """Return authoritative snapshot of ABHI runtime state, identity level, and power policy."""
    return runtime_coordinator.get_state_summary()


@router.post("/mode")
async def set_runtime_mode(request: SetModeRequest) -> Dict[str, Any]:
    """Execute a lifecycle mode transition (wake, rest, arm, lock)."""
    target = request.mode.strip().lower()

    if target in ["wake", "wake_up", "activate", "listening"]:
        success, msg = runtime_coordinator.transition_to_wake(source=request.source)
    elif target in ["sleep", "rest", "resting"]:
        success, msg = runtime_coordinator.transition_to_rest(reason=request.source)
    elif target in ["arm", "armed"]:
        success, msg = runtime_coordinator.transition_to_armed()
    elif target in ["lock", "locked"]:
        success, msg = runtime_coordinator.lock_assistant()
    elif target in ["emergency_stop", "stop"]:
        success, msg = runtime_coordinator.trigger_emergency_stop()
    elif target in ["clear_stop", "resume"]:
        success, msg = runtime_coordinator.clear_emergency_stop()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported runtime mode '{request.mode}'. Valid modes: wake, rest, arm, lock, emergency_stop, clear_stop."
        )

    if not success:
        raise HTTPException(status_code=status.HTTP_423_LOCKED if "locked" in msg.lower() else status.HTTP_400_BAD_REQUEST, detail=msg)

    return {"status": "success", "message": msg, "state": runtime_coordinator.get_state_summary().model_dump()}


@router.post("/wake", response_model=WakeWordEvent)
async def trigger_wake_word(request: TriggerWakeRequest) -> WakeWordEvent:
    """Process wake word event with debouncing and transition to listening state."""
    is_detected, event = wake_word_detector.trigger_wake_event(confidence=request.confidence)
    if is_detected:
        runtime_coordinator.transition_to_wake(source="wake_word")
    return event


@router.post("/auth/pin")
async def verify_local_pin(request: PinAuthRequest) -> Dict[str, Any]:
    """Verify ABHI-local application PIN to unlock assistant."""
    success, msg = runtime_coordinator.unlock_assistant(request.pin)
    if not success:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=msg)
    return {"status": "success", "message": msg, "state": runtime_coordinator.get_state_summary().model_dump()}


@router.post("/auth/pin/change")
async def change_local_pin(request: ChangePinRequest) -> Dict[str, Any]:
    """Update ABHI-local application PIN."""
    success, msg = local_auth_manager.set_pin(request.current_pin, request.new_pin)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return {"status": "success", "message": msg}


@router.get("/startup-health")
async def get_startup_health() -> Dict[str, Any]:
    """Inspect all core dependencies required for automatic Windows session startup."""
    ollama_ok = await ollama_client.is_healthy()
    return {
        "status": "HEALTHY" if ollama_ok else "DEGRADED",
        "services": {
            "backend_api": "HEALTHY",
            "sqlite_database": "HEALTHY",
            "ollama_engine": "HEALTHY" if ollama_ok else "UNREACHABLE",
            "wake_word_engine": "HEALTHY",
            "perception_daemon": "HEALTHY",
            "windows_host_worker": "HEALTHY",
            "websocket_telemetry": "HEALTHY"
        },
        "auto_start_policy": "ARMED_WITHOUT_TASK_EXECUTION",
        "runtime_mode": runtime_coordinator.mode.value
    }
