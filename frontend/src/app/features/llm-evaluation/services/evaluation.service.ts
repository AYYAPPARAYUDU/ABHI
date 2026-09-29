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
  CandidateType,
  CandidateRecord,
  ModelLineageNode,
  LockedBaselineContract,
  TrainingJobStatus
} from '../models/evaluation.model';

@Injectable({
  providedIn: 'root'
})
export class EvaluationService {
  private readonly apiService = inject(TaskApiService);

  // State Signals
  readonly statusInfo = signal<EvaluationStatusResponse | null>(null);
  readonly lockedBaseline = signal<LockedBaselineContract | null>(null);
  readonly runs = signal<EvaluationRun[]>([]);
  readonly timeline = signal<EvaluationTimelineEvent[]>([]);
  readonly selectedRun = signal<EvaluationRun | null>(null);
  readonly models = signal<ModelRecord[]>([]);
  readonly productionModel = signal<ModelRecord | null>(null);
  readonly benchmarks = signal<any[]>([]);
  readonly researchPapers = signal<ResearchPaper[]>([]);
  readonly experiments = signal<ExperimentRecord[]>([]);
  readonly candidates = signal<CandidateRecord[]>([]);
  readonly selectedCandidate = signal<CandidateRecord | null>(null);
  readonly lineageNodes = signal<ModelLineageNode[]>([]);
  readonly resourceHeadroom = signal<any | null>(null);
  readonly activeTrainingJob = signal<TrainingJobStatus | null>(null);
  
  // Tab navigation state
  readonly activeTab = signal<'DAILY' | 'CANDIDATES' | 'EXPERIMENTS' | 'MODELS' | 'LINEAGE' | 'RESEARCH' | 'ROLLBACK'>('DAILY');

  readonly isLoading = signal<boolean>(false);
  readonly isRunningEvaluation = signal<boolean>(false);
  readonly isEvaluatingCandidate = signal<boolean>(false);
  readonly isTraining = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  constructor() {
    this.loadAll();
  }

