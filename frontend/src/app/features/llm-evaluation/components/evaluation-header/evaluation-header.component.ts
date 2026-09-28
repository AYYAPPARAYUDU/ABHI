import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationService } from '../../services/evaluation.service';
import { EvaluationReplayService } from '../../services/evaluation-replay.service';
import { ScheduleType } from '../../models/evaluation.model';

@Component({
  selector: 'app-evaluation-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evaluation-header.component.html',
  styleUrls: ['./evaluation-header.component.css']
})
export class EvaluationHeaderComponent {
  readonly evalService = inject(EvaluationService);
  readonly replayService = inject(EvaluationReplayService);

  onTriggerEval(scheduleType: ScheduleType): void {
    this.evalService.triggerEvaluation(scheduleType);
  }

  onToggleLive(isLive: boolean): void {
    this.replayService.setLiveMode(isLive);
  }
}
