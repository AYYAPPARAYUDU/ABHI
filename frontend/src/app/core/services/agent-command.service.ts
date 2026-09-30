import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { OperatorStateService } from './operator-state.service';
import { AgentApiService, BackendCommandResponse } from '../api/agent-api.service';
import {
  AgentCommandRequest,
  AgentCommandResult,
  CommandContext,
  CommandLifecycleState,
  ResultType,
  SearchResultItem
} from '../models/agent-experience.model';

@Injectable({
  providedIn: 'root'
})
export class AgentCommandService {
  private readonly operatorState = inject(OperatorStateService);
  private readonly agentApi = inject(AgentApiService);
  private readonly router = inject(Router);

  // Command State Signals
  readonly lifecycle = signal<CommandLifecycleState>('RECEIVED');
  readonly currentCommand = signal<AgentCommandRequest | null>(null);
  readonly activeResult = signal<AgentCommandResult | null>(null);
  readonly isProcessing = signal<boolean>(false);
  readonly commandHistory = signal<AgentCommandRequest[]>([]);

  // Bounded Short-Lived Context for Follow-ups (Max 5 mins)
  private activeContext: CommandContext = {};
  private contextTimestamp = 0;

  readonly isWorking = computed(() => {
    const s = this.lifecycle();
    return s === 'PLANNING' || s === 'EXECUTING' || s === 'VERIFYING' || s === 'UNDERSTANDING';
  });

