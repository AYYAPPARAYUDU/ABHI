import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TaskSummary } from '../../../core/models/telemetry.model';
import { SpatialCardComponent } from '../spatial-card/spatial-card.component';
import { OperatorStateService } from '../../../core/services/operator-state.service';

@Component({
  selector: 'app-agent-task-card',
  standalone: true,
  imports: [CommonModule, RouterModule, SpatialCardComponent],
  template: `
    @if (task) {
      <app-spatial-card
        [title]="task.goal"
        [status]="cardStatus()"
        [statusText]="cardStatusText()"
        variant="elevated"
      >
        <div class="task-card-inner">
          <!-- Step & State Header -->
          <div class="task-step-row">
            <div class="step-info">
              <span class="step-indicator" [class.spinning]="isRunning()">
                @if (isRunning()) {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                } @else if (task.isSuccess) {
                  ✓
                } @else {
                  ✕
                }
              </span>
              <span class="step-name">{{ task.currentStep || 'Processing intent…' }}</span>
            </div>

            <div class="step-progress-num">
              {{ task.progressPercent }}%
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="progress-track">
            <div
              class="progress-fill"
              [style.width.%]="task.progressPercent || (isRunning() ? 35 : 100)"
              [class.success]="task.isSuccess"
              [class.error]="task.state === 'FAILED'"
            ></div>
          </div>

          <!-- Task Controls & Timers -->
          <div class="task-bottom-row">
            <div class="task-meta">
              <span class="meta-item">ID: <code class="task-id">{{ task.taskId }}</code></span>
              @if (task.durationMs) {
                <span class="meta-item">• {{ (task.durationMs / 1000).toFixed(1) }}s</span>
              }
            </div>

            <div class="task-actions">
              @if (isRunning()) {
                <button
                  type="button"
                  class="action-pill danger"
                  (click)="onCancel.emit(task.taskId)"
                  title="Cancel Task"
                >
                  Cancel
                </button>
              }
              <a [routerLink]="['/tasks']" class="action-pill secondary">
                Details
              </a>
            </div>
          </div>
        </div>
      </app-spatial-card>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .task-card-inner {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .task-step-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .step-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .step-indicator {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
    }

    .step-indicator.spinning svg {
      animation: spin 1.5s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .step-name {
      font-size: 13px;
      color: #f1f5f9;
      font-weight: 500;
    }

    .step-progress-num {
      font-size: 12px;
      font-weight: 700;
      color: #38bdf8;
      font-family: monospace;
    }

    .progress-track {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #06b6d4, #38bdf8);
      border-radius: 6px;
      transition: width 0.3s ease;
    }

    .progress-fill.success {
      background: linear-gradient(90deg, #10b981, #34d399);
    }

    .progress-fill.error {
      background: linear-gradient(90deg, #ef4444, #f87171);
    }

    .task-bottom-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }

    .task-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #64748b;
    }

    .task-id {
      font-family: monospace;
      color: #94a3b8;
    }

    .task-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .action-pill {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
    }

    .action-pill.secondary {
      background: rgba(255, 255, 255, 0.06);
      color: #cbd5e1;
    }

    .action-pill.secondary:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
    }

    .action-pill.danger {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
    }

    .action-pill.danger:hover {
      background: rgba(239, 68, 68, 0.3);
    }
  `]
})
export class AgentTaskCardComponent {
  @Input() task: TaskSummary | null = null;
  @Output() onCancel = new EventEmitter<string>();

  readonly stateService = inject(OperatorStateService);

  isRunning(): boolean {
    if (!this.task) return false;
    return !['COMPLETED', 'FAILED', 'CANCELLED', 'EMERGENCY_STOPPED'].includes(this.task.state);
  }

  cardStatus(): 'SUCCESS' | 'WARNING' | 'ERROR' | 'ACTIVE' | 'INFO' {
    if (!this.task) return 'INFO';
    if (this.task.isSuccess || this.task.state === 'COMPLETED') return 'SUCCESS';
    if (this.task.state === 'FAILED' || this.task.state === 'EMERGENCY_STOPPED') return 'ERROR';
    if (this.isRunning()) return 'ACTIVE';
    return 'INFO';
  }

  cardStatusText(): string {
    if (!this.task) return 'Ready';
    if (this.task.isSuccess || this.task.state === 'COMPLETED') return 'Completed';
    if (this.task.state === 'FAILED') return 'Failed';
    if (this.task.state === 'CANCELLED') return 'Cancelled';
    return 'Working';
  }
}
