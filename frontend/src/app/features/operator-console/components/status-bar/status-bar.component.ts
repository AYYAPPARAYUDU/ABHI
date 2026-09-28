import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { TelemetryService } from '../../../../core/websocket/telemetry.service';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-bar.component.html',
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
