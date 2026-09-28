import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { TelemetryService } from '../../../core/websocket/telemetry.service';
import { TaskApiService } from '../../../core/api/task-api.service';
import { TelemetryEvent } from '../../../core/models/telemetry.model';
import {
  AttentionState,
  FaceHeadStateInfo,
  GestureStateInfo,
  HeadPoseData,
  PerceptionHealthInfo,
  ScreenVisionStateInfo,
  SupportedGesture,
  TranscriptionItem,
  VoiceSessionState,
  VoiceStateInfo
} from '../models/perception.model';

@Injectable({
  providedIn: 'root'
})
export class PerceptionService implements OnDestroy {
  private readonly telemetry = inject(TelemetryService);
  private readonly apiService = inject(TaskApiService);
  private subscription: Subscription = new Subscription();

  // Gesture temporal stabilization buffer (3-frame window)
  private gestureBuffer: SupportedGesture[] = [];
  private readonly STABILIZATION_THRESHOLD = 3;

  // 1. Voice State Signal
  readonly voice = signal<VoiceStateInfo>({
    sessionState: 'IDLE',
    language: 'en',
    transcript: '',
    confidence: 1.0,
    durationSec: 0,
    isListening: false,
    noiseFloorDb: -48.0,
    sampleRate: 16000,
    timestamp: Date.now()
  });

  // 2. Transcription History Signal (Bounded to max 30 items)
  readonly transcriptions = signal<TranscriptionItem[]>([]);

  // 3. Face / Head Attention Signal
  readonly faceHead = signal<FaceHeadStateInfo>({
    faceDetected: true,
    confidence: 0.95,
    headPose: { yaw: 0.0, pitch: 0.0, roll: 0.0 },
    landmarksCount: 468,
    attention: 'OPTIMAL',
    blendshapes: { smile: 0.1, eye_blink_left: 0.0, eye_blink_right: 0.0 },
    blinkDetected: false,
    timestamp: Date.now()
  });

  // 4. Gesture State Signal
  readonly gesture = signal<GestureStateInfo>({
    handDetected: false,
    handedness: 'Right',
    detectedGesture: 'NONE',
    confidence: 0.0,
    stabilized: false,
    stabilizationFrames: 0,
    authoritativeSafetyState: 'NORMAL',
    timestamp: Date.now()
  });

  // 5. Screen / OCR Vision State Signal
  readonly screenVision = signal<ScreenVisionStateInfo>({
    status: 'STANDBY',
    observationId: 'obs_idle',
    target: 'None',
    confidence: 1.0,
    groundingLevel: 'LEVEL_1_UIA',
    detectedElementsCount: 6,
    processingTimeMs: 12.5,
    fullTextPreview: 'Local-First Personal AI Automation System',
    timestamp: Date.now()
  });

  // 6. Perception Engine Health Signal
  readonly health = signal<PerceptionHealthInfo>({
    microphone: 'HEALTHY',
    stt: 'HEALTHY',
    tts: 'HEALTHY',
    faceTracker: 'HEALTHY',
    handTracker: 'HEALTHY',
    screenOcr: 'HEALTHY',
    perceptionDaemon: 'HEALTHY',
    telemetry: 'HEALTHY'
  });

  // 7. Bounded Telemetry Events (Max 50 items)
  readonly telemetryLogs = signal<TelemetryEvent[]>([]);

  // Computed Properties
  readonly isVoiceActive = computed(() => this.voice().isListening || this.voice().sessionState === 'VOICE_DETECTED');
  readonly isEmergencyStopActive = computed(() => this.gesture().authoritativeSafetyState === 'EMERGENCY_STOP_TRIGGERED');
  readonly currentGestureEmoji = computed(() => {
    const g = this.gesture().detectedGesture;
    switch (g) {
      case 'THUMBS_UP': return '👍';
      case 'OPEN_PALM': return '✋';
      case 'PEACE': return '✌️';
      case 'POINTING': return '👉';
      case 'PINCH': return '🤏';
      case 'SWIPE_LEFT': return '👈';
      case 'SWIPE_RIGHT': return '👉';
      default: return '🖐️';
    }
  });

  constructor() {
    // Subscribe to unified telemetry events stream
    this.subscription.add(
      this.telemetry.events$.subscribe((event) => {
        this.handleTelemetryEvent(event);
      })
    );

    // Initial status fetch
    this.refreshPerceptionHealth();
  }

