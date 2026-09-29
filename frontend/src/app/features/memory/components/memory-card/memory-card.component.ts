import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemoryContract } from '../../models/memory.model';

@Component({
  selector: 'app-memory-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memory-card.component.html',
  styleUrl: './memory-card.component.css'
})
export class MemoryCardComponent {
  @Input({ required: true }) memory!: MemoryContract;
  @Input() isSelected: boolean = false;
  @Output() memorySelected = new EventEmitter<string>();
  @Output() confirmMemory = new EventEmitter<string>();
  @Output() rejectMemory = new EventEmitter<string>();
  @Output() forgetMemory = new EventEmitter<{ id: string; deletionType: string }>();

  getTypeBadgeClass(type: string): string {
    switch (type) {
      case 'PREFERENCE':
        return 'bg-primary bg-opacity-25 text-primary border-primary';
      case 'SEMANTIC':
        return 'bg-info bg-opacity-25 text-info border-info';
      case 'PROCEDURAL':
        return 'bg-success bg-opacity-25 text-success border-success';
      case 'EPISODIC':
        return 'bg-warning bg-opacity-25 text-warning border-warning';
      case 'WORKING':
        return 'bg-danger bg-opacity-25 text-danger border-danger';
      default:
        return 'bg-secondary bg-opacity-25 text-light border-secondary';
    }
  }

  getPrivacyBadgeClass(privacy?: string): string {
    switch (privacy) {
      case 'RESTRICTED':
      case 'SENSITIVE':
        return 'bg-danger bg-opacity-25 text-danger border-danger';
      case 'PRIVATE':
        return 'bg-warning bg-opacity-25 text-warning border-warning';
      case 'PERSONAL':
        return 'bg-info bg-opacity-25 text-info border-info';
      default:
        return 'bg-secondary bg-opacity-25 text-light border-secondary';
    }
  }

  getStatusBadgeClass(status?: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success bg-opacity-25 text-success';
      case 'CANDIDATE':
        return 'bg-warning bg-opacity-25 text-warning';
      case 'STALE':
      case 'SUPERSEDED':
        return 'bg-secondary bg-opacity-25 text-muted';
      case 'REJECTED':
      case 'DELETED':
      case 'DEPRECATED':
        return 'bg-danger bg-opacity-25 text-danger';
      default:
        return 'bg-dark text-muted';
    }
  }

  onConfirmClick(event: Event): void {
    event.stopPropagation();
    this.confirmMemory.emit(this.memory.memory_id);
  }

  onRejectClick(event: Event): void {
    event.stopPropagation();
    this.rejectMemory.emit(this.memory.memory_id);
  }

  onForgetClick(event: Event): void {
    event.stopPropagation();
    this.forgetMemory.emit({ id: this.memory.memory_id, deletionType: 'SOFT_DELETE' });
  }
}
