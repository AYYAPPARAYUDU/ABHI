export type UserExperienceMode = 'USER' | 'ADVANCED' | 'DEVELOPER';

export type SpatialEnvironmentMode =
  | 'DEFAULT'
  | 'MAIN_AGENT'
  | 'NETWORK'
  | 'INTELLIGENCE'
  | 'BUSINESS'
  | 'FOCUS'
  | 'ACTIVE_TASK'
  | 'MEDIA'
  | 'SYSTEM';

export type CommandLifecycleState =
  | 'RECEIVED'
  | 'UNDERSTANDING'
  | 'PLANNING'
  | 'WAITING_FOR_APPROVAL'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RECOVERING';

export type ResultType =
  | 'TEXT_RESULT'
  | 'NUMBER_RESULT'
  | 'MEDIA_RESULT'
  | 'TASK_RESULT'
  | 'APPLICATION_RESULT'
  | 'SEARCH_RESULTS'
  | 'ARTIFACT_RESULT'
  | 'ERROR_RESULT'
  | 'APPROVAL_REQUEST';

export interface CommandContext {
  projectId?: string;
  taskId?: string;
  selectedApp?: string;
  selectedArtifactId?: string;
  previousCommandId?: string;
  previousResultSummary?: string;
}

export interface AgentCommandRequest {
  commandId: string;
  text: string;
  inputMode: 'TEXT' | 'VOICE';
  language: 'en' | 'te' | 'hi' | 'ta' | 'auto';
  context?: CommandContext;
  submittedAt: number;
}

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'media' | 'memory' | 'app' | 'task';
  previewUrl?: string;
  routeLink?: string;
  metadata?: Record<string, any>;
}

export interface AgentCommandResult {
  resultId: string;
  commandId: string;
  taskId?: string;
  type: ResultType;
  title: string;
  summary: string;
  calculationExpression?: string;
  numberValue?: number;
  mediaPreviewUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  mediaArtifactId?: string;
  searchResults?: SearchResultItem[];
  appInfo?: {
    appId: string;
    displayName: string;
    state: string;
  };
  approvalInfo?: {
    nodeId: string;
    action: string;
    reason: string;
    tier: string;
  };
  errorMessage?: string;
  recoverySuggestion?: string;
  timestamp: number;
  actions?: Array<{
    label: string;
    actionType: 'NAVIGATE' | 'RETRY' | 'APPROVE' | 'REJECT' | 'OPEN_APP' | 'SAVE_MEDIA';
    payload?: any;
  }>;
}

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
  result?: AgentCommandResult;
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
