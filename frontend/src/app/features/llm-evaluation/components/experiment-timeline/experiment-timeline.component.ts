import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationService } from '../../services/evaluation.service';

@Component({
  selector: 'app-experiment-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experiment-timeline.component.html',
  styleUrls: ['./experiment-timeline.component.css']
})
export class ExperimentTimelineComponent {
  readonly evalService = inject(EvaluationService);

  readonly stages = [
    { name: 'Research Discovery', icon: '🔍', desc: 'Ingestion of validated technical findings (Tier A/B)' },
    { name: 'Improvement Hypothesis', icon: '💡', desc: 'Measurable target capability, baseline & non-regression risk' },
    { name: 'Dataset Sanitization', icon: '🛡️', desc: 'Contamination check vs protected private holdout' },
    { name: 'Isolated Adaptation', icon: '⚙️', desc: 'Subprocess execution with GPU/RAM headroom gate' },
    { name: 'Head-to-Head Evaluation', icon: '⚖️', desc: 'Real inference against BASELINE_V1_LOCKED' },
    { name: 'Regression Gate Check', icon: '🚪', desc: 'Safety, Tool Boundary, Multilingual, RAG & Latency' },
    { name: 'Controlled Promotion', icon: '🚀', desc: 'Atomic promotion with zero-loss rollback reference' }
  ];
}
