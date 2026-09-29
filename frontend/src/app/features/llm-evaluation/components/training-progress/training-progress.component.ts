import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationService } from '../../services/evaluation.service';

@Component({
  selector: 'app-training-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './training-progress.component.html',
  styleUrls: ['./training-progress.component.css']
})
export class TrainingProgressComponent {
  readonly evalService = inject(EvaluationService);

  async cancelTraining(): Promise<void> {
    await this.evalService.cancelTraining();
  }
}
