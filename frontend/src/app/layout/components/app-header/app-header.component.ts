import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatorStateService } from '../../../core/services/operator-state.service';
import { TelemetryService } from '../../../core/websocket/telemetry.service';
import { StatusIndicatorComponent } from '../../../shared/components/status-indicator/status-indicator.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, StatusIndicatorComponent],
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.css'
})
export class AppHeaderComponent {
  private readonly stateService = inject(OperatorStateService);
  private readonly telemetryService = inject(TelemetryService);

  readonly health = this.stateService.health;
  readonly safety = this.stateService.safety;
  readonly connStatus = this.telemetryService.connectionStatus;

  readonly telemetryStatusText = computed(() => this.connStatus());

  onEmergencyStop(): void {
    this.stateService.triggerEmergencyStop();
  }
}
