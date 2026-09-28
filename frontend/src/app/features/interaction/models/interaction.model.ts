/**
 * Multimodal Interaction & Command Interface Data Models.
 * Governed location: src/app/features/interaction/models/interaction.model.ts
 */

export type InteractionSource = 'TEXT' | 'VOICE' | 'GESTURE' | 'FACE';

export type VoiceState =
  | 'IDLE'
  | 'LISTENING'
  | 'PROCESSING'
  | 'TRANSCRIBING'
  | 'UNDERSTANDING'
  | 'READY'
  | 'REQUIRES_CONFIRMATION'
  | 'EXECUTING'
  | 'SUCCESS'
  | 'ERROR';

export type InteractionMode = 'VOICE' | 'TEXT' | 'GESTURE';

export interface MultimodalInput {
  inputId: string;
  source: InteractionSource;
  timestamp: number;
  language: string;
  rawReference?: string;
  normalizedText: string;
  intent: string;
  confidence: number;
  context?: Record<string, any>;
}

export interface CommandPreview {
  command: string;
  interpretedAction: string;
  target: string;
  source: InteractionSource;
  language: string;
  confidence: number;
  status: string;
  requiresConsent: boolean;
  slots: Record<string, any>;
}

export interface GestureStatusInfo {
  activeGesture: string;
  isStabilized: boolean;
  stabilizationFrames: number;
  confidence: number;
  isEmergencyStop: boolean;
  isConsentApproval: boolean;
  timestamp: number;
}

export interface FaceAttentionInfo {
  attentionState: 'ENGAGED' | 'DISTRACTED' | 'ABSENT';
  gazeOrientation: string;
  confidence: number;
  timestamp: number;
}

export interface InteractionState {
  mode: InteractionMode;
  voiceState: VoiceState;
  listening: boolean;
  transcript: string;
  detectedLanguage: string;
  confidence: number;
  canonicalIntent: string;
  preview: CommandPreview | null;
  awaitingConsent: boolean;
  activeTaskId: string | null;
  executionState: string;
  lastResult: string | null;
  errorMessage: string | null;
  gesture: GestureStatusInfo;
  face: FaceAttentionInfo;
  history: MultimodalInput[];
  timestamp: number;
}
