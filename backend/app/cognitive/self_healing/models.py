"""Data models for Self-Healing Engineering Core."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RepairRiskTier(str, Enum):
    LOW = "LOW"            # Internal scoped bug fixes, reversible, single-component, passes tests -> Auto-eligible
    MEDIUM = "MEDIUM"      # Multi-component, dependencies, supervisor contracts -> Requires user approval
    PROTECTED = "PROTECTED" # Security, permissions, auth, emergency stop, secrets, DB reset -> Immutable / strictly protected


class RepairStatus(str, Enum):
    DETECTED = "DETECTED"
    DIAGNOSING = "DIAGNOSING"
    DIAGNOSED = "DIAGNOSED"
    VALIDATING = "VALIDATING"
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPLYING = "APPLYING"
    APPLIED = "APPLIED"
    VERIFYING = "VERIFYING"
    VERIFIED_SUCCESS = "VERIFIED_SUCCESS"
    ROLLED_BACK = "ROLLED_BACK"
    REJECTED = "REJECTED"
    FAILED = "FAILED"


class DefectSource(str, Enum):
    BACKEND_EXCEPTION = "BACKEND_EXCEPTION"
    TEST_FAILURE = "TEST_FAILURE"
    FRONTEND_TELEMETRY = "FRONTEND_TELEMETRY"
    VERIFICATION_FAILURE = "VERIFICATION_FAILURE"
    THREEJS_RUNTIME = "THREEJS_RUNTIME"
    API_ERROR = "API_ERROR"


class DefectReport(BaseModel):
    """Captured defect report with sanitized runtime telemetry."""
    defect_id: str
    source: DefectSource
    error_type: str
    message: str
    stack_trace: Optional[str] = None
    component: str = "unknown"
    reproduction_command: Optional[str] = None
    sanitized_context: Dict[str, Any] = Field(default_factory=dict)
    detected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    occurrence_count: int = 1


class DiagnosisHypothesis(BaseModel):
    """Structured LLM diagnosis output."""
    defect_id: str
    root_cause_hypothesis: str
    affected_files: List[str] = Field(default_factory=list)
    confidence_score: float = 0.0
    suggested_fix_summary: str
    reproduction_strategy: str
    risk_tier: RepairRiskTier = RepairRiskTier.LOW
    requires_approval: bool = False


class CodePatch(BaseModel):
    """Specific targeted file patch for defect resolution."""
    patch_id: str
    defect_id: str
    target_file: str
    original_snippet: str
    replacement_snippet: str
    reasoning: str
    test_command: Optional[str] = None


class RepairRecord(BaseModel):
    """Persistent audit log of a self-healing defect lifecycle."""
    repair_id: str
    defect_id: str
    status: RepairStatus
    risk_tier: RepairRiskTier
    defect_summary: str
    affected_files: List[str] = Field(default_factory=list)
    patches: List[CodePatch] = Field(default_factory=list)
    test_results: Dict[str, Any] = Field(default_factory=dict)
    rollback_available: bool = True
    backup_paths: Dict[str, str] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    error_message: Optional[str] = None
