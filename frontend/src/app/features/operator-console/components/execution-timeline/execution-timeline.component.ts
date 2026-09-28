import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { TimelineItem } from '../../../../core/models/telemetry.model';

@Component({
  selector: 'app-execution-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './execution-timeline.component.html',
  styleUrl: './execution-timeline.component.css'
})
export class ExecutionTimelineComponent {
  private readonly stateService = inject(OperatorStateService);
  readonly timeline = this.stateService.timeline;

  trackByTimelineId(_index: number, item: TimelineItem): string {
    return item.id;
  }

  getStatusSymbol(status: TimelineItem['status']): string {
    switch (status) {
      case 'COMPLETED':
        return '✓';
      case 'FAILED':
        return '✗';
      case 'RECOVERING':
        return '🔄';
      case 'STOPPED':
        return '🛑';
      case 'IN_PROGRESS':
        return '▶';
      default:
        return '•';
    }
  }

  getTimelineItemClass(status: TimelineItem['status']): string {
    switch (status) {
      case 'COMPLETED':
        return 'item-completed';
      case 'FAILED':
        return 'item-failed';
      case 'RECOVERING':
        return 'item-recovering';
      case 'STOPPED':
        return 'item-stopped';
      default:
        return 'item-progress';
    }
  }
}
