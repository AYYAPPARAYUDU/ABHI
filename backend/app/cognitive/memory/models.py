"""Domain Models & Typed Contracts for Personal & Procedural Memory (Stage 7.5)."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MemoryType(str, Enum):
    """Explicit classifications of memory systems."""
    WORKING = "WORKING"
    EPISODIC = "EPISODIC"
    SEMANTIC = "SEMANTIC"
    PREFERENCE = "PREFERENCE"
    PROCEDURAL_CANDIDATE = "PROCEDURAL_CANDIDATE"
    PROCEDURAL = "PROCEDURAL"
    KNOWLEDGE = "KNOWLEDGE"


class MemoryStatus(str, Enum):
    """Lifecycle state of a persistent memory."""
    CANDIDATE = "CANDIDATE"
    ACTIVE = "ACTIVE"
    STALE = "STALE"
    SUPERSEDED = "SUPERSEDED"
    REJECTED = "REJECTED"
    DELETED = "DELETED"
    DEPRECATED = "DEPRECATED"


class PrivacyClassification(str, Enum):
    """Privacy governance classifications."""
    PUBLIC = "PUBLIC"
    PERSONAL = "PERSONAL"
    PRIVATE = "PRIVATE"
    SENSITIVE = "SENSITIVE"
    RESTRICTED = "RESTRICTED"


class MemorySource(str, Enum):
    """Provenance and origin of memory content."""
    USER_EXPLICIT = "USER_EXPLICIT"
    USER_CONFIRMED = "USER_CONFIRMED"
    EXECUTION_RESULT = "EXECUTION_RESULT"
    WORKFLOW_RESULT = "WORKFLOW_RESULT"
    DOCUMENT = "DOCUMENT"
    RAG = "RAG"
    SYSTEM_OBSERVED = "SYSTEM_OBSERVED"


class DeletionType(str, Enum):
    """Deletion semantics."""
    SOFT_DELETE = "SOFT_DELETE"
    HARD_DELETE = "HARD_DELETE"
    PRIVACY_ERASURE = "PRIVACY_ERASURE"


class AuthorityLevel(int, Enum):
    """Hierarchical authority levels for security and decision making."""
    SYSTEM_SECURITY_POLICY = 100
    CURRENT_USER_INSTRUCTION = 90
    CURRENT_GOAL_CONTRACT = 80
    VERIFIED_WORLD_STATE = 70
    USER_CONFIRMED_MEMORY = 60
    HIGH_CONFIDENCE_MEMORY = 50
    UNCONFIRMED_MEMORY = 30
    UNTRUSTED_EXTERNAL_CONTENT = 10


class MemoryContract(BaseModel):
    """Base typed contract for all persistent memory records."""
    memory_id: str
    memory_type: MemoryType
    title: str
    content: Dict[str, Any] = Field(default_factory=dict)
    summary: str
    source: MemorySource
    source_reference: Optional[str] = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    privacy_classification: PrivacyClassification = PrivacyClassification.PERSONAL
    status: MemoryStatus = MemoryStatus.ACTIVE
    version: str = "1.0.0"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None
    last_accessed_at: Optional[datetime] = None
    confirmed_by_user: bool = False
    tags: List[str] = Field(default_factory=list)
    lineage: Dict[str, Any] = Field(default_factory=dict)


class WorkingMemory(BaseModel):
    """Temporary execution context scoped to a specific task run."""
    task_id: str
    current_goal: str
    active_plan_id: Optional[str] = None
    active_node_id: Optional[str] = None
    current_application: Optional[str] = None
    current_browser_url: Optional[str] = None
    focused_window_title: Optional[str] = None
    active_milestone_id: Optional[str] = None
    selected_files: List[str] = Field(default_factory=list)
    recent_observations: List[Dict[str, Any]] = Field(default_factory=list)
    ephemeral_variables: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ttl_seconds: int = 1800  # 30 minutes


class EpisodicMemoryModel(BaseModel):
    """Structured record of a completed task or workflow episode."""
    memory_id: str
    task_id: Optional[str] = None
    execution_id: Optional[str] = None
    goal_summary: str
    plan_summary: str
    skill_sequence: List[str] = Field(default_factory=list)
    outcome: str = "SUCCESS"  # SUCCESS, FAILED, PARTIAL
    duration_ms: int = 0
    recovery_count: int = 0
    verification_result: Dict[str, Any] = Field(default_factory=dict)
    privacy_classification: PrivacyClassification = PrivacyClassification.PERSONAL
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SemanticMemoryModel(BaseModel):
    """Stable verified fact about the environment or domain."""
    key: str
    value: Any
    category: str = "general"
    source: MemorySource = MemorySource.SYSTEM_OBSERVED
    confidence: float = 0.8
    status: MemoryStatus = MemoryStatus.ACTIVE
    last_confirmed: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserPreferenceModel(BaseModel):
    """Dedicated structured user preference representation."""
    preference_id: str
    category: str  # e.g., ui, editor, directory, language, notification, workflow
    key: str
    value: Any
    confidence: float = 1.0
    source: MemorySource = MemorySource.USER_EXPLICIT
    confirmed_by_user: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: Optional[datetime] = None


class ProcedureParameter(BaseModel):
    """Typed parameter definition for a reusable procedure."""
    name: str
    type_name: str = "string"
    description: str = ""
    default_value: Optional[Any] = None
    required: bool = True


class ProcedureStep(BaseModel):
    """Deterministic step in a procedural memory workflow."""
    step_index: int
    skill_id: str
    action_name: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    expected_outcome: str = ""
    recovery_skill_id: Optional[str] = None
    timeout_seconds: float = 30.0


class ProcedurePrecondition(BaseModel):
    """Prerequisites that must hold before procedure execution."""
    required_apps: List[str] = Field(default_factory=list)
    required_skills: List[str] = Field(default_factory=list)
    required_permissions: List[str] = Field(default_factory=list)
    required_state: Dict[str, Any] = Field(default_factory=dict)


class ProcedurePostcondition(BaseModel):
    """Expected outcome and verification assertions."""
    expected_final_state: Dict[str, Any] = Field(default_factory=dict)
    artifacts: List[str] = Field(default_factory=list)
    verification_evidence: List[str] = Field(default_factory=list)


class ProcedureMetrics(BaseModel):
    """Historical reliability metrics for a procedure."""
    invocation_count: int = 0
    success_count: int = 0
    failure_count: int = 0
    success_rate: float = 1.0
    average_duration_ms: float = 0.0
    recovery_rate: float = 0.0
    replan_rate: float = 0.0
    last_used_at: Optional[datetime] = None


class ProcedureModel(BaseModel):
    """Full procedural memory model representing a reusable validated workflow."""
    procedure_id: str
    name: str
    description: str
    trigger_conditions: List[str] = Field(default_factory=list)
    required_skills: List[str] = Field(default_factory=list)
    parameters: List[ProcedureParameter] = Field(default_factory=list)
    steps: List[ProcedureStep] = Field(default_factory=list)
    preconditions: ProcedurePrecondition = Field(default_factory=ProcedurePrecondition)
    postconditions: ProcedurePostcondition = Field(default_factory=ProcedurePostcondition)
    recovery_rules: List[Dict[str, Any]] = Field(default_factory=list)
    metrics: ProcedureMetrics = Field(default_factory=ProcedureMetrics)
    version: str = "1.0.0"
    confidence: float = 0.95
    status: MemoryStatus = MemoryStatus.ACTIVE
    derived_from: Optional[str] = None
    reason_for_change: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProcedureVersionRecord(BaseModel):
    """Immutable snapshot of a procedure version for lineage and audit."""
    version_id: str
    procedure_id: str
    version: str
    derived_from: Optional[str] = None
    reason_for_change: Optional[str] = None
    snapshot: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MemoryConflict(BaseModel):
    """Represents a detected contradiction between memory records."""
    conflict_id: str
    memory_id_a: str
    memory_id_b: str
    key: str
    candidate_a: Dict[str, Any]
    candidate_b: Dict[str, Any]
    status: str = "UNRESOLVED"  # UNRESOLVED, RESOLVED, DISMISSED
    resolution: Optional[str] = None
    detected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MemoryAuditEntry(BaseModel):
    """Audit log entry for memory operations."""
    audit_id: str
    event_type: str  # created, updated, confirmed, rejected, expired, deleted, promoted, deprecated, conflict
    memory_id: Optional[str] = None
    procedure_id: Optional[str] = None
    details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MemoryContextBudget(BaseModel):
    """Budget constraints for memory retrieval injected into planners."""
    max_records: int = 10
    max_characters: int = 4000
    max_tokens: int = 1000


class MemoryRetrievalQuery(BaseModel):
    """Query specification for task-aware memory retrieval."""
    goal: str
    current_context: Optional[str] = None
    current_app: Optional[str] = None
    language: str = "en"
    types: Optional[List[MemoryType]] = None
    privacy_limit: PrivacyClassification = PrivacyClassification.RESTRICTED
    min_confidence: float = 0.4
    budget: MemoryContextBudget = Field(default_factory=MemoryContextBudget)


class MemoryRetrievalResult(BaseModel):
    """Packaged retrieval result ready for planner consumption."""
    memories: List[MemoryContract] = Field(default_factory=list)
    relevant_procedures: List[ProcedureModel] = Field(default_factory=list)
    formatted_context_for_planner: str = ""
    total_records: int = 0
    estimated_tokens: int = 0
