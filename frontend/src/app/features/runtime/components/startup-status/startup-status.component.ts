import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RuntimeService } from '../../services/runtime.service';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';

@Component({
  selector: 'app-startup-status',
  standalone: true,
  imports: [CommonModule, PanelComponent],
  templateUrl: './startup-status.component.html',
  styleUrl: './startup-status.component.css'
})
export class StartupStatusComponent {
  private readonly runtimeService = inject(RuntimeService);

  readonly startup = this.runtimeService.startupHealth;

  async refresh(): Promise<void> {
    await this.runtimeService.refreshStartupHealth();
  }

  getServiceBadge(status: string): string {
    if (status === 'HEALTHY' || status === 'READY') return 'bg-success text-success';
    if (status === 'DEGRADED') return 'bg-warning text-warning';
    return 'bg-danger text-danger';
  }
}
