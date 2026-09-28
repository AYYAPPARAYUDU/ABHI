import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusBarComponent } from '../../components/status-bar/status-bar.component';
import { AvatarViewportComponent } from '../../../avatar/components/avatar-viewport/avatar-viewport.component';
import { TaskPanelComponent } from '../../../tasks/components/task-panel/task-panel.component';
import { SafetyPanelComponent } from '../../components/safety-panel/safety-panel.component';
import { VisualGroundingPanelComponent } from '../../components/visual-grounding-panel/visual-grounding-panel.component';
import { ExecutionTimelineComponent } from '../../components/execution-timeline/execution-timeline.component';
import { TelemetryPanelComponent } from '../../components/telemetry-panel/telemetry-panel.component';

@Component({
  selector: 'app-operator-console-page',
  standalone: true,
  imports: [
    CommonModule,
    StatusBarComponent,
    AvatarViewportComponent,
    TaskPanelComponent,
    SafetyPanelComponent,
    VisualGroundingPanelComponent,
    ExecutionTimelineComponent,
    TelemetryPanelComponent
  ],
  templateUrl: './operator-console-page.component.html',
  styleUrl: './operator-console-page.component.css'
})
export class OperatorConsolePageComponent {}
