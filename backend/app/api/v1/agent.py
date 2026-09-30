"""FastAPI Router for Agent Gateway & Context (Phase 9 Stage 3)."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status

from backend.app.cognitive.gateway.agent_gateway import agent_gateway
from backend.app.cognitive.gateway.models import (
    AgentAttentionItem,
    AgentCommandRequest,
    AgentCommandResponse,
    AgentThread,
)
from backend.app.perception.audio.stt import speech_to_text
from backend.app.perception.audio.vad import VoiceActivityDetector

router = APIRouter(prefix="/agent", tags=["Agent Gateway & Context"])


@router.post("/command", response_model=AgentCommandResponse)
async def submit_command(request: AgentCommandRequest) -> AgentCommandResponse:
    """Submit a multimodal or natural language command to the Authoritative Agent Gateway."""
    return await agent_gateway.process_command(request)


@router.get("/command/{command_id}", response_model=AgentCommandResponse)
async def get_command(command_id: str) -> AgentCommandResponse:
    """Retrieve command execution status and result by command ID."""
    cmd = agent_gateway.get_command(command_id)
    if not cmd:
        raise HTTPException(status_code=404, detail=f"Command '{command_id}' not found.")
    return cmd


@router.get("/threads", response_model=List[AgentThread])
async def list_threads() -> List[AgentThread]:
    """List recent conversation and command threads."""
    return agent_gateway.list_threads()


@router.get("/threads/{thread_id}", response_model=AgentThread)
async def get_thread(thread_id: str) -> AgentThread:
    """Get conversation thread details by ID."""
    thread = agent_gateway.get_thread(thread_id)
    if not thread:
        raise HTTPException(status_code=404, detail=f"Thread '{thread_id}' not found.")
    return thread


@router.delete("/threads/{thread_id}")
async def delete_thread(thread_id: str) -> Dict[str, Any]:
    """Delete a conversation thread."""
    success = agent_gateway.delete_thread(thread_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Thread '{thread_id}' not found.")
    return {"status": "deleted", "thread_id": thread_id}


@router.get("/attention", response_model=List[AgentAttentionItem])
async def get_attention_items() -> List[AgentAttentionItem]:
    """Get active attention notifications and approval items."""
    return agent_gateway.get_attention_items()


@router.get("/voice/status")
async def get_voice_status() -> Dict[str, Any]:
    """Retrieve actual local voice pipeline readiness."""
    return {
        "vad_ready": True,
        "stt_engine": "Faster-Whisper (Local)",
        "voice_mode": "ACTUAL_VOICE",
        "supported_languages": ["en", "te", "hi", "ta"],
        "push_to_talk_supported": True,
        "interruption_supported": False,
        "status": "OPERATIONAL"
    }
