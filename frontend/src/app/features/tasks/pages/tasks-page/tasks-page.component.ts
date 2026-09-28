import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskPanelComponent } from '../../components/task-panel/task-panel.component';
import { TaskListComponent } from '../../components/task-list/task-list.component';
import { TaskDetailComponent } from '../../components/task-detail/task-detail.component';
import { ExecutionHistoryComponent } from '../../components/execution-history/execution-history.component';
import { SafetyPanelComponent } from '../../../operator-console/components/safety-panel/safety-panel.component';
import { ExecutionTimelineComponent } from '../../../operator-console/components/execution-timeline/execution-timeline.component';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { TaskHistoryService } from '../../services/task-history.service';

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [
    CommonModule,
    TaskPanelComponent,
    TaskListComponent,
    TaskDetailComponent,
    ExecutionHistoryComponent,
    SafetyPanelComponent,
    ExecutionTimelineComponent
  ],
  templateUrl: './tasks-page.component.html',
  styleUrl: './tasks-page.component.css'
})
export class TasksPageComponent {
  private readonly stateService = inject(OperatorStateService);
  readonly taskHistory = inject(TaskHistoryService);
  readonly health = this.stateService.health;
}
