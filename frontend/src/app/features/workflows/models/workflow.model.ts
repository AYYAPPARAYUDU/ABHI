export type AutonomyLevel =
  | 'LEVEL_0'
  | 'LEVEL_1'
  | 'LEVEL_2'
  | 'LEVEL_3'
  | 'LEVEL_4'
  | 'LEVEL_5';

export type PlanNodeStatus =
  | 'PENDING'
  | 'READY'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED'
  | 'BLOCKED';

export type MilestoneStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED';

export type GoalProgressStatus =
  | 'PROGRESSING'
  | 'BLOCKED'
  | 'RECOVERABLE'
  | 'REPLAN_REQUIRED'
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'FAILED';

export type HumanHandoffReason =
  | 'AUTHENTICATION_REQUIRED'
  | 'CAPTCHA_REQUIRED'
  | 'CONSENT_REQUIRED'
  | 'AMBIGUOUS_TARGET'
  | 'POLICY_BLOCKED'
  | 'UNKNOWN_APPLICATION_STATE'
  | 'RESOURCE_EXHAUSTED';

export type DataClassification =
  | 'LOCAL_FILE'
  | 'PRIVATE_DATA'
  | 'PUBLIC_WEB'
  | 'USER_INPUT'
  | 'GENERATED_SUMMARY';

export interface GoalConstraintModel {
  constraint_type: string;
  key: string;
  value: any;
  is_strict: boolean;
  description?: string;
}

export interface GoalContractModel {
  goal_id: string;
  original_request: string;
  normalized_goal: string;
  constraints: GoalConstraintModel[];
  required_outcome: string;
  prohibited_actions: string[];
  success_criteria: string[];
  risk_level: string;
  autonomy_level: AutonomyLevel;
  created_at_ts: number;
}

export interface SuccessContractModel {
  success_id: string;
  goal_id: string;
  required_state: Record<string, any>;
  observable_conditions: string[];
  verification_method: string;
  evidence_requirements: string[];
}

export interface MilestoneModel {
  milestone_id: string;
  title: string;
  description: string;
  node_ids: string[];
  observable_success_condition: string;
  status: MilestoneStatus;
  completed_at_ts?: number;
}

export interface PlanNodeModel {
  node_id: string;
  skill_id: string;
  skill_version: string;
  title: string;
  inputs: Record<string, any>;
  dependencies: string[];
  preconditions: string[];
  expected_output: Record<string, any>;
  postconditions: string[];
  risk_level: string;
  timeout_ms: number;
  status: PlanNodeStatus;
  result_data?: Record<string, any>;
  error_message?: string;
  execution_duration_ms: number;
}

export interface WorkflowPlanModel {
  plan_id: string;
  goal_id: string;
  version: number;
  nodes: Record<string, PlanNodeModel>;
  milestones: MilestoneModel[];
  success_contract: SuccessContractModel;
  risk_summary: string;
  estimated_cost: number;
  estimated_duration_ms: number;
  created_at_ts: number;
  is_active: boolean;
  superseded_by_plan_id?: string;
  replan_reason?: string;
}

export interface WorldStateFactModel {
  key: string;
  value: any;
  source: string;
  timestamp: number;
  confidence: number;
  verified: boolean;
}

export interface WorkflowWorldStateModel {
  facts: Record<string, WorldStateFactModel>;
  last_updated_ts: number;
  freshness_threshold_ms: number;
}

export interface GoalProgressEvaluationModel {
  status: GoalProgressStatus;
  completed_milestones: string[];
  active_milestone?: string;
  completed_nodes_count: number;
  total_nodes_count: number;
  progress_percentage: number;
  blocked_reason?: string;
  replan_needed: boolean;
  explanation: string;
}

export interface HumanHandoffRequestModel {
  handoff_id: string;
  task_id: string;
  goal_id: string;
  reason: HumanHandoffReason;
  message: string;
  completed_steps: number;
  total_steps: number;
  next_action_description: string;
  created_at_ts: number;
  resolved: boolean;
  resolution_notes?: string;
}

export interface DataFlowRecordModel {
  transfer_id: string;
  task_id: string;
  source_application: string;
  source_object: string;
  data_classification: DataClassification;
  destination_application: string;
  transfer_reason: string;
  policy_decision: string;
  timestamp: number;
}

export interface WorkflowJournalEntryModel {
  entry_id: string;
  task_id: string;
  goal_id: string;
  plan_id: string;
  plan_version: number;
  event_type: string;
  details: Record<string, any>;
  timestamp: number;
}

export interface WorkflowStatusModel {
  task_id: string;
  goal?: GoalContractModel;
  active_plan?: WorkflowPlanModel;
  plan_history: WorkflowPlanModel[];
  world_state?: WorkflowWorldStateModel;
  evaluation?: GoalProgressEvaluationModel;
  handoff_requests: HumanHandoffRequestModel[];
  is_paused: boolean;
}
