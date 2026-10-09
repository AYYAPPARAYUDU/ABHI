"""Business Sectors, Autonomous Execution & Revenue Integrity Models (Phase 9 Stage 3)."""

from datetime import datetime, timezone
from enum import Enum, IntEnum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AutonomyLevel(IntEnum):
    """Execution Autonomy Boundaries."""
    LEVEL_0_OBSERVE = 0
    LEVEL_1_RESEARCH = 1
    LEVEL_2_PLAN = 2
    LEVEL_3_BUILD_TEST = 3
    LEVEL_4_EXECUTE_INTERNAL = 4
    LEVEL_5_EXTERNAL_APPROVAL = 5


class AutopilotMode(str, Enum):
    """Autopilot Execution Profiles."""
    MANUAL = "MANUAL"
    RESEARCH_AUTOPILOT = "RESEARCH_AUTOPILOT"
    LOCAL_BUILD_AUTOPILOT = "LOCAL_BUILD_AUTOPILOT"
    APPROVED_WORKFLOW_AUTOPILOT = "APPROVED_WORKFLOW_AUTOPILOT"


class ProjectStatus(str, Enum):
    """Lifecycle status of a business project."""
    RESEARCHING = "RESEARCHING"
    PLANNING = "PLANNING"
    BUILDING = "BUILDING"
    ACTIVE = "ACTIVE"
    PAUSED_APPROVAL = "PAUSED_APPROVAL"
    BLOCKED = "BLOCKED"
    COMPLETED = "COMPLETED"


class EvidenceProvenanceType(str, Enum):
    """Data provenance classification for business claims and research."""
    OBSERVED = "OBSERVED"
    SOURCED = "SOURCED"
    MEASURED = "MEASURED"
    ESTIMATED = "ESTIMATED"
    ASSUMED = "ASSUMED"
    UNKNOWN = "UNKNOWN"


class RevenueCategory(str, Enum):
    """Strict accounting categorization for financial integrity."""
    ACTUAL_RECEIVED = "ACTUAL_RECEIVED"
    GROSS_SALES = "GROSS_SALES"
    REFUNDS = "REFUNDS"
    OPERATING_EXPENSES = "OPERATING_EXPENSES"
    NET_RESULT = "NET_RESULT"
    PENDING_PAYMENTS = "PENDING_PAYMENTS"
    FORECAST = "FORECAST"
    POTENTIAL = "POTENTIAL"


class RevenueProvenance(str, Enum):
    """Authenticity level for reported revenue and numbers."""
    MEASURED = "MEASURED"
    ESTIMATED = "ESTIMATED"
    ASSUMED = "ASSUMED"
    NOT_AVAILABLE = "NOT_AVAILABLE"


class OpportunityDimensionScore(BaseModel):
    """Multi-dimensional evaluation of a business opportunity."""
    dimension: str
    score: float = Field(ge=0.0, le=100.0, description="Score between 0 and 100")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence between 0 and 1")
    provenance: EvidenceProvenanceType = EvidenceProvenanceType.ESTIMATED
    source_ref: Optional[str] = None
    rationale: str = ""


class BusinessOpportunity(BaseModel):
    """Researched business opportunity with grounded scoring."""
    id: str
    title: str
    sector_id: str
    summary: str
    total_score: float = Field(ge=0.0, le=100.0)
    dimensions: List[OpportunityDimensionScore] = Field(default_factory=list)
    sources: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    status: str = "EVALUATED"


class BusinessSector(BaseModel):
    """3D-mapped autonomous business sector."""
    id: str
    name: str
    description: str
    active_projects_count: int = 0
    color: str = "#06b6d4"
    icon: str = "briefcase"
    position_3d: Dict[str, float] = Field(default_factory=lambda: {"x": 0.0, "y": 0.0, "z": 0.0})


class BusinessMilestone(BaseModel):
    """Milestone within a business project."""
    id: str
    project_id: str
    title: str
    description: str = ""
    status: str = "PENDING"  # PENDING, IN_PROGRESS, COMPLETED, BLOCKED
    deliverable_ref: Optional[str] = None
    verified: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None


