import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerceptionService } from '../../services/perception.service';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';

@Component({
  selector: 'app-face-state',
  standalone: true,
  imports: [CommonModule, PanelComponent],
  templateUrl: './face-state.component.html',
  styleUrl: './face-state.component.css'
})
export class FaceStateComponent {
  private readonly perceptionService = inject(PerceptionService);

  readonly faceHead = this.perceptionService.faceHead;

  getAttentionBadgeClass(): string {
    const a = this.faceHead().attention;
    if (a === 'OPTIMAL' || a === 'ENGAGED') return 'bg-success text-success';
    if (a === 'LOOKING_LEFT' || a === 'LOOKING_RIGHT' || a === 'LOOKING_UP' || a === 'LOOKING_DOWN') {
      return 'bg-info text-info';
    }
    return 'bg-warning text-warning';
  }
}
