/**
 * Phase 6 Stage 6.4 - Canonical Frontend Perception Models.
 * Governed location: src/app/features/perception/models/perception.model.ts
 */

export type VoiceSessionState =
  | 'IDLE'
  | 'LISTENING'
  | 'VOICE_DETECTED'
  | 'TRANSCRIBING'
  | 'TRANSCRIBED'
  | 'UNDERSTANDING'
  | 'CANONICALIZED'
  | 'ERROR';

export interface VoiceStateInfo {
  sessionState: VoiceSessionState;
  language: string;
  transcript: string;
  confidence: number;
  durationSec: number;
  isListening: boolean;
  noiseFloorDb: number;
  sampleRate: number;
  timestamp: number;
}

export interface TranscriptionItem {
  id: string;
  utterance: string;
  language: string;
  confidence: number;
  timestamp: number;
  status: 'TRANSCRIBING' | 'TRANSCRIBED' | 'CANONICALIZED' | 'ERROR';
  canonicalIntent?: string;
}

export type AttentionState =
  | 'OPTIMAL'
  | 'ENGAGED'
  | 'DISTRACTED'
  | 'AWAY'
  | 'LOOKING_LEFT'
  | 'LOOKING_RIGHT'
  | 'LOOKING_UP'
  | 'LOOKING_DOWN';

export interface HeadPoseData {
  yaw: number;   // Left (-) to Right (+)
  pitch: number; // Down (-) to Up (+)
  roll: number;  // Tilt Left (-) to Tilt Right (+)
}

export interface FaceHeadStateInfo {
  faceDetected: boolean;
  confidence: number;
  headPose: HeadPoseData;
  landmarksCount: number;
  attention: AttentionState;
  blendshapes: { [key: string]: number };
  blinkDetected: boolean;
  timestamp: number;
}

export type SupportedGesture =
  | 'NONE'
  | 'THUMBS_UP'
  | 'OPEN_PALM'
  | 'PEACE'
  | 'POINTING'
  | 'PINCH'
  | 'SWIPE_LEFT'
  | 'SWIPE_RIGHT';

export interface GestureStateInfo {
  handDetected: boolean;
  handedness: string;
  detectedGesture: SupportedGesture;
  confidence: number;
  stabilized: boolean;
  stabilizationFrames: number;
  authoritativeSafetyState: 'NORMAL' | 'CONSENT_TRIGGERED' | 'EMERGENCY_STOP_TRIGGERED';
  timestamp: number;
}

export type GroundingLevel =
  | 'LEVEL_1_UIA'
  | 'LEVEL_2_DOM'
  | 'LEVEL_2_ACCESSIBILITY'
  | 'LEVEL_3_OCR'
  | 'LEVEL_4_COORDINATES'
  | 'UNKNOWN';

export interface ScreenVisionStateInfo {
  status: 'ACTIVE' | 'STANDBY' | 'OBSERVING' | 'GROUNDED' | 'ERROR';
  observationId: string;
  target: string;
  confidence: number;
  groundingLevel: GroundingLevel;
  detectedElementsCount: number;
  processingTimeMs: number;
  fullTextPreview?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    center_x: number;
    center_y: number;
  };
  timestamp: number;
}

export type SubsystemHealth = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';

export interface PerceptionHealthInfo {
  microphone: SubsystemHealth;
  stt: SubsystemHealth;
  tts: SubsystemHealth;
  faceTracker: SubsystemHealth;
  handTracker: SubsystemHealth;
  screenOcr: SubsystemHealth;
  perceptionDaemon: SubsystemHealth;
  telemetry: SubsystemHealth;
  details?: { [key: string]: any };
}

export interface PerceptionState {
  voice: VoiceStateInfo;
  transcriptionHistory: TranscriptionItem[];
  faceHead: FaceHeadStateInfo;
  gesture: GestureStateInfo;
  screenVision: ScreenVisionStateInfo;
  health: PerceptionHealthInfo;
  timestamp: number;
}
