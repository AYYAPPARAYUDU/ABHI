"""Agent Gateway Domain Models, Context & Data Contracts (Phase 9 Stage 3)."""

import time
import uuid
import re
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class InputMode(str, Enum):
    TEXT = "TEXT"
    VOICE = "VOICE"
    SYSTEM_EVENT = "SYSTEM_EVENT"
    FOLLOW_UP = "FOLLOW_UP"


class CommandLifecycleState(str, Enum):
    RECEIVED = "RECEIVED"
    UNDERSTANDING = "UNDERSTANDING"
    PLANNING = "PLANNING"
    WAITING_FOR_APPROVAL = "WAITING_FOR_APPROVAL"
    EXECUTING = "EXECUTING"
    VERIFYING = "VERIFYING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    RECOVERING = "RECOVERING"
    QUEUED = "QUEUED"


class AttentionType(str, Enum):
    INFO = "INFO"
    SUCCESS = "SUCCESS"
    WARNING = "WARNING"
    APPROVAL = "APPROVAL"
    ERROR = "ERROR"
    RECOVERY = "RECOVERY"


class ResultReference(BaseModel):
    """Stable reference to an artifact, task or computation result."""
    result_id: str
    task_id: Optional[str] = None
    artifact_id: Optional[str] = None
    type: str = "TEXT"
    summary: Optional[str] = None
    created_at: int = Field(default_factory=lambda: int(time.time() * 1000))
    expires_at: int = Field(default_factory=lambda: int(time.time() * 1000) + 300_000)  # 5 min TTL


class AgentContext(BaseModel):
    """Bounded contextual metadata for conversational & multi-turn commands."""
    active_task_id: Optional[str] = None
    active_project_id: Optional[str] = None
    selected_artifact_id: Optional[str] = None
    selected_application: Optional[str] = None
    current_route: Optional[str] = None
    recent_command: Optional[str] = None
    recent_result: Optional[Dict[str, Any]] = None
    language: str = "auto"
    user_preferences: Dict[str, Any] = Field(default_factory=dict)
    ttl_seconds: int = 300
    updated_at: int = Field(default_factory=lambda: int(time.time() * 1000))

    def is_expired(self) -> bool:
        """Check if context TTL has elapsed."""
        now = int(time.time() * 1000)
        return (now - self.updated_at) > (self.ttl_seconds * 1000)


class AgentCommandRequest(BaseModel):
    """Authoritative API Request for submitting natural language / multimodal commands."""
    command_id: Optional[str] = None
    text: str = Field(..., min_length=1, max_length=2000)
    input_mode: InputMode = InputMode.TEXT
    language_hint: Optional[str] = None
    context: Optional[AgentContext] = None
    thread_id: Optional[str] = None
    origin: str = "web"
    created_at: int = Field(default_factory=lambda: int(time.time() * 1000))


class AgentCommandResponse(BaseModel):
    """Authoritative API Response returned from Agent Gateway."""
    command_id: str
    task_id: Optional[str] = None
    thread_id: Optional[str] = None
    status: CommandLifecycleState
    accepted: bool = True
    message: str
    result: Optional[Dict[str, Any]] = None
    context_reference: Optional[ResultReference] = None
    created_at: int = Field(default_factory=lambda: int(time.time() * 1000))


class AgentAttentionItem(BaseModel):
    """Important system notification / attention item for the operator."""
    item_id: str = Field(default_factory=lambda: f"attn_{uuid.uuid4().hex[:8]}")
    type: AttentionType
    title: str
    message: str
    action_type: Optional[str] = None
    target_id: Optional[str] = None
    timestamp: int = Field(default_factory=lambda: int(time.time() * 1000))
    priority: int = 1


class AgentThread(BaseModel):
    """Lightweight command and outcome thread."""
    thread_id: str = Field(default_factory=lambda: f"thread_{uuid.uuid4().hex[:10]}")
    title: str = "New Conversation"
    created_at: int = Field(default_factory=lambda: int(time.time() * 1000))
    updated_at: int = Field(default_factory=lambda: int(time.time() * 1000))
    active_context: Optional[AgentContext] = None
    commands: List[Dict[str, Any]] = Field(default_factory=list)
    results: List[Dict[str, Any]] = Field(default_factory=list)
