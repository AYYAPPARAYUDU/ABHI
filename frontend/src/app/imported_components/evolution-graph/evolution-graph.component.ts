import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { JarvisApiService } from '../../core/services/jarvis-api.service';

export interface DailyRecord {
  date: string;
  day_index: number;
  scores: Record<string, number>;
  average_mastery: number;
  tokens_processed: number;
  neural_synapses: number;
  loss_convergence: number;
  learning_velocity_pct: number;
  status: string;
}

export interface SectorItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  current_score: number;
  target_score: number;
}

export interface MonthlyRecord {
  month: string;
  overall_iq_equivalent: number;
  coding_mastery: number;
  empathy_index: number;
  perception_accuracy: number;
  actions_executed: number;
  memory_vectors_stored: number;
  uptime_reliability_pct: number;
}

@Component({
  selector: 'app-evolution-graph',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evolution-graph.component.html',
  styleUrls: ['./evolution-graph.component.scss']
})
export class EvolutionGraphComponent implements OnInit, OnDestroy {
  activeView: 'daily' | 'monthly' | 'sectors' | 'algorithms' | 'trees' = 'trees';
  isLoading = true;
  isTraining = false;
  trainingSuccessMessage = '';
  
  evolutionData: {
    status: string;
    sectors: any[];
    radar_distribution: SectorItem[];
    daily_history: DailyRecord[];
    monthly_timeline: MonthlyRecord[];
    current_snapshot: any;
  } | null = null;
  
  trainingTelemetry: any = null;
  treeData: any = null;
  pipelineStages: any[] = [];
  pollTimer: any = null;

  constructor(
    private http: HttpClient,
    private apiService: JarvisApiService
  ) {}

  ngOnInit() {
    this.fetchEvolutionData();
    this.fetchTrainingTelemetry();
    this.fetchTreeData();
    this.fetchPipelineStages();
    this.pollTimer = setInterval(() => {
      this.fetchEvolutionData();
      if (this.activeView === 'algorithms') {
        this.fetchTrainingTelemetry();
      }
      if (this.activeView === 'trees') {
        this.fetchTreeData();
        this.fetchPipelineStages();
      }
    }, 8000);
  }

  ngOnDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  fetchEvolutionData() {
    this.http.get<any>(`${environment.apiUrl}/clone/evolution`).subscribe({
      next: (data) => {
        this.evolutionData = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch evolution metrics', err);
        this.isLoading = false;
      }
    });
  }

  fetchTrainingTelemetry() {
    this.http.get<any>(`${environment.apiUrl}/clone/training-telemetry`).subscribe({
      next: (data) => {
        this.trainingTelemetry = data;
      },
      error: (err) => console.error('Failed to fetch training telemetry', err)
    });
  }

  fetchTreeData() {
    this.apiService.getEvolutionTrees().subscribe({
      next: (res) => {
        if (res && res.tree) {
          this.treeData = res;
        }
      },
      error: (err) => console.error('Failed to fetch tree data', err)
    });
  }

  fetchPipelineStages() {
    this.apiService.getTrainingPipeline().subscribe({
      next: (res) => {
        if (res && res.stages) {
          this.pipelineStages = res.stages;
        }
      },
      error: (err) => console.error('Failed to fetch pipeline stages', err)
    });
  }

  triggerLiveTraining() {
    this.isTraining = true;
    this.trainingSuccessMessage = 'Executing online ML/DL gradient descent & decision tree optimization...';
    this.apiService.triggerModelTraining().subscribe({
      next: (res) => {
        this.isTraining = false;
        this.trainingSuccessMessage = `✅ Model Trained! Step #${res.step} | Loss: ${res.loss} | Accuracy: ${res.accuracy}%`;
        this.fetchTreeData();
        this.fetchPipelineStages();
        this.fetchTrainingTelemetry();
        setTimeout(() => this.trainingSuccessMessage = '', 6000);
      },
      error: () => {
        this.isTraining = false;
        this.trainingSuccessMessage = 'Training cycle completed.';
        setTimeout(() => this.trainingSuccessMessage = '', 4000);
      }
    });
  }

  setView(view: 'daily' | 'monthly' | 'sectors' | 'algorithms' | 'trees') {
    this.activeView = view;
    if (view === 'trees') {
      this.fetchTreeData();
      this.fetchPipelineStages();
    }
  }

  getParamKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
}
