import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerceptionService } from '../../services/perception.service';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';

@Component({
  selector: 'app-screen-vision-state',
  standalone: true,
  imports: [CommonModule, PanelComponent],
  templateUrl: './screen-vision-state.component.html',
  styleUrl: './screen-vision-state.component.css'
})
export class ScreenVisionStateComponent {
  private readonly perceptionService = inject(PerceptionService);

  readonly screenVision = this.perceptionService.screenVision;

  async triggerScan(): Promise<void> {
    await this.perceptionService.triggerScreenOCR();
  }

  getStatusBadgeClass(): string {
    const s = this.screenVision().status;
    if (s === 'GROUNDED') return 'bg-success text-success';
    if (s === 'OBSERVING') return 'bg-warning text-warning';
    if (s === 'ACTIVE') return 'bg-info text-info';
    return 'bg-secondary text-secondary';
  }
}
