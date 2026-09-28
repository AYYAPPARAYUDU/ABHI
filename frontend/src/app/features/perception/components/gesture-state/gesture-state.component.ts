import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerceptionService } from '../../services/perception.service';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';

@Component({
  selector: 'app-gesture-state',
  standalone: true,
  imports: [CommonModule, PanelComponent],
  templateUrl: './gesture-state.component.html',
  styleUrl: './gesture-state.component.css'
})
export class GestureStateComponent {
  private readonly perceptionService = inject(PerceptionService);

  readonly gesture = this.perceptionService.gesture;
  readonly emoji = this.perceptionService.currentGestureEmoji;

  getSafetyBadgeClass(): string {
    const s = this.gesture().authoritativeSafetyState;
    if (s === 'EMERGENCY_STOP_TRIGGERED') return 'bg-danger text-danger';
    if (s === 'CONSENT_TRIGGERED') return 'bg-warning text-warning';
    return 'bg-success text-success';
  }
}
