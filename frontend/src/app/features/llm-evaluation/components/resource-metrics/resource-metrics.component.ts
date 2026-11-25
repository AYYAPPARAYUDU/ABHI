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
      cpu_percent: 'N/A',
      memory_mb: 'N/A',
      gpu_memory_mb: 'N/A',
      duration_seconds: 'N/A'
    };
  }
}
