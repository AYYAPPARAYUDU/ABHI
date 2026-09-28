import { Injectable, signal, computed, effect } from '@angular/core';
import { ApiService } from './api.service';
import { TelemetryService } from './telemetry.service';
import {
  AvatarState,
  GroundingDisplayInfo,
  SafetyDisplayInfo,
  SystemHealthSummary,
  TaskSummary,
  TelemetryEvent,
  TimelineItem,
  VerificationDisplayInfo
} from '../models/telemetry.model';

@Injectable({
  providedIn: 'root'
})
export class OperatorStateService {
  // System Health State
  readonly health = signal<SystemHealthSummary>({
    overall: 'HEALTHY',
    environment: 'development',
    gateway: 'HEALTHY',
    database: 'HEALTHY',
    ollama: 'HEALTHY',
    perception: 'HEALTHY',
    windowsWorker: 'HEALTHY',
    browserWorker: 'HEALTHY',
    safetyPolicy: 'HEALTHY',
    leaseManager: 'HEALTHY',
    availableModels: []
  });

  // Avatar State (Presentation Only)
  readonly avatarState = signal<AvatarState>('IDLE');

  // Active Task State
  readonly currentTask = signal<TaskSummary | null>(null);

  // Visual & Semantic Grounding State
  readonly grounding = signal<GroundingDisplayInfo>({
    source: 'LEVEL_1_UIA',
    level: 'LEVEL_1_UIA',
    targetIdentity: 'None',
    confidence: 1.0,
    isFallback: false
  });

  // Dual-State Verification State
  readonly verification = signal<VerificationDisplayInfo>({
    isVerified: false,
    state: 'UNVERIFIED',
    targetFound: false
  });

  // Safety & Authorization State
  readonly safety = signal<SafetyDisplayInfo>({
    policyStatus: 'IDLE',
    leaseStatus: 'NONE',
    consentPending: false,
    emergencyStopped: false,
    isPaused: false,
    contentionDetected: false
  });

  // Execution Timeline Items (Bounded)
  readonly timeline = signal<TimelineItem[]>([]);

  // Computed Helpers
  readonly isBusy = computed(() => {
    const task = this.currentTask();
    if (!task) return false;
    return !['COMPLETED', 'FAILED', 'CANCELLED', 'EMERGENCY_STOPPED'].includes(task.state);
  });

  constructor(
    private readonly apiService: ApiService,
    private readonly telemetryService: TelemetryService
  ) {
    // Subscribe to live telemetry events
    this.telemetryService.events$.subscribe((event) => {
      this.processTelemetryEvent(event);
    });

    // Poll health status initially and on reconnect
    this.refreshHealth();

    effect(() => {
      if (this.telemetryService.isConnected()) {
        this.refreshHealth();
      }
    });
  }

