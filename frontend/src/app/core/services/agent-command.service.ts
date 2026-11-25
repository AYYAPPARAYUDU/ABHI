import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { OperatorStateService } from './operator-state.service';
import { AgentApiService, BackendCommandResponse } from '../api/agent-api.service';
import { TaskApiService } from '../api/task-api.service';
import { SpeechVoiceService } from './speech-voice.service';
import {
  AgentCommandRequest,
  AgentCommandResult,
  CommandContext,
  CommandLifecycleState,
  ResultType,
  SearchResultItem
} from '../models/agent-experience.model';

export interface StarkChatMessage {
  id: string;
  sender: 'USER' | 'ABHI' | 'JARVIS' | 'FRIDAY' | 'SYSTEM';
  callsign: string;
  text: string;
  timestamp: number;
  type?: 'BANTER' | 'TASK' | 'DIAGNOSTIC' | 'PROTOCOL';
}

@Injectable({
  providedIn: 'root'
})
export class AgentCommandService {
  private readonly operatorState = inject(OperatorStateService);
  private readonly agentApi = inject(AgentApiService);
  private readonly taskApi = inject(TaskApiService);
  private readonly speechVoice = inject(SpeechVoiceService);
  private readonly router = inject(Router);

  // Active polling timer handle for background task state
  private activePollTimer: any = null;

  // Command State Signals
  readonly lifecycle = signal<CommandLifecycleState>('RECEIVED');
  readonly currentCommand = signal<AgentCommandRequest | null>(null);
  readonly activeResult = signal<AgentCommandResult | null>(null);
  readonly isProcessing = signal<boolean>(false);
  readonly commandHistory = signal<AgentCommandRequest[]>([]);

