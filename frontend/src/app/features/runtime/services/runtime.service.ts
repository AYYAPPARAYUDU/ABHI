import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { TelemetryService } from '../../../core/websocket/telemetry.service';
import { TaskApiService } from '../../../core/api/task-api.service';
import {
  IdentityLevel,
  PowerPolicy,
  RuntimeMode,
  RuntimeStateSummary,
  StartupHealthSummary,
  WakeWordEventInfo
} from '../models/runtime.model';

@Injectable({
  providedIn: 'root'
})
export class RuntimeService implements OnDestroy {
  private readonly telemetry = inject(TelemetryService);
  private readonly apiService = inject(TaskApiService);
  private subscription: Subscription = new Subscription();

  // 1. Runtime State Summary Signal
  readonly state = signal<RuntimeStateSummary>({
    current_mode: 'ARMED',
    identity_level: 'LEVEL_1_WAKE_WORD',
    is_locked: false,
    is_listening: false,
    is_resting: false,
    wake_word_active: true,
    camera_power_policy: 'LOW_POWER',
    microphone_power_policy: 'LOW_POWER',
    last_wake_timestamp: undefined,
    uptime_sec: 0,
    active_user: 'local_operator',
    lockout_remaining_sec: 0
  });

  // 2. Startup Health Summary Signal
  readonly startupHealth = signal<StartupHealthSummary>({
    status: 'HEALTHY',
    services: {
      backend_api: 'HEALTHY',
      sqlite_database: 'HEALTHY',
      ollama_engine: 'HEALTHY',
      wake_word_engine: 'HEALTHY',
      perception_daemon: 'HEALTHY',
      windows_host_worker: 'HEALTHY',
      websocket_telemetry: 'HEALTHY'
    },
    auto_start_policy: 'ARMED_WITHOUT_TASK_EXECUTION',
    runtime_mode: 'ARMED'
  });

  // 3. Last Wake Word Event Signal
  readonly lastWakeWordEvent = signal<WakeWordEventInfo | null>(null);

  // 4. Authentication Error Message
  readonly authError = signal<string | null>(null);
  readonly isAuthenticating = signal<boolean>(false);

  // Computed Helpers
  readonly isArmed = computed(() => this.state().current_mode === 'ARMED');
  readonly isListening = computed(() => this.state().current_mode === 'LISTENING');
  readonly isResting = computed(() => this.state().current_mode === 'RESTING');
  readonly isLocked = computed(() => this.state().current_mode === 'LOCKED');
  readonly isEmergencyStopped = computed(() => this.state().current_mode === 'EMERGENCY_STOP');

  constructor() {
    this.subscription.add(
      this.telemetry.events$.subscribe((event) => {
        if (event.type === 'TASK_EMERGENCY_STOPPED') {
          this.state.update((s) => ({ ...s, current_mode: 'EMERGENCY_STOP' }));
        } else if (event.type === 'CONSENT_REQUIRED') {
          this.state.update((s) => ({ ...s, identity_level: 'LEVEL_3_OPERATOR_CONSENT' }));
        }
      })
    );

    // Initial query
    this.refreshState();
    this.refreshStartupHealth();
  }

  /**
   * Refresh authoritative runtime state from backend.
   */
  async refreshState(): Promise<void> {
    try {
      const res = await this.apiService.getRuntimeState();
      this.state.set(res);
    } catch (err) {
      console.warn('Failed to fetch runtime state:', err);
    }
  }

  /**
   * Refresh startup dependencies health from backend.
   */
  async refreshStartupHealth(): Promise<void> {
    try {
      const res = await this.apiService.getStartupHealth();
      this.startupHealth.set(res);
    } catch (err) {
      console.warn('Failed to fetch startup health:', err);
    }
  }

  /**
   * Transition ABHI to active/listening wake state.
   */
  async wakeAssistant(source: string = 'ui_button'): Promise<void> {
    try {
      await this.apiService.setRuntimeMode('wake', source);
      this.state.update((s) => ({
        ...s,
        current_mode: 'LISTENING',
        is_listening: true,
        is_resting: false,
        last_wake_timestamp: Date.now()
      }));
    } catch (err: any) {
      this.authError.set(err.message || 'Wake transition failed');
    }
  }

  /**
   * Transition ABHI to resting dormant state.
   */
  async sleepAssistant(source: string = 'ui_button'): Promise<void> {
    try {
      await this.apiService.setRuntimeMode('sleep', source);
      this.state.update((s) => ({
        ...s,
        current_mode: 'RESTING',
        is_listening: false,
        is_resting: true,
        camera_power_policy: 'DORMANT',
        microphone_power_policy: 'LOW_POWER'
      }));
    } catch (err: any) {
      this.authError.set(err.message || 'Sleep transition failed');
    }
  }

  /**
   * Transition ABHI to lightweight armed state.
   */
  async armAssistant(source: string = 'ui_button'): Promise<void> {
    try {
      await this.apiService.setRuntimeMode('arm', source);
      this.state.update((s) => ({
        ...s,
        current_mode: 'ARMED',
        is_listening: false,
        is_resting: false,
        wake_word_active: true
      }));
    } catch (err: any) {
      this.authError.set(err.message || 'Arm transition failed');
    }
  }

  /**
   * Lock ABHI application state.
   */
  async lockAssistant(): Promise<void> {
    try {
      await this.apiService.setRuntimeMode('lock', 'ui_lock');
      this.state.update((s) => ({
        ...s,
        current_mode: 'LOCKED',
        is_locked: true,
        identity_level: 'LEVEL_0_ANONYMOUS'
      }));
    } catch (err: any) {
      this.authError.set(err.message || 'Lock transition failed');
    }
  }

  /**
   * Unlock ABHI application state using local PIN.
   */
  async unlockAssistant(pin: string): Promise<boolean> {
    this.isAuthenticating.set(true);
    this.authError.set(null);
    try {
      const res = await this.apiService.verifyLocalPin(pin);
      this.state.set(res.state);
      this.isAuthenticating.set(false);
      return true;
    } catch (err: any) {
      this.authError.set(err.message || 'Invalid PIN');
      this.isAuthenticating.set(false);
      return false;
    }
  }

  /**
   * Simulate or trigger acoustic wake word detection.
   */
  async triggerWakeWord(confidence: number = 0.95): Promise<void> {
    try {
      const res = await this.apiService.triggerWake(confidence, 'wake_word_button');
      this.lastWakeWordEvent.set(res);
      if (res.detected) {
        this.state.update((s) => ({
          ...s,
          current_mode: 'LISTENING',
          is_listening: true,
          is_resting: false,
          last_wake_timestamp: Date.now()
        }));
      }
    } catch (err) {
      console.warn('Wake word trigger failed:', err);
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
