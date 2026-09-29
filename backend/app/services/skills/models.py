"""Phase 7 Stage 7.1 — Skill Runtime Data Models and Typed Contracts."""

from enum import Enum
import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SkillCategory(str, Enum):
    """Taxonomy of supported capability domains."""
    SYSTEM = "SYSTEM"
    WINDOWS = "WINDOWS"
    FILES = "FILES"
    BROWSER = "BROWSER"
    APPLICATION = "APPLICATION"
    TEXT = "TEXT"
    VISION = "VISION"
    PERCEPTION = "PERCEPTION"
    KNOWLEDGE = "KNOWLEDGE"
    MEMORY = "MEMORY"
    LLM = "LLM"
    COMMUNICATION = "COMMUNICATION"
    MEDIA = "MEDIA"
    UTILITY = "UTILITY"


class SkillRiskLevel(str, Enum):
    """Standardized risk tiers for skills."""
    READ_ONLY = "READ_ONLY"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class SkillLifecycleState(str, Enum):
    """Lifecycle stages for registered skills."""
    REGISTERED = "REGISTERED"
    ENABLED = "ENABLED"
    DISABLED = "DISABLED"
    DEPRECATED = "DEPRECATED"


class SkillFailureCode(str, Enum):
    """Deterministic failure taxonomy for skill execution."""
    SKILL_NOT_FOUND = "SKILL_NOT_FOUND"
    INVALID_ARGUMENTS = "INVALID_ARGUMENTS"
    POLICY_DENIED = "POLICY_DENIED"
    CONSENT_REQUIRED = "CONSENT_REQUIRED"
    CONSENT_TIMEOUT = "CONSENT_TIMEOUT"
    LEASE_EXPIRED = "LEASE_EXPIRED"
    LEASE_UNAVAILABLE = "LEASE_UNAVAILABLE"
    GROUNDING_FAILED = "GROUNDING_FAILED"
    GROUNDING_AMBIGUOUS = "GROUNDING_AMBIGUOUS"
    GROUNDING_CONFLICT = "GROUNDING_CONFLICT"
    PRECONDITION_FAILED = "PRECONDITION_FAILED"
    ACTION_FAILED = "ACTION_FAILED"
    OBSERVATION_FAILED = "OBSERVATION_FAILED"
    VERIFICATION_FAILED = "VERIFICATION_FAILED"
    TIMEOUT = "TIMEOUT"
    WORKER_UNAVAILABLE = "WORKER_UNAVAILABLE"
    WORKER_CRASHED = "WORKER_CRASHED"
    RECOVERY_FAILED = "RECOVERY_FAILED"
    DAG_DEPENDENCY_FAILED = "DAG_DEPENDENCY_FAILED"
    TASK_LIMIT_REACHED = "TASK_LIMIT_REACHED"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"


class SkillDefinition(BaseModel):
    """Immutable, typed specification of an executable skill."""
    skill_id: str = Field(..., description="Unique immutable skill identifier (e.g., windows.open_application)")
    name: str = Field(..., description="Human-readable title")
    version: str = Field(default="1.0.0", description="Semantic version string")
    description: str = Field(..., description="Precise functional description for planning & discovery")
    category: SkillCategory = Field(default=SkillCategory.UTILITY)
    risk_level: SkillRiskLevel = Field(default=SkillRiskLevel.LOW)
    permissions: List[str] = Field(default_factory=list, description="Required platform permissions")
    input_schema: Dict[str, Any] = Field(default_factory=dict, description="JSON Schema for input arguments")
    output_schema: Dict[str, Any] = Field(default_factory=dict, description="JSON Schema for returned output data")
    preconditions: List[str] = Field(default_factory=list, description="Verifiable conditions before execution")
    postconditions: List[str] = Field(default_factory=list, description="Verifiable conditions after execution")
    grounding_requirements: List[str] = Field(default_factory=list, description="Required perception grounding tags")
    confirmation_policy: str = Field(default="ON_RISK", description="Consent policy: ALWAYS | NEVER | ON_RISK")
    timeout_policy_ms: int = Field(default=10000, description="Execution timeout in milliseconds")
    retry_policy: Dict[str, Any] = Field(default_factory=lambda: {"max_retries": 2, "backoff_ms": 300})
    recovery_policy: str = Field(default="REOBSERVE_AND_VERIFY", description="Recovery strategy on failure")
    verification_policy: str = Field(default="OBSERVED_STATE_MATCH", description="Verification strategy")
    supported_workers: List[str] = Field(default_factory=list, description="Worker identifiers capable of executing this")
    enabled: bool = Field(default=True)
    lifecycle_state: SkillLifecycleState = Field(default=SkillLifecycleState.ENABLED)
    audit_metadata: Dict[str, Any] = Field(default_factory=dict)

    @property
    def key(self) -> str:
        """Deterministic versioned identity key."""
        return f"{self.skill_id}@{self.version}"


