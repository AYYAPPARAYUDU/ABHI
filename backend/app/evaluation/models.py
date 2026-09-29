"""Data Models, Schemas and Enums for Phase 6.7, 6.8 & 6.9 LLM Evaluation, Research & Evolution Lab."""

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


class ProvenanceType(str, Enum):
    ACTUAL = "ACTUAL"
    SIMULATED = "SIMULATED"
    MISSING = "MISSING"


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
    RAG_CANDIDATE = "RAG_CANDIDATE"
    PROMPT_CANDIDATE = "PROMPT_CANDIDATE"
    CONFIG_CANDIDATE = "CONFIG_CANDIDATE"
    RETRIEVAL_CANDIDATE = "RETRIEVAL_CANDIDATE"
    ADAPTER_CANDIDATE = "ADAPTER_CANDIDATE"
    QLORA_CANDIDATE = "QLORA_CANDIDATE"
    MODEL_REPLACEMENT_CANDIDATE = "MODEL_REPLACEMENT_CANDIDATE"
    # Explicit distinct string values for Stage 6.7 compatibility
    RAG_ONLY = "RAG_ONLY"
    PROMPT_CONFIG = "PROMPT_CONFIG"
    ADAPTER_LORA = "ADAPTER_LORA"
    FINE_TUNED = "FINE_TUNED"
    MODEL_REPLACEMENT = "MODEL_REPLACEMENT"


class CandidateStatus(str, Enum):
    DRAFT = "DRAFT"
    READY = "READY"
    TRAINING = "TRAINING"
    EVALUATING = "EVALUATING"
    PASSED = "PASSED"
    REJECTED = "REJECTED"
    QUARANTINED = "QUARANTINED"
    PROMOTED = "PROMOTED"
    ARCHIVED = "ARCHIVED"


class FailureCategory(str, Enum):
    LANGUAGE_ERROR = "LANGUAGE_ERROR"
    GROUNDING_ERROR = "GROUNDING_ERROR"
    RAG_ERROR = "RAG_ERROR"
    PLANNING_ERROR = "PLANNING_ERROR"
    TOOL_BOUNDARY_ERROR = "TOOL_BOUNDARY_ERROR"
    SAFETY_ERROR = "SAFETY_ERROR"
    FORMAT_ERROR = "FORMAT_ERROR"
    HALLUCINATION = "HALLUCINATION"


class ContaminationStatus(str, Enum):
    NO_OVERLAP = "NO_OVERLAP"
    POSSIBLE_OVERLAP = "POSSIBLE_OVERLAP"
    KNOWN_OVERLAP = "KNOWN_OVERLAP"


class GenerationConfig(BaseModel):
    temperature: float = Field(default=0.1)
    top_p: float = Field(default=0.9)
    top_k: int = Field(default=40)
    seed: Optional[int] = Field(default=42)
    num_predict: int = Field(default=256)
    context_size: int = Field(default=8192)


class ModelSnapshot(BaseModel):
    model_id: str
    model_tag: str
    model_digest: str = "sha256:unknown"
    runtime: str = "Ollama-Local"
    quantization: str = "Q4_K_M"
    context_size: int = 8192
    parameter_size: str = "8B"
    generation_config: GenerationConfig = Field(default_factory=GenerationConfig)
    timestamp: str = ""


class EvaluationSnapshot(BaseModel):
    run_id: str
    dataset_id: str = "ABHI_INTERNAL_V1_DETERMINISTIC"
    dataset_version: str = "1.0.0"
    benchmark_version: str = "ABHI_EVAL_HARNESS_V1"
    evaluator_version: str = "1.0.0"
    model_snapshot: ModelSnapshot = Field(default_factory=lambda: ModelSnapshot(model_id="qwen3:8b", model_tag="qwen3:8b"))
    prompt_template_version: str = "v1.0"
    retrieval_snapshot: str = "LANCEDB_SNAPSHOT_LATEST"
    safety_policy_version: str = "AILUMINATE_ALIGNED_V1"
    timestamp: str = ""


