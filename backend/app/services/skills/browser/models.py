"""Phase 7 Stage 7.3 — Advanced Browser & Web Skills Domain Models and Trust Classifications."""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import time
import uuid


class TrustClassification(str, Enum):
    """Explicit content trust classification model."""
    SYSTEM = "SYSTEM"
    TRUSTED_LOCAL_RUNTIME = "TRUSTED_LOCAL_RUNTIME"
    USER = "USER"
    REGISTERED_SKILL = "REGISTERED_SKILL"
    WEB_CONTENT = "WEB_CONTENT"
    DOWNLOADED_CONTENT = "DOWNLOADED_CONTENT"
    UNKNOWN_EXTERNAL_CONTENT = "UNKNOWN_EXTERNAL_CONTENT"


class BrowserSessionState(str, Enum):
    """Lifecycle state of an active browser session."""
    STOPPED = "STOPPED"
    STARTING = "STARTING"
    READY = "READY"
    NAVIGATING = "NAVIGATING"
    EXECUTING = "EXECUTING"
    OBSERVING = "OBSERVING"
    VERIFYING = "VERIFYING"
    STOPPING = "STOPPING"
    FAILED = "FAILED"


class BrowserSecurityEventType(str, Enum):
    """Structured security events for browser execution monitoring."""
    BROWSER_ORIGIN_DENIED = "BROWSER_ORIGIN_DENIED"
    BROWSER_REDIRECT_DENIED = "BROWSER_REDIRECT_DENIED"
    BROWSER_PROMPT_INJECTION_DETECTED = "BROWSER_PROMPT_INJECTION_DETECTED"
    BROWSER_SENSITIVE_FIELD = "BROWSER_SENSITIVE_FIELD"
    BROWSER_DOWNLOAD = "BROWSER_DOWNLOAD"
    BROWSER_AUTH_REQUIRED = "BROWSER_AUTH_REQUIRED"
    BROWSER_CAPTCHA_REQUIRED = "BROWSER_CAPTCHA_REQUIRED"
    BROWSER_GROUNDING_AMBIGUOUS = "BROWSER_GROUNDING_AMBIGUOUS"
    BROWSER_STALE_OBSERVATION = "BROWSER_STALE_OBSERVATION"
    BROWSER_FOCUS_CHANGED = "BROWSER_FOCUS_CHANGED"
    BROWSER_RECOVERY = "BROWSER_RECOVERY"


class PageIdentity(BaseModel):
    """Deterministic snapshot of a browser page's identity and state freshness."""
    origin: str
    canonical_url: str
    title: str = ""
    dom_signature: str = ""
    observation_timestamp: int = Field(default_factory=lambda: int(time.time() * 1000))
    freshness_token: str = Field(default_factory=lambda: f"tok_page_{uuid.uuid4().hex[:8]}")


class BrowserSession(BaseModel):
    """Encapsulates the state and identity of a single task's browser session."""
    session_id: str
    task_id: str
    execution_id: Optional[str] = None
    browser_type: str = "chromium"
    current_origin: str = ""
    current_url: str = ""
    page_identity: Optional[PageIdentity] = None
    state: BrowserSessionState = BrowserSessionState.STOPPED
    created_at_ts: int = Field(default_factory=lambda: int(time.time() * 1000))
    last_observation_ts: int = Field(default_factory=lambda: int(time.time() * 1000))
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BrowserCapability(BaseModel):
    """Advertised browser automation capability with risk and verification contracts."""
    name: str
    skill_id: str
    risk_level: str = "LOW"
    permissions: List[str] = Field(default_factory=list)
    description: str = ""
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    output_schema: Dict[str, Any] = Field(default_factory=dict)
    verification_policy: str = "DEFAULT"


class BrowserSecurityEvent(BaseModel):
    """Audit log record for browser security violations and guardrail interventions."""
    event_id: str = Field(default_factory=lambda: f"sec_evt_{uuid.uuid4().hex[:8]}")
    event_type: BrowserSecurityEventType
    timestamp: int = Field(default_factory=lambda: int(time.time() * 1000))
    details: Dict[str, Any] = Field(default_factory=dict)
    severity: str = "MEDIUM"  # LOW, MEDIUM, HIGH, CRITICAL


class ExtractedPageContent(BaseModel):
    """Structured and bounded content extracted from a web page with trust labeling."""
    title: str = ""
    url: str = ""
    origin: str = ""
    main_text: str = ""
    links: List[Dict[str, str]] = Field(default_factory=list)
    forms: List[Dict[str, Any]] = Field(default_factory=list)
    interactive_controls: List[Dict[str, str]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    is_truncated: bool = False
    has_prompt_injection: bool = False
    detected_injection_patterns: List[str] = Field(default_factory=list)
    trust_level: TrustClassification = TrustClassification.WEB_CONTENT


class BrowserDownloadRecord(BaseModel):
    """Metadata record for a file downloaded through browser automation."""
    download_id: str = Field(default_factory=lambda: f"dl_{uuid.uuid4().hex[:8]}")
    filename: str
    file_path: str
    origin: str
    size_bytes: int = 0
    mime_type: str = "application/octet-stream"
    downloaded_at_ts: int = Field(default_factory=lambda: int(time.time() * 1000))
    is_executable: bool = False
    verified: bool = True
