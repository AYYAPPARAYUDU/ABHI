import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskHistoryService } from '../../services/task-history.service';

@Component({
  selector: 'app-execution-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './execution-history.component.html',
  styleUrl: './execution-history.component.css'
})
export class ExecutionHistoryComponent {
  readonly taskHistory = inject(TaskHistoryService);

  readonly stages = [
    { label: 'PLANNING', desc: 'Deterministic heuristic / LLM DAG breakdown' },
    { label: 'POLICY', desc: 'Pre-flight safety validation & capability checking' },
    { label: 'LEASE', desc: 'Temporary scoped authorization lease issued' },
    { label: 'GROUNDING', desc: 'Semantic UIA / DOM tree / Visual OCR fallback' },
    { label: 'ACTION', desc: 'Dispatched execution to isolated host worker' },
    { label: 'VERIFICATION', desc: 'Post-condition validation & assertion match' },
    { label: 'PERSISTENCE', desc: 'Relational journal & episodic memory saved' }
  ];
}
