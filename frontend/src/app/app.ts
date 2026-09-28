import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusBarComponent } from './features/operator-console/components/status-bar/status-bar.component';
import { AvatarViewportComponent } from './features/avatar/components/avatar-viewport/avatar-viewport.component';
import { TaskPanelComponent } from './features/tasks/components/task-panel/task-panel.component';
import { SafetyPanelComponent } from './features/operator-console/components/safety-panel/safety-panel.component';
import { VisualGroundingPanelComponent } from './features/operator-console/components/visual-grounding-panel/visual-grounding-panel.component';
import { ExecutionTimelineComponent } from './features/operator-console/components/execution-timeline/execution-timeline.component';
import { TelemetryPanelComponent } from './features/operator-console/components/telemetry-panel/telemetry-panel.component';
import { ConsentModalComponent } from './features/operator-console/components/consent-modal/consent-modal.component';
import { OperatorStateService } from './core/services/operator-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    StatusBarComponent,
    AvatarViewportComponent,
    TaskPanelComponent,
    SafetyPanelComponent,
    VisualGroundingPanelComponent,
    ExecutionTimelineComponent,
    TelemetryPanelComponent,
    ConsentModalComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly stateService = inject(OperatorStateService);

  ngOnInit(): void {
    // Initial authoritative snapshot & WebSocket connect
    this.stateService.refreshAuthoritativeState();
  }
}
