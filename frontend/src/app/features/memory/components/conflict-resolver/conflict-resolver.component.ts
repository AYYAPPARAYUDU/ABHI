import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemoryConflict } from '../../models/memory.model';

@Component({
  selector: 'app-conflict-resolver',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './conflict-resolver.component.html',
  styleUrl: './conflict-resolver.component.css'
})
export class ConflictResolverComponent {
  @Input({ required: true }) conflicts: MemoryConflict[] = [];
  @Output() resolveConflict = new EventEmitter<{ conflictId: string; candidate: 'A' | 'B'; notes?: string }>();

  onSelectCandidate(conflictId: string, candidate: 'A' | 'B'): void {
    const notes = prompt(`Confirm resolution: Keep Candidate ${candidate}? Add optional notes:`, `Operator approved Candidate ${candidate}`);
    if (notes !== null) {
      this.resolveConflict.emit({ conflictId, candidate, notes });
    }
  }
}
