export type MemoryPrivacyClass = 'task_derived' | 'user_provided' | 'system';

export interface EpisodicMemory {
  memory_id: string;
  task_id?: string | null;
  category: string;
  context_summary: string;
  solution_summary: string;
  outcome: 'SUCCESS' | 'FAILED' | string;
  tags: string[];
  privacy_class: MemoryPrivacyClass;
  created_at?: string | null;
}

export interface MemoryListResponse {
  memories: EpisodicMemory[];
  total: number;
  limit: number;
  offset: number;
  category_filter?: string | null;
  categories: string[];
}

export interface UserProfilePreference {
  key: string;
  value: Record<string, any>;
  updated_at?: string | null;
}

export interface MemoryFilterOptions {
  category: string;
  query: string;
  page: number;
  pageSize: number;
}
