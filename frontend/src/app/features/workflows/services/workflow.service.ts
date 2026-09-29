import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  DataFlowRecordModel,
  GoalContractModel,
  GoalProgressEvaluationModel,
  HumanHandoffRequestModel,
  PlanNodeModel,
  WorkflowJournalEntryModel,
  WorkflowPlanModel,
  WorkflowStatusModel,
  WorkflowWorldStateModel
} from '../models/workflow.model';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://127.0.0.1:8000/api/v1/workflows';

  // Signals
  readonly activeWorkflow = signal<WorkflowStatusModel | null>({
    task_id: 'wf_demo_01',
    is_paused: false,
    goal: {
      goal_id: 'g_demo_01',
      original_request: 'Find latest PDF in Downloads, summarize findings, and write summary report',
      normalized_goal: 'Find latest PDF in Downloads, summarize findings, and write summary report',
      constraints: [
        { constraint_type: 'LOCATION', key: 'directory', value: 'Downloads', is_strict: true, description: 'Target directory' },
        { constraint_type: 'FILE_TYPE', key: 'extension', value: '.pdf', is_strict: true, description: 'Target file type' }
      ],
      required_outcome: 'Summary report written and verified',
      prohibited_actions: ['files.delete'],
      success_criteria: ['Summary file exists', 'Content non-empty'],
      risk_level: 'MEDIUM',
      autonomy_level: 'LEVEL_3',
      created_at_ts: Date.now() - 120000
    },
    active_plan: {
      plan_id: 'plan_demo_v1',
      goal_id: 'g_demo_01',
      version: 1,
      is_active: true,
      risk_summary: 'MEDIUM',
      estimated_cost: 4.5,
      estimated_duration_ms: 6000,
      created_at_ts: Date.now() - 110000,
      success_contract: {
        success_id: 'succ_demo_01',
        goal_id: 'g_demo_01',
        required_state: { completed: true },
        observable_conditions: ['output_file_exists == true'],
        verification_method: 'COMPOSITE_OBSERVATION',
        evidence_requirements: ['file_exists', 'content_verified']
      },
      milestones: [
        {
          milestone_id: 'm1',
          title: 'Discover Documents',
          description: 'Locate PDF documents in user Downloads folder',
          node_ids: ['step_1'],
          observable_success_condition: 'files_listed == true',
          status: 'COMPLETED',
          completed_at_ts: Date.now() - 90000
        },
        {
          milestone_id: 'm2',
          title: 'Read & Synthesize',
          description: 'Extract text contents and generate concise summary',
          node_ids: ['step_2', 'step_3'],
          observable_success_condition: 'output_file_exists == true',
          status: 'RUNNING'
        }
      ],
      nodes: {
        step_1: {
          node_id: 'step_1',
          skill_id: 'files.list',
          skill_version: '1.0.0',
          title: 'Scan Downloads Directory',
          inputs: { directory_path: 'database/downloads' },
          dependencies: [],
          preconditions: [],
          expected_output: { files: [] },
          postconditions: ['Files listed'],
          risk_level: 'READ_ONLY',
          timeout_ms: 10000,
          status: 'COMPLETED',
          execution_duration_ms: 24,
          result_data: { count: 3, latest_pdf: 'quarterly_report.pdf' }
        },
        step_2: {
          node_id: 'step_2',
          skill_id: 'files.read',
          skill_version: '1.0.0',
          title: 'Extract PDF Text',
          inputs: { file_path: 'database/downloads/quarterly_report.pdf' },
          dependencies: ['step_1'],
          preconditions: ['File exists'],
          expected_output: { content: '' },
          postconditions: ['Content extracted'],
          risk_level: 'READ_ONLY',
          timeout_ms: 15000,
          status: 'RUNNING',
          execution_duration_ms: 0
        },
        step_3: {
          node_id: 'step_3',
          skill_id: 'files.write',
          skill_version: '1.0.0',
          title: 'Persist Summary Report',
          inputs: { file_path: 'database/downloads/summary_report.txt' },
          dependencies: ['step_2'],
          preconditions: ['Summary generated'],
          expected_output: { written: true },
          postconditions: ['File verified'],
          risk_level: 'MEDIUM',
          timeout_ms: 10000,
          status: 'PENDING',
          execution_duration_ms: 0
        }
      }
    },
    plan_history: [],
    world_state: {
      last_updated_ts: Date.now() - 30000,
      freshness_threshold_ms: 30000,
      facts: {
        files_listed: { key: 'files_listed', value: true, source: 'FS', timestamp: Date.now() - 90000, confidence: 1.0, verified: true },
        active_app: { key: 'active_app', value: 'FileExplorer', source: 'UIA', timestamp: Date.now() - 60000, confidence: 0.95, verified: true }
      }
    },
    evaluation: {
      status: 'PROGRESSING',
      completed_milestones: ['Discover Documents'],
      active_milestone: 'Read & Synthesize',
      completed_nodes_count: 1,
      total_nodes_count: 3,
      progress_percentage: 33.3,
      replan_needed: false,
      explanation: 'Workflow in progress (1/3 steps complete).'
    },
    handoff_requests: []
  });

  readonly queue = signal<any[]>([]);
  readonly dataFlows = signal<DataFlowRecordModel[]>([
    {
      transfer_id: 'fl_init_01',
      task_id: 'wf_demo_01',
      source_application: 'FileSystem',
      source_object: 'Downloads/quarterly_report.pdf',
      data_classification: 'LOCAL_FILE',
      destination_application: 'WorkflowEngine',
      transfer_reason: 'Extract text contents for summarization',
      policy_decision: 'ALLOWED',
      timestamp: Date.now() - 60000
    }
  ]);
  readonly journal = signal<WorkflowJournalEntryModel[]>([
    {
      entry_id: 'jnl_01',
      task_id: 'wf_demo_01',
      goal_id: 'g_demo_01',
      plan_id: 'plan_demo_v1',
      plan_version: 1,
      event_type: 'GOAL_CREATED',
      details: { request: 'Find latest PDF in Downloads' },
      timestamp: Date.now() - 120000
    },
    {
      entry_id: 'jnl_02',
      task_id: 'wf_demo_01',
      goal_id: 'g_demo_01',
      plan_id: 'plan_demo_v1',
      plan_version: 1,
      event_type: 'PLAN_APPROVED',
      details: { autonomy_level: 'LEVEL_3' },
      timestamp: Date.now() - 110000
    }
  ]);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Computed
  readonly currentPlanNodes = computed<PlanNodeModel[]>(() => {
    const plan = this.activeWorkflow()?.active_plan;
    if (!plan || !plan.nodes) return [];
    return Object.values(plan.nodes);
  });

  readonly progressPercentage = computed<number>(() => {
    return this.activeWorkflow()?.evaluation?.progress_percentage ?? 0;
  });

  readonly hasPendingHandoff = computed<boolean>(() => {
    const handoffs = this.activeWorkflow()?.handoff_requests ?? [];
    return handoffs.some((h) => !h.resolved);
  });

  readonly pendingHandoff = computed<HumanHandoffRequestModel | null>(() => {
    const handoffs = this.activeWorkflow()?.handoff_requests ?? [];
    return handoffs.find((h) => !h.resolved) ?? null;
  });

  async loadWorkflow(taskId: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<WorkflowStatusModel>(`${this.baseUrl}/${taskId}`));
      if (res) {
        this.activeWorkflow.set(res);
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Offline fallback mode');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadQueue(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<any[]>(`${this.baseUrl}/queue`));
      if (res) this.queue.set(res);
    } catch (err: any) {}
  }

  async submitGoal(goalText: string, autonomyLevel: string = 'LEVEL_3'): Promise<string | null> {
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.post<any>(`${this.baseUrl}/submit`, {
          goal: goalText,
          autonomy_level: autonomyLevel
        })
      );
      if (res && res.task_id) {
        await this.loadWorkflow(res.task_id);
        return res.task_id;
      }
      return null;
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Goal submission failed');
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }

  async startWorkflow(taskId: string): Promise<void> {
    try {
      const evalRes = await firstValueFrom(
        this.http.post<GoalProgressEvaluationModel>(`${this.baseUrl}/${taskId}/start`, {})
      );
      if (evalRes && this.activeWorkflow()) {
        this.activeWorkflow.update((wf) => (wf ? { ...wf, evaluation: evalRes } : null));
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Workflow start failed');
    }
  }

  async pauseWorkflow(taskId: string): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/${taskId}/pause`, {}));
      this.activeWorkflow.update((wf) => (wf ? { ...wf, is_paused: true } : null));
    } catch (err: any) {
      this.activeWorkflow.update((wf) => (wf ? { ...wf, is_paused: true } : null));
    }
  }

  async resumeWorkflow(taskId: string): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/${taskId}/resume`, {}));
      this.activeWorkflow.update((wf) => (wf ? { ...wf, is_paused: false } : null));
    } catch (err: any) {
      this.activeWorkflow.update((wf) => (wf ? { ...wf, is_paused: false } : null));
    }
  }

  async cancelWorkflow(taskId: string): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/${taskId}/cancel`, {}));
      this.activeWorkflow.update((wf) =>
        wf && wf.active_plan ? { ...wf, active_plan: { ...wf.active_plan, is_active: false } } : null
      );
    } catch (err: any) {}
  }

  async triggerReplan(taskId: string, reason: string = 'Manual operator trigger'): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/${taskId}/replan`, {}, { params: { reason } })
      );
      await this.loadWorkflow(taskId);
    } catch (err: any) {}
  }

  async resolveHandoff(taskId: string, handoffId: string, notes: string = 'Resolved by operator'): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/${taskId}/resolve-handoff`, {
          handoff_id: handoffId,
          resolution_notes: notes
        })
      );
      this.activeWorkflow.update((wf) => {
        if (!wf) return null;
        const updated = wf.handoff_requests.map((h) =>
          h.handoff_id === handoffId ? { ...h, resolved: true, resolution_notes: notes } : h
        );
        return { ...wf, handoff_requests: updated };
      });
    } catch (err: any) {}
  }
}
