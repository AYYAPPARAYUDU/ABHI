export type ScheduleType = 'QUICK_DAILY' | 'STANDARD_DAILY' | 'DEEP_MANUAL';
export type EvaluationStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
export type ModelPromotionState = 'PRODUCTION' | 'CANDIDATE' | 'ARCHIVED' | 'REJECTED' | 'QUARANTINED';
export type SourceTier = 'TIER_A' | 'TIER_B' | 'TIER_C';
export type ResearchIngestionStatus = 'DISCOVERED' | 'VALIDATED' | 'INGESTED' | 'QUARANTINED' | 'IGNORED';
export type RegressionSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'IMPROVEMENT' | 'UNCHANGED';
export type CandidateType = 'RAG_ONLY' | 'PROMPT_CONFIG' | 'ADAPTER_LORA' | 'FINE_TUNED' | 'MODEL_REPLACEMENT';

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
  model_id: string;
  model_version: string;
  schedule_type: ScheduleType;
  capabilities: CapabilityVector;
  multilingual: MultilingualScores;
  rag_metrics: RAGMetrics;
  safety_metrics: SafetyMetrics;
  resource_metrics: ResourceUsageSnapshot;
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
  model_version: string;
  benchmark: string;
  capability: string;
  score: number;
  delta: number;
  metadata: Record<string, any>;
}

export interface EvaluationStatusResponse {
  status: string;
  production_model: ModelRecord;
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
}
