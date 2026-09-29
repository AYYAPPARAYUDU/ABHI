import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MilestoneModel } from '../../models/workflow.model';

@Component({
  selector: 'app-milestone-tracker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './milestone-tracker.component.html',
  styleUrls: ['./milestone-tracker.component.css']
})
export class MilestoneTrackerComponent {
  milestones = input<MilestoneModel[]>([]);
  progressPercentage = input<number>(0);
  activeMilestone = input<string | null>(null);

  getStatusClass(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'milestone-completed';
      case 'RUNNING': return 'milestone-running';
      case 'FAILED': return 'milestone-failed';
      default: return 'milestone-pending';
    }
  }
}