  // Stark & JARVIS Live Comms Stream
  readonly commsMessages = signal<StarkChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'JARVIS',
      callsign: 'J.A.R.V.I.S.',
      text: 'Good day, Sir. Arc Reactor online, Mark 85 core synchronized, and Veronica safety gate primed. I am at your complete service as your trusted friend and co-pilot. What are we building today?',
      timestamp: Date.now(),
      type: 'PROTOCOL'
    }
  ]);

  // Persistent Multi-turn Thread ID & Bounded Context for Follow-ups
  readonly activeThreadId = signal<string | null>(null);
  private activeContext: CommandContext = {};
  private contextTimestamp = 0;

  readonly isWorking = computed(() => {
    const s = this.lifecycle();
    return s === 'PLANNING' || s === 'EXECUTING' || s === 'VERIFYING' || s === 'UNDERSTANDING';
  });

  /**
   * Autocorrects common typos and command shortcuts using fuzzy regex mapping.
   */
  autocorrectCommand(input: string): string {
    let corrected = input.trim();
    const typoMap: [RegExp, string][] = [
      [/\b(opn|ope|lanch|start)\s+(calclatr|calculator|clac|calk)\b/gi, 'open calculator'],
      [/\b(calclatr|clac|calk)\b/gi, 'calculator'],
      [/\b(opn|ope)\s+(yt|youtub|youtbe|youtube)\b/gi, 'open youtube'],
      [/\b(yt|youtub|youtbe)\b/gi, 'youtube'],
      [/\b(notepd|notepadd|notpad)\b/gi, 'notepad'],
      [/\b(wrkspce|wrkspace|workspce)\b/gi, 'workspace'],
      [/\b(shw|sho)\s+(me\s+)?(wrkspce|workspace)\b/gi, 'open workspace'],
      [/\b(settngs|setings)\b/gi, 'settings'],
      [/\b(termnal|termnl|cmd)\b/gi, 'terminal'],
      [/\b(explorr|explrer|fls)\b/gi, 'explorer'],
      [/\b(scrnshot|screnshot|ss)\b/gi, 'screenshot'],
      [/\b(cmra|camra|webcm)\b/gi, 'camera'],
    ];

    for (const [pattern, replacement] of typoMap) {
      corrected = corrected.replace(pattern, replacement);
    }
    return corrected;
  }

  /**
   * Submit natural language command to Authoritative Backend Agent Gateway.
   */
  async submitCommand(
    rawText: string,
    inputMode: 'TEXT' | 'VOICE' = 'TEXT',
    language: 'en' | 'te' | 'hi' | 'ta' | 'auto' = 'auto'
  ): Promise<AgentCommandResult | null> {
    const text = this.autocorrectCommand(rawText).trim();
    if (!text || this.isProcessing()) return null;

    // Instant UI Navigation Shortcuts
    const lower = text.toLowerCase();
    if (lower === 'workspace' || lower === 'open workspace' || lower === 'show workspace') {
      this.router.navigate(['/workspace']);
      const navResult: AgentCommandResult = {
        resultId: `res_${Date.now()}`,
        commandId: `cmd_${Date.now()}`,
        type: 'TASK_RESULT',
        title: '3D Bot Workspace',
        summary: 'Opening 3D Living Bot Workspace.',
        timestamp: Date.now()
      };
      this.speechVoice.speak('Opening workspace.');
      this.activeResult.set(navResult);
      return navResult;
    }
    if (lower === 'core' || lower === '3d core' || lower === 'home' || lower === 'show core') {
      this.router.navigate(['/home']);
      const navResult: AgentCommandResult = {
        resultId: `res_${Date.now()}`,
        commandId: `cmd_${Date.now()}`,
        type: 'TASK_RESULT',
        title: '3D Intelligence Core',
        summary: 'Returning to 3D Intelligence Core.',
        timestamp: Date.now()
      };
      this.speechVoice.speak('Displaying 3D core.');
      this.activeResult.set(navResult);
      return navResult;
    }

    // Check if context has expired (> 5 minutes)
    if (Date.now() - this.contextTimestamp > 5 * 60 * 1000) {
      this.activeContext = {};
    }

    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const activeSelectedLang = this.speechVoice.selectedLanguage();
    const effectiveLang = language !== 'auto' ? language : activeSelectedLang;
    const detectedLang = this.detectLanguage(text, effectiveLang);
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
    // Keep spatialMode as MAIN_AGENT so 3D central core and UI controls remain visible during command execution

    // Add to live Stark Comms conversation stream
    this.commsMessages.update((msgs) => [
      ...msgs,
      {
        id: `msg_u_${Date.now()}`,
        sender: 'USER',
        callsign: this.speechVoice.userCallsign(),
        text,
        timestamp: Date.now(),
        type: 'BANTER'
      }
    ]);

    // Add to sanitized history (strip sensitive tokens)
    if (!this.containsSensitiveData(text)) {
      this.commandHistory.update((h) => [request, ...h.slice(0, 19)]);
    }

    try {
      this.lifecycle.set('PLANNING');

      // Dispatch to Backend Authoritative Agent Gateway with Persistent Thread ID
      const response: BackendCommandResponse = await this.agentApi.submitCommand({
        command_id: commandId,
        thread_id: this.activeThreadId() || undefined,
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

      if (response.thread_id) {
        this.activeThreadId.set(response.thread_id);
      }

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

      // If backend dispatched a background task and it's not yet completed, start polling
      if (response.task_id && response.status !== 'COMPLETED') {
        this.operatorState.currentTask.set({
          taskId: response.task_id,
          goal: text,
          state: response.status || 'EXECUTING',
          isSuccess: false,
          progressPercent: 0,
          currentStep: response.message || 'Executing action...',
          startTime: Date.now(),
          durationMs: 0,
          actionsExecuted: 0
        });
        this.pollTaskExecution(response.task_id, commandId, text, result);
      }

      // Record AI response in Stark Comms stream
      const persona = this.speechVoice.personaMode();
      const botCallsign = persona === 'ABHI' ? 'ABHI' : (persona === 'JARVIS' ? 'J.A.R.V.I.S.' : 'F.R.I.D.A.Y.');
      this.commsMessages.update((msgs) => [
        ...msgs,
        {
          id: `msg_b_${Date.now()}`,
          sender: persona,
          callsign: botCallsign,
          text: result.summary,
          timestamp: Date.now(),
          type: result.type === 'NUMBER_RESULT' ? 'DIAGNOSTIC' : 'BANTER'
        }
      ]);

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

      // Speak result aloud to user via speech synthesis
      if (result.summary) {
        this.speechVoice.speak(result.summary, true);
      }

      return result;
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to reach ABHI backend gateway.';
      const errorResult: AgentCommandResult = {
        resultId: `res_err_${Date.now()}`,
        commandId,
        type: 'TEXT_RESULT',
        title: 'Command Execution Failed',
        summary: errorMessage,
        timestamp: Date.now()
      };
      this.lifecycle.set('FAILED');
      this.activeResult.set(errorResult);

      const persona = this.speechVoice.personaMode();
      const botCallsign = persona === 'ABHI' ? 'ABHI' : (persona === 'JARVIS' ? 'J.A.R.V.I.S.' : 'F.R.I.D.A.Y.');
      this.commsMessages.update((msgs) => [
        ...msgs,
        {
          id: `msg_err_${Date.now()}`,
          sender: persona,
          callsign: botCallsign,
          text: `Error: ${errorMessage}`,
          timestamp: Date.now(),
          type: 'DIAGNOSTIC'
        }
      ]);

      this.operatorState.addRecentActivity({
        id: `act_${Date.now()}`,
        type: 'TASK',
        title: `Failed: ${this.formatCommandTitle(text)}`,
        description: errorMessage,
        timestamp: Date.now(),
        status: 'FAILED',
        result: errorResult
      });

      return errorResult;
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Clear the active Stark Comms dialogue stream.
   */
  clearComms(): void {
    this.activeThreadId.set(null);
    this.activeContext = {};
    const persona = this.speechVoice.personaMode();
    const callsign = persona === 'ABHI' ? 'ABHI' : (persona === 'JARVIS' ? 'J.A.R.V.I.S.' : 'F.R.I.D.A.Y.');
    this.commsMessages.set([
      {
        id: `msg_clr_${Date.now()}`,
        sender: persona,
        callsign,
        text: `Comms channel reset, ${this.speechVoice.userCallsign()}. Standing by for your next directive.`,
        timestamp: Date.now(),
        type: 'PROTOCOL'
      }
    ]);
  }

  /**
   * Asynchronously poll the backend task endpoint until terminal state (COMPLETED, FAILED, CANCELLED).
   */
  private pollTaskExecution(
    taskId: string,
    commandId: string,
    rawText: string,
    initialResult: AgentCommandResult
  ): void {
    if (this.activePollTimer) {
      clearInterval(this.activePollTimer);
      this.activePollTimer = null;
    }

    const startTime = Date.now();
    const maxPollMs = 90000;

    this.activePollTimer = setInterval(async () => {
      if (Date.now() - startTime > maxPollMs) {
        if (this.activePollTimer) {
          clearInterval(this.activePollTimer);
          this.activePollTimer = null;
        }
        return;
      }

      try {
        const taskStatus = await this.taskApi.getTaskStatus(taskId);
        if (!taskStatus) return;

        const state = (taskStatus.state || '').toUpperCase();

        // Update Operator State currentTask from real backend DAG/step progress
        this.operatorState.currentTask.update((prev) => {
          const prevProgress = prev?.progressPercent ?? 0;
          const realProgress = this.computeTaskProgress(taskStatus, state, prevProgress);
          const stepLabel = taskStatus.active_node_id
            ? `Executing: ${taskStatus.active_node_id}`
            : (state === 'COMPLETED' ? 'Task execution verified & complete.' : (prev?.currentStep || state || 'Running...'));

          if (!prev) {
            return {
              taskId,
              goal: rawText,
              state,
              isSuccess: state === 'COMPLETED',
              progressPercent: realProgress,
              currentStep: stepLabel,
              startTime,
              durationMs: Date.now() - startTime,
              actionsExecuted: typeof taskStatus.completed_nodes === 'number' ? taskStatus.completed_nodes : 0
            };
          }
          return {
            ...prev,
            state,
            isSuccess: state === 'COMPLETED',
            progressPercent: realProgress,
            currentStep: stepLabel,
            durationMs: Date.now() - startTime,
            actionsExecuted: typeof taskStatus.completed_nodes === 'number' ? taskStatus.completed_nodes : prev.actionsExecuted
          };
        });

        if (state === 'COMPLETED') {
          if (this.activePollTimer) {
            clearInterval(this.activePollTimer);
            this.activePollTimer = null;
          }
          this.lifecycle.set('COMPLETED');
          const finalSummary = taskStatus.summary || `Done, ${this.speechVoice.userCallsign()}. ${this.formatCommandTitle(rawText)} verified and completed.`;
          const updatedResult: AgentCommandResult = {
            ...initialResult,
            title: `Execution Completed: ${this.formatCommandTitle(rawText)}`,
            summary: finalSummary,
            timestamp: Date.now()
          };
          this.activeResult.set(updatedResult);
          this.speechVoice.speak(finalSummary, true);
        } else if (state === 'FAILED' || state === 'CANCELLED' || state === 'EMERGENCY_STOPPED') {
          if (this.activePollTimer) {
            clearInterval(this.activePollTimer);
            this.activePollTimer = null;
          }
          this.lifecycle.set(state === 'FAILED' ? 'FAILED' : 'CANCELLED');
          const errorMsg = taskStatus.error_message || `Execution stopped (${state}).`;
          const updatedResult: AgentCommandResult = {
            ...initialResult,
            title: `Task ${state}: ${this.formatCommandTitle(rawText)}`,
            summary: errorMsg,
            timestamp: Date.now()
          };
          this.activeResult.set(updatedResult);
          this.speechVoice.speak(`Execution note: ${errorMsg}`);
        } else if (state === 'WAITING_FOR_APPROVAL') {
          this.lifecycle.set('WAITING_FOR_APPROVAL');
        }
      } catch (_err) {
        // Quietly retry next poll interval
      }
    }, 500);
  }

  /**
   * Compute task progress percentage from authoritative backend DAG/step counts.
   */
  private computeTaskProgress(taskStatus: any, state: string, prevProgress: number): number {
    if (state === 'COMPLETED') return 100;
    if (typeof taskStatus.progress_percent === 'number') {
      return Math.max(0, Math.min(100, Math.round(taskStatus.progress_percent)));
    }
    if (
      typeof taskStatus.completed_nodes === 'number' &&
      typeof taskStatus.total_nodes === 'number' &&
      taskStatus.total_nodes > 0
    ) {
      return Math.max(0, Math.min(100, Math.round((taskStatus.completed_nodes / taskStatus.total_nodes) * 100)));
    }
    const nodes: any[] | undefined = Array.isArray(taskStatus.nodes)
      ? taskStatus.nodes
      : Array.isArray(taskStatus.dag?.nodes)
        ? taskStatus.dag.nodes
        : undefined;
    if (nodes && nodes.length > 0) {
      const done = nodes.filter((n) => {
        const s = String(n?.status || n?.state || '').toUpperCase();
        return s === 'COMPLETED' || s === 'SUCCESS' || s === 'VERIFIED';
      }).length;
      return Math.round((done / nodes.length) * 100);
    }
    return prevProgress;
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
    if (this.activePollTimer) {
      clearInterval(this.activePollTimer);
      this.activePollTimer = null;
    }
    this.activeResult.set(null);
    this.lifecycle.set('RECEIVED');
    this.operatorState.setSpatialMode('MAIN_AGENT');
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
