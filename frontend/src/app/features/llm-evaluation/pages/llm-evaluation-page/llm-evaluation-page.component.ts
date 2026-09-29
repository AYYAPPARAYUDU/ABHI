import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationService } from '../../services/evaluation.service';
import { EvaluationHeaderComponent } from '../../components/evaluation-header/evaluation-header.component';
import { EvaluationReplayComponent } from '../../components/evaluation-replay/evaluation-replay.component';
import { DailyScorecardComponent } from '../../components/daily-scorecard/daily-scorecard.component';
import { CapabilityGalaxyComponent } from '../../components/capability-galaxy/capability-galaxy.component';
import { EvolutionTimeline3dComponent } from '../../components/evolution-timeline-3d/evolution-timeline-3d.component';
import { CapabilityRadarComponent } from '../../components/capability-radar/capability-radar.component';
import { BenchmarkHeatmapComponent } from '../../components/benchmark-heatmap/benchmark-heatmap.component';
import { ResearchFeedComponent } from '../../components/research-feed/research-feed.component';
import { ModelComparisonComponent } from '../../components/model-comparison/model-comparison.component';
import { RegressionAlertComponent } from '../../components/regression-alert/regression-alert.component';
import { EvolutionPipelineComponent } from '../../components/evolution-pipeline/evolution-pipeline.component';
import { ResourceMetricsComponent } from '../../components/resource-metrics/resource-metrics.component';
import { RunDetailComponent } from '../../components/run-detail/run-detail.component';
import { CandidateListComponent } from '../../components/candidate-list/candidate-list.component';
import { ExperimentBoardComponent } from '../../components/experiment-board/experiment-board.component';
import { ModelLineage3dComponent } from '../../components/model-lineage-3d/model-lineage-3d.component';
import { ExperimentTimelineComponent } from '../../components/experiment-timeline/experiment-timeline.component';
import { TrainingProgressComponent } from '../../components/training-progress/training-progress.component';
import { ResourceMonitorComponent } from '../../components/resource-monitor/resource-monitor.component';

@Component({
  selector: 'app-llm-evaluation-page',
  standalone: true,
  imports: [
    CommonModule,
    EvaluationHeaderComponent,
    EvaluationReplayComponent,
    DailyScorecardComponent,
    CapabilityGalaxyComponent,
    EvolutionTimeline3dComponent,
    CapabilityRadarComponent,
    BenchmarkHeatmapComponent,
    ResearchFeedComponent,
    ModelComparisonComponent,
    RegressionAlertComponent,
    EvolutionPipelineComponent,
    ResourceMetricsComponent,
    RunDetailComponent,
    CandidateListComponent,
    ExperimentBoardComponent,
    ModelLineage3dComponent,
    ExperimentTimelineComponent,
    TrainingProgressComponent,
    ResourceMonitorComponent
  ],
  templateUrl: './llm-evaluation-page.component.html',
  styleUrls: ['./llm-evaluation-page.component.css']
})
export class LlmEvaluationPageComponent {
  readonly evalService = inject(EvaluationService);

  readonly tabs: { id: 'DAILY' | 'CANDIDATES' | 'EXPERIMENTS' | 'MODELS' | 'LINEAGE' | 'RESEARCH' | 'ROLLBACK'; label: string; icon: string }[] = [
    { id: 'DAILY', label: 'Daily Scorecard & Evidence', icon: '📊' },
    { id: 'CANDIDATES', label: 'Candidate Adaptation', icon: '🧪' },
    { id: 'EXPERIMENTS', label: 'Experiment Board', icon: '📋' },
    { id: 'LINEAGE', label: '3D Model Lineage', icon: '🌐' },
    { id: 'MODELS', label: 'Model Comparison & Rollback', icon: '⚖️' },
    { id: 'RESEARCH', label: 'Research Corpus', icon: '📚' }
  ];

  setTab(tabId: any): void {
    this.evalService.setActiveTab(tabId);
  }
}
