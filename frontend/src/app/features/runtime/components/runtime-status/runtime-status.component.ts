import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RuntimeService } from '../../services/runtime.service';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';

@Component({
  selector: 'app-runtime-status',
  standalone: true,
  imports: [CommonModule, PanelComponent],
  templateUrl: './runtime-status.component.html',
  styleUrl: './runtime-status.component.css'
})
export class RuntimeStatusComponent {
  private readonly runtimeService = inject(RuntimeService);

  readonly state = this.runtimeService.state;

  getModeBadgeClass(): string {
    const m = this.state().current_mode;
    if (m === 'ARMED' || m === 'ACTIVE') return 'bg-success text-success';
    if (m === 'LISTENING') return 'bg-info text-info';
    if (m === 'RESTING') return 'bg-warning text-warning';
    if (m === 'LOCKED' || m === 'EMERGENCY_STOP') return 'bg-danger text-danger';
    return 'bg-secondary text-secondary';
  }

  async wake(): Promise<void> {
    await this.runtimeService.wakeAssistant();
  }

  async sleep(): Promise<void> {
    await this.runtimeService.sleepAssistant();
  }

  async arm(): Promise<void> {
    await this.runtimeService.armAssistant();
  }

  async lock(): Promise<void> {
    await this.runtimeService.lockAssistant();
  }
}
