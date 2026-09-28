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
    ResourceMetricsComponent
  ],
  templateUrl: './llm-evaluation-page.component.html',
  styleUrls: ['./llm-evaluation-page.component.css']
})
export class LlmEvaluationPageComponent {
  readonly evalService = inject(EvaluationService);
}
