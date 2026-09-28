"""Canonical Structured Automation Error Model."""

import time
from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class AutomationErrorCode(str, Enum):
    LEASE_MISSING = "LEASE_MISSING"
    LEASE_EXPIRED = "LEASE_EXPIRED"
    LEASE_REVOKED = "LEASE_REVOKED"
    LEASE_LIMIT_EXCEEDED = "LEASE_LIMIT_EXCEEDED"
    CAPABILITY_DENIED = "CAPABILITY_DENIED"
    CONSENT_REQUIRED = "CONSENT_REQUIRED"
    GROUNDING_FAILED = "GROUNDING_FAILED"
    GROUNDING_NOT_FOUND = "GROUNDING_NOT_FOUND"
    GROUNDING_AMBIGUOUS = "GROUNDING_AMBIGUOUS"
    GROUNDING_CONFIDENCE_LOW = "GROUNDING_CONFIDENCE_LOW"
    STALE_VISUAL_EVIDENCE = "STALE_VISUAL_EVIDENCE"
    INVALID_BOUNDING_BOX = "INVALID_BOUNDING_BOX"
    GROUNDING_CONFLICT = "GROUNDING_CONFLICT"
    PRECONDITION_FAILED = "PRECONDITION_FAILED"
    ACTION_TIMEOUT = "ACTION_TIMEOUT"
    ACTION_CANCELLED = "ACTION_CANCELLED"
    USER_INTERFERENCE = "USER_INTERFERENCE"
    VERIFICATION_FAILED = "VERIFICATION_FAILED"
    WORKER_UNAVAILABLE = "WORKER_UNAVAILABLE"
    POLICY_DENIED = "POLICY_DENIED"
    PLANNING_FAILED = "PLANNING_FAILED"
    EMERGENCY_STOPPED = "EMERGENCY_STOPPED"
    DUPLICATE_ACTION = "DUPLICATE_ACTION"


class AutomationError(BaseModel):
    """Canonical typed error envelope for automation policy and worker IPC."""
    error_code: AutomationErrorCode
    message: str
    action_id: Optional[str] = None
    task_id: Optional[str] = None
    lease_id: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: float = Field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return self.model_dump()
