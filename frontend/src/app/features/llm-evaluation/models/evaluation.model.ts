export type ScheduleType = 'QUICK_DAILY' | 'STANDARD_DAILY' | 'DEEP_MANUAL';
export type EvaluationStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type ProvenanceType = 'ACTUAL' | 'SIMULATED' | 'MISSING';
export type ModelPromotionState = 'PRODUCTION' | 'CANDIDATE' | 'ARCHIVED' | 'REJECTED' | 'QUARANTINED';
export type SourceTier = 'TIER_A' | 'TIER_B' | 'TIER_C';
export type ResearchIngestionStatus = 'DISCOVERED' | 'VALIDATED' | 'INGESTED' | 'QUARANTINED' | 'IGNORED';
export type RegressionSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'IMPROVEMENT' | 'UNCHANGED';
export type CandidateType =
  | 'RAG_CANDIDATE'
  | 'PROMPT_CANDIDATE'
  | 'CONFIG_CANDIDATE'
  | 'RETRIEVAL_CANDIDATE'
  | 'ADAPTER_CANDIDATE'
  | 'QLORA_CANDIDATE'
  | 'MODEL_REPLACEMENT_CANDIDATE'
  | 'RAG_ONLY'
  | 'PROMPT_CONFIG'
  | 'ADAPTER_LORA'
  | 'FINE_TUNED'
  | 'MODEL_REPLACEMENT';

export type CandidateStatus =
  | 'DRAFT'
  | 'READY'
  | 'TRAINING'
  | 'EVALUATING'
  | 'PASSED'
  | 'REJECTED'
  | 'QUARANTINED'
  | 'PROMOTED'
  | 'ARCHIVED';

export type FailureCategory =
  | 'LANGUAGE_ERROR'
  | 'GROUNDING_ERROR'
  | 'RAG_ERROR'
  | 'PLANNING_ERROR'
  | 'TOOL_BOUNDARY_ERROR'
  | 'SAFETY_ERROR'
  | 'FORMAT_ERROR'
  | 'HALLUCINATION';

export type ContaminationStatus = 'NO_OVERLAP' | 'POSSIBLE_OVERLAP' | 'KNOWN_OVERLAP';

export interface GenerationConfig {
  temperature: number;
  top_p: number;
  top_k: number;
  seed?: number;
  num_predict: number;
  context_size: number;
}

export interface ModelSnapshot {
  model_id: string;
  model_tag: string;
  model_digest: string;
  runtime: string;
  quantization: string;
  context_size: number;
  parameter_size: string;
  generation_config: GenerationConfig;
  timestamp: string;
}

export interface EvaluationSnapshot {
  run_id: string;
  dataset_id: string;
  dataset_version: string;
  benchmark_version: string;
  evaluator_version: string;
  model_snapshot: ModelSnapshot;
  prompt_template_version: string;
  retrieval_snapshot: string;
  safety_policy_version: string;
  timestamp: string;
}

export interface CaseEvidenceRecord {
  case_id: string;
  category: string;
  language: string;
  prompt: string;
  expected_output: string;
  actual_output: string;
  metric_name: string;
  score: number;
  is_passed: boolean;
  latency_ms: number;
  tokens_per_sec: number;
  prompt_tokens: number;
  output_tokens: number;
  evaluator_reason: string;
  provenance: ProvenanceType;
  timestamp: string;
}

export interface CapabilityVector {
  reasoning: number;
  knowledge: number;
  coding: number;
  instruction_following: number;
  multilingual: number;
  rag: number;
  tool_use: number;
  safety: number;
  groundedness: number;
  latency_ms: number;
  resource_efficiency: number;
}

export interface MultilingualScores {
  en: number;
  te: number;
  hi: number;
  ta: number;
  mixed: number;
}

export interface RAGMetrics {
  retrieval_relevance: number;
  context_precision: number;
  context_recall: number;
  answer_groundedness: number;
  citation_correctness: number;
}

export interface SafetyMetrics {
  prompt_injection_resistance: number;
  tool_boundary_adherence: number;
  privacy_leakage_score: number;
  destructive_action_refusal: number;
  execution_boundary_adherence: number;
}

export interface ResourceUsageSnapshot {
  cpu_percent: number;
  memory_mb: number;
  gpu_memory_mb: number;
  duration_seconds: number;
  tokens_per_sec?: number;
}

export interface RegressionAlert {
  severity: RegressionSeverity;
  category: string;
  previous_score: number;
  current_score: number;
  delta: number;
  benchmark: string;
  sample_count: number;
  message: string;
}

export interface EvaluationRun {
  run_id: string;
  day_index: number;
  scheduled_time: string;
  start_time: string;
  end_time?: string;
  status: EvaluationStatus;
  provenance: ProvenanceType;
  is_baseline?: boolean;
  model_id: string;
  model_version: string;
  schedule_type: ScheduleType;
  model_snapshot?: ModelSnapshot;
  evaluation_snapshot?: EvaluationSnapshot;
  capabilities: CapabilityVector;
  multilingual: MultilingualScores;
  rag_metrics: RAGMetrics;
  safety_metrics: SafetyMetrics;
  resource_metrics: ResourceUsageSnapshot;
  evidence_records?: CaseEvidenceRecord[];
  regressions: RegressionAlert[];
  improvements: RegressionAlert[];
  dataset_snapshot: string;
  research_snapshot: string;
  report_path?: string;
  error?: string;
}

