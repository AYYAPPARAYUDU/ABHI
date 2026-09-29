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

  /**
   * Query authoritative ABHI runtime lifecycle state, mode, and power policies.
   */
  async getRuntimeState(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/runtime/state`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Runtime state request failed: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Set ABHI runtime mode (wake, sleep, rest, arm, lock, emergency_stop).
   */
  async setRuntimeMode(mode: string, source: string = 'ui'): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/runtime/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, source })
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Runtime mode transition failed (${response.status}): ${err}`);
    }
    return await response.json();
  }

  /**
   * Trigger or simulate a wake word acoustic event with debouncing.
   */
  async triggerWake(confidence: number = 0.95, source: string = 'ui_button'): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/runtime/wake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confidence, source })
    });
    if (!response.ok) {
      throw new Error(`Wake trigger request failed: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Verify ABHI-local application PIN to unlock assistant.
   */
  async verifyLocalPin(pin: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/runtime/auth/pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`PIN authentication failed: ${err}`);
    }
    return await response.json();
  }

  /**
   * Change ABHI-local application PIN.
   */
  async changeLocalPin(currentPin: string, newPin: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/runtime/auth/pin/change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_pin: currentPin, new_pin: newPin })
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Change PIN failed: ${err}`);
    }
    return await response.json();
  }

  /**
   * Inspect dependencies and health for Windows user session auto-startup.
   */
  async getStartupHealth(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/runtime/startup-health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Startup health request failed: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * List historical and active tasks with pagination and query filtering.
   */
  async listTasks(limit: number = 50, offset: number = 0, state?: string, query?: string): Promise<any> {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    params.set('offset', offset.toString());
    if (state && state !== 'ALL') params.set('state', state);
    if (query && query.trim()) params.set('query', query.trim());

    const response = await fetch(`${this.baseUrl}/api/v1/tasks?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to list tasks: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * List memories with multi-attribute filtering (category, type, privacy, query).
   */
  async listMemories(
    limit: number = 50,
    offset: number = 0,
    category?: string,
    query?: string,
    memoryType?: string,
    privacy?: string,
    status?: string
  ): Promise<any> {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    params.set('offset', offset.toString());
    if (category && category !== 'all') params.set('category', category);
    if (query && query.trim()) params.set('query', query.trim());
    if (memoryType && memoryType !== 'ALL') params.set('memory_type', memoryType);
    if (privacy && privacy !== 'ALL') params.set('privacy', privacy);
    if (status && status !== 'ALL') params.set('status', status);

    const response = await fetch(`${this.baseUrl}/api/v1/memory?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to list memories: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Retrieve detailed memory record.
   */
  async getMemoryDetail(memoryId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/memory/${encodeURIComponent(memoryId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to retrieve memory ${memoryId}`);
    }
    return await response.json();
  }

  /**
   * Confirm memory candidate.
   */
  async confirmMemory(memoryId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/memory/${encodeURIComponent(memoryId)}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to confirm memory ${memoryId}`);
    }
    return await response.json();
  }

  /**
   * Reject memory candidate.
   */
  async rejectMemory(memoryId: string, reason?: string): Promise<any> {
    const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    const response = await fetch(`${this.baseUrl}/api/v1/memory/${encodeURIComponent(memoryId)}/reject${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to reject memory ${memoryId}`);
    }
    return await response.json();
  }

  /**
   * Delete memory with explicit deletion semantics (SOFT_DELETE, HARD_DELETE, PRIVACY_ERASURE).
   */
  async forgetMemory(memoryId: string, deletionType: string = 'SOFT_DELETE'): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/memory/${encodeURIComponent(memoryId)}?deletion_type=${deletionType}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to delete memory ${memoryId}`);
    }
    return await response.json();
  }

  /**
   * List detected memory contradictions / conflicts.
   */
  async listMemoryConflicts(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/memory/conflicts`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to list conflicts: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Resolve a memory contradiction.
   */
  async resolveMemoryConflict(conflictId: string, chosenCandidate: string, notes?: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/memory/conflicts/${encodeURIComponent(conflictId)}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chosen_candidate: chosenCandidate, notes: notes || '' })
    });
    if (!response.ok) {
      throw new Error(`Failed to resolve conflict ${conflictId}`);
    }
    return await response.json();
  }

  /**
   * List stored procedural memory workflows.
   */
  async listProcedures(status?: string, skillId?: string, query?: string): Promise<any> {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.set('status', status);
    if (skillId) params.set('skill_id', skillId);
    if (query && query.trim()) params.set('query', query.trim());

    const response = await fetch(`${this.baseUrl}/api/v1/procedures?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to list procedures: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Retrieve detailed procedure.
   */
  async getProcedureDetail(procedureId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/procedures/${encodeURIComponent(procedureId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to retrieve procedure ${procedureId}`);
    }
    return await response.json();
  }

  /**
   * Validate candidate procedure.
   */
  async validateProcedure(procedureId: string, registeredSkillIds?: string[]): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/procedures/${encodeURIComponent(procedureId)}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registered_skill_ids: registeredSkillIds || null })
    });
    if (!response.ok) {
      throw new Error(`Failed to validate procedure ${procedureId}`);
    }
    return await response.json();
  }

  /**
   * Promote candidate procedure to ACTIVE.
   */
  async promoteProcedure(procedureId: string, validatorNotes?: string): Promise<any> {
    const params = validatorNotes ? `?validator_notes=${encodeURIComponent(validatorNotes)}` : '';
    const response = await fetch(`${this.baseUrl}/api/v1/procedures/${encodeURIComponent(procedureId)}/promote${params}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to promote procedure ${procedureId}`);
    }
    return await response.json();
  }

  /**
   * Deprecate a procedure.
   */
  async deprecateProcedure(procedureId: string, reason: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/procedures/${encodeURIComponent(procedureId)}/deprecate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (!response.ok) {
      throw new Error(`Failed to deprecate procedure ${procedureId}`);
    }
    return await response.json();
  }

  /**
   * List all stored user preferences and profile parameters.
   */
  async listUserProfiles(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/memory/profiles/all`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to list user profiles: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Execute hybrid vector semantic search and BM25 keyword matching via LanceDB.
   */
  async searchKnowledge(query: string, topK: number = 5, sourceFilter?: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/knowledge/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: topK, source_filter: sourceFilter || null })
    });
    if (!response.ok) {
      throw new Error(`Knowledge search failed: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * List indexed knowledge sources and storage stats.
   */
  async listKnowledgeSources(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/knowledge/sources`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to list knowledge sources: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Retrieve indexed knowledge chunks.
   */
  async getKnowledgeChunks(limit: number = 50, offset: number = 0): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/knowledge/chunks?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to list knowledge chunks: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Retrieve structured contextual chunks for task planning.
   */
  async getRetrievalContext(query: string, topK: number = 3): Promise<any> {
    const params = new URLSearchParams();
    params.set('query', query);
    params.set('top_k', topK.toString());

    const response = await fetch(`${this.baseUrl}/api/v1/knowledge/context?${params.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to retrieve context: ${response.status}`);
    }
    return await response.json();
  }

  // ==========================================
  // PHASE 6.7: LLM EVALUATION & EVOLUTION LAB
  // ==========================================

  /**
   * Fetch evaluation subsystem status and scheduler state.
   */
  async getEvaluationStatus(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to get evaluation status: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * List historical evaluation runs.
   */
  async listEvaluationRuns(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/runs`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to list evaluation runs: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Retrieve single evaluation run by ID.
   */
  async getEvaluationRun(runId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/runs/${encodeURIComponent(runId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to get evaluation run ${runId}: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Retrieve historical timeline events for visualization replay.
   */
  async getEvaluationTimeline(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/timeline`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to get evaluation timeline: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * List models in versioned registry.
   */
  async listEvaluationModels(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/models`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to list evaluation models: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * List benchmark adapter statuses.
   */
  async listEvaluationBenchmarks(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/benchmarks`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to list evaluation benchmarks: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * List research corpus papers.
   */
  async listResearchPapers(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/research`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to list research papers: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Ingest verified research paper into local knowledge.
   */
  async ingestResearchPaper(sourceId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/research/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_id: sourceId })
    });
    if (!response.ok) {
      throw new Error(`Failed to ingest research paper: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Quarantine unverified research paper.
   */
  async quarantineResearchPaper(sourceId: string, reason: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/research/quarantine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_id: sourceId, reason })
    });
    if (!response.ok) {
      throw new Error(`Failed to quarantine research paper: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * List candidate evolution experiments.
   */
  async listEvaluationExperiments(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/experiments`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to list experiments: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Trigger local evaluation run.
   */
  async triggerEvaluationRun(scheduleType: string = 'QUICK_DAILY', modelId?: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule_type: scheduleType, model_id: modelId || null })
    });
    if (!response.ok) {
      throw new Error(`Failed to trigger evaluation run: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Register a new candidate model experiment.
   */
  async createCandidateExperiment(payload: {
    hypothesis: string;
    candidate_type: string;
    candidate_model_name: string;
    candidate_version: string;
    quantization?: string;
  }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/candidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`Failed to create candidate experiment: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Promote candidate model to production.
   */
  async promoteCandidate(candidateId: string, overrideReason?: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, override_reason: overrideReason || null })
    });
    if (!response.ok) {
      throw new Error(`Failed to promote candidate: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Instant rollback to previous production model.
   */
  async rollbackModel(targetModelId?: string, reason: string = 'Operator initiated rollback'): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_model_id: targetModelId || null, reason })
    });
    if (!response.ok) {
      throw new Error(`Failed to rollback model: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Get authoritative locked baseline contract.
   */
  async getLockedBaseline(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/locked-baseline`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to get locked baseline: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * List candidate adaptation records.
   */
  async listCandidates(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/candidates`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to list candidates: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Create a new candidate adaptation record.
   */
  async createCandidateAdaptation(payload: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/candidates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      throw new Error(`Failed to create candidate adaptation: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Start candidate parameter training or index preparation job.
   */
  async startTrainingJob(payload: { candidate_id: string; epochs?: number; batch_size?: number; learning_rate?: number }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/candidates/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Failed to start training: ${err}`);
    }
    return await response.json();
  }

  /**
   * Get training job status and telemetry.
   */
  async getTrainingStatus(jobId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/candidates/training/${jobId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to get training status: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Cancel an active training job.
   */
  async cancelTrainingJob(jobId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/candidates/training/${jobId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to cancel training job: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Evaluate candidate head-to-head against locked baseline.
   */
  async evaluateCandidate(candidateId: string, scheduleType: string = 'QUICK_DAILY'): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/candidates/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: candidateId, schedule_type: scheduleType })
    });
    if (!response.ok) {
      throw new Error(`Failed to evaluate candidate: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Get model lineage graph nodes for 3D/2D visualizer.
   */
  async getModelLineage(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/lineage`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to get model lineage: ${response.status}`);
    }
    return await response.json();
  }

  /**
   * Get host hardware and GPU VRAM headroom for adaptation.
   */
  async getResourceHeadroom(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluation/resources`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to get resource headroom: ${response.status}`);
    }
    return await response.json();
  }
}


