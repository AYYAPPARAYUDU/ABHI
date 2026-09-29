export type MemoryType = 'WORKING' | 'EPISODIC' | 'SEMANTIC' | 'PREFERENCE' | 'PROCEDURAL_CANDIDATE' | 'PROCEDURAL' | 'KNOWLEDGE';
export type MemoryStatus = 'CANDIDATE' | 'ACTIVE' | 'STALE' | 'SUPERSEDED' | 'REJECTED' | 'DELETED' | 'DEPRECATED';
export type PrivacyClassification = 'PUBLIC' | 'PERSONAL' | 'PRIVATE' | 'SENSITIVE' | 'RESTRICTED';
export type MemorySource = 'USER_EXPLICIT' | 'USER_CONFIRMED' | 'EXECUTION_RESULT' | 'WORKFLOW_RESULT' | 'DOCUMENT' | 'RAG' | 'SYSTEM_OBSERVED';
export type MemoryPrivacyClass = 'task_derived' | 'user_provided' | 'system';

export interface MemoryContract {
  memory_id: string;
  memory_type: MemoryType;
  title: string;
  task_id?: string | null;
  category: string;
  context_summary?: string;
  solution_summary?: string;
  summary?: string;
  content?: Record<string, any>;
  outcome?: string;
  tags: string[];
  confidence: number;
  privacy_class: MemoryPrivacyClass;
  privacy_classification: PrivacyClassification;
  status: MemoryStatus;
  source: MemorySource;
  confirmed_by_user?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  expires_at?: string | null;
}

export type EpisodicMemory = MemoryContract;

export interface MemoryListResponse {
  memories: MemoryContract[];
  total: number;
  limit: number;
  offset: number;
  category_filter?: string | null;
  categories: string[];
}

export interface UserProfilePreference {
  key: string;
  value: Record<string, any>;
  updated_at?: string | null;
}

export interface MemoryConflictCandidate {
  memory_id: string;
  value: any;
  source: string;
  confidence: number;
  updated_at?: string;
}

export interface MemoryConflict {
  conflict_id: string;
  memory_id_a: string;
  memory_id_b: string;
  key: string;
  candidate_a: MemoryConflictCandidate;
  candidate_b: MemoryConflictCandidate;
  status: 'UNRESOLVED' | 'RESOLVED' | 'DISMISSED';
  resolution?: string | null;
  detected_at?: string;
}

export interface ProcedureParameter {
  name: string;
  type_name: string;
  description: string;
  default_value?: any;
  required: boolean;
}

export interface ProcedureStep {
  step_index: number;
  skill_id: string;
  action_name: string;
  parameters: Record<string, any>;
  expected_outcome?: string;
  recovery_skill_id?: string | null;
  timeout_seconds: number;
}

export interface ProcedureMetrics {
  invocation_count: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  average_duration_ms: number;
  recovery_rate: number;
  replan_rate: number;
  last_used_at?: string | null;
}

export interface ProcedureModel {
  procedure_id: string;
  name: string;
  description: string;
  trigger_conditions: string[];
  required_skills: string[];
  parameters: ProcedureParameter[];
  steps: ProcedureStep[];
  preconditions?: {
    required_apps?: string[];
    required_skills?: string[];
    required_permissions?: string[];
  };
  postconditions?: {
    expected_final_state?: Record<string, any>;
    artifacts?: string[];
    verification_evidence?: string[];
  };
  metrics: ProcedureMetrics;
  version: string;
  confidence: number;
  status: MemoryStatus;
  derived_from?: string | null;
  reason_for_change?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MemoryFilterOptions {
  category: string;
  memoryType: string;
  privacy: string;
  status: string;
  query: string;
  page: number;
  pageSize: number;
}
