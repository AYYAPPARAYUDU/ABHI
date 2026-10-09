export interface AgentNode {
  id: string;
  name: string;
  category: string;
  role: string;
  status: 'IDLE' | 'READY' | 'ACTIVE' | 'WAITING' | 'RESOURCE_BLOCKED' | 'VERIFYING' | 'COMPLETED' | 'FAILED' | 'DISABLED';
  capabilities: string[];
  risk_tier: string;
  active_task_id?: string;
  active_task_title?: string;
  resource_needs?: { ram_mb?: number; vram_mb?: number };
  recent_outcomes: string[];
  errors_requiring_attention: string[];
  position_3d: { x: number; y: number; z: number };
  is_supervisor?: boolean;
}

export interface AgentEdge {
  source: string;
  target: string;
  type: 'DEPENDENCY' | 'DELEGATION' | 'VERIFICATION' | 'DATA_FLOW';
  is_active: boolean;
  label: string;
}

export interface NetworkGraphData {
  nodes: AgentNode[];
  edges: AgentEdge[];
  total_agents: number;
  active_agents: number;
  system_status: string;
}