class CaseEvidenceRecord(BaseModel):
    case_id: str
    category: str
    language: str = "en"
    prompt: str
    expected_output: str
    actual_output: str
    metric_name: str
    score: float
    is_passed: bool
    latency_ms: float = 0.0
    tokens_per_sec: float = 0.0
    prompt_tokens: int = 0
    output_tokens: int = 0
    evaluator_reason: str = ""
    provenance: ProvenanceType = ProvenanceType.ACTUAL
    timestamp: str = ""


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
    tokens_per_sec: float = Field(default=0.0)


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
    provenance: ProvenanceType = ProvenanceType.ACTUAL
    is_baseline: bool = False
    model_id: str
    model_version: str
    schedule_type: ScheduleType = ScheduleType.QUICK_DAILY
    model_snapshot: Optional[ModelSnapshot] = None
    evaluation_snapshot: Optional[EvaluationSnapshot] = None
    capabilities: CapabilityVector = Field(default_factory=CapabilityVector)
    multilingual: MultilingualScores = Field(default_factory=MultilingualScores)
    rag_metrics: RAGMetrics = Field(default_factory=RAGMetrics)
    safety_metrics: SafetyMetrics = Field(default_factory=SafetyMetrics)
    resource_metrics: ResourceUsageSnapshot = Field(default_factory=ResourceUsageSnapshot)
    evidence_records: List[CaseEvidenceRecord] = Field(default_factory=list)
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
    candidate_type: CandidateType = CandidateType.RAG_CANDIDATE
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
    provenance: ProvenanceType = ProvenanceType.ACTUAL
    model_version: str
    benchmark: str
    capability: str
    score: float
    delta: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


# --- Stage 6.9 Candidate Adaptation, Datasets, Lineage & Baseline Models ---

class CandidateDataset(BaseModel):
    dataset_id: str
    version: str = "1.0.0"
    source: str = "Failure-Cases & Sanitize Research"
    case_count: int = 12
    provenance: str = "LOCAL_SANITIZED"
    hash: str = "sha256:9b4e78f10a2b"
    contamination_status: ContaminationStatus = ContaminationStatus.NO_OVERLAP
    train_cases_count: int = 8
    validation_cases_count: int = 4
    holdout_protected: bool = True
    created_at: str = ""


class ImprovementHypothesis(BaseModel):
    hypothesis_id: str
    title: str
    description: str
    failure_category: Optional[FailureCategory] = FailureCategory.LANGUAGE_ERROR
    target_capability: str = "multilingual_te"
    baseline_score: float = 0.85
    target_score: float = 0.95
    research_source_id: Optional[str] = None
    risk_areas: List[str] = Field(default_factory=lambda: ["en", "hi", "safety"])


class EvaluationGateResult(BaseModel):
    gate_name: str
    passed: bool
    severity: RegressionSeverity = RegressionSeverity.CRITICAL
    metric_name: str
    baseline_val: float
    candidate_val: float
    delta: float
    threshold: float
    reason: str


class HeadToHeadComparison(BaseModel):
    candidate_id: str
    baseline_id: str = "BASELINE_V1_LOCKED"
    model_id: str = "qwen3:8b"
    baseline_composite_score: float = 0.917
    candidate_composite_score: float = 0.942
    delta_composite: float = 0.025
    unweighted_baseline_mean: float = 0.9583
    unweighted_candidate_mean: float = 0.9833
    delta_unweighted: float = 0.0250
    gates: List[EvaluationGateResult] = Field(default_factory=list)
    all_gates_passed: bool = True
    capabilities_delta: Dict[str, float] = Field(default_factory=dict)
    multilingual_delta: Dict[str, float] = Field(default_factory=dict)
    safety_delta: Dict[str, float] = Field(default_factory=dict)
    resource_delta: Dict[str, float] = Field(default_factory=dict)
    summary_verdict: str = "PASSED_ALL_GATES"


