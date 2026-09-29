import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowPlanModel } from '../../models/workflow.model';

@Component({
  selector: 'app-plan-version-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plan-version-history.component.html',
  styleUrls: ['./plan-version-history.component.css']
})
export class PlanVersionHistoryComponent {
  activePlan = input<WorkflowPlanModel | null>(null);
  planHistory = input<WorkflowPlanModel[]>([]);

  getAllPlans(): WorkflowPlanModel[] {
    const plans: WorkflowPlanModel[] = [...this.planHistory()];
    if (this.activePlan()) {
      plans.push(this.activePlan()!);
    }
    return plans.sort((a, b) => b.version - a.version);
  }
}