  async loadAll(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const [
        status,
        baseline,
        runs,
        timeline,
        models,
        benchmarks,
        research,
        experiments,
        candidates,
        lineage,
        resources
      ] = await Promise.all([
        this.apiService.getEvaluationStatus(),
        this.apiService.getLockedBaseline().catch(() => null),
        this.apiService.listEvaluationRuns(),
        this.apiService.getEvaluationTimeline(),
        this.apiService.listEvaluationModels(),
        this.apiService.listEvaluationBenchmarks(),
        this.apiService.listResearchPapers(),
        this.apiService.listEvaluationExperiments(),
        this.apiService.listCandidates().catch(() => []),
        this.apiService.getModelLineage().catch(() => []),
        this.apiService.getResourceHeadroom().catch(() => null)
      ]);

      this.statusInfo.set(status);
      this.lockedBaseline.set(baseline);
      this.runs.set(runs);
      this.timeline.set(timeline);
      this.models.set(models);
      this.benchmarks.set(benchmarks);
      this.researchPapers.set(research);
      this.experiments.set(experiments);
      this.candidates.set(candidates);
      this.lineageNodes.set(lineage);
      this.resourceHeadroom.set(resources);

      const prod = models.find((m: ModelRecord) => m.is_production) || status.production_model || null;
      this.productionModel.set(prod);

      // Default selected candidate
      if (candidates && candidates.length > 0 && !this.selectedCandidate()) {
        this.selectedCandidate.set(candidates[0]);
      }

      // Default select earliest Day 1 snapshot for replay
      if (runs && runs.length > 0 && !this.selectedRun()) {
        this.selectedRun.set(runs[0]);
      }
    } catch (err: any) {
      console.warn('Failed to load evaluation data:', err);
      this.errorMessage.set(err.message || 'Failed to connect to LLM Evaluation backend');
    } finally {
      this.isLoading.set(false);
    }
  }

  setActiveTab(tab: 'DAILY' | 'CANDIDATES' | 'EXPERIMENTS' | 'MODELS' | 'LINEAGE' | 'RESEARCH' | 'ROLLBACK'): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    this.successMessage.set(null);
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

  selectCandidate(candidateId: string): void {
    const found = this.candidates().find((c) => c.candidate_id === candidateId);
    if (found) {
      this.selectedCandidate.set(found);
    }
  }

  async triggerEvaluation(scheduleType: ScheduleType = 'QUICK_DAILY'): Promise<void> {
    this.isRunningEvaluation.set(true);
    this.errorMessage.set(null);
    try {
      await this.apiService.triggerEvaluationRun(scheduleType);
      await this.loadAll();
      this.successMessage.set('Daily evaluation run completed with real evidence capture.');
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to trigger evaluation run');
    } finally {
      this.isRunningEvaluation.set(false);
    }
  }

  async createCandidate(payload: {
    hypothesis_title: string;
    hypothesis_description: string;
    candidate_type: CandidateType;
    candidate_name: string;
    target_capability?: string;
    baseline_score?: number;
    target_score?: number;
    research_source_id?: string;
  }): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      await this.apiService.createCandidateAdaptation({
        hypothesis_title: payload.hypothesis_title,
        hypothesis_description: payload.hypothesis_description,
        candidate_type: payload.candidate_type,
        candidate_name: payload.candidate_name,
        target_capability: payload.target_capability || 'multilingual_te',
        baseline_score: payload.baseline_score || 0.85,
        target_score: payload.target_score || 0.95,
        research_source_id: payload.research_source_id
      });
      await this.loadAll();
      this.successMessage.set(`Candidate adaptation "${payload.candidate_name}" registered.`);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to create candidate adaptation');
    } finally {
      this.isLoading.set(false);
    }
  }

  async startTraining(candidateId: string, epochs: number = 3): Promise<void> {
    this.isTraining.set(true);
    this.errorMessage.set(null);
    try {
      const res = await this.apiService.startTrainingJob({
        candidate_id: candidateId,
        epochs
      });
      if (res.job) {
        this.activeTrainingJob.set(res.job);
        this.pollTrainingStatus(res.job.job_id);
      }
      this.successMessage.set('Adaptation job initiated in isolated subprocess.');
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Training failed to start');
      this.isTraining.set(false);
    }
  }

  private pollTrainingStatus(jobId: string): void {
    const interval = setInterval(async () => {
      try {
        const job = await this.apiService.getTrainingStatus(jobId);
        this.activeTrainingJob.set(job);
        if (job.state === 'COMPLETED' || job.state === 'FAILED' || job.state === 'CANCELLED') {
          clearInterval(interval);
          this.isTraining.set(false);
          await this.loadAll();
        }
      } catch (e) {
        clearInterval(interval);
        this.isTraining.set(false);
      }
    }, 500);
  }

  async cancelTraining(): Promise<void> {
    const job = this.activeTrainingJob();
    if (!job) return;
    try {
      await this.apiService.cancelTrainingJob(job.job_id);
      this.isTraining.set(false);
      this.activeTrainingJob.set(null);
      await this.loadAll();
      this.successMessage.set('Training job cancelled safely.');
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to cancel training');
    }
  }

  async evaluateCandidate(candidateId: string): Promise<void> {
    this.isEvaluatingCandidate.set(true);
    this.errorMessage.set(null);
    try {
      const res = await this.apiService.evaluateCandidate(candidateId, 'QUICK_DAILY');
      await this.loadAll();
      this.selectCandidate(candidateId);
      this.successMessage.set(`Candidate evaluated head-to-head: ${res.comparison?.summary_verdict || 'Done'}`);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Head-to-Head evaluation failed');
    } finally {
      this.isEvaluatingCandidate.set(false);
    }
  }

  async promoteCandidate(candidateId: string, overrideReason?: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      await this.apiService.promoteCandidate(candidateId, overrideReason);
      await this.loadAll();
      this.successMessage.set('Candidate promoted to PRODUCTION. Previous model archived for zero-loss rollback.');
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Candidate promotion failed');
    } finally {
      this.isLoading.set(false);
    }
  }

  async rollbackModel(targetModelId?: string, reason?: string): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      await this.apiService.rollbackModel(targetModelId, reason);
      await this.loadAll();
      this.successMessage.set('Emergency rollback completed successfully. Previous production model restored.');
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
      this.successMessage.set('Research paper ingested into local LanceDB corpus.');
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to ingest research paper');
    }
  }

  async quarantinePaper(sourceId: string, reason: string): Promise<void> {
    try {
      await this.apiService.quarantineResearchPaper(sourceId, reason);
      await this.loadAll();
      this.successMessage.set('Research paper quarantined.');
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to quarantine research paper');
    }
  }
}
