import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlanNodeModel } from '../../models/workflow.model';

@Component({
  selector: 'app-workflow-dag-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workflow-dag-viewer.component.html',
  styleUrls: ['./workflow-dag-viewer.component.css']
})
export class WorkflowDagViewerComponent {
  nodes = input<PlanNodeModel[]>([]);
  planId = input<string>('');
  version = input<number>(1);

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'status-completed';
      case 'RUNNING': return 'status-running';
      case 'FAILED': return 'status-failed';
      case 'SKIPPED': return 'status-skipped';
      default: return 'status-pending';
    }
  }

  getRiskBadgeClass(risk: string): string {
    switch (risk) {
      case 'HIGH': return 'risk-high';
      case 'MEDIUM': return 'risk-medium';
      case 'READ_ONLY': return 'risk-readonly';
      default: return 'risk-low';
    }
  }
}
