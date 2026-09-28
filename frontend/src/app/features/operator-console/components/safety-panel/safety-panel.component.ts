import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatorStateService } from '../../../../core/services/operator-state.service';

@Component({
  selector: 'app-safety-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './safety-panel.component.html',
  styleUrl: './safety-panel.component.css'
})
export class SafetyPanelComponent {
  private readonly stateService = inject(OperatorStateService);
  readonly safety = this.stateService.safety;

  getPolicyClass(): string {
    const s = this.safety().policyStatus;
    if (s === 'APPROVED') return 'text-success';
    if (s === 'DENIED') return 'text-danger';
    return 'text-info';
  }

  getLeaseClass(): string {
    const s = this.safety().leaseStatus;
    if (s === 'ACTIVE') return 'text-success';
    if (s === 'ACQUIRING') return 'text-info';
    if (s === 'REVOKED' || s === 'EXPIRED') return 'text-danger';
    return 'text-muted';
  }

  onOpenConsentModal(): void {
    // Modal binds directly to safety().consentPending signal
  }
}
