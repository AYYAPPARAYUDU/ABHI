import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusBarComponent } from './components/status-bar/status-bar.component';
import { AvatarViewportComponent } from './components/avatar-viewport/avatar-viewport.component';
import { TaskPanelComponent } from './components/task-panel/task-panel.component';
import { SafetyPanelComponent } from './components/safety-panel/safety-panel.component';
import { VisualGroundingPanelComponent } from './components/visual-grounding-panel/visual-grounding-panel.component';
import { ExecutionTimelineComponent } from './components/execution-timeline/execution-timeline.component';
import { TelemetryPanelComponent } from './components/telemetry-panel/telemetry-panel.component';
import { ConsentModalComponent } from './components/consent-modal/consent-modal.component';
import { OperatorStateService } from './services/operator-state.service';

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
