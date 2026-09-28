import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationService } from '../../services/evaluation.service';

@Component({
  selector: 'app-resource-metrics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resource-metrics.component.html',
  styleUrls: ['./resource-metrics.component.css']
})
export class ResourceMetricsComponent {
  readonly evalService = inject(EvaluationService);

  get resource() {
    return this.evalService.selectedRun()?.resource_metrics || {
      cpu_percent: 14.5,
      memory_mb: 480.0,
      gpu_memory_mb: 1240.0,
      duration_seconds: 2.15
    };
  }
}