export interface ResearchPaper {
  source_id: string;
  title: string;
  authors: string[];
  publication_date: string;
  retrieval_date: string;
  url?: string;
  doi?: string;
  arxiv_id?: string;
  openalex_id?: string;
  tier: SourceTier;
  topics: string[];
  abstract: string;
  license?: string;
  ingestion_status: ResearchIngestionStatus;
  hash: string;
  quarantined: boolean;
  quarantine_reason?: string;
}

export interface ModelRecord {
  model_id: string;
  model_name: string;
  version: string;
  source: string;
  quantization: string;
  context_length: number;
  runtime: string;
  hash_ref: string;
  created_at: string;
  evaluation_summary: Record<string, number>;
  promotion_state: ModelPromotionState;
  is_production: boolean;
  rollback_target_id?: string;
}

export interface ExperimentRecord {
  experiment_id: string;
  hypothesis: string;
  candidate_type: CandidateType;
  base_model_id: string;
  candidate_model_id: string;
  dataset_snapshot: string;
  status: string;
  results: Record<string, any>;
  decision: string;
  created_at: string;
}

export interface EvaluationTimelineEvent {
  timestamp: string;
  run_id: string;
  day_index: number;
  event_type: string;
  provenance: ProvenanceType;
  model_version: string;
  benchmark: string;
  capability: string;
  score: number;
  delta: number;
  metadata: Record<string, any>;
}

// --- Stage 6.9 Candidate Adaptation Models ---

export interface CandidateDataset {
  dataset_id: string;
  version: string;
  source: string;
  case_count: number;
  provenance: string;
  hash: string;
  contamination_status: ContaminationStatus;
  train_cases_count: number;
  validation_cases_count: number;
  holdout_protected: boolean;
  created_at: string;
}

export interface ImprovementHypothesis {
  hypothesis_id: string;
  title: string;
  description: string;
  failure_category?: FailureCategory;
  target_capability: string;
  baseline_score: number;
  target_score: number;
  research_source_id?: string;
  risk_areas: string[];
}

export interface EvaluationGateResult {
  gate_name: string;
  passed: boolean;
  severity: RegressionSeverity;
  metric_name: string;
  baseline_val: number;
  candidate_val: number;
  delta: number;
  threshold: number;
  reason: string;
}

export interface HeadToHeadComparison {
  candidate_id: string;
  baseline_id: string;
  model_id: string;
  baseline_composite_score: number;
  candidate_composite_score: number;
  delta_composite: number;
  unweighted_baseline_mean: number;
  unweighted_candidate_mean: number;
  delta_unweighted: number;
  gates: EvaluationGateResult[];
  all_gates_passed: boolean;
  capabilities_delta: Record<string, number>;
  multilingual_delta: Record<string, number>;
  safety_delta: Record<string, number>;
  resource_delta: Record<string, number>;
  summary_verdict: string;
}

export interface CandidateRecord {
  candidate_id: string;
  candidate_type: CandidateType;
  parent_model_id: string;
  parent_model_version: string;
  name: string;
  hypothesis: ImprovementHypothesis;
  dataset?: CandidateDataset;
  status: CandidateStatus;
  created_at: string;
  updated_at: string;
  evaluation_run_id?: string;
  head_to_head?: HeadToHeadComparison;
  adapter_path?: string;
  configuration_overrides: Record<string, any>;
}

export interface ModelLineageNode {
  node_id: string;
  name: string;
  version: string;
  node_type: string;
  parent_id?: string;
  composite_score: number;
  status: string;
  is_current_prod: boolean;
  created_at: string;
  metadata: Record<string, any>;
}

export interface LockedBaselineContract {
  baseline_id: string;
  locked_at: string;
  model_id: string;
  model_tag: string;
  model_digest: string;
  unweighted_case_mean: number;
  weighted_10_pillar_composite: number;
  steady_state_tps: number;
  end_to_end_latency_ms_per_token: number;
  aggregation_formula: string;
  throughput_methodology: string;
  weights_spec: Record<string, number>;
  protected_holdout_hash: string;
}

export interface TrainingJobStatus {
  job_id: string;
  candidate_id: string;
  state: string;
  progress_percent: number;
  current_epoch: number;
  total_epochs: number;
  current_step: number;
  total_steps: number;
  current_loss?: number;
  vram_usage_mb: number;
  ram_usage_mb: number;
  elapsed_seconds: number;
  error_message?: string;
}

export interface EvaluationStatusResponse {
  status: string;
  production_model: ModelRecord;
  locked_baseline?: LockedBaselineContract;
  total_evaluation_runs: number;
  latest_run: EvaluationRun | null;
  scheduler: {
    active: boolean;
    is_evaluating: boolean;
    last_run_time: string;
    interval_seconds: number;
    mode: string;
  };
  total_research_papers: number;
  total_models: number;
  total_candidates?: number;
}
