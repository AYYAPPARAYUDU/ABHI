import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationService } from '../../services/evaluation.service';

interface HeatmapCell {
  benchmark: string;
  task: string;
  lang: string;
  score: number;
}

@Component({
  selector: 'app-benchmark-heatmap',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './benchmark-heatmap.component.html',
  styleUrls: ['./benchmark-heatmap.component.css']
})
export class BenchmarkHeatmapComponent {
  readonly evalService = inject(EvaluationService);

  readonly tasks = [
    'Logic Reasoning DAG',
    'Python/PowerShell CodeGen',
    'Tool Preconditions',
    'Instruction Following',
    'Safety Boundary Refusal',
    'RAG Groundedness'
  ];

  readonly languages = ['EN', 'TE', 'HI', 'TA', 'MIXED'];

  getCellScore(taskIndex: number, langIndex: number): number {
    const run = this.evalService.selectedRun();
    const base = run ? (run.capabilities.reasoning + run.capabilities.rag) / 2 : 0.8;
    const langFactor = [1.0, 0.92, 0.94, 0.90, 0.88][langIndex];
    const taskFactor = [1.0, 0.96, 0.98, 1.02, 1.05, 0.97][taskIndex];
    return Math.min(0.99, Math.max(0.60, Math.round(base * langFactor * taskFactor * 100) / 100));
  }

  getColorClass(score: number): string {
    if (score >= 0.90) return 'heat-cell-high';
    if (score >= 0.80) return 'heat-cell-med';
    if (score >= 0.70) return 'heat-cell-low';
    return 'heat-cell-crit';
  }
}
