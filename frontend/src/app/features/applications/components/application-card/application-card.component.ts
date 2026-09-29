import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApplicationItem } from '../../models/application.model';

@Component({
  selector: 'app-application-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './application-card.component.html',
  styleUrl: './application-card.component.css'
})
export class ApplicationCardComponent {
  @Input({ required: true }) application!: ApplicationItem;
  @Input() isSelected: boolean = false;

  @Output() selectApp = new EventEmitter<string>();
  @Output() toggleApp = new EventEmitter<{ id: string; enabled: boolean }>();
  @Output() launchApp = new EventEmitter<string>();
  @Output() focusApp = new EventEmitter<string>();

  onCardClick(): void {
    this.selectApp.emit(this.application.application_id);
  }

  onToggle(event: Event): void {
    event.stopPropagation();
    const checkbox = event.target as HTMLInputElement;
    this.toggleApp.emit({
      id: this.application.application_id,
      enabled: checkbox.checked
    });
  }

  onLaunch(event: Event): void {
    event.stopPropagation();
    this.launchApp.emit(this.application.application_id);
  }

  onFocus(event: Event): void {
    event.stopPropagation();
    this.focusApp.emit(this.application.application_id);
  }

  getStateBadgeClass(state: string): string {
    switch (state) {
      case 'RUNNING':
        return 'bg-success bg-opacity-25 text-success border border-success';
      case 'FOCUSED':
        return 'bg-info bg-opacity-25 text-info border border-info';
      case 'STARTING':
      case 'EXECUTING':
        return 'bg-warning bg-opacity-25 text-warning border border-warning';
      default:
        return 'bg-secondary bg-opacity-25 text-muted border border-secondary border-opacity-50';
    }
  }
}
