import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatorStateService } from '../../../../core/services/operator-state.service';

@Component({
  selector: 'app-visual-grounding-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './visual-grounding-panel.component.html',
  styleUrl: './visual-grounding-panel.component.css'
})
export class VisualGroundingPanelComponent {
  private readonly stateService = inject(OperatorStateService);

  readonly grounding = this.stateService.grounding;
  readonly verification = this.stateService.verification;

  getGroundingLevelClass(level: string): string {
    switch (level) {
      case 'LEVEL_1_UIA':
      case 'LEVEL_2_DOM':
        return 'bg-success text-white';
      case 'LEVEL_2_ACCESSIBILITY':
        return 'bg-info text-dark';
      case 'LEVEL_3_OCR':
        return 'bg-warning text-dark';
      case 'LEVEL_4_COORDINATES':
        return 'bg-danger text-white';
      default:
        return 'bg-secondary text-white';
    }
  }

  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.9) return '#00ff88'; // Emerald
    if (confidence >= 0.75) return '#00f0ff'; // Cyan
    if (confidence >= 0.6) return '#ffb700'; // Amber
    return '#ff2a55'; // Crimson
  }

  getVerificationBadgeClass(): string {
    const v = this.verification();
    if (v.isVerified) return 'bg-success text-white';
    if (v.state === 'FAILED') return 'bg-danger text-white';
    if (v.state === 'VERIFYING') return 'bg-info text-dark';
    return 'bg-secondary text-white';
  }

  getVerificationBoxClass(): string {
    const v = this.verification();
    if (v.isVerified) return 'verif-pass';
    if (v.state === 'FAILED') return 'verif-fail';
    if (v.state === 'VERIFYING') return 'verif-progress';
    return 'verif-idle';
  }
}
