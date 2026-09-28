import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatorStateService } from '../../services/operator-state.service';

@Component({
  selector: 'app-consent-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="safety().consentPending"
      class="consent-backdrop d-flex align-items-center justify-content-center p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consentTitle"
      aria-describedby="consentDesc"
    >
      <div class="consent-modal-card p-4 rounded-3 shadow-lg">
        <!-- Header -->
        <div class="d-flex align-items-center gap-3 mb-3 border-bottom border-warning border-opacity-25 pb-3">
          <div class="shield-icon-box">
            <span class="shield-icon">⚠️</span>
          </div>
          <div>
            <h3 id="consentTitle" class="modal-title font-monospace text-warning m-0">
              AUTHORIZATION REQUIRED
            </h3>
            <span class="badge bg-warning bg-opacity-25 text-warning font-monospace small">
              CRITICAL TIER 3 ACTION
            </span>
          </div>
        </div>

        <!-- Body -->
        <div class="modal-body mb-4">
          <p id="consentDesc" class="consent-text font-monospace text-light mb-3">
            {{ safety().consentReason || 'The supervisor has requested explicit operator approval before executing this action.' }}
          </p>
          <div class="action-info-box p-3 rounded font-monospace small text-secondary">
            <div class="d-flex justify-content-between mb-1">
              <span>SECURITY LEVEL:</span>
              <span class="text-warning fw-bold">TIER 3 / CRITICAL</span>
            </div>
            <div class="d-flex justify-content-between mb-1">
              <span>GATEWAY POLICY:</span>
              <span class="text-info">HUMAN_IN_THE_LOOP</span>
            </div>
            <div class="d-flex justify-content-between">
              <span>STATUS:</span>
              <span class="text-danger fw-bold">BLOCKED WAITING FOR CONSENT</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="d-flex justify-content-end gap-3">
          <button
            type="button"
            class="btn btn-outline-danger font-monospace px-4 py-2"
            (click)="rejectConsent()"
            aria-label="Deny Action"
          >
            DENY (REJECT)
          </button>
          <button
            type="button"
            class="btn btn-success font-monospace px-4 py-2 fw-bold"
            (click)="approveConsent()"
            aria-label="Authorize Action"
          >
            AUTHORIZE (APPROVE)
          </button>
        </div>
      </div>
    </div>
  `,
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
