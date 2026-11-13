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
  bounds: {
    x: number; // in canvas coordinate units 0-1000
    y: number;
    w: number;
    h: number;
  };
  features: string[];
}

export type EntityActivity = 'typing' | 'walking' | 'meeting' | 'coffee' | 'gaming' | 'thinking' | 'sleeping' | 'repairing';

export interface OfficeEntity {
  id: string;
  name: string;
  role: string;
  type: 'agent' | 'human' | 'bot' | 'visitor';
  roomId: string;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  avatar: string;
  color: string;
  activity: EntityActivity;
  speechBubble?: string;
  speechTimer?: number;
  facing: 'left' | 'right' | 'up' | 'down';
  deskPosition?: { x: number; y: number };
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
  category: 'Brand rules' | 'Lessons' | 'Ideas' | 'Logs';
  entity: string;
  content: string;
  timestamp: string;
  author: string;
  accessCount: number;
}

export interface ClaudeEventLog {
  id: string;
  timestamp: string;
  step: number;
  type: 'USER_COMMAND' | 'THINKING' | 'TOOL_CALL' | 'PARALLEL_SPAWN' | 'FILE_WRITE' | 'HUMAN_GATE' | 'OUTPUT';
  agent: string;
  title: string;
  codeSnippet?: string;
  durationMs: number;
  isApprovalRequired?: boolean;
}

export interface PipelineItem {
  id: string;
  title: string;
  category: 'video' | 'script' | 'research' | 'code' | 'social';
  stage: 'inbox' | 'in_progress' | 'awaiting_approval' | 'done';
  assignee: string;
  progress: number;
  subtasks: string[];
  summary: string;
  createdAt: string;
}

export type SampleLayoutMode = 'workspace-1' | 'workspace-2' | 'workspace-3';
