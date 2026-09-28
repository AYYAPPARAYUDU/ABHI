import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerceptionService } from '../../services/perception.service';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';

@Component({
  selector: 'app-perception-health',
  standalone: true,
  imports: [CommonModule, PanelComponent],
  templateUrl: './perception-health.component.html',
  styleUrl: './perception-health.component.css'
})
export class PerceptionHealthComponent {
  private readonly perceptionService = inject(PerceptionService);

  readonly health = this.perceptionService.health;

  async refresh(): Promise<void> {
    await this.perceptionService.refreshPerceptionHealth();
  }

  getHealthBadgeClass(status: string): string {
    if (status === 'HEALTHY') return 'bg-success text-success';
    if (status === 'DEGRADED') return 'bg-warning text-warning';
    return 'bg-danger text-danger';
  }
}
