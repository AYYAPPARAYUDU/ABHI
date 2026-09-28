import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusBarComponent } from '../../../operator-console/components/status-bar/status-bar.component';
import { SafetyPanelComponent } from '../../../operator-console/components/safety-panel/safety-panel.component';
import { TelemetryPanelComponent } from '../../../operator-console/components/telemetry-panel/telemetry-panel.component';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { TelemetryService } from '../../../../core/websocket/telemetry.service';

@Component({
  selector: 'app-system-page',
  standalone: true,
  imports: [
    CommonModule,
    StatusBarComponent,
    SafetyPanelComponent,
    TelemetryPanelComponent,
    PanelComponent
  ],
  templateUrl: './system-page.component.html',
  styleUrl: './system-page.component.css'
})
export class SystemPageComponent {
  private readonly stateService = inject(OperatorStateService);
  private readonly telemetryService = inject(TelemetryService);

  readonly health = this.stateService.health;
  readonly connStatus = this.telemetryService.connectionStatus;
}