  /**
   * Process structured telemetry events from backend WebSocket.
   */
  handleTelemetryEvent(event: TelemetryEvent): void {
    const { type, payload = {}, timestamp = Date.now() } = event;

    // Append to bounded telemetry log
    this.telemetryLogs.update((prev) => [event, ...prev].slice(0, 50));

    switch (type) {
      case 'VOICE_LISTENING':
        this.voice.update((v) => ({
          ...v,
          sessionState: 'LISTENING',
          isListening: true,
          timestamp
        }));
        break;

      case 'PERCEPTION_VOICE_CHUNK':
        this.voice.update((v) => ({
          ...v,
          sessionState: 'VOICE_DETECTED',
          noiseFloorDb: payload['rms_db'] || v.noiseFloorDb,
          timestamp
        }));
        break;

      case 'VOICE_TRANSCRIPTION':
      case 'PERCEPTION_TRANSCRIPTION': {
        const text = payload['transcript'] || payload['text'] || '';
        const lang = payload['language'] || 'en';
        const conf = payload['confidence'] ?? 0.95;
        this.voice.update((v) => ({
          ...v,
          sessionState: 'TRANSCRIBED',
          transcript: text,
          language: lang,
          confidence: conf,
          timestamp
        }));
        this.addTranscriptionItem(text, lang, conf, 'TRANSCRIBED');
        break;
      }

      case 'VOICE_UNDERSTANDING':
      case 'INTENT_CANONICALIZED': {
        const intent = payload['canonical_intent'] || payload['intent'] || '';
        this.voice.update((v) => ({
          ...v,
          sessionState: 'CANONICALIZED',
          timestamp
        }));
        this.updateLatestTranscriptionIntent(intent);
        break;
      }

      case 'FACE_TRACKED':
      case 'PERCEPTION_FACE_UPDATE': {
        const pose: HeadPoseData = payload['head_pose'] || { yaw: 0, pitch: 0, roll: 0 };
        const attention = this.computeAttention(pose);
        const blendshapes = payload['blendshapes'] || {};
        const blink = (blendshapes['eye_blink_left'] || 0) > 0.5 || (blendshapes['eye_blink_right'] || 0) > 0.5;

        this.faceHead.set({
          faceDetected: payload['face_detected'] ?? true,
          confidence: payload['confidence'] ?? 0.95,
          headPose: pose,
          landmarksCount: payload['landmarks_count'] || 468,
          attention,
          blendshapes,
          blinkDetected: blink,
          timestamp
        });
        break;
      }

      case 'GESTURE_DETECTED':
      case 'PERCEPTION_HAND_UPDATE': {
        const gestureName = (payload['gesture'] || payload['detected_gesture'] || 'NONE') as SupportedGesture;
        const confidence = payload['confidence'] ?? 0.95;
        const handedness = payload['handedness'] || 'Right';
        this.processGestureFrame(gestureName, confidence, handedness, timestamp);
        break;
      }

      case 'GROUNDING_STARTED':
        this.screenVision.update((s) => ({
          ...s,
          status: 'OBSERVING',
          target: payload['target'] || 'Grounding Target',
          timestamp
        }));
        break;

      case 'GROUNDING_SELECTED':
        this.screenVision.set({
          status: 'GROUNDED',
          observationId: payload['observation_id'] || 'obs_' + Date.now(),
          target: payload['target_identity'] || 'Target',
          confidence: payload['confidence'] ?? 0.95,
          groundingLevel: payload['source'] || 'LEVEL_3_OCR',
          detectedElementsCount: payload['elements_count'] || 6,
          processingTimeMs: payload['processing_time_ms'] || 12.5,
          boundingBox: payload['bounding_box'],
          timestamp
        });
        break;

      case 'TASK_EMERGENCY_STOPPED':
        this.gesture.update((g) => ({
          ...g,
          authoritativeSafetyState: 'EMERGENCY_STOP_TRIGGERED'
        }));
        break;

      case 'CONSENT_REQUIRED':
        this.gesture.update((g) => ({
          ...g,
          authoritativeSafetyState: 'CONSENT_TRIGGERED'
        }));
        break;

      case 'CONSENT_GRANTED':
      case 'TASK_COMPLETED':
      case 'TASK_CANCELLED':
        this.gesture.update((g) => ({
          ...g,
          authoritativeSafetyState: 'NORMAL'
        }));
        break;
    }
  }

  /**
   * Gesture stabilization filter: Requires 3 consecutive identical frames.
   */
  private processGestureFrame(
    gestureName: SupportedGesture,
    confidence: number,
    handedness: string,
    timestamp: number
  ): void {
    this.gestureBuffer.push(gestureName);
    if (this.gestureBuffer.length > this.STABILIZATION_THRESHOLD) {
      this.gestureBuffer.shift();
    }

    const isStabilized =
      this.gestureBuffer.length >= this.STABILIZATION_THRESHOLD &&
      this.gestureBuffer.every((g) => g === gestureName && g !== 'NONE');

    let safetyState: 'NORMAL' | 'CONSENT_TRIGGERED' | 'EMERGENCY_STOP_TRIGGERED' = this.gesture().authoritativeSafetyState;
    if (isStabilized) {
      if (gestureName === 'OPEN_PALM') {
        safetyState = 'EMERGENCY_STOP_TRIGGERED';
      } else if (gestureName === 'THUMBS_UP' && safetyState === 'CONSENT_TRIGGERED') {
        safetyState = 'NORMAL';
      }
    }

    this.gesture.set({
      handDetected: gestureName !== 'NONE',
      handedness,
      detectedGesture: gestureName,
      confidence,
      stabilized: isStabilized,
      stabilizationFrames: this.gestureBuffer.filter((g) => g === gestureName).length,
      authoritativeSafetyState: safetyState,
      timestamp
    });
  }