  /**
   * Submit natural language command to Authoritative Backend Agent Gateway.
   */
  async submitCommand(
    rawText: string,
    inputMode: 'TEXT' | 'VOICE' = 'TEXT',
    language: 'en' | 'te' | 'hi' | 'ta' | 'auto' = 'auto'
  ): Promise<AgentCommandResult | null> {
    const text = rawText.trim();
    if (!text || this.isProcessing()) return null;

    // Check if context has expired (> 5 minutes)
    if (Date.now() - this.contextTimestamp > 5 * 60 * 1000) {
      this.activeContext = {};
    }

    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const detectedLang = this.detectLanguage(text, language);
    const request: AgentCommandRequest = {
      commandId,
      text,
      inputMode,
      language: detectedLang,
      context: { ...this.activeContext },
      submittedAt: Date.now()
    };

    this.currentCommand.set(request);
    this.isProcessing.set(true);
    this.lifecycle.set('UNDERSTANDING');
    this.operatorState.setSpatialMode('ACTIVE_TASK');

    // Add to sanitized history (strip sensitive tokens)
    if (!this.containsSensitiveData(text)) {
      this.commandHistory.update((h) => [request, ...h.slice(0, 19)]);
    }

    try {
      this.lifecycle.set('PLANNING');

      // Dispatch to Backend Authoritative Agent Gateway
      const response: BackendCommandResponse = await this.agentApi.submitCommand({
        command_id: commandId,
        text,
        input_mode: inputMode,
        language_hint: detectedLang,
        context: {
          active_task_id: this.activeContext.taskId,
          recent_command: this.activeContext.previousCommandId,
          recent_result: this.activeContext.previousResultSummary ? { summary: this.activeContext.previousResultSummary } : undefined
        },
        origin: 'web'
      });

      // Map backend response into UI outcome model
      const result = this.mapBackendResponseToResult(response, commandId, text);

      if (response.status === 'COMPLETED') {
        this.lifecycle.set('COMPLETED');
      } else if (response.status === 'WAITING_FOR_APPROVAL') {
        this.lifecycle.set('WAITING_FOR_APPROVAL');
      } else {
        this.lifecycle.set((response.status as CommandLifecycleState) || 'EXECUTING');
      }

      this.activeResult.set(result);
      this.saveContextFromCommand(commandId, result, response.task_id);

      this.operatorState.addRecentActivity({
        id: `act_${Date.now()}`,
        type: result.type === 'MEDIA_RESULT' ? 'MEDIA' : result.type === 'NUMBER_RESULT' ? 'APP' : 'TASK',
        title: result.title,
        description: result.summary,
        timestamp: Date.now(),
        status: response.status === 'COMPLETED' ? 'SUCCESS' : 'RUNNING',
        routeLink: result.taskId ? '/tasks' : undefined,
        result
      });

      return result;
    } catch (err: any) {
      this.lifecycle.set('FAILED');
      const errResult: AgentCommandResult = {
        resultId: `res_err_${Date.now()}`,
        commandId,
        type: 'ERROR_RESULT',
        title: 'Unable to complete request',
        summary: err?.message || 'The requested action could not be completed by local workers.',
        errorMessage: err?.message,
        recoverySuggestion: 'Try rephrasing your command or ensure local worker services are running.',
        timestamp: Date.now(),
        actions: [
          { label: 'Retry', actionType: 'RETRY' }
        ]
      };
      this.activeResult.set(errResult);
      return errResult;
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Map backend command response to typed frontend AgentCommandResult.
   */
  private mapBackendResponseToResult(
    response: BackendCommandResponse,
    commandId: string,
    rawText: string
  ): AgentCommandResult {
    const backendResult = response.result || {};
    const resType: ResultType = (backendResult.result_type as ResultType) || this.inferResultType(rawText);

    return {
      resultId: response.context_reference?.result_id || `res_${Date.now()}`,
      commandId,
      taskId: response.task_id,
      type: resType,
      title: backendResult.title || this.formatCommandTitle(rawText),
      summary: backendResult.summary || response.message,
      calculationExpression: backendResult.data?.expression,
      numberValue: backendResult.data?.value,
      searchResults: backendResult.data?.items,
      timestamp: Date.now(),
      actions: response.task_id
        ? [{ label: 'View Tasks', actionType: 'NAVIGATE', payload: '/tasks' }]
        : undefined
    };
  }

  /**
   * Dismiss the currently displayed active result.
   */
  dismissResult(): void {
    this.activeResult.set(null);
    this.lifecycle.set('RECEIVED');
    this.operatorState.setSpatialMode('DEFAULT');
  }

  /**
   * Retry the last submitted command.
   */
  retryLastCommand(): void {
    const last = this.currentCommand();
    if (last) {
      this.submitCommand(last.text, last.inputMode, last.language);
    }
  }

  /**
   * Detect language or script of command text.
   */
  private detectLanguage(text: string, preferred: 'en' | 'te' | 'hi' | 'ta' | 'auto'): 'en' | 'te' | 'hi' | 'ta' {
    if (preferred !== 'auto') return preferred;
    // Telugu Unicode block: 0C00-0C7F
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
    // Devanagari (Hindi) Unicode block: 0900-097F
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    // Tamil Unicode block: 0B80-0BFF
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
    return 'en';
  }

  private inferResultType(text: string): ResultType {
    const lower = text.toLowerCase();
    if (lower.includes('video') || lower.includes('image') || lower.includes('render')) return 'MEDIA_RESULT';
    if (lower.includes('notepad') || lower.includes('calculator') || lower.includes('browser')) return 'APPLICATION_RESULT';
    return 'TASK_RESULT';
  }

  private formatCommandTitle(text: string): string {
    const clean = text.replace(/^(please|can you|open|run|start)\s+/i, '');
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  private containsSensitiveData(text: string): boolean {
    const lower = text.toLowerCase();
    return (
      lower.includes('password') ||
      lower.includes('secret') ||
      lower.includes('api_key') ||
      lower.includes('token') ||
      lower.includes('private_key')
    );
  }

  private saveContextFromCommand(commandId: string, result: AgentCommandResult, taskId?: string): void {
    this.activeContext = {
      previousCommandId: commandId,
      previousResultSummary: result.summary,
      taskId: taskId || result.taskId
    };
    this.contextTimestamp = Date.now();
  }
}
