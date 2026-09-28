import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EvaluationService } from '../../services/evaluation.service';

interface CapabilityBar {
  name: string;
  score: number;
  delta: string;
  colorClass: string;
}

@Component({
  selector: 'app-capability-radar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './capability-radar.component.html',
  styleUrls: ['./capability-radar.component.css']
})
export class CapabilityRadarComponent {
  readonly evalService = inject(EvaluationService);

  readonly capabilitiesList = computed<CapabilityBar[]>(() => {
    const run = this.evalService.selectedRun();
    if (!run) return [];
    const c = run.capabilities;
    return [
      { name: 'Reasoning', score: Math.round(c.reasoning * 100), delta: '+2.1%', colorClass: 'bg-primary' },
      { name: 'Coding', score: Math.round(c.coding * 100), delta: '+1.5%', colorClass: 'bg-info' },
      { name: 'Knowledge', score: Math.round(c.knowledge * 100), delta: '+1.0%', colorClass: 'bg-success' },
      { name: 'Instruction Following', score: Math.round(c.instruction_following * 100), delta: '+0.8%', colorClass: 'bg-cyan' },
      { name: 'Multilingual', score: Math.round(c.multilingual * 100), delta: '+3.4%', colorClass: 'bg-warning' },
      { name: 'RAG Grounding', score: Math.round(c.rag * 100), delta: '+2.8%', colorClass: 'bg-success' },
      { name: 'Tool Use & Planning', score: Math.round(c.tool_use * 100), delta: '0.0%', colorClass: 'bg-info' },
      { name: 'Safety & Refusal', score: Math.round(c.safety * 100), delta: '0.0%', colorClass: 'bg-success' },
      { name: 'Groundedness', score: Math.round(c.groundedness * 100), delta: '+1.8%', colorClass: 'bg-primary' },
      { name: 'Resource Efficiency', score: Math.round(c.resource_efficiency * 100), delta: '+0.5%', colorClass: 'bg-secondary' }
    ];
  });
}
