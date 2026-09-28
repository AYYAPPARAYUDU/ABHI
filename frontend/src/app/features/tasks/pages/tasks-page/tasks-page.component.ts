import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskPanelComponent } from '../../components/task-panel/task-panel.component';
import { SafetyPanelComponent } from '../../../operator-console/components/safety-panel/safety-panel.component';
import { ExecutionTimelineComponent } from '../../../operator-console/components/execution-timeline/execution-timeline.component';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';
import { OperatorStateService } from '../../../../core/services/operator-state.service';

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [
    CommonModule,
    TaskPanelComponent,
    SafetyPanelComponent,
    ExecutionTimelineComponent,
    PanelComponent
  ],
  templateUrl: './tasks-page.component.html',
  styleUrl: './tasks-page.component.css'
})
export class TasksPageComponent {
  private readonly stateService = inject(OperatorStateService);
  readonly health = this.stateService.health;
}
