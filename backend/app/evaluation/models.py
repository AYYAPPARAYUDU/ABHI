"""Data Models, Schemas and Enums for Phase 6.7 LLM Evaluation, Research & Evolution Lab."""

from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class ScheduleType(str, Enum):
    QUICK_DAILY = "QUICK_DAILY"
    STANDARD_DAILY = "STANDARD_DAILY"
    DEEP_MANUAL = "DEEP_MANUAL"


class EvaluationStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ModelPromotionState(str, Enum):
    PRODUCTION = "PRODUCTION"
    CANDIDATE = "CANDIDATE"
    ARCHIVED = "ARCHIVED"
    REJECTED = "REJECTED"
    QUARANTINED = "QUARANTINED"


class SourceTier(str, Enum):
    TIER_A = "TIER_A"  # Peer-reviewed, official specifications, primary research
    TIER_B = "TIER_B"  # Recognized indexes, institutional archives
    TIER_C = "TIER_C"  # Secondary technical sources, blog posts, community notes


class ResearchIngestionStatus(str, Enum):
    DISCOVERED = "DISCOVERED"
    VALIDATED = "VALIDATED"
    INGESTED = "INGESTED"
    QUARANTINED = "QUARANTINED"
    IGNORED = "IGNORED"


class RegressionSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    MAJOR = "MAJOR"
    MINOR = "MINOR"
    IMPROVEMENT = "IMPROVEMENT"
    UNCHANGED = "UNCHANGED"


class CandidateType(str, Enum):
    RAG_ONLY = "RAG_ONLY"
    PROMPT_CONFIG = "PROMPT_CONFIG"
    ADAPTER_LORA = "ADAPTER_LORA"
    FINE_TUNED = "FINE_TUNED"
    MODEL_REPLACEMENT = "MODEL_REPLACEMENT"


class CapabilityVector(BaseModel):
    reasoning: float = Field(default=0.0, description="Reasoning & logic score [0-1]")
    knowledge: float = Field(default=0.0, description="Factual knowledge accuracy [0-1]")
    coding: float = Field(default=0.0, description="Code generation & debugging score [0-1]")
    instruction_following: float = Field(default=0.0, description="Constraint & format adherence [0-1]")
    multilingual: float = Field(default=0.0, description="Cross-lingual fidelity [0-1]")
    rag: float = Field(default=0.0, description="Retrieval-augmented grounding score [0-1]")
    tool_use: float = Field(default=0.0, description="Tool selection & parameter accuracy [0-1]")
    safety: float = Field(default=0.0, description="Safety policy & boundary compliance [0-1]")
    groundedness: float = Field(default=0.0, description="Hallucination avoidance & grounding [0-1]")
    latency_ms: float = Field(default=0.0, description="Average token generation latency in ms")
    resource_efficiency: float = Field(default=0.0, description="Resource efficiency score [0-1]")


class MultilingualScores(BaseModel):
    en: float = Field(default=0.0, description="English fidelity score")
    te: float = Field(default=0.0, description="Telugu fidelity score")
    hi: float = Field(default=0.0, description="Hindi fidelity score")
    ta: float = Field(default=0.0, description="Tamil fidelity score")
    mixed: float = Field(default=0.0, description="Code-switched / mixed language fidelity")


class RAGMetrics(BaseModel):
    retrieval_relevance: float = Field(default=0.0, description="Precision of retrieved chunks")
    context_precision: float = Field(default=0.0, description="Context ranking precision")
    context_recall: float = Field(default=0.0, description="Coverage of necessary facts")
    answer_groundedness: float = Field(default=0.0, description="Absence of ungrounded hallucinations")
    citation_correctness: float = Field(default=0.0, description="Accuracy of source attribution")


class SafetyMetrics(BaseModel):
    prompt_injection_resistance: float = Field(default=0.0, description="Immunity to adversarial injection")
    tool_boundary_adherence: float = Field(default=0.0, description="Strict refusal of unauthorized tools")
    privacy_leakage_score: float = Field(default=0.0, description="Protection of private credentials/pii")
    destructive_action_refusal: float = Field(default=0.0, description="Refusal of dangerous commands")
    execution_boundary_adherence: float = Field(default=0.0, description="Adherence to supervisor sandbox")


class ResourceUsageSnapshot(BaseModel):
    cpu_percent: float = Field(default=0.0)
    memory_mb: float = Field(default=0.0)
    gpu_memory_mb: float = Field(default=0.0)
    duration_seconds: float = Field(default=0.0)


