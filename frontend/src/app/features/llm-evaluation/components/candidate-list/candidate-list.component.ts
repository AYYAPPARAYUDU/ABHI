import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EvaluationService } from '../../services/evaluation.service';
import { CandidateRecord, CandidateType } from '../../models/evaluation.model';

@Component({
  selector: 'app-candidate-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './candidate-list.component.html',
  styleUrls: ['./candidate-list.component.css']
})
export class CandidateListComponent {
  readonly evalService = inject(EvaluationService);

  showCreateModal = false;
  newCand = {
    hypothesis_title: '',
    hypothesis_description: '',
    candidate_type: 'PROMPT_CANDIDATE' as CandidateType,
    candidate_name: '',
    target_capability: 'multilingual_te',
    baseline_score: 0.85,
    target_score: 0.95
  };

  openCreateModal(): void {
    this.newCand = {
      hypothesis_title: 'Telugu Argument Normalization',
      hypothesis_description: 'Improved few-shot canonicalization examples to resolve Telugu verb phrases.',
      candidate_type: 'PROMPT_CANDIDATE',
      candidate_name: 'Qwen3-8B Telugu-Prompt-V2',
      target_capability: 'multilingual_te',
      baseline_score: 0.85,
      target_score: 0.95
    };
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  async submitCreate(): Promise<void> {
    if (!this.newCand.candidate_name || !this.newCand.hypothesis_title) return;
    await this.evalService.createCandidate(this.newCand);
    this.closeCreateModal();
  }

  selectCandidate(cand: CandidateRecord): void {
    this.evalService.selectCandidate(cand.candidate_id);
  }

  async evaluateCandidate(cand: CandidateRecord, event: Event): Promise<void> {
    event.stopPropagation();
    await this.evalService.evaluateCandidate(cand.candidate_id);
  }

  async promoteCandidate(cand: CandidateRecord, event: Event): Promise<void> {
    event.stopPropagation();
    await this.evalService.promoteCandidate(cand.candidate_id);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PASSED':
      case 'PROMOTED':
        return 'status-passed';
      case 'EVALUATING':
      case 'TRAINING':
        return 'status-active';
      case 'REJECTED':
      case 'QUARANTINED':
        return 'status-failed';
      default:
        return 'status-ready';
    }
  }
}
