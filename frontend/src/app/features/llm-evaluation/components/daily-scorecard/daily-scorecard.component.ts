import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationService } from '../../services/evaluation.service';

@Component({
  selector: 'app-daily-scorecard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-scorecard.component.html',
  styleUrls: ['./daily-scorecard.component.css']
})
export class DailyScorecardComponent {
  readonly evalService = inject(EvaluationService);

  readonly compositeScore = computed(() => {
    const run = this.evalService.selectedRun();
    if (!run) return 0.0;
    const c = run.capabilities;
    return Math.round(((c.reasoning + c.coding + c.rag + c.safety + c.knowledge + c.multilingual) / 6.0) * 100);
  });
}
