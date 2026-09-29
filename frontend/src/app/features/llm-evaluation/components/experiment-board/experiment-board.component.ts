import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationService } from '../../services/evaluation.service';
import { CandidateRecord, CandidateStatus } from '../../models/evaluation.model';

@Component({
  selector: 'app-experiment-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experiment-board.component.html',
  styleUrls: ['./experiment-board.component.css']
})
export class ExperimentBoardComponent {
  readonly evalService = inject(EvaluationService);

  readonly columns: { title: string; status: CandidateStatus; color: string }[] = [
    { title: 'Ready', status: 'READY', color: '#94a3b8' },
    { title: 'Training / Adaptation', status: 'TRAINING', color: '#38bdf8' },
    { title: 'Evaluating', status: 'EVALUATING', color: '#a855f7' },
    { title: 'Passed Gates', status: 'PASSED', color: '#22c55e' },
    { title: 'Promoted', status: 'PROMOTED', color: '#10b981' },
    { title: 'Rejected', status: 'REJECTED', color: '#ef4444' }
  ];

  getCandidatesByStatus(status: CandidateStatus): CandidateRecord[] {
    return this.evalService.candidates().filter((c) => c.status === status);
  }

  selectCandidate(cand: CandidateRecord): void {
    this.evalService.selectCandidate(cand.candidate_id);
  }

  async triggerTrain(cand: CandidateRecord, event: Event): Promise<void> {
    event.stopPropagation();
    await this.evalService.startTraining(cand.candidate_id, 3);
  }

  async triggerEval(cand: CandidateRecord, event: Event): Promise<void> {
    event.stopPropagation();
    await this.evalService.evaluateCandidate(cand.candidate_id);
  }
}
