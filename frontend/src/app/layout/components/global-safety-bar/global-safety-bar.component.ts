import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatorStateService } from '../../../core/services/operator-state.service';

@Component({
  selector: 'app-global-safety-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './global-safety-bar.component.html',
  styleUrl: './global-safety-bar.component.css'
})
export class GlobalSafetyBarComponent {
  private readonly stateService = inject(OperatorStateService);
  readonly safety = this.stateService.safety;

  onOpenConsent(): void {
    // Modal signal is reactive to safety().consentPending
  }
}
