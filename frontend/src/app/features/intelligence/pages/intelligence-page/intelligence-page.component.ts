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
import { NeuralNetworkViewerComponent } from '../../../../shared/components/neural-network-viewer/neural-network-viewer.component';

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
    TrainingProgressComponent,
    NeuralNetworkViewerComponent
  ],
  templateUrl: './intelligence-page.component.html',
  styleUrl: './intelligence-page.component.css'
})
export class IntelligencePageComponent implements OnInit {
  readonly evalService = inject(EvaluationService);
  private readonly threeScene = inject(ThreeSceneManagerService);

  ngOnInit(): void {
    this.threeScene.setMode('INTELLIGENCE');
    this.evalService.loadAll();
  }
}
