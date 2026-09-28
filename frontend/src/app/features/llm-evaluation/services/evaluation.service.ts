import { Injectable, signal, inject } from '@angular/core';
import { TaskApiService } from '../../../core/api/task-api.service';
import {
  EvaluationRun,
  EvaluationTimelineEvent,
  ModelRecord,
  ResearchPaper,
  ExperimentRecord,
  EvaluationStatusResponse,
  ScheduleType,
  CandidateType
} from '../models/evaluation.model';

@Injectable({
  providedIn: 'root'
})
export class EvaluationService {
  private readonly apiService = inject(TaskApiService);

  // State Signals
  readonly statusInfo = signal<EvaluationStatusResponse | null>(null);
  readonly runs = signal<EvaluationRun[]>([]);
  readonly timeline = signal<EvaluationTimelineEvent[]>([]);
  readonly selectedRun = signal<EvaluationRun | null>(null);
  readonly models = signal<ModelRecord[]>([]);
  readonly productionModel = signal<ModelRecord | null>(null);
  readonly benchmarks = signal<any[]>([]);
  readonly researchPapers = signal<ResearchPaper[]>([]);
  readonly experiments = signal<ExperimentRecord[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isRunningEvaluation = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.loadAll();
  }

  async loadAll(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const [status, runs, timeline, models, benchmarks, research, experiments] = await Promise.all([
        this.apiService.getEvaluationStatus(),
        this.apiService.listEvaluationRuns(),
        this.apiService.getEvaluationTimeline(),
        this.apiService.listEvaluationModels(),
        this.apiService.listEvaluationBenchmarks(),
        this.apiService.listResearchPapers(),
        this.apiService.listEvaluationExperiments()
      ]);

      this.statusInfo.set(status);
      this.runs.set(runs);
      this.timeline.set(timeline);
      this.models.set(models);
      this.benchmarks.set(benchmarks);
      this.researchPapers.set(research);
      this.experiments.set(experiments);

      const prod = models.find((m: ModelRecord) => m.is_production) || status.production_model || null;
      this.productionModel.set(prod);

      // By default, select Day 1 (earliest snapshot) as required by specification
      if (runs && runs.length > 0) {
        this.selectedRun.set(runs[0]);
      }
    } catch (err: any) {
      console.warn('Failed to load evaluation data:', err);
      this.errorMessage.set(err.message || 'Failed to connect to LLM Evaluation backend');
    } finally {
      this.isLoading.set(false);
    }
  }

  selectRun(runId: string): void {
    const found = this.runs().find((r) => r.run_id === runId);
    if (found) {
      this.selectedRun.set(found);
    }
  }

  selectRunByDay(dayIndex: number): void {
    const found = this.runs().find((r) => r.day_index === dayIndex);
    if (found) {
      this.selectedRun.set(found);
    }
  }

  async triggerEvaluation(scheduleType: ScheduleType = 'QUICK_DAILY'): Promise<void> {
    this.isRunningEvaluation.set(true);
    try {
      await this.apiService.triggerEvaluationRun(scheduleType);
      await this.loadAll();
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to trigger evaluation run');
    } finally {
      this.isRunningEvaluation.set(false);
    }
  }

  async createCandidate(payload: {
    hypothesis: string;
    candidate_type: CandidateType;
    candidate_model_name: string;
    candidate_version: string;
    quantization?: string;
  }): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.apiService.createCandidateExperiment(payload);
      await this.loadAll();
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to create candidate experiment');
    } finally {
      this.isLoading.set(false);
    }
  }

  async promoteCandidate(candidateId: string, overrideReason?: string): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.apiService.promoteCandidate(candidateId, overrideReason);
      await this.loadAll();
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Candidate promotion failed');
    } finally {
      this.isLoading.set(false);
    }
  }

  async rollbackModel(targetModelId?: string, reason?: string): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.apiService.rollbackModel(targetModelId, reason);
      await this.loadAll();
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Rollback failed');
    } finally {
      this.isLoading.set(false);
    }
  }

  async ingestPaper(sourceId: string): Promise<void> {
    try {
      await this.apiService.ingestResearchPaper(sourceId);
      await this.loadAll();
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to ingest research paper');
    }
  }

  async quarantinePaper(sourceId: string, reason: string): Promise<void> {
    try {
      await this.apiService.quarantineResearchPaper(sourceId, reason);
      await this.loadAll();
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to quarantine research paper');
    }
  }
}
