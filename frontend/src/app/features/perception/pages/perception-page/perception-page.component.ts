import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VisualGroundingPanelComponent } from '../../../operator-console/components/visual-grounding-panel/visual-grounding-panel.component';
import { AvatarViewportComponent } from '../../../avatar/components/avatar-viewport/avatar-viewport.component';
import { TelemetryPanelComponent } from '../../../operator-console/components/telemetry-panel/telemetry-panel.component';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';

@Component({
  selector: 'app-perception-page',
  standalone: true,
  imports: [
    CommonModule,
    VisualGroundingPanelComponent,
    AvatarViewportComponent,
    TelemetryPanelComponent,
    PanelComponent
  ],
  templateUrl: './perception-page.component.html',
  styleUrl: './perception-page.component.css'
})
export class PerceptionPageComponent {}
