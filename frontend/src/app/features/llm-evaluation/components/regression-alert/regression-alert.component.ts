import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationService } from '../../services/evaluation.service';

@Component({
  selector: 'app-regression-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './regression-alert.component.html',
  styleUrls: ['./regression-alert.component.css']
})
export class RegressionAlertComponent {
  readonly evalService = inject(EvaluationService);

  get regressions() {
    return this.evalService.selectedRun()?.regressions || [];
  }

  get improvements() {
    return this.evalService.selectedRun()?.improvements || [];
  }
}
