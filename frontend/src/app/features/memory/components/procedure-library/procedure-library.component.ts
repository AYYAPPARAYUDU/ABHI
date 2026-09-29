import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProcedureModel } from '../../models/memory.model';

@Component({
  selector: 'app-procedure-library',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './procedure-library.component.html',
  styleUrl: './procedure-library.component.css'
})
export class ProcedureLibraryComponent {
  @Input({ required: true }) procedures: ProcedureModel[] = [];
  @Input() selectedProcedureId: string | null = null;
  @Output() procedureSelected = new EventEmitter<string>();
  @Output() promoteProcedure = new EventEmitter<string>();
  @Output() deprecateProcedure = new EventEmitter<{ id: string; reason: string }>();

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success bg-opacity-25 text-success border-success';
      case 'CANDIDATE':
        return 'bg-warning bg-opacity-25 text-warning border-warning';
      case 'DEPRECATED':
        return 'bg-danger bg-opacity-25 text-danger border-danger';
      default:
        return 'bg-secondary bg-opacity-25 text-muted border-secondary';
    }
  }

  onPromote(event: Event, procId: string): void {
    event.stopPropagation();
    this.promoteProcedure.emit(procId);
  }

  onDeprecate(event: Event, procId: string): void {
    event.stopPropagation();
    const reason = prompt('Enter reason for deprecating this procedure:', 'Obsolete workflow');
    if (reason) {
      this.deprecateProcedure.emit({ id: procId, reason });
    }
  }
}
