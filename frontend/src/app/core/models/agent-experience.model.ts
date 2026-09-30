export type UserExperienceMode = 'USER' | 'ADVANCED' | 'DEVELOPER';

export type SpatialEnvironmentMode = 'DEFAULT' | 'FOCUS' | 'ACTIVE_TASK' | 'MEDIA' | 'SYSTEM';

export interface AgentExperienceEvent {
  eventId: string;
  taskId?: string;
  executionId?: string;
  stage: string;
  status: 'WORKING' | 'PREPARING' | 'GENERATING' | 'OPENING' | 'SEARCHING' | 'WAITING' | 'COMPLETED' | 'FAILED';
  userMessage: string;
  technicalDetail?: string;
  progressPct?: number;
  timestamp: number;
  userVisible: boolean;
}

export interface RecentActivityItem {
  id: string;
  type: 'TASK' | 'MEDIA' | 'APP' | 'MEMORY' | 'SYSTEM';
  title: string;
  description: string;
  timestamp: number;
  status: 'SUCCESS' | 'RUNNING' | 'FAILED';
  routeLink?: string;
  metadata?: Record<string, any>;
}

export interface CommandPaletteAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  category: 'ACTIONS' | 'NAVIGATION' | 'MEDIA' | 'APPS' | 'SYSTEM';
  handler: () => void;
  shortcut?: string;
}
