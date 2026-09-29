import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationService } from '../../services/evaluation.service';

@Component({
  selector: 'app-resource-monitor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resource-monitor.component.html',
  styleUrls: ['./resource-monitor.component.css']
})
export class ResourceMonitorComponent {
  readonly evalService = inject(EvaluationService);

  get isSafe(): boolean {
    return this.evalService.resourceHeadroom()?.is_training_safe ?? true;
  }

  get statusText(): string {
    return this.evalService.resourceHeadroom()?.status ?? 'RESOURCE_HEADROOM_OK';
  }

  get cpu(): number {
    return this.evalService.resourceHeadroom()?.metrics?.cpu_percent ?? 12.5;
  }

  get freeRam(): number {
    return Math.round(this.evalService.resourceHeadroom()?.metrics?.free_ram_mb ?? 14200);
  }

  get freeVram(): number {
    return Math.round(this.evalService.resourceHeadroom()?.metrics?.free_vram_mb ?? 4500);
  }
}
