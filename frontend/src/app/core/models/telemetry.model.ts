/**
 * Canonical Frontend Telemetry & Operator Console Data Models.
 * Governed location: src/app/core/models/telemetry.model.ts
 */

export type ConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';

export type AvatarState =
  | 'IDLE'
  | 'LISTENING'
  | 'THINKING'
  | 'PLANNING'
  | 'WAITING_CONSENT'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'RECOVERING'
  | 'SUCCESS'
  | 'ERROR'
  | 'EMERGENCY_STOP';

export type SubsystemHealthState = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';

export interface SubsystemStatus {
  name: string;
  status: SubsystemHealthState;
  details?: string;
  lastChecked?: number;
}

export interface SystemHealthSummary {
  overall: SubsystemHealthState;
  environment: string;
  gateway: SubsystemHealthState;
  database: SubsystemHealthState;
  ollama: SubsystemHealthState;
  perception: SubsystemHealthState;
  windowsWorker: SubsystemHealthState;
  browserWorker: SubsystemHealthState;
  safetyPolicy: SubsystemHealthState;
  leaseManager: SubsystemHealthState;
  availableModels: string[];
}

export interface TelemetryEvent {
  id?: string;
  channel?: string;
  type: string;
  task_id?: string;
  timestamp: number;
  component?: string;
  status?: string;
  payload?: Record<string, any>;
  rawJson?: string;
}

export interface TimelineItem {
  id: string;
  taskId: string;
  stepName: string;
  eventType: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'RECOVERING' | 'STOPPED';
  timestamp: number;
  durationMs?: number;
  details?: string;
  metadata?: Record<string, any>;
}

export interface GroundingDisplayInfo {
  source: string;
  level: 'LEVEL_1_UIA' | 'LEVEL_2_DOM' | 'LEVEL_2_ACCESSIBILITY' | 'LEVEL_3_OCR' | 'LEVEL_4_COORDINATES' | 'UNKNOWN';
  targetIdentity: string;
  confidence: number;
  observationId?: string;
  fallbackReason?: string;
  isFallback: boolean;
  boundingBox?: {
    center_x: number;
    center_y: number;
    width: number;
    height: number;
  };
}

export interface VerificationDisplayInfo {
  isVerified: boolean;
  state: 'UNVERIFIED' | 'VERIFYING' | 'VERIFIED' | 'FAILED';
  targetFound: boolean;
  mismatchDetails?: string;
  timestamp?: number;
}

export interface SafetyDisplayInfo {
  policyStatus: 'APPROVED' | 'EVALUATING' | 'DENIED' | 'IDLE';
  leaseStatus: 'ACTIVE' | 'ACQUIRING' | 'EXPIRED' | 'REVOKED' | 'NONE';
  activeLeaseId?: string;
  leaseTtlRemainingSec?: number;
  consentPending: boolean;
  consentReason?: string;
  consentNodeId?: string;
  consentActionText?: string;
  emergencyStopped: boolean;
  isPaused: boolean;
  pauseReason?: string;
  contentionDetected: boolean;
}

export interface TaskSummary {
  taskId: string;
  executionId?: string;
  goal: string;
  state: string;
  isSuccess: boolean;
  progressPercent: number;
  currentStep?: string;
  errorMessage?: string;
  startTime: number;
  durationMs: number;
  actionsExecuted: number;
}
