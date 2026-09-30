import { Injectable } from '@angular/core';

export interface BackendCommandRequest {
  command_id?: string;
  text: string;
  input_mode?: 'TEXT' | 'VOICE' | 'SYSTEM_EVENT' | 'FOLLOW_UP';
  language_hint?: string;
  context?: any;
  thread_id?: string;
  origin?: string;
}

export interface BackendCommandResponse {
  command_id: string;
  task_id?: string;
  thread_id?: string;
  status: string;
  accepted: boolean;
  message: string;
  result?: any;
  context_reference?: any;
  created_at: number;
}

export interface BackendAttentionItem {
  item_id: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'APPROVAL' | 'ERROR' | 'RECOVERY';
  title: string;
  message: string;
  action_type?: string;
  target_id?: string;
  timestamp: number;
  priority: number;
}

@Injectable({
  providedIn: 'root'
})
export class AgentApiService {
  private readonly baseUrl = 'http://127.0.0.1:8000';

  /**
   * Submit natural language command to Authoritative Agent Gateway.
   */
  async submitCommand(req: BackendCommandRequest): Promise<BackendCommandResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/agent/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Command submission failed (${response.status}): ${errText}`);
    }
    return await response.json();
  }

  /**
   * Get command status by ID.
   */
  async getCommand(commandId: string): Promise<BackendCommandResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/agent/command/${encodeURIComponent(commandId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch command (${response.status})`);
    }
    return await response.json();
  }

  /**
   * List conversation and command threads.
   */
  async listThreads(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/agent/threads`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  }

  /**
   * Fetch system attention items and approval requests.
   */
  async getAttentionItems(): Promise<BackendAttentionItem[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/agent/attention`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  }

  /**
   * Check actual voice subsystem capability and readiness.
   */
  async getVoiceStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/agent/voice/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        return { voice_mode: 'NOT_AVAILABLE', status: 'UNAVAILABLE' };
      }
      return await response.json();
    } catch {
      return { voice_mode: 'NOT_AVAILABLE', status: 'UNAVAILABLE' };
    }
  }
}
