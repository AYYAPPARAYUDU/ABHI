import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { TaskApiService } from '../../../core/api/task-api.service';
import { TelemetryService } from '../../../core/websocket/telemetry.service';
import { OperatorStateService } from '../../../core/services/operator-state.service';
import {
  CommandPreview,
  FaceAttentionInfo,
  GestureStatusInfo,
  InteractionMode,
  InteractionSource,
  InteractionState,
  MultimodalInput,
  VoiceState
} from '../models/interaction.model';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class InteractionService implements OnDestroy {
  private readonly telemetrySub: Subscription;
  private gestureHistory: string[] = [];
  private readonly GESTURE_STABILIZATION_THRESHOLD = 3;

  readonly state = signal<InteractionState>({
    mode: 'TEXT',
    voiceState: 'IDLE',
    listening: false,
    transcript: '',
    detectedLanguage: 'en',
    confidence: 1.0,
    canonicalIntent: '',
    preview: null,
    awaitingConsent: false,
    activeTaskId: null,
    executionState: 'IDLE',
    lastResult: null,
    errorMessage: null,
    gesture: {
      activeGesture: 'NONE',
      isStabilized: false,
      stabilizationFrames: 0,
      confidence: 1.0,
      isEmergencyStop: false,
      isConsentApproval: false,
      timestamp: Date.now()
    },
    face: {
      attentionState: 'ENGAGED',
      gazeOrientation: 'CENTER',
      confidence: 1.0,
      timestamp: Date.now()
    },
    history: [],
    timestamp: Date.now()
  });

  // Selectors / Computeds
  readonly mode = computed(() => this.state().mode);
  readonly voiceState = computed(() => this.state().voiceState);
  readonly isListening = computed(() => this.state().listening);
  readonly transcript = computed(() => this.state().transcript);
  readonly preview = computed(() => this.state().preview);
  readonly gesture = computed(() => this.state().gesture);
  readonly face = computed(() => this.state().face);
  readonly history = computed(() => this.state().history);
  readonly isBusy = computed(() => ['EXECUTING', 'PROCESSING', 'TRANSCRIBING', 'UNDERSTANDING'].includes(this.state().voiceState));

  constructor(
    private readonly apiService: TaskApiService,
    private readonly telemetryService: TelemetryService,
    private readonly operatorState: OperatorStateService
  ) {
    this.telemetrySub = this.telemetryService.events$.subscribe((event) => {
      this.handleTelemetryEvent(event);
    });
  }

  setMode(mode: InteractionMode): void {
    this.state.update((s) => ({ ...s, mode }));
  }

  /**
   * Start or toggle bounded voice interaction session.
   */
  startVoiceSession(): void {
    if (this.state().listening) return;

    this.state.update((s) => ({
      ...s,
      mode: 'VOICE',
      listening: true,
      voiceState: 'LISTENING',
      transcript: 'Listening for voice input...',
      errorMessage: null
    }));

    this.operatorState.avatarState.set('LISTENING');

    // Simulate VAD / STT capture event via backend
    setTimeout(() => {
      if (this.state().listening) {
        this.processVoiceAudio();
      }
    }, 1800);
  }

  /**
   * Stop active listening session.
   */
  stopVoiceSession(): void {
    this.state.update((s) => ({
      ...s,
      listening: false,
      voiceState: s.voiceState === 'LISTENING' ? 'IDLE' : s.voiceState
    }));
    if (this.operatorState.avatarState() === 'LISTENING') {
      this.operatorState.avatarState.set('IDLE');
    }
  }

  /**
   * Process voice buffer through backend STT and Canonicalizer.
   */
  async processVoiceAudio(language?: string): Promise<void> {
    try {
      this.state.update((s) => ({ ...s, listening: false, voiceState: 'TRANSCRIBING' }));
      this.operatorState.avatarState.set('THINKING');

      // Call backend local STT endpoint
      const sttRes = await this.apiService.transcribeAudio(undefined, language);
      const transcribedText = sttRes.text || 'Open calculator';

      this.state.update((s) => ({
        ...s,
        voiceState: 'UNDERSTANDING',
        transcript: transcribedText,
        detectedLanguage: sttRes.language || 'en',
        confidence: sttRes.confidence || 0.95
      }));

      // Generate structured command preview
      await this.generateCommandPreview(transcribedText, 'VOICE', sttRes.language, sttRes.confidence);
    } catch (err: any) {
      this.state.update((s) => ({
        ...s,
        voiceState: 'ERROR',
        listening: false,
        errorMessage: err.message || 'Voice transcription failed'
      }));
      this.operatorState.avatarState.set('ERROR');
    }
  }

  /**
   * Submit natural language text command directly.
   */
  async submitTextCommand(rawText: string, language?: string): Promise<void> {
    const textClean = rawText.trim();
    if (!textClean) return;

    this.state.update((s) => ({
      ...s,
      mode: 'TEXT',
      transcript: textClean,
      voiceState: 'UNDERSTANDING',
      errorMessage: null
    }));
    this.operatorState.avatarState.set('PLANNING');

    await this.generateCommandPreview(textClean, 'TEXT', language, 1.0);
  }

  /**
   * Generate canonical intent and command preview from input.
   */
  async generateCommandPreview(
    rawText: string,
    source: InteractionSource,
    language?: string,
    confidence: number = 1.0
  ): Promise<void> {
    try {
      const previewRes = await this.apiService.getCommandPreview(rawText, source, language, confidence);

      const preview: CommandPreview = {
        command: previewRes.command,
        interpretedAction: previewRes.interpreted_action,
        target: previewRes.target,
        source: previewRes.source as InteractionSource,
        language: previewRes.language,
        confidence: previewRes.confidence,
        status: previewRes.status,
        requiresConsent: previewRes.requires_consent,
        slots: previewRes.slots || {}
      };

      this.state.update((s) => ({
        ...s,
        preview,
        canonicalIntent: preview.interpretedAction,
        voiceState: preview.requiresConsent ? 'REQUIRES_CONFIRMATION' : 'READY',
        awaitingConsent: preview.requiresConsent
      }));

      if (preview.requiresConsent) {
        this.operatorState.avatarState.set('WAITING_CONSENT');
      } else {
        this.operatorState.avatarState.set('PLANNING');
      }
    } catch (err: any) {
      this.state.update((s) => ({
        ...s,
        voiceState: 'ERROR',
        errorMessage: err.message || 'Preview generation failed'
      }));
      this.operatorState.avatarState.set('ERROR');
    }
  }

  /**
   * Execute the currently previewed command through the authoritative Supervisor.
   */
  async executeCurrentPreview(): Promise<void> {
    const currentPreview = this.state().preview;
    if (!currentPreview) return;

    try {
      this.state.update((s) => ({
        ...s,
        voiceState: 'EXECUTING',
        executionState: 'DISPATCHING'
      }));
      this.operatorState.avatarState.set('EXECUTING');

      // Submit task to backend Central Supervisor
      const res = await this.apiService.submitTask(currentPreview.command);
      const taskId = res.task_id;

      const record: MultimodalInput = {
        inputId: `in_${Date.now()}`,
        source: currentPreview.source,
        timestamp: Date.now(),
        language: currentPreview.language,
        normalizedText: currentPreview.command,
        intent: currentPreview.interpretedAction,
        confidence: currentPreview.confidence,
        context: { taskId, target: currentPreview.target }
      };

      this.state.update((s) => ({
        ...s,
        activeTaskId: taskId,
        executionState: res.state || 'EXECUTING',
        voiceState: 'SUCCESS',
        lastResult: `Task ${taskId} submitted successfully`,
        history: [record, ...s.history].slice(0, 50)
      }));

      this.operatorState.avatarState.set('SUCCESS');
      setTimeout(() => {
        if (this.state().voiceState === 'SUCCESS') {
          this.state.update((s) => ({ ...s, voiceState: 'IDLE', preview: null }));
          this.operatorState.avatarState.set('IDLE');
        }
      }, 3000);
    } catch (err: any) {
      this.state.update((s) => ({
        ...s,
        voiceState: 'ERROR',
        executionState: 'FAILED',
        errorMessage: err.message || 'Task execution failed'
      }));
      this.operatorState.avatarState.set('ERROR');
    }
  }

  /**
   * Cancel active interaction or task.
   */
  async cancelInteraction(): Promise<void> {
    const activeTaskId = this.state().activeTaskId;
    if (activeTaskId) {
      try {
        await this.apiService.cancelTask(activeTaskId);
      } catch (err) {
        console.warn('Cancel task failed:', err);
      }
    }

    this.state.update((s) => ({
      ...s,
      listening: false,
      voiceState: 'IDLE',
      preview: null,
      awaitingConsent: false,
      activeTaskId: null,
      executionState: 'CANCELLED',
      lastResult: 'Interaction cancelled by operator'
    }));

    this.operatorState.avatarState.set('IDLE');
  }

  /**
   * Handle incoming WebSocket telemetry events with strict priority dispatch.
   */
  private handleTelemetryEvent(event: any): void {
    const type = event.type;
    const payload = event.payload || {};

    // 1. HIGHEST PRIORITY: EMERGENCY STOP
    if (type === 'EMERGENCY_STOP' || type === 'SAFETY_EMERGENCY_STOP') {
      this.state.update((s) => ({
        ...s,
        listening: false,
        voiceState: 'IDLE',
        preview: null,
        awaitingConsent: false,
        executionState: 'EMERGENCY_STOPPED',
        errorMessage: 'Emergency Stop Triggered'
      }));
      this.operatorState.avatarState.set('EMERGENCY_STOP');
      return;
    }

    // 2. PERCEPTION TELEMETRY (Audio VAD, Face Tracking, Hand Gestures)
    if (type === 'PERCEPTION_TELEMETRY') {
      this.processPerceptionTelemetry(payload);
    }

    // 3. TASK EXECUTION STATE CHANGES
    if (type === 'TASK_STATE_CHANGED' || type === 'TASK_STARTED') {
      if (payload.task_id === this.state().activeTaskId) {
        this.state.update((s) => ({
          ...s,
          executionState: payload.new_state || payload.state || 'IN_PROGRESS'
        }));
      }
    }
  }

  /**
   * Process and stabilize live vision and hand gesture telemetry.
   */
  private processPerceptionTelemetry(payload: any): void {
    const hand = payload.hand || {};
    const face = payload.face || {};

    const rawGesture = hand.gesture || 'NONE';
    this.gestureHistory.push(rawGesture);
    if (this.gestureHistory.length > 5) {
      this.gestureHistory.shift();
    }

    // Check consecutive frame stabilization
    const stableCount = this.gestureHistory.filter((g) => g === rawGesture).length;
    const isStabilized = stableCount >= this.GESTURE_STABILIZATION_THRESHOLD && rawGesture !== 'NONE';

    const isEmergencyStop = isStabilized && rawGesture === 'OPEN_PALM';
    const isConsentApproval = isStabilized && rawGesture === 'THUMBS_UP';

    const gestureInfo: GestureStatusInfo = {
      activeGesture: rawGesture,
      isStabilized,
      stabilizationFrames: stableCount,
      confidence: hand.confidence || 0.9,
      isEmergencyStop,
      isConsentApproval,
      timestamp: Date.now()
    };

    const faceInfo: FaceAttentionInfo = {
      attentionState: face.face_detected ? 'ENGAGED' : 'ABSENT',
      gazeOrientation: face.head_pose?.yaw > 15 ? 'RIGHT' : face.head_pose?.yaw < -15 ? 'LEFT' : 'CENTER',
      confidence: face.confidence || 0.95,
      timestamp: Date.now()
    };

    this.state.update((s) => ({
      ...s,
      gesture: gestureInfo,
      face: faceInfo
    }));

    // Trigger actions based on stabilized gestures
    if (isEmergencyStop) {
      this.apiService.emergencyStop().catch((e) => console.warn('Gesture emergency stop error:', e));
    } else if (isConsentApproval && this.state().awaitingConsent && this.state().activeTaskId) {
      this.apiService
        .provideConsent(this.state().activeTaskId!, true)
        .then(() => {
          this.state.update((s) => ({ ...s, awaitingConsent: false }));
        })
        .catch((e) => console.warn('Gesture consent error:', e));
    }
  }

  ngOnDestroy(): void {
    if (this.telemetrySub) {
      this.telemetrySub.unsubscribe();
    }
  }
}
