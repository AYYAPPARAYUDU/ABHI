import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationService } from '../../services/evaluation.service';

@Component({
  selector: 'app-model-comparison',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './model-comparison.component.html',
  styleUrls: ['./model-comparison.component.css']
})
export class ModelComparisonComponent {
  readonly evalService = inject(EvaluationService);

  get productionModel() {
    return this.evalService.productionModel();
  }

  get candidateModels() {
    return this.evalService.models().filter((m) => m.promotion_state === 'CANDIDATE');
  }

  get archivedModels() {
    return this.evalService.models().filter((m) => m.promotion_state === 'ARCHIVED');
  }
}
