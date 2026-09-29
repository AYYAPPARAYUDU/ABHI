import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkflowService } from '../../services/workflow.service';
import { WorkflowDagViewerComponent } from '../../components/workflow-dag-viewer/workflow-dag-viewer.component';
import { MilestoneTrackerComponent } from '../../components/milestone-tracker/milestone-tracker.component';
import { PlanVersionHistoryComponent } from '../../components/plan-version-history/plan-version-history.component';
import { HumanHandoffModalComponent } from '../../components/human-handoff-modal/human-handoff-modal.component';
import { DataFlowMonitorComponent } from '../../components/data-flow-monitor/data-flow-monitor.component';

@Component({
  selector: 'app-workflow-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    WorkflowDagViewerComponent,
    MilestoneTrackerComponent,
    PlanVersionHistoryComponent,
    HumanHandoffModalComponent,
    DataFlowMonitorComponent
  ],
  templateUrl: './workflow-page.component.html',
  styleUrls: ['./workflow-page.component.css']
})
export class WorkflowPageComponent implements OnInit {
  readonly workflowService = inject(WorkflowService);

  newGoalText: string = '';
  selectedAutonomy: string = 'LEVEL_3';

  ngOnInit(): void {
    this.workflowService.loadQueue();
  }

  async onSubmitGoal(): Promise<void> {
    if (!this.newGoalText.trim()) return;
    await this.workflowService.submitGoal(this.newGoalText, this.selectedAutonomy);
    this.newGoalText = '';
  }

  async onStart(): Promise<void> {
    const taskId = this.workflowService.activeWorkflow()?.task_id;
    if (taskId) await this.workflowService.startWorkflow(taskId);
  }

  async onPause(): Promise<void> {
    const taskId = this.workflowService.activeWorkflow()?.task_id;
    if (taskId) await this.workflowService.pauseWorkflow(taskId);
  }

  async onResume(): Promise<void> {
    const taskId = this.workflowService.activeWorkflow()?.task_id;
    if (taskId) await this.workflowService.resumeWorkflow(taskId);
  }

  async onCancel(): Promise<void> {
    const taskId = this.workflowService.activeWorkflow()?.task_id;
    if (taskId) await this.workflowService.cancelWorkflow(taskId);
  }

  async onReplan(): Promise<void> {
    const taskId = this.workflowService.activeWorkflow()?.task_id;
    if (taskId) await this.workflowService.triggerReplan(taskId);
  }

  async onResolveHandoff(event: { handoffId: string; notes: string }): Promise<void> {
    const taskId = this.workflowService.activeWorkflow()?.task_id;
    if (taskId) await this.workflowService.resolveHandoff(taskId, event.handoffId, event.notes);
  }
}
