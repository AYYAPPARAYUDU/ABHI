import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskSummary } from '../../models/task.model';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.css'
})
export class TaskCardComponent {
  @Input({ required: true }) task!: TaskSummary;
  @Input() isSelected: boolean = false;
  @Output() taskSelected = new EventEmitter<string>();

  getStatusBadgeClass(state: string): string {
    switch (state?.toUpperCase()) {
      case 'COMPLETED':
      case 'SUCCESS':
        return 'bg-success bg-opacity-25 text-success border-success';
      case 'EXECUTING':
      case 'PLANNING':
      case 'VERIFYING':
        return 'bg-info bg-opacity-25 text-info border-info';
      case 'WAITING_USER_CONSENT':
        return 'bg-warning bg-opacity-25 text-warning border-warning';
      case 'FAILED':
        return 'bg-danger bg-opacity-25 text-danger border-danger';
      case 'CANCELLED':
      case 'EMERGENCY_STOPPED':
        return 'bg-secondary bg-opacity-25 text-secondary border-secondary';
      default:
        return 'bg-secondary bg-opacity-10 text-light border-secondary';
    }
  }

  formatDuration(ms?: number | null): string {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }
}
