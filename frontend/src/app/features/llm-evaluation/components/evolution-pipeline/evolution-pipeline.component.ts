import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EvaluationService } from '../../services/evaluation.service';
import { CandidateType } from '../../models/evaluation.model';

@Component({
  selector: 'app-evolution-pipeline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './evolution-pipeline.component.html',
  styleUrls: ['./evolution-pipeline.component.css']
})
export class EvolutionPipelineComponent {
  readonly evalService = inject(EvaluationService);

  hypothesis = '';
  candidateType: CandidateType = 'RAG_CANDIDATE';
  candidateName = 'qwen3:8b-exp';
  candidateVersion = '1.1.0';

  onCreateExperiment(): void {
    if (!this.hypothesis.trim()) return;
    this.evalService.createCandidate({
      hypothesis_title: this.hypothesis,
      hypothesis_description: this.hypothesis,
      candidate_type: this.candidateType,
      candidate_name: this.candidateName
    });
    this.hypothesis = '';
  }

  onPromote(candidateId: string): void {
    this.evalService.promoteCandidate(candidateId);
  }

  onRollback(): void {
    this.evalService.rollbackModel();
  }
}