class SkillInvocation(BaseModel):
    """Typed invocation payload for executing a skill."""
    task_id: str
    execution_id: str
    action_id: str
    skill_id: str
    skill_version: str = "1.0.0"
    arguments: Dict[str, Any] = Field(default_factory=dict)
    requested_by: str = "DAG_PLANNER"
    risk_level: SkillRiskLevel = SkillRiskLevel.LOW
    lease_id: Optional[str] = None
    created_at_ts: int = Field(default_factory=lambda: int(time.time() * 1000))


class SkillResult(BaseModel):
    """Execution result returned from a skill invocation."""
    is_success: bool
    skill_id: str
    skill_version: str
    action_id: str
    output_data: Dict[str, Any] = Field(default_factory=dict)
    observed_state: Optional[Dict[str, Any]] = None
    verification_passed: bool = False
    failure_code: Optional[SkillFailureCode] = None
    error_message: Optional[str] = None
    duration_ms: int = 0
    recovery_applied: bool = False
    reground_count: int = 0
    audit_trail: Dict[str, Any] = Field(default_factory=dict)


class SessionState(str, Enum):
    """Autonomous execution session state machine states."""
    INIT = "INIT"
    PLANNING = "PLANNING"
    DISPATCHING = "DISPATCHING"
    WAITING_CONSENT = "WAITING_CONSENT"
    EXECUTING = "EXECUTING"
    GROUNDING = "GROUNDING"
    VERIFYING = "VERIFYING"
    RECOVERING = "RECOVERING"
    REPLANNING = "REPLANNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    EMERGENCY_STOPPED = "EMERGENCY_STOPPED"


class SessionCheckpoint(BaseModel):
    """Persisted progression checkpoint after a successfully verified DAG node."""
    checkpoint_id: str
    task_id: str
    session_id: str
    node_id: str
    skill_id: str
    skill_version: str
    action_id: str
    completed_at_ts: int
    node_status: str
    result_summary: Dict[str, Any] = Field(default_factory=dict)
    verified: bool = True


class ExecutionSession(BaseModel):
    """Stateful execution session tracking autonomous multi-step execution."""
    session_id: str
    task_id: str
    plan_id: str
    goal: str
    state: SessionState = SessionState.INIT
    active_skill: Optional[str] = None
    active_node_id: Optional[str] = None
    lease_id: Optional[str] = None
    started_at_ts: int = Field(default_factory=lambda: int(time.time() * 1000))
    updated_at_ts: int = Field(default_factory=lambda: int(time.time() * 1000))
    elapsed_time_ms: int = 0
    retry_count: int = 0
    recovery_count: int = 0
    replan_count: int = 0
    checkpoints: List[SessionCheckpoint] = Field(default_factory=list)
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AutonomyLimits(BaseModel):
    """Configurable security boundaries preventing runaway loops."""
    max_task_duration_s: int = 300
    max_dag_nodes: int = 20
    max_retries_per_node: int = 3
    max_replans: int = 2
    max_concurrent_skills: int = 1
    max_recovery_attempts: int = 3
    max_tool_calls: int = 50


class SkillDiscoveryCandidate(BaseModel):
    """Discovery candidate returned for planner selection."""
    skill_id: str
    version: str
    name: str
    description: str
    category: SkillCategory
    risk_level: SkillRiskLevel
    required_permissions: List[str]
    required_inputs: List[str]
    supported_workers: List[str]
    verification_method: str
    score: float = 1.0
