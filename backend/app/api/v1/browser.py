"""Phase 7 Stage 7.3 — Browser & Web Skills REST API Router."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from backend.app.automation.browser.playwright_worker import playwright_browser_worker
from backend.app.services.skills.browser.adapter import browser_skill_adapter
from backend.app.services.skills.browser.models import (
    BrowserCapability,
    BrowserDownloadRecord,
    BrowserSecurityEvent,
    BrowserSession
)
from backend.app.services.skills.browser.security import browser_security_engine

router = APIRouter(prefix="/browser", tags=["Browser & Web Skills"])


class StartSessionRequest(BaseModel):
    task_id: str
    execution_id: Optional[str] = None


class BrowserStatusResponse(BaseModel):
    worker_state: str
    is_headless: bool
    active_sessions_count: int
    downloads_count: int
    security_events_count: int
    current_url: str
    current_title: str


@router.get("/status", response_model=BrowserStatusResponse)
async def get_browser_status():
    """Get overall Playwright browser automation worker and session status."""
    return BrowserStatusResponse(
        worker_state=browser_skill_adapter.worker.state.value,
        is_headless=browser_skill_adapter.headless,
        active_sessions_count=len(browser_skill_adapter.list_sessions()),
        downloads_count=len(browser_skill_adapter.get_downloads()),
        security_events_count=len(browser_security_engine.get_security_events()),
        current_url=browser_skill_adapter.worker.current_url,
        current_title=browser_skill_adapter.worker.current_title
    )


@router.get("/capabilities", response_model=List[BrowserCapability])
async def get_browser_capabilities():
    """List all registered and policy-controlled browser automation capabilities."""
    return browser_skill_adapter.get_capabilities()


@router.get("/sessions", response_model=List[BrowserSession])
async def list_browser_sessions():
    """List all tracked browser sessions."""
    return browser_skill_adapter.list_sessions()


@router.get("/sessions/{session_id}", response_model=BrowserSession)
async def get_browser_session(session_id: str):
    """Get details of a specific browser session."""
    session = browser_skill_adapter.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Browser session '{session_id}' not found."
        )
    return session


@router.post("/sessions/start", response_model=BrowserSession)
async def start_browser_session(request: StartSessionRequest):
    """Start or retrieve a browser session for a task."""
    session = browser_skill_adapter.get_session_for_task(request.task_id)
    if not session:
        session = browser_skill_adapter.create_session(
            task_id=request.task_id,
            execution_id=request.execution_id
        )
    return session


@router.post("/sessions/{session_id}/stop")
async def stop_browser_session(session_id: str):
    """Cleanly close and terminate a browser session."""
    session = browser_skill_adapter.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Browser session '{session_id}' not found."
        )
    session.state = browser_skill_adapter.worker.state
    return {"success": True, "session_id": session_id, "status": "STOPPED"}


@router.get("/security-events", response_model=List[BrowserSecurityEvent])
async def list_browser_security_events():
    """List all recorded security events and prompt injection alerts."""
    return browser_security_engine.get_security_events()


@router.post("/clear-events")
async def clear_browser_security_events():
    """Clear recorded security events stream."""
    browser_security_engine.clear_security_events()
    return {"success": True, "message": "Security events cleared."}


@router.get("/downloads", response_model=List[BrowserDownloadRecord])
async def list_browser_downloads():
    """List all verified files downloaded through browser automation."""
    return browser_skill_adapter.get_downloads()
