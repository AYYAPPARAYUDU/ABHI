"""Phase 7 Stage 7.4 — Long-Horizon Workflow Models, Goal Contracts & Plan Versioning."""

from enum import Enum
import time
import uuid
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field

from backend.app.services.skills.models import SkillRiskLevel


class AutonomyLevel(str, Enum):
    """Bounded autonomy levels governing execution capability scope."""
    LEVEL_0_OBSERVE_ONLY = "LEVEL_0"      # Passive inspection / perception only
    LEVEL_1_READ_ONLY = "LEVEL_1"         # Non-mutating read actions (files, web text, OCR)
    LEVEL_2_LOCAL_LOW_RISK = "LEVEL_2"    # Low-risk local OS actions (launch app, focus window)
    LEVEL_3_MULTI_STEP_LOCAL = "LEVEL_3"  # Multi-step automated workflows inside local applications
    LEVEL_4_CROSS_APP = "LEVEL_4"         # Multi-step cross-application workflows (Files -> App -> Browser)
    LEVEL_5_EXTERNAL_HIGH_RISK = "LEVEL_5" # High-risk external actions (submissions, sensitive transfers)


class ConstraintType(str, Enum):
    """Taxonomy of extracted goal constraints."""
    LOCATION = "LOCATION"
    FILE_TYPE = "FILE_TYPE"
    APPLICATION = "APPLICATION"
    ALLOWED_DOMAINS = "ALLOWED_DOMAINS"
    PROHIBITED_ACTION = "PROHIBITED_ACTION"
    PRIVACY = "PRIVACY"
    TIMEOUT_LIMIT = "TIMEOUT_LIMIT"
    RESOURCE_LIMIT = "RESOURCE_LIMIT"
    OUTPUT_DESTINATION = "OUTPUT_DESTINATION"


class GoalConstraint(BaseModel):
    """A structured constraint extracted from the user's natural language goal."""
    constraint_type: ConstraintType
    key: str
    value: Any
    is_strict: bool = True
    description: Optional[str] = None


class GoalContract(BaseModel):
    """Immutable contract capturing the original user request and verified constraints."""
    goal_id: str = Field(default_factory=lambda: f"goal_{uuid.uuid4().hex[:12]}")
    original_request: str
    normalized_goal: str
    constraints: List[GoalConstraint] = Field(default_factory=list)
    required_outcome: str
    prohibited_actions: List[str] = Field(default_factory=list)
    success_criteria: List[str] = Field(default_factory=list)
    risk_level: SkillRiskLevel = SkillRiskLevel.LOW
    autonomy_level: AutonomyLevel = AutonomyLevel.LEVEL_3_MULTI_STEP_LOCAL
    created_at_ts: int = Field(default_factory=lambda: int(time.time() * 1000))


class SuccessContract(BaseModel):
    """Formal verifiable criteria determining overall goal completion."""
    success_id: str = Field(default_factory=lambda: f"succ_{uuid.uuid4().hex[:12]}")
    goal_id: str
    required_state: Dict[str, Any] = Field(default_factory=dict)
    observable_conditions: List[str] = Field(default_factory=list)
    verification_method: str = "COMPOSITE_OBSERVATION"
    evidence_requirements: List[str] = Field(default_factory=list)


class MilestoneStatus(str, Enum):
    """Progression state of an execution milestone."""
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    BLOCKED = "BLOCKED"


class Milestone(BaseModel):
    """A discrete, observable sub-goal within a long-horizon workflow plan."""
    milestone_id: str
    title: str
    description: str
    node_ids: List[str] = Field(default_factory=list)
    observable_success_condition: str
    status: MilestoneStatus = MilestoneStatus.PENDING
    completed_at_ts: Optional[int] = None


class PlanNodeStatus(str, Enum):
    """Node execution status in long-horizon plans."""
    PENDING = "PENDING"
    READY = "READY"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"
    BLOCKED = "BLOCKED"


class PlanNode(BaseModel):
    """A single executable step in a workflow plan."""
    node_id: str
    skill_id: str
    skill_version: str = "1.0.0"
    title: str
    inputs: Dict[str, Any] = Field(default_factory=dict)
    dependencies: List[str] = Field(default_factory=list)
    preconditions: List[str] = Field(default_factory=list)
    expected_output: Dict[str, Any] = Field(default_factory=dict)
    postconditions: List[str] = Field(default_factory=list)
    risk_level: SkillRiskLevel = SkillRiskLevel.LOW
    timeout_ms: int = 15000
    retry_policy: Dict[str, Any] = Field(default_factory=lambda: {"max_retries": 2, "backoff_ms": 300})
    checkpoint_policy: str = "ON_SUCCESS"
    status: PlanNodeStatus = PlanNodeStatus.PENDING
    result_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    execution_duration_ms: int = 0


