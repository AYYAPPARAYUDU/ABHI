export type AvatarCognitiveState =
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

export interface AvatarStateSnapshot {
  state: AvatarCognitiveState;
  activity: string;
  intensity: number;
  timestamp: number;
}
