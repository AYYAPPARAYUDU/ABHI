import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataFlowRecordModel } from '../../models/workflow.model';

@Component({
  selector: 'app-data-flow-monitor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-flow-monitor.component.html',
  styleUrls: ['./data-flow-monitor.component.css']
})
export class DataFlowMonitorComponent {
  dataFlows = input<DataFlowRecordModel[]>([]);

  getPolicyBadgeClass(decision: string): string {
    switch (decision) {
      case 'ALLOWED': return 'policy-allowed';
      case 'DENIED': return 'policy-denied';
      case 'CONSENT_REQUIRED': return 'policy-consent';
      default: return 'policy-pending';
    }
  }
}
