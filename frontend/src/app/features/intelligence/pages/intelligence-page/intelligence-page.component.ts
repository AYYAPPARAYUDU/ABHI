import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationService } from '../../../llm-evaluation/services/evaluation.service';
import { ThreeSceneManagerService } from '../../../../shared/3d/three-scene-manager.service';
import { DailyScorecardComponent } from '../../../llm-evaluation/components/daily-scorecard/daily-scorecard.component';
import { CapabilityRadarComponent } from '../../../llm-evaluation/components/capability-radar/capability-radar.component';
import { BenchmarkHeatmapComponent } from '../../../llm-evaluation/components/benchmark-heatmap/benchmark-heatmap.component';
import { ModelComparisonComponent } from '../../../llm-evaluation/components/model-comparison/model-comparison.component';
import { RegressionAlertComponent } from '../../../llm-evaluation/components/regression-alert/regression-alert.component';
import { ResourceMetricsComponent } from '../../../llm-evaluation/components/resource-metrics/resource-metrics.component';
import { CandidateListComponent } from '../../../llm-evaluation/components/candidate-list/candidate-list.component';
import { ExperimentBoardComponent } from '../../../llm-evaluation/components/experiment-board/experiment-board.component';
import { ModelLineage3dComponent } from '../../../llm-evaluation/components/model-lineage-3d/model-lineage-3d.component';
import { ExperimentTimelineComponent } from '../../../llm-evaluation/components/experiment-timeline/experiment-timeline.component';
import { TrainingProgressComponent } from '../../../llm-evaluation/components/training-progress/training-progress.component';