  /**
   * Determine head attention state based on yaw and pitch angles.
   */
  private computeAttention(pose: HeadPoseData): AttentionState {
    const { yaw, pitch } = pose;
    if (Math.abs(yaw) > 35 || Math.abs(pitch) > 30) return 'AWAY';
    if (yaw < -15) return 'LOOKING_LEFT';
    if (yaw > 15) return 'LOOKING_RIGHT';
    if (pitch < -15) return 'LOOKING_DOWN';
    if (pitch > 15) return 'LOOKING_UP';
    if (Math.abs(yaw) <= 10 && Math.abs(pitch) <= 10) return 'OPTIMAL';
    return 'ENGAGED';
  }

  /**
   * Add a recognized transcription entry to the bounded list.
   */
  private addTranscriptionItem(
    utterance: string,
    language: string,
    confidence: number,
    status: TranscriptionItem['status']
  ): void {
    if (!utterance.trim()) return;
    const item: TranscriptionItem = {
      id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      utterance,
      language,
      confidence,
      timestamp: Date.now(),
      status
    };

    this.transcriptions.update((prev) => [item, ...prev].slice(0, 30));
  }

  private updateLatestTranscriptionIntent(canonicalIntent: string): void {
    this.transcriptions.update((prev) => {
      if (prev.length === 0) return prev;
      const [latest, ...rest] = prev;
      return [{ ...latest, canonicalIntent, status: 'CANONICALIZED' }, ...rest];
    });
  }

  /**
   * Toggle Voice Microphone listening session.
   */
  toggleMicrophone(): void {
    const currentlyListening = this.voice().isListening;
    if (currentlyListening) {
      this.voice.update((v) => ({
        ...v,
        sessionState: 'IDLE',
        isListening: false,
        timestamp: Date.now()
      }));
    } else {
      this.voice.update((v) => ({
        ...v,
        sessionState: 'LISTENING',
        isListening: true,
        transcript: '',
        timestamp: Date.now()
      }));
    }
  }

  /**
   * Query perception backend for health and capability status.
   */
  async refreshPerceptionHealth(): Promise<void> {
    try {
      const res = await this.apiService.getPerceptionStatus();
      this.health.set({
        microphone: res.audio?.vad_available ? 'HEALTHY' : 'UNAVAILABLE',
        stt: res.audio?.stt_engine ? 'HEALTHY' : 'UNAVAILABLE',
        tts: res.audio?.tts_engine ? 'HEALTHY' : 'UNAVAILABLE',
        faceTracker: res.vision?.face_tracking ? 'HEALTHY' : 'UNAVAILABLE',
        handTracker: res.vision?.hand_tracking ? 'HEALTHY' : 'UNAVAILABLE',
        screenOcr: res.vision?.screen_ocr_grounding ? 'HEALTHY' : 'UNAVAILABLE',
        perceptionDaemon: 'HEALTHY',
        telemetry: this.telemetry.isConnected() ? 'HEALTHY' : 'DEGRADED',
        details: res
      });
    } catch (e) {
      this.health.update((h) => ({
        ...h,
        perceptionDaemon: 'DEGRADED',
        telemetry: this.telemetry.isConnected() ? 'HEALTHY' : 'UNAVAILABLE'
      }));
    }
  }

  /**
   * Trigger local screen OCR grounding analysis.
   */
  async triggerScreenOCR(query?: string): Promise<void> {
    this.screenVision.update((s) => ({
      ...s,
      status: 'OBSERVING',
      target: query || 'Full Screen Text Search',
      timestamp: Date.now()
    }));

    try {
      const response = await fetch('http://127.0.0.1:8000/api/v1/perception/vision/screen_ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_width: 1920, image_height: 1080, target_query: query || null })
      });

      if (response.ok) {
        const data = await response.json();
        const elements = data.detected_elements || [];
        this.screenVision.set({
          status: 'GROUNDED',
          observationId: 'ocr_' + Date.now(),
          target: query || 'Screen Analysis',
          confidence: 0.98,
          groundingLevel: 'LEVEL_3_OCR',
          detectedElementsCount: elements.length,
          processingTimeMs: data.processing_time_ms || 12.5,
          fullTextPreview: data.full_text || '',
          boundingBox: elements[0]?.box,
          timestamp: Date.now()
        });
      }
    } catch (err) {
      this.screenVision.update((s) => ({
        ...s,
        status: 'STANDBY',
        timestamp: Date.now()
      }));
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
