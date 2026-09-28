import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskHistoryService } from '../../services/task-history.service';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.css'
})
export class TaskDetailComponent {
  readonly taskHistory = inject(TaskHistoryService);

  get selectedTask() {
    return this.taskHistory.selectedTask();
  }

  getDagNodes(dag: any): Array<{ id: string; action: string; state: string; target?: string }> {
    if (!dag || !dag.nodes) return [];
    return Object.entries(dag.nodes).map(([id, val]: [string, any]) => ({
      id,
      action: val.action || val.type || 'EXECUTE',
      state: val.state || 'COMPLETED',
      target: val.target || val.params?.target || val.goal || undefined
    }));
  }

  getStatusColor(state?: string): string {
    switch (state?.toUpperCase()) {
      case 'COMPLETED':
      case 'SUCCESS':
        return 'text-success';
      case 'EXECUTING':
      case 'PLANNING':
      case 'VERIFYING':
        return 'text-info';
      case 'WAITING_USER_CONSENT':
        return 'text-warning';
      case 'FAILED':
        return 'text-danger';
      default:
        return 'text-secondary';
    }
  }
}
