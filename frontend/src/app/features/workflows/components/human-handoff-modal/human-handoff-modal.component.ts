import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HumanHandoffRequestModel } from '../../models/workflow.model';

@Component({
  selector: 'app-human-handoff-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './human-handoff-modal.component.html',
  styleUrls: ['./human-handoff-modal.component.css']
})
export class HumanHandoffModalComponent {
  handoff = input<HumanHandoffRequestModel | null>(null);
  resolve = output<{ handoffId: string; notes: string }>();

  resolutionNotes: string = '';

  onResolve(): void {
    if (!this.handoff()) return;
    this.resolve.emit({
      handoffId: this.handoff()!.handoff_id,
      notes: this.resolutionNotes || 'Operator resolved handoff request'
    });
    this.resolutionNotes = '';
  }
}
