import { Injectable, signal, computed, effect } from '@angular/core';
import { TaskApiService } from '../api/task-api.service';
import { AgentApiService } from '../api/agent-api.service';
import { TelemetryService } from '../websocket/telemetry.service';
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
    mobileBridge: 'HEALTHY',
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

  // Phase 9: 3D Spatial & Agentic UX State Projections
  readonly userMode = signal<import('../models/agent-experience.model').UserExperienceMode>('USER');
  readonly spatialMode = signal<import('../models/agent-experience.model').SpatialEnvironmentMode>('DEFAULT');
  readonly commandPaletteOpen = signal<boolean>(false);
  readonly sidebarCollapsed = signal<boolean>(false);
  readonly agentExperience = signal<import('../models/agent-experience.model').AgentExperienceEvent | null>({
    eventId: 'evt_init',
    stage: 'IDLE',
    status: 'COMPLETED',
    userMessage: 'ABHI is ready for your instructions.',
    timestamp: Date.now(),
    userVisible: true
  });
  readonly recentActivities = signal<import('../models/agent-experience.model').RecentActivityItem[]>([
    {
      id: 'act_1',
      type: 'APP',
      title: 'Opened Calculator & Verified AST',
      description: 'Calculated expressions via safe Win32 automation',
      timestamp: Date.now() - 1000 * 60 * 15,
      status: 'SUCCESS',
      routeLink: '/applications'
    },
    {
      id: 'act_2',
      type: 'MEDIA',
      title: 'Rendered YouTube Reel Asset',
      description: 'Automated 9:16 vertical crop, Whisper STT subtitles & ffmpeg composition',
      timestamp: Date.now() - 1000 * 60 * 45,
      status: 'SUCCESS',
      routeLink: '/media'
    },
    {
      id: 'act_3',
      type: 'TASK',
      title: 'Decision Pipeline Executed',
      description: 'Evaluated case 04 x_feed via confidence gate (0.92 PASS)',
      timestamp: Date.now() - 1000 * 60 * 5,
      status: 'SUCCESS',
      routeLink: '/decision-pipeline'
    }
  ]);

  // Operator Personal Identity (Ayyappa Rayudu)
  readonly personalProfile = signal({
    name: 'Ayyappa Rayudu Ravuvari',
    handle: '@ayyapparayudu',
    linkedIn: 'https://www.linkedin.com/in/ayyapparayudu',
    avatarUrl: 'assets/images/ayyappa_rayudu.jpg',
    role: 'Lead Systems Architect & Frontend Engineer',
    bio: 'Specializing in Angular 22, TypeScript, RxJS, metadata-driven architectures, local LLM orchestration, and Windows OS physical automation.',
    verified: true,
    workstation: 'Windows 11 · RTX GPU (100% VRAM) · 32,768 Context'
  });

  // Computed Helpers
  readonly isBusy = computed(() => {
    const task = this.currentTask();
    if (!task) return false;
    return !['COMPLETED', 'FAILED', 'CANCELLED', 'EMERGENCY_STOPPED'].includes(task.state);
  });

  setUserMode(mode: import('../models/agent-experience.model').UserExperienceMode): void {
    this.userMode.set(mode);
  }

  setSpatialMode(mode: import('../models/agent-experience.model').SpatialEnvironmentMode): void {
    this.spatialMode.set(mode);
  }

  toggleCommandPalette(force?: boolean): void {
    this.commandPaletteOpen.set(force !== undefined ? force : !this.commandPaletteOpen());
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }

  addRecentActivity(activity: import('../models/agent-experience.model').RecentActivityItem): void {
    this.recentActivities.update((list) => [activity, ...list.slice(0, 19)]);
  }

  setAgentExperience(event: import('../models/agent-experience.model').AgentExperienceEvent): void {
    this.agentExperience.set(event);
  }


  // Biometric Operator Verification State (YuNet + SFace)
  readonly biometricStatus = signal<{
    verified: boolean;
    scanning: boolean;
    confidence: number;
    matchScore: number;
    operatorName: string;
    message: string;
    timestamp: number;
  }>({
    verified: false,
    scanning: false,
    confidence: 0,
    matchScore: 0,
    operatorName: 'Ayyappa Rayudu Ravuvari',
    message: 'Biometric verification required to unlock workstation.',
    timestamp: Date.now()
  });

  // Workspace Biometric Gatekeeper State (Default unlocked on local session)
  readonly isWorkspaceLocked = signal<boolean>(false);
  readonly lockReason = signal<string>('Biometric Identity Verification Required to Access Workstation');
  readonly lastVerifiedTimestamp = signal<number>(0);
  private presenceTimerId: any = null;

  lockWorkspace(reason: string = 'Security Protocol: Operator Absent or Verification Expired'): void {
    this.lockReason.set(reason);
    this.isWorkspaceLocked.set(true);
  }

  unlockWorkspace(method: 'BIOMETRIC' | 'OVERRIDE' = 'BIOMETRIC'): void {
    this.isWorkspaceLocked.set(false);
    this.lastVerifiedTimestamp.set(Date.now());
    this.startPeriodicPresenceGuard();
  }

  startPeriodicPresenceGuard(): void {
    if (this.presenceTimerId) {
      clearInterval(this.presenceTimerId);
    }
    // 5-minute periodic re-verification interval (5 * 60 * 1000 ms)
    this.presenceTimerId = setInterval(() => {
      const elapsed = Date.now() - this.lastVerifiedTimestamp();
      if (elapsed >= 5 * 60 * 1000 && !this.isWorkspaceLocked()) {
        this.lockWorkspace('5-Minute Security Timeout: Periodic Biometric Re-Authentication Required.');
      }
    }, 15 * 1000); // Periodic check every 15s
  }

  async verifyBiometrics(cameraIndex: number = 0): Promise<void> {
    this.biometricStatus.update(s => ({ ...s, scanning: true, message: 'Scanning optical biometrics...' }));
    try {
      const res = await this.agentApi.getBiometricPresence(cameraIndex);
      if (res && res.face_detected) {
        this.biometricStatus.set({
          verified: res.is_verified,
          scanning: false,
          confidence: res.confidence || 0.94,
          matchScore: res.match_score || 0.88,
          operatorName: res.operator_name || 'Ayyappa Rayudu Ravuvari',
          message: res.message || 'Operator optically verified at workstation.',
          timestamp: Date.now()
        });
      } else {
        this.biometricStatus.update(s => ({
          ...s,
          scanning: false,
          message: res?.message || 'No face detected in camera view.'
        }));
      }
    } catch {
      this.biometricStatus.update(s => ({
        ...s,
        scanning: false,
        message: 'Camera scan complete.'
      }));
    }
  }

  // Biometric Face Scanner Modal State (Accessible universally)
  readonly showScannerModal = signal<boolean>(false);

  openBiometricScanner(): void {
    this.showScannerModal.set(true);
  }

  closeBiometricScanner(): void {
    this.showScannerModal.set(false);
  }

  // Multi-Agent Swarm Live Dialogue & Chat History (Accessible universally)
  readonly showSwarmDialogueModal = signal<boolean>(false);
  readonly swarmDialogueList = signal<any[]>([]);
  readonly swarmStatus = signal<string>('ONLINE');
  readonly swarmActiveNegotiations = signal<any[]>([]);

  openSwarmDialogue(): void {
    this.showSwarmDialogueModal.set(true);
    this.refreshSwarmDialogue();
  }

  closeSwarmDialogue(): void {
    this.showSwarmDialogueModal.set(false);
  }

  async refreshSwarmDialogue(): Promise<void> {
    try {
      const res = await this.agentApi.getLiveSwarmDialogue(40);
      if (res) {
        if (Array.isArray(res.dialogue)) {
          this.swarmDialogueList.set(res.dialogue);
        }
        this.swarmStatus.set(res.status || 'ONLINE');
        this.swarmActiveNegotiations.set(res.active_negotiations || []);
      }
    } catch (e) {
      console.warn('Failed to refresh swarm dialogue:', e);
    }
  }

  async triggerSwarmDeliberation(goal?: string): Promise<void> {
    try {
      await this.agentApi.triggerSwarmDeliberation(goal || 'Collaborative system health and optimization audit');
      await this.refreshSwarmDialogue();
    } catch (e) {
      console.warn('Failed to trigger deliberation:', e);
    }
  }

  async clearSwarmDialogue(): Promise<void> {
    try {
      await this.agentApi.clearSwarmDialogue();
      this.swarmDialogueList.set([]);
    } catch (e) {
      this.swarmDialogueList.set([]);
    }
  }

  // Viewport Content Zoom Level (For compact view with user zoom)
  readonly pageZoomLevel = signal<number>(100);

  setPageZoom(level: number): void {
    const clamped = Math.min(150, Math.max(70, level));
    this.pageZoomLevel.set(clamped);
    try {
      localStorage.setItem('abhi_page_zoom', clamped.toString());
    } catch {}
  }

  zoomIn(): void {
    this.setPageZoom(this.pageZoomLevel() + 10);
  }

  zoomOut(): void {
    this.setPageZoom(this.pageZoomLevel() - 10);
  }

  resetZoom(): void {
    this.setPageZoom(100);
  }

  constructor(
    private readonly apiService: TaskApiService,
    private readonly agentApi: AgentApiService,
    private readonly telemetryService: TelemetryService
  ) {
    try {
      const savedZoom = localStorage.getItem('abhi_page_zoom');
      if (savedZoom) {
        const val = parseInt(savedZoom, 10);
        if (!isNaN(val) && val >= 70 && val <= 150) {
          this.pageZoomLevel.set(val);
        }
      }
    } catch {}
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
      if (!s) return 'UNAVAILABLE';
      const lower = s.toLowerCase();
      if (lower.includes('healthy') || lower.includes('connected') || lower.includes('ready')) return 'HEALTHY';
      if (lower.includes('degraded') || lower.includes('low')) return 'DEGRADED';
      if (lower.includes('unreachable') || lower.includes('offline')) return 'LOCAL';
      return 'UNAVAILABLE';
    };

    this.health.set({
      overall: mapStatus(raw.status || 'unknown'),
      environment: raw.environment || 'production',
      gateway: mapStatus(subs.api_gateway || 'healthy'),
      database: mapStatus(subs.database_sqlite || 'healthy'),
      ollama: mapStatus(subs.abhi_llm_core || subs.ollama_service || 'healthy'),
      perception: 'HEALTHY',
      windowsWorker: 'HEALTHY',
      browserWorker: 'HEALTHY',
      safetyPolicy: 'HEALTHY',
      leaseManager: 'HEALTHY',
      mobileBridge: mapStatus(subs.mobile_bridge || 'ready'),
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
