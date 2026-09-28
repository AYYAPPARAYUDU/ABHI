import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatorStateService } from '../../services/operator-state.service';
import { TimelineItem } from '../../models/telemetry.model';

@Component({
  selector: 'app-execution-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timeline-card p-3">
      <!-- Section Header -->
      <div class="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom border-secondary border-opacity-25">
        <div class="d-flex align-items-center gap-2">
          <span class="panel-icon">⏱️</span>
          <h2 class="panel-title m-0">LIVE EXECUTION TIMELINE</h2>
        </div>
        <span class="badge bg-secondary bg-opacity-25 text-secondary font-monospace">
          {{ timeline().length }} EVENTS
        </span>
      </div>

      <!-- Timeline List -->
      <div class="timeline-scroll-container">
        <div *ngIf="timeline().length === 0" class="text-center p-3 text-muted font-monospace small">
          No execution timeline events recorded. Start a task to observe stage transitions.
        </div>

        <div class="timeline-list">
          <div
            *ngFor="let item of timeline(); trackBy: trackByTimelineId"
            class="timeline-item d-flex align-items-start gap-3 p-2 mb-2 rounded"
            [ngClass]="getTimelineItemClass(item.status)"
          >
            <!-- Status Icon -->
            <div class="timeline-icon-box">
              <span class="status-symbol">{{ getStatusSymbol(item.status) }}</span>
            </div>

            <!-- Content -->
            <div class="timeline-content flex-grow-1">
              <div class="d-flex align-items-center justify-content-between">
                <span class="timeline-step-title font-monospace fw-bold">{{ item.stepName }}</span>
                <span class="timeline-time font-monospace text-muted small">
                  {{ item.timestamp | date:'HH:mm:ss.SSS' }}
                </span>
              </div>
              <div *ngIf="item.details" class="timeline-details font-monospace text-secondary small mt-1">
                {{ item.details }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
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