  /**
   * Process incoming structured telemetry event.
   */
  processTelemetryEvent(event: TelemetryEvent): void {
    const type = event.type;
    const payload = event.payload || {};
    const taskId = event.task_id || this.currentTask()?.taskId || 'active_task';
    const timestamp = event.timestamp || Date.now();

    // 1. Append to timeline
    this.appendTimelineItem(taskId, type, payload, timestamp);

    // 2. Dispatch state updates by event type
    switch (type) {
      case 'TASK_CREATED':
        this.currentTask.set({
          taskId,
          executionId: payload['execution_id'],
          goal: payload['goal'] || 'Executing task intent',
          state: 'CREATED',
          isSuccess: false,
          progressPercent: 5,
          currentStep: 'Task Initialized',
          startTime: timestamp,
          durationMs: 0,
          actionsExecuted: 0
        });
        this.avatarState.set('PLANNING');
        break;

      case 'TASK_PLANNED':
        this.updateCurrentTaskState('PLANNING', 15, 'Action Planned');
        this.avatarState.set('THINKING');
        break;

      case 'POLICY_EVALUATED':
        this.safety.update((prev) => ({
          ...prev,
          policyStatus: payload['approved'] ? 'APPROVED' : 'DENIED'
        }));
        this.updateCurrentTaskState('POLICY_EVALUATION', 25, 'Policy Approved');
        break;

      case 'CONSENT_REQUIRED':
        this.safety.update((prev) => ({
          ...prev,
          consentPending: true,
          consentNodeId: payload['action_id'] || 'action_gate',
          consentReason: payload['reason'] || payload['action_text'] || `Action ${payload['action_id']} requires operator authorization (Tier: ${payload['tier'] || 'Critical'}).`,
          consentActionText: `Action ${payload['action_id']} requires operator authorization (Tier: ${payload['tier'] || 'Critical'}).`
        }));
        this.avatarState.set('WAITING_CONSENT');
        this.updateCurrentTaskState('WAITING_USER_CONSENT', 30, 'Awaiting Operator Consent');
        break;

      case 'CONSENT_GRANTED':
        this.safety.update((prev) => ({
          ...prev,
          consentPending: false,
          consentActionText: undefined
        }));
        this.updateCurrentTaskState('CONSENT_GRANTED', 35, 'Consent Granted');
        break;

      case 'LEASE_ACQUIRED':
        this.safety.update((prev) => ({
          ...prev,
          leaseStatus: 'ACTIVE',
          activeLeaseId: payload['lease_id'],
          leaseTtlRemainingSec: payload['ttl'] || 15
        }));
        this.updateCurrentTaskState('ACQUIRING_LEASE', 40, 'Lease Acquired');
        break;

      case 'GROUNDING_STARTED':
      case 'REGROUNDING_STARTED':
        this.avatarState.set('THINKING');
        this.updateCurrentTaskState('GROUNDING', 45, `Grounding Target '${payload['target']}'`);
        break;

      case 'GROUNDING_SELECTED':
        this.grounding.set({
          source: payload['source'] || 'LEVEL_1_UIA',
          level: payload['source'] || 'LEVEL_1_UIA',
          targetIdentity: payload['target_identity'] || 'Target',
          confidence: payload['confidence'] ?? 1.0,
          observationId: payload['observation_id'],
          isFallback: payload['source'] !== 'LEVEL_1_UIA' && payload['source'] !== 'LEVEL_2_DOM',
          fallbackReason: payload['fallback_reason'],
          boundingBox: payload['bounding_box']
        });
        this.updateCurrentTaskState('GROUNDING_SELECTED', 50, `Grounding: ${payload['source']}`);
        break;

      case 'PRECONDITION_CHECKED':
        this.updateCurrentTaskState('PRECONDITION_CHECK', 60, 'Precondition Checked');
        break;

      case 'ACTION_DISPATCHED':
      case 'ACTION_EXECUTING':
        this.avatarState.set('EXECUTING');
        this.updateCurrentTaskState('EXECUTING', 70, `Executing action ${payload['action_id'] || ''}`);
        break;

      case 'OBSERVATION_CAPTURED':
        this.updateCurrentTaskState('OBSERVING', 80, 'Physical Observation Captured');
        break;

      case 'VERIFICATION_STARTED':
        this.avatarState.set('VERIFYING');
        this.verification.update((prev) => ({
          ...prev,
          state: 'VERIFYING'
        }));
        this.updateCurrentTaskState('VERIFYING', 85, 'Dual-State Verifying');
        break;

      case 'VERIFICATION_COMPLETED':
        this.verification.set({
          isVerified: true,
          state: 'VERIFIED',
          targetFound: true,
          timestamp
        });
        this.updateCurrentTaskState('VERIFIED', 90, 'Verification Passed');
        break;

      case 'VERIFICATION_FAILED':
        this.verification.set({
          isVerified: false,
          state: 'FAILED',
          targetFound: false,
          mismatchDetails: payload['details'] || 'Postcondition state mismatch',
          timestamp
        });
        this.updateCurrentTaskState('VERIFICATION_FAILED', 70, 'Verification Failed');
        break;

      case 'RETRY_SELECTED':
      case 'RECOVERY_STARTED':
      case 'STATE_RECONCILIATION_STARTED':
        this.avatarState.set('RECOVERING');
        this.updateCurrentTaskState('RECOVERING', 50, `Reconciling: ${payload['reason'] || 'Interruption recovery'}`);
        break;

      case 'WORKER_FAILURE_DETECTED':
        this.health.update((prev) => ({
          ...prev,
          windowsWorker: payload['worker'] === 'WindowsAutomationWorker' ? 'DEGRADED' : prev.windowsWorker,
          browserWorker: payload['worker'] === 'BrowserAutomationWorker' ? 'DEGRADED' : prev.browserWorker
        }));
        break;

      case 'TASK_COMPLETED':
        this.avatarState.set('SUCCESS');
        this.currentTask.update((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            state: 'COMPLETED',
            isSuccess: true,
            progressPercent: 100,
            currentStep: 'Task Completed Successfully',
            durationMs: payload['duration_ms'] || Date.now() - prev.startTime
          };
        });
        this.safety.update((prev) => ({ ...prev, leaseStatus: 'NONE', activeLeaseId: undefined }));
        break;

      case 'TASK_FAILED':
        this.avatarState.set('ERROR');
        this.currentTask.update((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            state: 'FAILED',
            isSuccess: false,
            errorMessage: payload['error'] || 'Task failed execution',
            currentStep: 'Task Execution Failed'
          };
        });
        this.safety.update((prev) => ({ ...prev, leaseStatus: 'NONE', activeLeaseId: undefined }));
        break;

