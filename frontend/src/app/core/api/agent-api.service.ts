import { Injectable } from '@angular/core';
import { getApiBaseUrl } from '../config/api-config';

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
  private readonly baseUrl = getApiBaseUrl();

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

  /**
   * Fetch live dynamic thoughts, active window, and mobile state from Gateway.
   */
  async getLiveThoughts(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/agent-gateway/live-thoughts`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Fetch mobile status (battery, screen, connection).
   */
  async getMobileStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/devices/mobile/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Execute mobile device action (lock, unlock, app, whatsapp, dial, screenshot).
   */
  async executeMobileAction(action: string, params: Record<string, any> = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/devices/mobile/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, params })
    });
    return await response.json();
  }

  /**
   * Verify operator presence via local optical neural models (YuNet + SFace).
   */
  async getBiometricPresence(cameraIndex: number = 0): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/agent-gateway/biometrics/presence?camera_index=${cameraIndex}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Enroll operator biometrics from current camera frame.
   */
  async enrollBiometrics(name: string = 'Ayyappa Rayudu Ravuvari', cameraIndex: number = 0): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/agent-gateway/biometrics/enroll?name=${encodeURIComponent(name)}&camera_index=${cameraIndex}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Enrollment failed: ${err}`);
    }
    return await response.json();
  }

  /**
   * Verify operator biometrics directly from client-captured video frame.
   */
  async verifyBiometricFrame(frameBase64: string, operatorName: string = 'Ayyappa Rayudu Ravuvari'): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/agent-gateway/biometrics/verify-frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame_base64: frameBase64, operator_name: operatorName })
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Verification failed: ${err}`);
    }
    return await response.json();
  }

  /**
   * Get Face Lock enrollment status and registered operator name.
   */
  async getBiometricStatus(): Promise<{ is_enrolled: boolean; operator_name: string | null; enrolled_name: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/agent-gateway/biometrics/status`);
      if (!response.ok) return { is_enrolled: false, operator_name: null, enrolled_name: 'Unenrolled' };
      return await response.json();
    } catch {
      return { is_enrolled: false, operator_name: null, enrolled_name: 'Unenrolled' };
    }
  }

  /**
   * Enroll operator biometrics directly from client-captured video frame with optional master password authentication.
   */
  async enrollBiometricFrame(
    frameBase64: string,
    operatorName: string = 'Ayyappa Rayudu Ravuvari',
    masterPassword?: string
  ): Promise<any> {
    const payload: any = { frame_base64: frameBase64, operator_name: operatorName };
    if (masterPassword) {
      payload.master_password = masterPassword;
    }
    const response = await fetch(`${this.baseUrl}/api/v1/agent-gateway/biometrics/enroll-frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const err = await response.text();
      let parsedErr: any;
      try { parsedErr = JSON.parse(err); } catch {}
      const msg = parsedErr?.detail?.message || parsedErr?.detail || err;
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    return await response.json();
  }

  /**
   * Remove registered Face Lock from SQLite WAL using Master Password (143).
   */
  async removeBiometrics(masterPassword: string = '143'): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/agent-gateway/biometrics/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ master_password: masterPassword })
    });
    if (!response.ok) {
      const err = await response.text();
      let parsedErr: any;
      try { parsedErr = JSON.parse(err); } catch {}
      const msg = parsedErr?.detail?.message || parsedErr?.detail || err;
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    return await response.json();
  }

  /**
   * Record a single unauthorized intruder security incident snapshot.
   */
  async recordIntruder(frameBase64: string, reason: string = 'Unauthorized access attempt'): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/agent-gateway/biometrics/record-intruder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame_base64: frameBase64, reason })
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Retrieve real-time multi-agent swarm dialogue & inter-LLM thoughts.
   */
  async getLiveSwarmDialogue(limit: number = 25): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/agent-gateway/swarm/live-dialogue?limit=${limit}`);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Trigger a live collaborative multi-agent negotiation stream.
   */
  async triggerSwarmDeliberation(goal?: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/agent-gateway/swarm/trigger-deliberation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goal || 'Autonomous collaborative system health and optimization audit.' }),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Clear live swarm dialogue transcripts from memory.
   */
  async clearSwarmDialogue(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/agent-gateway/swarm/clear-dialogue`, {
        method: 'POST',
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Fetch real-time physical Windows hardware telemetry.
   */
  async getSystemTelemetry(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/health/system-telemetry`);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Fetch Sovereign Treasury overview and Mamu's SBI settlement metrics.
   */
  async getTreasuryOverview(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/business/treasury/overview`);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Trigger the autonomous CEO revenue generation cycle across all commercial streams.
   */
  async runAutonomousRevenueCycle(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/business/ceo/revenue-cycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Execute Stream A AST static code audit and bug bounty deliverable.
   */
  async runCodeAuditBounty(targetPath?: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/business/ceo/audit-bounty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_path: targetPath || 'backend/app/automation/desktop/os_control_engine.py' }),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * List authentic commercial tax invoices settled to Mamu's SBI account.
   */
  async listTreasuryInvoices(limit = 50): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/business/treasury/invoices?limit=${limit}`);
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  }

  /**
   * Verify authentic inward UPI settlement to SBI Account 41130645649 using 12-digit Bank UTR.
   */
  async verifySbiSettlement(payload: { utr_number: string; amount_inr: number; payer_name?: string; invoice_number?: string }): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/business/treasury/verify-settlement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Purge all dummy simulated records from the treasury ledger and reset to clean authentic state.
   */
  async clearTreasuryDummyData(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/business/treasury/clear-dummy-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Retrieve authentic affiliate marketing network profiles and campaigns.
   */
  async getAffiliateOverview(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/business/affiliate/overview`);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Generate an authentic tracked affiliate link for Mamu (ayyapparayudu.ravuvari@gmail.com).
   */
  async generateAffiliateLink(payload: { network_id: string; destination_url: string; custom_sub_id?: string }): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/business/affiliate/generate-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Record a verified affiliate commission payout into State Bank of India account.
   */
  async recordAffiliateCommission(payload: { campaign_id: string; amount_inr: number; bank_utr?: string; payout_note?: string }): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/business/affiliate/commissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Retrieve live real-time humanoid workers telemetry for the 3D Virtual Agent Office (Agent HQ).
   */
  async getOfficeOverview(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/intelligence/office-overview`);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Update an agent's working or idle state in the virtual office.
   */
  async updateAgentStatus(payload: { agent_id: string; status: string; task_desc?: string; tool_name?: string }): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/intelligence/agent/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Trigger Tier 4 Multi-Agent Swarm Orchestration.
   */
  async runTier4Orchestration(goal: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/intelligence/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }
}
