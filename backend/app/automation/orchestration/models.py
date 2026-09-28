"""Authoritative Orchestration Models and Supervisor Decision Traces for Stage 5.5."""

import time
import uuid
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from backend.app.automation.models.errors import AutomationError


class OrchestrationState(str, Enum):
    """Authoritative lifecycle states for Supervisor Orchestration."""
    CREATED = "CREATED"
    PLANNING = "PLANNING"
    POLICY_EVALUATION = "POLICY_EVALUATION"
    WAITING_USER_CONSENT = "WAITING_USER_CONSENT"
    ACQUIRING_LEASE = "ACQUIRING_LEASE"
    GROUNDING = "GROUNDING"
    PRECONDITION_CHECK = "PRECONDITION_CHECK"
    DISPATCHING = "DISPATCHING"
    EXECUTING = "EXECUTING"
    OBSERVING = "OBSERVING"
    VERIFYING = "VERIFYING"
    REGROUNDING = "REGROUNDING"
    RETRYING = "RETRYING"
    RECOVERING = "RECOVERING"
    RECONCILING = "RECONCILING"
    PAUSED_USER_INTERFERENCE = "PAUSED_USER_INTERFERENCE"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    EMERGENCY_STOPPED = "EMERGENCY_STOPPED"


class ExecutionAuditRecord(BaseModel):
    """Immutable machine-readable execution journal entry for security, recovery, and audit tracking."""
    record_id: str = Field(default_factory=lambda: f"audit_{uuid.uuid4().hex[:12]}")
    task_id: str
    execution_id: str
    action_id: Optional[str] = None
    timestamp: float = Field(default_factory=time.time)
    state_transition: str
    worker: Optional[str] = None
    grounding_method: Optional[str] = None
    lease_status: Optional[str] = None
    policy_result: Optional[Dict[str, Any]] = None
    precondition_result: Optional[Dict[str, Any]] = None
    observation_reference: Optional[str] = None
    verification_result: Optional[Dict[str, Any]] = None
    recovery_event: Optional[str] = None
    final_state: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class SupervisorDecisionTrace(BaseModel):
    """Machine-readable audit record detailing every authorization, grounding, and verification decision."""
    trace_id: str = Field(default_factory=lambda: f"trace_{uuid.uuid4().hex[:12]}")
    task_id: str
    execution_id: str
    action_id: str
    requested_action: str
    preferred_grounding: str
    available_grounding: List[str] = Field(default_factory=list)
    selected_grounding: str
    why_selected: str
    policy_result: Dict[str, Any] = Field(default_factory=dict)
    lease_result: Dict[str, Any] = Field(default_factory=dict)
    precondition_result: Dict[str, Any] = Field(default_factory=dict)
    execution_result: Optional[Dict[str, Any]] = None
    observation_result: Optional[Dict[str, Any]] = None
    verification_result: Optional[Dict[str, Any]] = None
    retry_decision: Optional[str] = None
    final_state: str = OrchestrationState.CREATED.value
    timestamp: float = Field(default_factory=time.time)


class OrchestrationExecutionContext(BaseModel):
    """Full execution context tracking a single canonical action through the 12-step pipeline."""
    task_id: str
    execution_id: str
    action_id: str
    lease_id: str
    worker_id: str
    grounding_source: str
    grounding_level: str
    observation_id: Optional[str] = None
    precondition: str
    expected_postcondition: str
    timeout_ms: int = 5000
    max_retries: int = 3
    retry_count: int = 0
    consent_state: str = "NOT_REQUIRED"
    safety_decision: str = "APPROVED"
    execution_state: OrchestrationState = OrchestrationState.CREATED
    verification_state: Optional[str] = None


class OrchestrationTaskResult(BaseModel):
    """Final outcome summary for an orchestrated task."""
    task_id: str
    execution_id: str
    goal: str
    state: OrchestrationState
    is_success: bool
    decision_traces: List[SupervisorDecisionTrace] = Field(default_factory=list)
    executed_actions: List[Dict[str, Any]] = Field(default_factory=list)
    duration_ms: int = 0
    error: Optional[AutomationError] = None


# Type alias for convenience
OrchestrationResult = OrchestrationTaskResult
