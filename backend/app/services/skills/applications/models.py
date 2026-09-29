"""Phase 7 Stage 7.2 — Application Adapter & Capability Models."""

from enum import Enum
import time
from typing import Any, Callable, Dict, List, Optional
from pydantic import BaseModel, Field
from backend.app.services.skills.models import SkillCategory, SkillRiskLevel, SkillFailureCode, SkillResult


class ApplicationState(str, Enum):
    """Lifecycle state of an external application under automation."""
    UNKNOWN = "UNKNOWN"
    NOT_RUNNING = "NOT_RUNNING"
    STARTING = "STARTING"
    RUNNING = "RUNNING"
    FOCUSED = "FOCUSED"
    OBSERVING = "OBSERVING"
    EXECUTING = "EXECUTING"
    VERIFYING = "VERIFYING"
    RECOVERING = "RECOVERING"
    STOPPED = "STOPPED"


class ApplicationIdentity(BaseModel):
    """Deterministic multi-factor identity definition for a Windows application."""
    application_id: str = Field(..., description="Unique application identifier (e.g., notepad, explorer, calculator)")
    display_name: str
    executable_names: List[str] = Field(default_factory=list, description="Allowlisted binary names (e.g. notepad.exe)")
    window_classes: List[str] = Field(default_factory=list, description="Windows UIA/Win32 class names (e.g. Notepad, CabinetWClass)")
    package_id: Optional[str] = Field(default=None, description="Appx/MSIX package identity if modern UWP app")
    window_title_patterns: List[str] = Field(default_factory=list, description="Regex/glob patterns for window title matching")
    icon_name: str = "app"
    description: str = ""


class ApplicationCapability(BaseModel):
    """Specific verifiable capability advertised by an application adapter."""
    capability_name: str = Field(..., description="Capability name (e.g. read_text, type_text, enter_expression)")
    skill_id: str = Field(..., description="Global skill ID (e.g. app.notepad.read_text)")
    version: str = "1.0.0"
    description: str
    risk_level: SkillRiskLevel = SkillRiskLevel.LOW
    permissions: List[str] = Field(default_factory=list)
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    output_schema: Dict[str, Any] = Field(default_factory=dict)
    preconditions: List[str] = Field(default_factory=list)
    postconditions: List[str] = Field(default_factory=list)
    verification_policy: str = "OBSERVED_STATE_MATCH"
    requires_focus: bool = True


class ApplicationSession(BaseModel):
    """Active application automation session tracking process state and window binding."""
    session_id: str
    task_id: str
    application_id: str
    process_id: Optional[int] = None
    window_handle: Optional[int] = None
    window_title: Optional[str] = None
    state: ApplicationState = ApplicationState.NOT_RUNNING
    created_at_ts: int = Field(default_factory=lambda: int(time.time() * 1000))
    last_observation_ts: int = Field(default_factory=lambda: int(time.time() * 1000))
    observation_token: str = Field(default="")
    adapter_version: str = "1.0.0"
    metadata: Dict[str, Any] = Field(default_factory=dict)
