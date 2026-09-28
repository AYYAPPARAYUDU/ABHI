import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationService } from '../../services/evaluation.service';
import { CaseEvidenceRecord } from '../../models/evaluation.model';

@Component({
  selector: 'app-run-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './run-detail.component.html',
  styleUrls: ['./run-detail.component.css']
})
export class RunDetailComponent {
  readonly evalService = inject(EvaluationService);

  readonly selectedCase = signal<CaseEvidenceRecord | null>(null);

  get run() {
    return this.evalService.selectedRun();
  }

  get evidenceList(): CaseEvidenceRecord[] {
    return this.run?.evidence_records || [];
  }

  onSelectCase(record: CaseEvidenceRecord): void {
    this.selectedCase.set(record);
  }

  onCloseModal(): void {
    this.selectedCase.set(null);
  }
}
