import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EpisodicMemory } from '../../models/memory.model';

@Component({
  selector: 'app-memory-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memory-card.component.html',
  styleUrl: './memory-card.component.css'
})
export class MemoryCardComponent {
  @Input({ required: true }) memory!: EpisodicMemory;
  @Input() isSelected: boolean = false;
  @Output() memorySelected = new EventEmitter<string>();
  @Output() forgetMemory = new EventEmitter<string>();

  getPrivacyBadgeClass(privacy: string): string {
    switch (privacy) {
      case 'task_derived':
        return 'bg-info bg-opacity-25 text-info border-info';
      case 'user_provided':
        return 'bg-success bg-opacity-25 text-success border-success';
      default:
        return 'bg-secondary bg-opacity-25 text-light border-secondary';
    }
  }

  onForgetClick(event: Event): void {
    event.stopPropagation();
    if (confirm(`Are you sure you want ABHI to forget memory '${this.memory.memory_id}'?`)) {
      this.forgetMemory.emit(this.memory.memory_id);
    }
  }
}
