export type SampleViewMode = 'hub-and-spoke' | 'corporate-floorplan';

export interface SampleAgent {
  id: string;
  name: string;
  role: string;
  team: string;
  status: 'idle' | 'running' | 'thinking' | 'review' | 'coffee-break';
  currentTask: string;
  avatarColor: string;
  initials: string;
  podId: string;
  assignedDesk: { x: number; y: number; z: number };
  modelTier: 'opus' | 'sonnet' | 'haiku' | 'headless';
  connectedTools: string[];
  subAgentsCount: number;
}

export interface PodRoom {
  id: string;
  title: string;
  colorHex: string;
  colorName: string;
  agentsCount: number;
  runningCount: number;
  leadRole: string;
  icon: string;
  angle: number; // Radian position in circle
  connectedTools: { name: string; type: string; status: 'connected' | 'idle' }[];
  skills: { name: string; progress: number }[];
  recentOutput: string;
}

export interface BrainNote {
  id: string;
  title: string;
  author: string;
  pod: string;
  timestamp: string;
  content: string;
  category: 'RESEARCH' | 'ARCHITECTURE' | 'PROD_DEPLOY' | 'SCRIPT';
}

export interface CalendarJob {
  id: string;
  title: string;
  time: string;
  pod: string;
  agent: string;
  status: 'SCHEDULED' | 'RUNNING' | 'COMPLETED';
}

export interface LLMEngineSpec {
  id: 'opus' | 'sonnet' | 'haiku' | 'headless';
  name: string;
  speed: string;
  cost: string;
  activeAgents: number;
  tokensPerSec: number;
}
