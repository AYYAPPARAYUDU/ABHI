import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CapabilityItem } from '../../models/application.model';

@Component({
  selector: 'app-capability-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './capability-table.component.html',
  styleUrl: './capability-table.component.css'
})
export class CapabilityTableComponent {
  @Input({ required: true }) capabilities: CapabilityItem[] = [];

  getRiskBadgeClass(risk: string): string {
    switch (risk?.toUpperCase()) {
      case 'READ_ONLY':
        return 'bg-info bg-opacity-25 text-info border-info';
      case 'LOW':
        return 'bg-success bg-opacity-25 text-success border-success';
      case 'MEDIUM':
        return 'bg-warning bg-opacity-25 text-warning border-warning';
      case 'HIGH':
      case 'CRITICAL':
        return 'bg-danger bg-opacity-25 text-danger border-danger';
      default:
        return 'bg-secondary text-light';
    }
  }
}
