export type TaskLifecycleState =
  | 'PENDING'
  | 'PLANNING'
  | 'WAITING_USER_CONSENT'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'RECOVERING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EMERGENCY_STOPPED';

export interface TaskSummary {
  task_id: string;
  goal: string;
  state: TaskLifecycleState | string;
  dag?: Record<string, any>;
  error_message?: string | null;
  duration_ms?: number | null;
  created_at?: string | null;
  completed_at?: string | null;
}

export interface TaskListResponse {
  tasks: TaskSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface TaskFilterOptions {
  state: string;
  query: string;
  page: number;
  pageSize: number;
}