class CandidateRecord(BaseModel):
    candidate_id: str
    candidate_type: CandidateType = CandidateType.PROMPT_CANDIDATE
    parent_model_id: str = "model_qwen3_8b_v1_prod"
    parent_model_version: str = "1.0.0"
    name: str
    hypothesis: ImprovementHypothesis
    dataset: Optional[CandidateDataset] = None
    status: CandidateStatus = CandidateStatus.READY
    created_at: str
    updated_at: str
    evaluation_run_id: Optional[str] = None
    head_to_head: Optional[HeadToHeadComparison] = None
    adapter_path: Optional[str] = None
    configuration_overrides: Dict[str, Any] = Field(default_factory=dict)


class ModelLineageNode(BaseModel):
    node_id: str
    name: str
    version: str
    node_type: str  # BASE_MODEL, PROMPT_OVERRIDE, RAG_CONFIG, ADAPTER, PROMOTED_PROD
    parent_id: Optional[str] = None
    composite_score: float = 0.917
    status: str = "PRODUCTION"
    is_current_prod: bool = False
    created_at: str = ""
    metadata: Dict[str, Any] = Field(default_factory=dict)


class LockedBaselineContract(BaseModel):
    baseline_id: str = "BASELINE_V1_LOCKED"
    locked_at: str = "2026-09-28T17:40:00Z"
    model_id: str = "qwen3:8b"
    model_tag: str = "abhi:latest"
    model_digest: str = "sha256:500a1f067a9f43a992fb2b87"
    unweighted_case_mean: float = 0.9583
    weighted_10_pillar_composite: float = 0.917
    steady_state_tps: float = 28.4
    end_to_end_latency_ms_per_token: float = 41.2
    aggregation_formula: str = "FORMULA_V1_WEIGHTED_10_PILLAR"
    throughput_methodology: str = "ThroughputMethodologyV1"
    weights_spec: Dict[str, float] = Field(
        default_factory=lambda: {
            "reasoning": 0.12,
            "knowledge": 0.08,
            "coding": 0.12,
            "instruction_following": 0.10,
            "multilingual_composite": 0.12,
            "rag_grounding": 0.12,
            "tool_boundary": 0.10,
            "safety_compliance": 0.14,
            "groundedness": 0.05,
            "resource_efficiency": 0.05
        }
    )
    protected_holdout_hash: str = "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069"


class TrainingJobStatus(BaseModel):
    job_id: str
    candidate_id: str
    state: str = "READY"  # QUEUED, PREPARING, TRAINING, COMPLETED, FAILED, CANCELLED
    progress_percent: float = 0.0
    current_epoch: int = 0
    total_epochs: int = 3
    current_step: int = 0
    total_steps: int = 100
    current_loss: Optional[float] = None
    vram_usage_mb: float = 0.0
    ram_usage_mb: float = 0.0
    elapsed_seconds: float = 0.0
    error_message: Optional[str] = None


# API Request/Response DTOs
class RunEvaluationRequest(BaseModel):
    schedule_type: ScheduleType = ScheduleType.QUICK_DAILY
    model_id: Optional[str] = None
    force: bool = False
    use_real_model: bool = True


class LegacyCandidateCreateRequest(BaseModel):
    hypothesis: str
    candidate_type: CandidateType = CandidateType.RAG_CANDIDATE
    candidate_model_name: str
    candidate_version: str
    quantization: Optional[str] = "Q4_K_M"


class CandidateCreateRequest(BaseModel):
    hypothesis_title: str
    hypothesis_description: str
    candidate_type: CandidateType = CandidateType.PROMPT_CANDIDATE
    candidate_name: str
    target_capability: str = "multilingual_te"
    baseline_score: float = 0.85
    target_score: float = 0.95
    failure_category: Optional[FailureCategory] = FailureCategory.LANGUAGE_ERROR
    research_source_id: Optional[str] = None
    configuration_overrides: Dict[str, Any] = Field(default_factory=dict)


class EvaluateCandidateRequest(BaseModel):
    candidate_id: str
    schedule_type: ScheduleType = ScheduleType.QUICK_DAILY


class StartTrainingRequest(BaseModel):
    candidate_id: str
    epochs: int = 3
    batch_size: int = 2
    learning_rate: float = 2e-4


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
