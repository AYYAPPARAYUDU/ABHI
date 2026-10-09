export interface OpportunityDimensionScore {
  dimension: string;
  score: number;
  confidence: number;
  provenance: 'OBSERVED' | 'SOURCED' | 'MEASURED' | 'ESTIMATED' | 'ASSUMED' | 'UNKNOWN';
  source_ref?: string;
  rationale: string;
}

export interface BusinessOpportunity {
  id: string;
  title: string;
  sector_id: string;
  summary: string;
  total_score: number;
  dimensions: OpportunityDimensionScore[];
  sources: string[];
  created_at: string;
  status: string;
}

export interface BusinessSector {
  id: string;
  name: string;
  description: string;
  active_projects_count: number;
  color: string;
  icon: string;
  position_3d: { x: number; y: number; z: number };
}

export interface BusinessMilestone {
  id: string;
  project_id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  deliverable_ref?: string;
  verified: boolean;
  created_at: string;
  completed_at?: string;
}

export interface BusinessTask {
  id: string;
  project_id: string;
  milestone_id: string;
  title: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'WAITING_APPROVAL';
  assigned_agent: string;
  capability_required: string;
  output_ref?: string;
  result_summary?: string;
}

export interface BusinessEvidence {
  id: string;
  project_id: string;
  claim: string;
  source: string;
  provenance_type: 'OBSERVED' | 'SOURCED' | 'MEASURED' | 'ESTIMATED' | 'ASSUMED' | 'UNKNOWN';
  confidence: number;
  timestamp: string;
}

export interface BusinessExpense {
  id: string;
  project_id: string;
  description: string;
  amount_usd: number;
  category: string;
  timestamp: string;
}

export interface BusinessRevenueRecord {
  id: string;
  project_id: string;
  category: 'ACTUAL_RECEIVED' | 'GROSS_SALES' | 'REFUNDS' | 'OPERATING_EXPENSES' | 'NET_RESULT' | 'PENDING_PAYMENTS' | 'FORECAST' | 'POTENTIAL';
  amount_usd: number;
  provenance: 'MEASURED' | 'ESTIMATED' | 'ASSUMED' | 'NOT_AVAILABLE';
  reference_doc?: string;
  notes: string;
  timestamp: string;
}

export interface BusinessApproval {
  id: string;
  project_id: string;
  action_description: string;
  risk_tier: string;
  required_permission: string;
  estimated_cost_usd: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  resolved_at?: string;
}

export interface BusinessProject {
  id: string;
  sector_id: string;
  name: string;
  objective: string;
  autonomy_level: number; // 0 to 5
  autopilot_mode: 'MANUAL' | 'RESEARCH_AUTOPILOT' | 'LOCAL_BUILD_AUTOPILOT' | 'APPROVED_WORKFLOW_AUTOPILOT';
  status: 'RESEARCHING' | 'PLANNING' | 'BUILDING' | 'ACTIVE' | 'PAUSED_APPROVAL' | 'BLOCKED' | 'COMPLETED';
  budget_limit_usd: number;
  spent_usd: number;
  target_completion?: string;
  next_milestone_id?: string;
  milestones: BusinessMilestone[];
  tasks: BusinessTask[];
  evidences: BusinessEvidence[];
  expenses: BusinessExpense[];
  revenue_records: BusinessRevenueRecord[];
  approvals: BusinessApproval[];
  created_at: string;
  updated_at: string;
}

export interface FinancialSummary {
  actual_revenue_received_usd: number;
  gross_sales_usd: number;
  refunds_usd: number;
  operating_expenses_usd: number;
  net_result_usd: number;
  pending_payments_usd: number;
  forecast_revenue_usd: number;
  potential_revenue_usd: number;
  revenue_provenance: string;
  has_verified_financial_connection: boolean;
  disclaimer: string;
}