class WorkflowPlan(BaseModel):
    """An immutable, versioned DAG plan pursuing a GoalContract."""
    plan_id: str = Field(default_factory=lambda: f"plan_{uuid.uuid4().hex[:12]}")
    goal_id: str
    version: int = 1
    nodes: Dict[str, PlanNode] = Field(default_factory=dict)
    milestones: List[Milestone] = Field(default_factory=list)
    success_contract: SuccessContract
    risk_summary: str = "LOW"
    estimated_cost: float = 1.0
    estimated_duration_ms: int = 5000
    created_at_ts: int = Field(default_factory=lambda: int(time.time() * 1000))
    is_active: bool = True
    superseded_by_plan_id: Optional[str] = None
    replan_reason: Optional[str] = None

    def get_runnable_nodes(self) -> List[PlanNode]:
        """Return nodes whose prerequisite dependencies have successfully completed."""
        runnable = []
        for node in self.nodes.values():
            if node.status != PlanNodeStatus.PENDING:
                continue
            deps_met = all(
                self.nodes[dep_id].status == PlanNodeStatus.COMPLETED
                for dep_id in node.dependencies
                if dep_id in self.nodes
            )
            if deps_met:
                runnable.append(node)
        return runnable


class WorldStateFact(BaseModel):
    """A structured, verifiable atomic truth about current environment state."""
    key: str
    value: Any
    source: str = "OBSERVATION"  # UIA | DOM | FS | PROCESS | VISION | SYSTEM
    timestamp: int = Field(default_factory=lambda: int(time.time() * 1000))
    confidence: float = 1.0
    verified: bool = True


class WorkflowWorldState(BaseModel):
    """Structured collection of active environment facts with freshness tracking."""
    facts: Dict[str, WorldStateFact] = Field(default_factory=dict)
    last_updated_ts: int = Field(default_factory=lambda: int(time.time() * 1000))
    freshness_threshold_ms: int = 30000

    def set_fact(self, key: str, value: Any, source: str = "OBSERVATION", verified: bool = True) -> None:
        now_ts = int(time.time() * 1000)
        self.facts[key] = WorldStateFact(
            key=key,
            value=value,
            source=source,
            timestamp=now_ts,
            verified=verified
        )
        self.last_updated_ts = now_ts

    def get_fact(self, key: str, default: Any = None) -> Any:
        fact = self.facts.get(key)
        if not fact:
            return default
        # Check freshness
        now_ts = int(time.time() * 1000)
        if (now_ts - fact.timestamp) > self.freshness_threshold_ms:
            return default  # Stale fact
        return fact.value

    def is_stale(self, key: str) -> bool:
        fact = self.facts.get(key)
        if not fact:
            return True
        now_ts = int(time.time() * 1000)
        return (now_ts - fact.timestamp) > self.freshness_threshold_ms


class GoalProgressStatus(str, Enum):
    """Status evaluation of progress toward goal."""
    PROGRESSING = "PROGRESSING"
    BLOCKED = "BLOCKED"
    RECOVERABLE = "RECOVERABLE"
    REPLAN_REQUIRED = "REPLAN_REQUIRED"
    COMPLETED = "COMPLETED"
    PARTIALLY_COMPLETED = "PARTIALLY_COMPLETED"
    FAILED = "FAILED"


class GoalProgressEvaluation(BaseModel):
    """Periodic evaluation report assessing progress toward the GoalContract."""
    status: GoalProgressStatus
    completed_milestones: List[str] = Field(default_factory=list)
    active_milestone: Optional[str] = None
    completed_nodes_count: int = 0
    total_nodes_count: int = 0
    progress_percentage: float = 0.0
    blocked_reason: Optional[str] = None
    replan_needed: bool = False
    explanation: str = "Execution progressing normally."


class HumanHandoffReason(str, Enum):
    """Categorized root causes necessitating operator intervention."""
    AUTHENTICATION_REQUIRED = "AUTHENTICATION_REQUIRED"
    CAPTCHA_REQUIRED = "CAPTCHA_REQUIRED"
    CONSENT_REQUIRED = "CONSENT_REQUIRED"
    AMBIGUOUS_TARGET = "AMBIGUOUS_TARGET"
    POLICY_BLOCKED = "POLICY_BLOCKED"
    UNKNOWN_APPLICATION_STATE = "UNKNOWN_APPLICATION_STATE"
    RESOURCE_EXHAUSTED = "RESOURCE_EXHAUSTED"


