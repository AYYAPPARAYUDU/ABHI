import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TaskApiService {
  private readonly baseUrl = 'http://127.0.0.1:8000';

  /**
   * Fetch comprehensive subsystem health status.
   */
  async checkHealth(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error(`Health check returned status ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.warn('Backend health check error:', err);
      return {
        status: 'unreachable',
        environment: 'unknown',
        subsystems: {
          api_gateway: 'unreachable',
          database_sqlite: 'unknown',
          ollama_service: 'unknown',
          available_models: [],
          storage: { status: 'unknown' }
        }
      };
    }
  }

  /**
   * Submit a high-level natural language task to the authoritative backend.
   */
  async submitTask(goal: string, taskId?: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal, task_id: taskId || null })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Task submission failed (${response.status}): ${errorText}`);
    }
    return await response.json();
  }

  /**
   * Query the latest authoritative state for a task.
   */
  async getTaskStatus(taskId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks/${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to retrieve task status (${response.status})`);
    }
    return await response.json();
  }

  /**
   * Provide operator approval or rejection for a critical action consent gate.
   */
  async provideConsent(taskId: string, approved: boolean, nodeId: string = 'root_action'): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks/${encodeURIComponent(taskId)}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: nodeId, approved })
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Consent response failed: ${err}`);
    }
    return await response.json();
  }

  /**
   * Cancel an in-progress task.
   */
  async cancelTask(taskId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks/${encodeURIComponent(taskId)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Cancel request failed with status ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Trigger immediate system-wide Emergency Stop across all active execution leases.
   */
  async emergencyStop(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/tasks/emergency-stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Emergency stop request failed with status ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Canonicalize natural language text into standardized internal intent.
   */
  async canonicalize(text: string, sourceLanguage?: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/perception/canonicalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source_language: sourceLanguage || null })
    });
    if (!response.ok) {
      throw new Error(`Canonicalization request failed: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Generate structured command preview and intent validation before execution.
   */
  async getCommandPreview(
    rawInput: string,
    source: string = 'text',
    sourceLanguage?: string,
    confidence: number = 1.0
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/perception/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        raw_input: rawInput,
        source: source.toLowerCase(),
        source_language: sourceLanguage || null,
        confidence
      })
    });
    if (!response.ok) {
      throw new Error(`Command preview request failed: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Transcribe raw audio buffer/base64 into structured text.
   */
  async transcribeAudio(audioBase64?: string, language?: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/perception/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_base64: audioBase64 || null, language: language || null })
    });
    if (!response.ok) {
      throw new Error(`Transcription request failed: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Synthesize text into speech audio response.
   */
  async synthesizeSpeech(text: string, voice: string = 'default_neutral', rate: number = 1.0): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/perception/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, rate })
    });
    if (!response.ok) {
      throw new Error(`Speech synthesis request failed: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Query status and capabilities of perception engines.
   */
  async getPerceptionStatus(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/perception/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Perception status request failed: ${response.status}`);
    }
    return await response.json();
  }
}

