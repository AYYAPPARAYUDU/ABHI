import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OperatorStateService } from '../../../../core/services/operator-state.service';

@Component({
  selector: 'app-task-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-panel.component.html',
  styleUrl: './task-panel.component.css'
})
export class TaskPanelComponent {
  private readonly stateService = inject(OperatorStateService);

  readonly currentTask = this.stateService.currentTask;
  readonly isBusy = this.stateService.isBusy;
  readonly goalInput = signal('');

  selectPreset(text: string): void {
    this.goalInput.set(text);
  }

  onSubmitTask(): void {
    const text = this.goalInput().trim();
    if (!text || this.isBusy()) return;
    this.stateService.submitGoal(text);
  }

  onCancelTask(): void {
    this.stateService.cancelActiveTask();
  }

  getTaskBadgeClass(state: string): string {
    switch (state) {
      case 'COMPLETED':
        return 'bg-success text-white';
      case 'FAILED':
      case 'EMERGENCY_STOPPED':
        return 'bg-danger text-white';
      case 'RECOVERING':
      case 'RECONCILING':
        return 'bg-warning text-dark';
      case 'EXECUTING':
        return 'bg-primary text-white';
      default:
        return 'bg-info text-dark';
    }
  }

  getProgressBarClass(state: string): string {
    switch (state) {
      case 'COMPLETED':
        return 'bg-success';
      case 'FAILED':
      case 'EMERGENCY_STOPPED':
        return 'bg-danger';
      case 'RECOVERING':
        return 'bg-warning';
      default:
        return 'bg-info';
    }
  }
}
