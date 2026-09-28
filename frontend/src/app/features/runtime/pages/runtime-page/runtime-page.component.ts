import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RuntimeStatusComponent } from '../../components/runtime-status/runtime-status.component';
import { WakeWordStatusComponent } from '../../components/wake-word-status/wake-word-status.component';
import { RuntimeModeComponent } from '../../components/runtime-mode/runtime-mode.component';
import { IdentityStatusComponent } from '../../components/identity-status/identity-status.component';
import { StartupStatusComponent } from '../../components/startup-status/startup-status.component';
import { AvatarViewportComponent } from '../../../avatar/components/avatar-viewport/avatar-viewport.component';
import { TelemetryPanelComponent } from '../../../operator-console/components/telemetry-panel/telemetry-panel.component';

@Component({
  selector: 'app-runtime-page',
  standalone: true,
  imports: [
    CommonModule,
    RuntimeStatusComponent,
    WakeWordStatusComponent,
    RuntimeModeComponent,
    IdentityStatusComponent,
    StartupStatusComponent,
    AvatarViewportComponent,
    TelemetryPanelComponent
  ],
  templateUrl: './runtime-page.component.html',
  styleUrl: './runtime-page.component.css'
})
export class RuntimePageComponent {}
