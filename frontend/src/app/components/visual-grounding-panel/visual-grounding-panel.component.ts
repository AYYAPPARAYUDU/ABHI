import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatorStateService } from '../../services/operator-state.service';

@Component({
  selector: 'app-visual-grounding-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grounding-card p-3">
      <!-- Section Header -->
      <div class="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom border-secondary border-opacity-25">
        <div class="d-flex align-items-center gap-2">
          <span class="panel-icon">👁️</span>
          <h2 class="panel-title m-0">VISUAL GROUNDING & DUAL-STATE VERIFICATION</h2>
        </div>
        <span class="badge" [ngClass]="getVerificationBadgeClass()">
          {{ verification().state }}
        </span>
      </div>

      <div class="row g-3">
        <!-- Left: Grounding Details -->
        <div class="col-md-7">
          <div class="grounding-details-box p-3 rounded">
            <!-- Level & Source -->
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="text-muted small font-monospace">GROUNDING STRATEGY:</span>
              <span class="badge font-monospace" [ngClass]="getGroundingLevelClass(grounding().level)">
                {{ grounding().source }}
              </span>
            </div>

            <!-- Target Identity -->
            <div class="mb-2">
              <span class="text-muted small font-monospace d-block">RESOLVED TARGET:</span>
              <span class="target-name font-monospace text-light fw-bold">
                {{ grounding().targetIdentity }}
              </span>
            </div>

            <!-- Confidence Meter -->
            <div class="mb-2">
              <div class="d-flex justify-content-between small font-monospace mb-1">
                <span class="text-muted">CONFIDENCE SCORE:</span>
                <span class="fw-bold" [style.color]="getConfidenceColor(grounding().confidence)">
                  {{ (grounding().confidence * 100).toFixed(1) }}%
                </span>
              </div>
              <div class="progress confidence-progress" role="progressbar">
                <div
                  class="progress-bar"
                  [style.width.%]="grounding().confidence * 100"
                  [style.background-color]="getConfidenceColor(grounding().confidence)"
                ></div>
              </div>
            </div>

            <!-- Bounding Box / Observation ID -->
            <div class="small font-monospace text-muted d-flex justify-content-between pt-2 border-top border-secondary border-opacity-25">
              <span>OBS ID: {{ grounding().observationId || 'obs_active' }}</span>
              <span *ngIf="grounding().isFallback" class="text-warning">⚠️ FALLBACK ENGAGED</span>
            </div>

            <!-- Fallback Warning Alert -->
            <div *ngIf="grounding().isFallback && grounding().fallbackReason" class="alert alert-warning p-2 mt-2 mb-0 small font-monospace">
              ℹ️ {{ grounding().fallbackReason }}
            </div>
          </div>
        </div>

        <!-- Right: Verification Matrix -->
        <div class="col-md-5">
          <div class="verification-box p-3 rounded h-100 d-flex flex-column justify-content-between">
            <div>
              <span class="text-muted small font-monospace d-block mb-2">DUAL-STATE VERIFICATION:</span>
              
              <div class="verif-status-badge text-center p-2 rounded mb-2" [ngClass]="getVerificationBoxClass()">
                <div class="verif-icon">{{ verification().isVerified ? '✅' : verification().state === 'FAILED' ? '❌' : '🔍' }}</div>
                <div class="verif-text fw-bold font-monospace mt-1">{{ verification().state }}</div>
              </div>
            </div>

            <div class="small font-monospace text-muted">
              <div>TARGET FOUND: <strong class="text-light">{{ verification().targetFound ? 'YES' : 'NO' }}</strong></div>
              <div *ngIf="verification().mismatchDetails" class="text-danger mt-1">
                {{ verification().mismatchDetails }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
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
