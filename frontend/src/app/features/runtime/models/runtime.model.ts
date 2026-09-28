/**
 * Phase 6 Stage 6.5 - ABHI Runtime Lifecycle & Activation Models.
 * Governed location: src/app/features/runtime/models/runtime.model.ts
 */

export type RuntimeMode =
  | 'STOPPED'
  | 'STARTING'
  | 'ARMED'
  | 'LISTENING'
  | 'PROCESSING'
  | 'ACTIVE'
  | 'RESTING'
  | 'LOCKED'
  | 'EMERGENCY_STOP';

export type IdentityLevel =
  | 'LEVEL_0_ANONYMOUS'
  | 'LEVEL_1_WAKE_WORD'
  | 'LEVEL_2_LOCAL_PRESENCE'
  | 'LEVEL_3_OPERATOR_CONSENT'
  | 'LEVEL_4_WINDOWS_HELLO';

export type PowerPolicy = 'FULL' | 'LOW_POWER' | 'DORMANT' | 'OFF';

export interface RuntimeStateSummary {
  current_mode: RuntimeMode;
  identity_level: IdentityLevel;
  is_locked: boolean;
  is_listening: boolean;
  is_resting: boolean;
  wake_word_active: boolean;
  camera_power_policy: PowerPolicy;
  microphone_power_policy: PowerPolicy;
  last_wake_timestamp?: number;
  uptime_sec: number;
  active_user: string;
  lockout_remaining_sec: number;
}

export interface WakeWordEventInfo {
  keyword: string;
  detected: boolean;
  confidence: number;
  timestamp: number;
  cooldown_remaining_sec: number;
}

export interface StartupHealthSummary {
  status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  services: {
    backend_api: string;
    sqlite_database: string;
    ollama_engine: string;
    wake_word_engine: string;
    perception_daemon: string;
    windows_host_worker: string;
    websocket_telemetry: string;
  };
  auto_start_policy: string;
  runtime_mode: string;
}
