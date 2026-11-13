export type AgentStatus = 'idle' | 'working' | 'parallel' | 'awaiting_approval' | 'error';

export interface SubAgentTask {
  id: string;
  name: string;
  role: string;
  status: 'running' | 'completed' | 'queued' | 'pending_approval';
  progress: number;
  elapsedMs: number;
  outputSnippet?: string;
}

export interface AgentLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'success' | 'action';
  text: string;
  toolCall?: string;
}

export interface SampleAgent {
  id: string;
  name: string;
  codename: string;
  teamId: string;
  teamName: string;
  role: string;
  avatar: string;
  status: AgentStatus;
  statusMessage: string;
  currentTask: string;
  progress: number;
  subAgents: SubAgentTask[];
  toolsUsed: string[];
  mcpServers: string[];
  tokensUsed: number;
  costEstimate: string;
  recentLogs: AgentLogEntry[];
  roomId: string;
  roomName: string;
  x: number;
  y: number;
  isFavorite?: boolean;
}

export interface AgentTeam {
  id: string;
  name: string;
  icon: string;
  color: string;
  leadAgentId: string;
  description: string;
  agentCount: number;
  activeTasks: number;
  mcpIntegrations: string[];
}

export interface OfficeRoom {
  id: string;
  name: string;
  code: string;
  icon: string;
  themeColor: string;
  description: string;
  capacity: number;
  occupantIds: string[];
  isOutOfOrder?: boolean;
  specialNote?: string;
  gridArea: {
    rowStart: number;
    colStart: number;
    rowSpan: number;
    colSpan: number;
  };
  features: string[];
  ambientSound?: string;
}

export type EntityActivity = 'typing' | 'walking' | 'meeting' | 'coffee' | 'gaming' | 'thinking' | 'sleeping' | 'repairing';

export interface OfficeEntity {
  id: string;
  name: string;
  role: string;
  type: 'agent' | 'human' | 'bot' | 'visitor';
  roomId: string;
  x: number; // 0 to 100% within room
  y: number; // 0 to 100% within room
  avatar: string;
  activity: EntityActivity;
  speechBubble?: string;
  facing: 'left' | 'right';
  targetX?: number;
  targetY?: number;
}

export interface ApprovalRequest {
  id: string;
  agentId: string;
  agentName: string;
  teamName: string;
  action: string;
  target: string;
  summary: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  payloadDiff?: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface SharedBrainMemory {
  id: string;
  key: string;
  team: string;
  vectorEmbeddingDim: number;
  content: string;
  lastSync: string;
  accessCount: number;
  relevanceScore: number;
}

export type SampleLayoutMode = 'workspace-1' | 'workspace-2' | 'workspace-3';