@Component({
  selector: 'app-intelligence-page',
  standalone: true,
  imports: [
    CommonModule,
    DailyScorecardComponent,
    CapabilityRadarComponent,
    BenchmarkHeatmapComponent,
    ModelComparisonComponent,
    RegressionAlertComponent,
    ResourceMetricsComponent,
    CandidateListComponent,
    ExperimentBoardComponent,
    ModelLineage3dComponent,
    ExperimentTimelineComponent,
    TrainingProgressComponent
  ],
  template: `
    <div class="intelligence-workspace">
      <!-- Workspace Header -->
      <header class="workspace-header">
        <div class="header-left">
          <div class="workspace-title-group">
            <span class="workspace-pill">WORKSPACE THREE</span>
            <h1 class="workspace-title">Intelligence & Training Lab</h1>
          </div>
          <p class="workspace-subtitle">
            Model observatory, daily benchmark telemetry, candidate evolution & honest training capabilities.
          </p>
        </div>

        <div class="header-actions">
          <div class="baseline-tag">
            <span class="tag-label">LOCKED BASELINE</span>
            <span class="tag-val">{{ evalService.lockedBaseline()?.baseline_id || 'BASELINE_V1_LOCKED' }}</span>
          </div>
          <button class="run-eval-btn" (click)="evalService.triggerEvaluation('QUICK_DAILY')" [disabled]="evalService.isRunningEvaluation()">
            @if (evalService.isRunningEvaluation()) {
              <span>Evaluating...</span>
            } @else {
              <span>▶ Run Daily Benchmark</span>
            }
          </button>
        </div>
      </header>

      <!-- Training Capability Honest Status Banner -->
      <section class="training-capability-banner">
        <div class="banner-icon">ℹ</div>
        <div class="banner-content">
          <div class="banner-title">
            <span>TRAINING RUNTIME CAPABILITY:</span>
            <span class="banner-status-tag">ADAPTER EXPERIMENTATION ACTIVE</span>
            <span class="banner-status-tag warning">FULL BACKPROP NOT_AVAILABLE</span>
          </div>
          <p class="banner-desc">
            Local PyTorch / CUDA runtime is active for prompt tuning, RAG index adaptation, and candidate parameter isolation. Full distributed backprop neural fine-tuning is honestly classified as <strong>NOT_AVAILABLE</strong> on this local node.
          </p>
        </div>
      </section>

      <!-- Lab Navigation Tabs -->
      <nav class="lab-tabs">
        <button
          class="lab-tab"
          [class.active]="evalService.activeTab() === 'DAILY'"
          (click)="evalService.setActiveTab('DAILY')"
        >
          <span>Daily Scorecard & Evidence</span>
        </button>
        <button
          class="lab-tab"
          [class.active]="evalService.activeTab() === 'CANDIDATES'"
          (click)="evalService.setActiveTab('CANDIDATES')"
        >
          <span>Candidate Adaptation</span>
        </button>
        <button
          class="lab-tab"
          [class.active]="evalService.activeTab() === 'EXPERIMENTS'"
          (click)="evalService.setActiveTab('EXPERIMENTS')"
        >
          <span>Experiment Board</span>
        </button>
        <button
          class="lab-tab"
          [class.active]="evalService.activeTab() === 'LINEAGE'"
          (click)="evalService.setActiveTab('LINEAGE')"
        >
          <span>3D Model Lineage</span>
        </button>
        <button
          class="lab-tab"
          [class.active]="evalService.activeTab() === 'MODELS'"
          (click)="evalService.setActiveTab('MODELS')"
        >
          <span>Model Comparison & Rollback</span>
        </button>
      </nav>

      <!-- Active Tab Panels -->
      <main class="lab-content">
        @if (evalService.activeTab() === 'DAILY') {
          <div class="daily-grid">
            <div class="daily-left">
              <app-daily-scorecard></app-daily-scorecard>
              <app-benchmark-heatmap></app-benchmark-heatmap>
            </div>
            <div class="daily-right">
              <app-capability-radar></app-capability-radar>
              <app-resource-metrics></app-resource-metrics>
            </div>
          </div>
        }

        @if (evalService.activeTab() === 'CANDIDATES') {
          <div class="candidates-layout">
            <app-candidate-list></app-candidate-list>
            <app-training-progress></app-training-progress>
          </div>
        }

        @if (evalService.activeTab() === 'EXPERIMENTS') {
          <div class="experiments-layout">
            <app-experiment-board></app-experiment-board>
            <app-experiment-timeline></app-experiment-timeline>
          </div>
        }

        @if (evalService.activeTab() === 'LINEAGE') {
          <div class="lineage-layout">
            <app-model-lineage-3d></app-model-lineage-3d>
          </div>
        }

        @if (evalService.activeTab() === 'MODELS') {
          <div class="models-layout">
            <app-model-comparison></app-model-comparison>
            <app-regression-alert></app-regression-alert>
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .intelligence-workspace {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
      animation: fadeIn 0.4s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .workspace-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px 20px;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
    }

    .workspace-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .workspace-pill {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.3);
    }

    .workspace-title {
      font-size: 20px;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0;
    }

    .workspace-subtitle {
      font-size: 13px;
      color: #94a3b8;
      margin: 4px 0 0 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .baseline-tag {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }

    .tag-label {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.05em;
    }

    .tag-val {
      font-size: 11px;
      font-family: monospace;
      color: #10b981;
      font-weight: 600;
    }

    .run-eval-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 10px;
      background: linear-gradient(135deg, #6366f1, #3b82f6);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
      transition: all 0.2s;
    }

    .run-eval-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.45);
    }

    /* Honest Training Banner */
    .training-capability-banner {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 12px 16px;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 12px;
    }

    .banner-icon {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      flex-shrink: 0;
    }

    .banner-content {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .banner-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.05em;
    }

    .banner-status-tag {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    .banner-status-tag.warning {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
    }

    .banner-desc {
      font-size: 12px;
      color: #cbd5e1;
      margin: 0;
      line-height: 1.4;
    }

    /* Lab Tabs */
    .lab-tabs {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 8px;
      flex-wrap: wrap;
    }

    .lab-tab {
      padding: 8px 16px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      color: #94a3b8;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .lab-tab:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #f1f5f9;
    }

    .lab-tab.active {
      background: rgba(99, 102, 241, 0.15);
      border-color: rgba(99, 102, 241, 0.35);
      color: #818cf8;
      font-weight: 600;
    }

    /* Tab Layouts */
    .daily-grid {
      display: grid;
      grid-template-columns: 1fr 420px;
      gap: 20px;
    }

    .daily-left, .daily-right {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .candidates-layout, .experiments-layout, .models-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .lineage-layout {
      width: 100%;
    }

    @media (max-width: 1024px) {
      .daily-grid, .candidates-layout, .experiments-layout, .models-layout {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class IntelligencePageComponent implements OnInit {
  readonly evalService = inject(EvaluationService);
  private readonly threeScene = inject(ThreeSceneManagerService);

  ngOnInit(): void {
    this.threeScene.setMode('INTELLIGENCE');
    this.evalService.loadAll();
  }
}