      case 'TASK_CANCELLED':
        this.avatarState.set('IDLE');
        this.currentTask.update((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            state: 'CANCELLED',
            isSuccess: false,
            currentStep: 'Task Cancelled'
          };
        });
        this.safety.update((prev) => ({ ...prev, leaseStatus: 'NONE', activeLeaseId: undefined }));
        break;

      case 'TASK_EMERGENCY_STOPPED':
        this.avatarState.set('EMERGENCY_STOP');
        this.safety.update((prev) => ({
          ...prev,
          emergencyStopped: true,
          leaseStatus: 'REVOKED',
          activeLeaseId: undefined
        }));
        this.currentTask.update((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            state: 'EMERGENCY_STOPPED',
            isSuccess: false,
            errorMessage: 'Immediate Emergency Stop triggered'
          };
        });
        break;

      case 'TASK_PAUSED':
        this.safety.update((prev) => ({
          ...prev,
          isPaused: true,
          pauseReason: payload['reason'] || 'Operator manual contention'
        }));
        break;

      case 'TASK_RESUMED':
        this.safety.update((prev) => ({
          ...prev,
          isPaused: false,
          pauseReason: undefined
        }));
        break;
    }
  }

  /**
   * Helper to update current task state immutably.
   */
  private updateCurrentTaskState(state: string, progress: number, stepName: string): void {
    this.currentTask.update((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        state,
        progressPercent: Math.max(prev.progressPercent, progress),
        currentStep: stepName,
        actionsExecuted: state === 'EXECUTING' ? prev.actionsExecuted + 1 : prev.actionsExecuted
      };
    });
  }

  /**
   * Append timeline item with bounded retention (max 50 items).
   */
  private appendTimelineItem(taskId: string, eventType: string, payload: Record<string, any>, timestamp: number): void {
    const item: TimelineItem = {
      id: `tl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      taskId,
      stepName: this.formatEventTitle(eventType),
      eventType,
      status: this.mapStatusFromEventType(eventType),
      timestamp,
      details: payload['target'] || payload['error'] || payload['reason'] || payload['details'] || undefined,
      metadata: payload
    };

    this.timeline.update((prev) => [item, ...prev].slice(0, 50));
  }

  private formatEventTitle(type: string): string {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private mapStatusFromEventType(type: string): TimelineItem['status'] {
    if (type.includes('COMPLETED') || type.includes('GRANTED') || type.includes('VERIFIED')) return 'COMPLETED';
    if (type.includes('FAILED') || type.includes('DENIED') || type.includes('ERROR')) return 'FAILED';
    if (type.includes('RECOVERY') || type.includes('REGROUNDING') || type.includes('RETRY')) return 'RECOVERING';
    if (type.includes('STOPPED') || type.includes('CANCELLED')) return 'STOPPED';
    return 'IN_PROGRESS';
  }

  /**
   * Submit natural language task to authoritative backend.
   */
  async submitGoal(goal: string): Promise<void> {
    const trimmed = goal.trim();
    if (!trimmed) return;

    this.avatarState.set('PLANNING');
    try {
      await this.apiService.submitTask(trimmed);
    } catch (err: any) {
      this.avatarState.set('ERROR');
      console.error('Failed to submit goal:', err);
    }
  }

  /**
   * Respond to operator consent gate.
   */
  async respondToConsent(approved: boolean): Promise<void> {
    const task = this.currentTask();
    const nodeId = this.safety().consentNodeId || 'action_gate';
    if (!task) return;

    try {
      await this.apiService.provideConsent(task.taskId, approved, nodeId);
      this.safety.update((prev) => ({ ...prev, consentPending: false }));
    } catch (err) {
      console.error('Consent response error:', err);
    }
  }

  /**
   * Trigger immediate system-wide Emergency Stop.
   */
  async triggerEmergencyStop(): Promise<void> {
    this.avatarState.set('EMERGENCY_STOP');
    this.safety.update((prev) => ({ ...prev, emergencyStopped: true }));
    try {
      await this.apiService.emergencyStop();
    } catch (err) {
      console.error('Emergency stop error:', err);
    }
  }

  /**
   * Cancel currently active task.
   */
  async cancelActiveTask(): Promise<void> {
    const task = this.currentTask();
    if (!task) return;
    try {
      await this.apiService.cancelTask(task.taskId);
    } catch (err) {
      console.error('Cancel task error:', err);
    }
  }

  /**
   * Fetch live backend health summary.
   */
  async refreshHealth(): Promise<void> {
    const raw = await this.apiService.checkHealth();
    const subs = raw.subsystems || {};

    const mapStatus = (s: string) => {
      if (s === 'healthy') return 'HEALTHY';
      if (s === 'degraded' || s === 'low') return 'DEGRADED';
      return 'UNAVAILABLE';
    };

    this.health.set({
      overall: mapStatus(raw.status || 'unknown'),
      environment: raw.environment || 'production',
      gateway: mapStatus(subs.api_gateway || 'healthy'),
      database: mapStatus(subs.database_sqlite || 'healthy'),
      ollama: mapStatus(subs.ollama_service || 'healthy'),
      perception: 'HEALTHY',
      windowsWorker: 'HEALTHY',
      browserWorker: 'HEALTHY',
      safetyPolicy: 'HEALTHY',
      leaseManager: 'HEALTHY',
      availableModels: subs.available_models || []
    });
  }

  /**
   * Reconcile local UI state with backend authoritative state snapshot.
   */
  refreshAuthoritativeState(): void {
    this.refreshHealth();
    if (!this.telemetryService.isConnected()) {
      this.telemetryService.connect();
    }
  }
}