class HumanHandoffRequest(BaseModel):
    """Structured request for human operator resolution."""
    handoff_id: str = Field(default_factory=lambda: f"handoff_{uuid.uuid4().hex[:12]}")
    task_id: str
    goal_id: str
    reason: HumanHandoffReason
    message: str
    completed_steps: int = 0
    total_steps: int = 0
    next_action_description: str
    created_at_ts: int = Field(default_factory=lambda: int(time.time() * 1000))
    resolved: bool = False
    resolution_notes: Optional[str] = None


class DataClassification(str, Enum):
    """Classification of data moving across application boundaries."""
    LOCAL_FILE = "LOCAL_FILE"
    PRIVATE_DATA = "PRIVATE_DATA"
    PUBLIC_WEB = "PUBLIC_WEB"
    USER_INPUT = "USER_INPUT"
    GENERATED_SUMMARY = "GENERATED_SUMMARY"


class DataFlowRecord(BaseModel):
    """Audit log tracking cross-application and cross-boundary data transfer."""
    transfer_id: str = Field(default_factory=lambda: f"flow_{uuid.uuid4().hex[:12]}")
    task_id: str
    source_application: str
    source_object: str
    data_classification: DataClassification
    destination_application: str
    transfer_reason: str
    policy_decision: str = "ALLOWED"  # ALLOWED | BLOCKED | CONSENT_REQUIRED
    timestamp: int = Field(default_factory=lambda: int(time.time() * 1000))


class WorkflowJournalEventType(str, Enum):
    """Taxonomy of workflow execution journal events."""
    GOAL_CREATED = "GOAL_CREATED"
    PLAN_CREATED = "PLAN_CREATED"
    PLAN_APPROVED = "PLAN_APPROVED"
    NODE_STARTED = "NODE_STARTED"
    NODE_VERIFIED = "NODE_VERIFIED"
    MILESTONE_COMPLETED = "MILESTONE_COMPLETED"
    REPLAN_TRIGGERED = "REPLAN_TRIGGERED"
    NEW_PLAN_CREATED = "NEW_PLAN_CREATED"
    RECOVERY_ATTEMPTED = "RECOVERY_ATTEMPTED"
    HUMAN_HANDOFF_REQUESTED = "HUMAN_HANDOFF_REQUESTED"
    TASK_PAUSED = "TASK_PAUSED"
    TASK_RESUMED = "TASK_RESUMED"
    TASK_CANCELLED = "TASK_CANCELLED"
    TASK_COMPLETED = "TASK_COMPLETED"
    TASK_FAILED = "TASK_FAILED"


class WorkflowJournalEntry(BaseModel):
    """Immutable audit trail entry for long-horizon workflow progression."""
    entry_id: str = Field(default_factory=lambda: f"jnl_{uuid.uuid4().hex[:12]}")
    task_id: str
    goal_id: str
    plan_id: str
    plan_version: int
    event_type: WorkflowJournalEventType
    details: Dict[str, Any] = Field(default_factory=dict)
    timestamp: int = Field(default_factory=lambda: int(time.time() * 1000))


class WorkflowTaskPriority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"


class WorkflowTaskQueueItem(BaseModel):
    """Scheduled task item in the bounded autonomous workflow queue."""
    task_id: str
    goal_contract: GoalContract
    priority: WorkflowTaskPriority = WorkflowTaskPriority.NORMAL
    status: str = "PENDING"  # PENDING | RUNNING | PAUSED | BLOCKED | COMPLETED | FAILED | CANCELLED
    created_at_ts: int = Field(default_factory=lambda: int(time.time() * 1000))
    started_at_ts: Optional[int] = None
    completed_at_ts: Optional[int] = None
    plan_id: Optional[str] = None
    current_version: int = 1


class PlanSimulationResult(BaseModel):
    """Dry-run simulation analysis of a generated workflow plan."""
    plan_id: str
    node_count: int
    estimated_duration_ms: int
    risk_levels: List[str]
    skills_involved: List[str]
    cross_application_transitions: int
    required_permissions: List[str]
    potential_consent_points: List[str]
    estimated_cost: float
    feasible: bool = True
    warnings: List[str] = Field(default_factory=list)
