export interface BrowserStatusModel {
  worker_state: string;
  is_headless: boolean;
  active_sessions_count: number;
  downloads_count: number;
  security_events_count: number;
  current_url: string;
  current_title: string;
}

export interface BrowserCapabilityModel {
  name: string;
  skill_id: string;
  risk_level: string;
  permissions: string[];
  description: string;
  input_schema?: Record<string, any>;
  output_schema?: Record<string, any>;
  verification_policy: string;
}

export interface BrowserSessionModel {
  session_id: string;
  task_id: string;
  execution_id?: string;
  browser_type: string;
  current_origin: string;
  current_url: string;
  state: string;
  created_at_ts: number;
  last_observation_ts: number;
}

export interface BrowserSecurityEventModel {
  event_id: string;
  event_type: string;
  timestamp: number;
  details: Record<string, any>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface BrowserDownloadModel {
  download_id: string;
  filename: string;
  file_path: string;
  origin: string;
  size_bytes: number;
  mime_type?: string;
  is_executable: boolean;
  verified: boolean;
}
