import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatorStateService } from '../../services/operator-state.service';
import { TelemetryService } from '../../services/telemetry.service';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="status-bar d-flex align-items-center justify-content-between px-3 py-2">
      <!-- Left: Logo and System Identity -->
      <div class="d-flex align-items-center gap-3">
        <div class="brand d-flex align-items-center gap-2">
          <div class="brand-glyph">
            <span class="glyph-core"></span>
          </div>
          <div>
            <h1 class="brand-title m-0">ABHI</h1>
            <span class="brand-sub">OPERATOR CONSOLE</span>
          </div>
        </div>
        <span class="badge bg-dark-subtle border text-secondary px-2 py-1 font-monospace">v0.1.0 • PHASE 6</span>
      </div>

      <!-- Center: Subsystem Status Matrix -->
      <div class="status-matrix d-flex align-items-center gap-2 flex-wrap">
        <!-- WebSocket -->
        <div class="status-chip" [ngClass]="telemetryStatusClass()">
          <span class="chip-dot"></span>
          <span class="chip-label">WS TELEMETRY:</span>
          <span class="chip-val">{{ telemetryStatusText() }}</span>
        </div>

        <!-- Gateway -->
        <div class="status-chip" [ngClass]="getHealthClass(health().gateway)">
          <span class="chip-dot"></span>
          <span class="chip-label">GATEWAY:</span>
          <span class="chip-val">{{ health().gateway }}</span>
        </div>

        <!-- Database -->
        <div class="status-chip" [ngClass]="getHealthClass(health().database)">
          <span class="chip-dot"></span>
          <span class="chip-label">SQLITE WAL:</span>
          <span class="chip-val">{{ health().database }}</span>
        </div>

        <!-- Ollama -->
        <div class="status-chip" [ngClass]="getHealthClass(health().ollama)">
          <span class="chip-dot"></span>
          <span class="chip-label">OLLAMA:</span>
          <span class="chip-val">{{ health().ollama }}</span>
        </div>

        <!-- Windows Worker -->
        <div class="status-chip" [ngClass]="getHealthClass(health().windowsWorker)">
          <span class="chip-dot"></span>
          <span class="chip-label">WIN WORKER:</span>
          <span class="chip-val">{{ health().windowsWorker }}</span>
        </div>

        <!-- Browser Worker -->
        <div class="status-chip" [ngClass]="getHealthClass(health().browserWorker)">
          <span class="chip-dot"></span>
          <span class="chip-label">WEB WORKER:</span>
          <span class="chip-val">{{ health().browserWorker }}</span>
        </div>

        <!-- Safety Policy -->
        <div class="status-chip" [ngClass]="getSafetyClass()">
          <span class="chip-dot"></span>
          <span class="chip-label">SAFETY:</span>
          <span class="chip-val">{{ safety().policyStatus }}</span>
        </div>
      </div>

      <!-- Right: Controls & Emergency Stop -->
      <div class="d-flex align-items-center gap-3">
        <button
          type="button"
          class="btn btn-emergency-stop d-flex align-items-center gap-2"
          [class.active-stop]="safety().emergencyStopped"
          (click)="onEmergencyStop()"
          aria-label="Emergency Stop automation execution"
        >
          <span class="estop-icon">🛑</span>
          <span class="estop-text">EMERGENCY STOP</span>
        </button>
      </div>
    </header>
  `,
  styleUrl: './status-bar.component.css'
})
export class StatusBarComponent {
  private readonly stateService = inject(OperatorStateService);
  private readonly telemetryService = inject(TelemetryService);

  readonly health = this.stateService.health;
  readonly safety = this.stateService.safety;
  readonly connStatus = this.telemetryService.connectionStatus;

  readonly telemetryStatusClass = computed(() => {
    switch (this.connStatus()) {
      case 'CONNECTED':
        return 'chip-healthy';
      case 'RECONNECTING':
        return 'chip-degraded';
      default:
        return 'chip-unavailable';
    }
  });

  readonly telemetryStatusText = computed(() => this.connStatus());

  getHealthClass(status: string): string {
    if (status === 'HEALTHY') return 'chip-healthy';
    if (status === 'DEGRADED') return 'chip-degraded';
    return 'chip-unavailable';
  }

  getSafetyClass(): string {
    const s = this.safety();
    if (s.emergencyStopped || s.policyStatus === 'DENIED') return 'chip-unavailable';
    if (s.consentPending || s.isPaused) return 'chip-degraded';
    return 'chip-healthy';
  }

  onEmergencyStop(): void {
    this.stateService.triggerEmergencyStop();
  }
}