class BusinessTask(BaseModel):
    """Executable task linked to a milestone."""
    id: str
    project_id: str
    milestone_id: str
    title: str
    status: str = "PENDING"  # PENDING, ACTIVE, COMPLETED, FAILED, WAITING_APPROVAL
    assigned_agent: str = "Supervisor"
    capability_required: str = "research"
    output_ref: Optional[str] = None
    result_summary: Optional[str] = None


class BusinessEvidence(BaseModel):
    """Documented evidence backing business claims and findings."""
    id: str
    project_id: str
    claim: str
    source: str
    provenance_type: EvidenceProvenanceType = EvidenceProvenanceType.SOURCED
    confidence: float = 0.8
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class BusinessExpense(BaseModel):
    """Operating expense tracked for real net result calculation."""
    id: str
    project_id: str
    description: str
    amount_usd: float
    category: str = "Compute / API"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class BusinessRevenueRecord(BaseModel):
    """Financial record with mandatory provenance declaration."""
    id: str
    project_id: str
    category: RevenueCategory
    amount_usd: float
    provenance: RevenueProvenance
    reference_doc: Optional[str] = None
    notes: str = ""
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class BusinessApproval(BaseModel):
    """Policy-gated action requiring explicit user authorization."""
    id: str
    project_id: str
    action_description: str
    risk_tier: str = "Tier 3"
    required_permission: str = "SPEND_FUNDS | EXTERNAL_PUBLISH"
    estimated_cost_usd: float = 0.0
    status: str = "PENDING"  # PENDING, APPROVED, REJECTED
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    resolved_at: Optional[str] = None


class BusinessProject(BaseModel):
    """Persisted business project with traceable milestones and ledger."""
    id: str
    sector_id: str
    name: str
    objective: str
    autonomy_level: AutonomyLevel = AutonomyLevel.LEVEL_3_BUILD_TEST
    autopilot_mode: AutopilotMode = AutopilotMode.LOCAL_BUILD_AUTOPILOT
    status: ProjectStatus = ProjectStatus.RESEARCHING
    budget_limit_usd: float = 50.0
    spent_usd: float = 0.0
    target_completion: Optional[str] = None
    next_milestone_id: Optional[str] = None
    milestones: List[BusinessMilestone] = Field(default_factory=list)
    tasks: List[BusinessTask] = Field(default_factory=list)
    evidences: List[BusinessEvidence] = Field(default_factory=list)
    expenses: List[BusinessExpense] = Field(default_factory=list)
    revenue_records: List[BusinessRevenueRecord] = Field(default_factory=list)
    approvals: List[BusinessApproval] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class BusinessProjectCreateRequest(BaseModel):
    """Request payload to initiate a new business project."""
    sector_id: str
    name: str
    objective: str
    autonomy_level: AutonomyLevel = AutonomyLevel.LEVEL_3_BUILD_TEST
    autopilot_mode: AutopilotMode = AutopilotMode.LOCAL_BUILD_AUTOPILOT
    budget_limit_usd: float = 50.0


class BusinessProjectUpdateRequest(BaseModel):
    """Request payload to update project settings or autonomy."""
    name: Optional[str] = None
    objective: Optional[str] = None
    autonomy_level: Optional[AutonomyLevel] = None
    autopilot_mode: Optional[AutopilotMode] = None
    status: Optional[ProjectStatus] = None
    budget_limit_usd: Optional[float] = None


class OpportunityEvaluateRequest(BaseModel):
    """Request to score a potential business opportunity."""
    sector_id: str
    title: str
    concept_description: str
    target_audience: str = "Developers and Creators"
    target_pricing_usd: float = 29.0


class BusinessExecuteStepRequest(BaseModel):
    """Request to autonomously execute the next valid milestone or task."""
    override_stop_conditions: bool = False


class FinancialSummaryResponse(BaseModel):
    """Evidence-backed financial overview across all business projects."""
    actual_revenue_received_usd: float = 0.0
    gross_sales_usd: float = 0.0
    refunds_usd: float = 0.0
    operating_expenses_usd: float = 0.0
    net_result_usd: float = 0.0
    pending_payments_usd: float = 0.0
    forecast_revenue_usd: float = 0.0
    potential_revenue_usd: float = 0.0
    revenue_provenance: RevenueProvenance = RevenueProvenance.NOT_AVAILABLE
    has_verified_financial_connection: bool = False
    disclaimer: str = "Forecast only — not actual earnings. No verified external banking or payment gateway connected."
