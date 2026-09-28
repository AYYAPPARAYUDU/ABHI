import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatorStateService } from '../../../../core/services/operator-state.service';

@Component({
  selector: 'app-consent-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './consent-modal.component.html',
  styleUrl: './consent-modal.component.css'
})
export class ConsentModalComponent {
  private readonly stateService = inject(OperatorStateService);
  readonly safety = this.stateService.safety;

  approveConsent(): void {
    this.stateService.respondToConsent(true);
  }

  rejectConsent(): void {
    this.stateService.respondToConsent(false);
  }
}