class RegressionAlert(BaseModel):
    severity: RegressionSeverity = Field(default=RegressionSeverity.UNCHANGED)
    category: str = Field(..., description="Capability or Safety category affected")
    previous_score: float = Field(default=0.0)
    current_score: float = Field(default=0.0)
    delta: float = Field(default=0.0)
    benchmark: str = Field(default="INTERNAL_SUITE")
    sample_count: int = Field(default=0)
    message: str = Field(default="")


class EvaluationResultItem(BaseModel):
    benchmark: str
    task: str
    language: str = "en"
    metric: str
    score: float
    sample_count: int
    details: Optional[Dict[str, Any]] = None


class EvaluationRun(BaseModel):
    run_id: str
    day_index: int = 1
    scheduled_time: str
    start_time: str
    end_time: Optional[str] = None
    status: EvaluationStatus = EvaluationStatus.PENDING
    model_id: str
    model_version: str
    schedule_type: ScheduleType = ScheduleType.QUICK_DAILY
    capabilities: CapabilityVector = Field(default_factory=CapabilityVector)
    multilingual: MultilingualScores = Field(default_factory=MultilingualScores)
    rag_metrics: RAGMetrics = Field(default_factory=RAGMetrics)
    safety_metrics: SafetyMetrics = Field(default_factory=SafetyMetrics)
    resource_metrics: ResourceUsageSnapshot = Field(default_factory=ResourceUsageSnapshot)
    regressions: List[RegressionAlert] = Field(default_factory=list)
    improvements: List[RegressionAlert] = Field(default_factory=list)
    dataset_snapshot: str = "ABHI_CORE_V1"
    research_snapshot: str = "CORPUS_LATEST"
    report_path: Optional[str] = None
    error: Optional[str] = None


class ResearchPaper(BaseModel):
    source_id: str
    title: str
    authors: List[str] = Field(default_factory=list)
    publication_date: str
    retrieval_date: str
    url: Optional[str] = None
    doi: Optional[str] = None
    arxiv_id: Optional[str] = None
    openalex_id: Optional[str] = None
    tier: SourceTier = SourceTier.TIER_A
    topics: List[str] = Field(default_factory=list)
    abstract: str = ""
    license: Optional[str] = "Open-Access / CC-BY"
    ingestion_status: ResearchIngestionStatus = ResearchIngestionStatus.DISCOVERED
    hash: str
    quarantined: bool = False
    quarantine_reason: Optional[str] = None


class ModelRecord(BaseModel):
    model_id: str
    model_name: str
    version: str
    source: str = "Ollama"
    quantization: str = "Q4_K_M"
    context_length: int = 8192
    runtime: str = "Ollama-Local"
    hash_ref: str
    created_at: str
    evaluation_summary: Dict[str, float] = Field(default_factory=dict)
    promotion_state: ModelPromotionState = ModelPromotionState.PRODUCTION
    is_production: bool = False
    rollback_target_id: Optional[str] = None


class ExperimentRecord(BaseModel):
    experiment_id: str
    hypothesis: str
    candidate_type: CandidateType = CandidateType.RAG_ONLY
    base_model_id: str
    candidate_model_id: str
    dataset_snapshot: str = "ABHI_EVAL_V1"
    status: str = "EVALUATING"
    results: Dict[str, Any] = Field(default_factory=dict)
    decision: str = "PENDING"
    created_at: str


class EvaluationTimelineEvent(BaseModel):
    timestamp: str
    run_id: str
    day_index: int
    event_type: str  # DAILY_EVAL, RESEARCH_INGEST, CANDIDATE_EVAL, PROMOTION, ROLLBACK
    model_version: str
    benchmark: str
    capability: str
    score: float
    delta: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


# API Request/Response DTOs
class RunEvaluationRequest(BaseModel):
    schedule_type: ScheduleType = ScheduleType.QUICK_DAILY
    model_id: Optional[str] = None
    force: bool = False


class CandidateCreateRequest(BaseModel):
    hypothesis: str
    candidate_type: CandidateType = CandidateType.RAG_ONLY
    candidate_model_name: str
    candidate_version: str
    quantization: Optional[str] = "Q4_K_M"


class PromoteCandidateRequest(BaseModel):
    candidate_id: str
    override_reason: Optional[str] = None


class RollbackRequest(BaseModel):
    target_model_id: Optional[str] = None
    reason: str = "Manual operator rollback due to regression"


class ResearchIngestRequest(BaseModel):
    source_id: str


class ResearchQuarantineRequest(BaseModel):
    source_id: str
    reason: str
