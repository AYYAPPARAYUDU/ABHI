import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TelemetryService } from '../../../../core/websocket/telemetry.service';
import { TelemetryEvent } from '../../../../core/models/telemetry.model';

@Component({
  selector: 'app-telemetry-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './telemetry-panel.component.html',
  styleUrl: './telemetry-panel.component.css'
})
export class TelemetryPanelComponent {
  private readonly telemetryService = inject(TelemetryService);
  readonly rawEvents = this.telemetryService.eventBuffer;

  readonly filterText = signal<string>('');
  readonly selectedCategory = signal<string>('ALL');
  readonly expandedEvents = new Set<string>();

  readonly filteredEvents = computed(() => {
    const text = this.filterText().toLowerCase().trim();
    const cat = this.selectedCategory();
    const events: TelemetryEvent[] = this.rawEvents();

    return events.filter((e: TelemetryEvent) => {
      // Category filter
      if (cat !== 'ALL') {
        const type = (e.type || '').toUpperCase();
        if (cat === 'ORCHESTRATION' && !type.includes('TASK') && !type.includes('PLAN') && !type.includes('STEP')) return false;
        if (cat === 'WORKER' && !type.includes('WORKER') && !type.includes('ACTION') && !type.includes('DISPATCH')) return false;
        if (cat === 'GROUNDING' && !type.includes('GROUNDING') && !type.includes('OCR') && !type.includes('UIA')) return false;
        if (cat === 'VERIFICATION' && !type.includes('VERIF') && !type.includes('OBSERVATION')) return false;
        if (cat === 'RECOVERY' && !type.includes('RECOV') && !type.includes('INTERRUPT') && !type.includes('RECONCIL')) return false;
        if (cat === 'SAFETY' && !type.includes('SAFETY') && !type.includes('POLICY') && !type.includes('LEASE') && !type.includes('CONSENT') && !type.includes('STOP')) return false;
      }

      // Text search
      if (text) {
        const typeMatch = (e.type || '').toLowerCase().includes(text);
        const compMatch = (e.component || '').toLowerCase().includes(text);
        const statusMatch = (e.status || '').toLowerCase().includes(text);
        const payloadMatch = JSON.stringify(e.payload || {}).toLowerCase().includes(text);
        return typeMatch || compMatch || statusMatch || payloadMatch;
      }

      return true;
    });
  });

  trackByEventId(_index: number, item: TelemetryEvent): string {
    return item.id || `${item.timestamp}_${_index}`;
  }

  isExpanded(evt: TelemetryEvent): boolean {
    const id = evt.id || `${evt.timestamp}`;
    return this.expandedEvents.has(id);
  }

  toggleDetails(evt: TelemetryEvent): void {
    const id = evt.id || `${evt.timestamp}`;
    if (this.expandedEvents.has(id)) {
      this.expandedEvents.delete(id);
    } else {
      this.expandedEvents.add(id);
    }
  }

  getEventJson(evt: TelemetryEvent): string {
    return JSON.stringify(evt.payload || {}, null, 2);
  }

  clearBuffer(): void {
    this.telemetryService.clearBuffer();
  }

  getEventClass(evt: TelemetryEvent): string {
    const t = evt.type.toUpperCase();
    if (t.includes('FAIL') || t.includes('ERROR') || t.includes('DENIED')) return 'event-error';
    if (t.includes('EMERGENCY') || t.includes('STOP')) return 'event-emergency';
    if (t.includes('RECOV') || t.includes('RETRY') || t.includes('INTERRUPT')) return 'event-warning';
    if (t.includes('COMPLETE') || t.includes('SUCCESS') || t.includes('GRANTED')) return 'event-success';
    return 'event-normal';
  }

  getBadgeClass(evt: TelemetryEvent): string {
    const t = evt.type.toUpperCase();
    if (t.includes('FAIL') || t.includes('ERROR')) return 'bg-danger text-white';
    if (t.includes('EMERGENCY') || t.includes('STOP')) return 'bg-danger text-white';
    if (t.includes('RECOV') || t.includes('RETRY') || t.includes('CONSENT_REQ')) return 'bg-warning text-dark';
    if (t.includes('COMPLETE') || t.includes('SUCCESS')) return 'bg-success text-white';
    if (t.includes('GROUNDING')) return 'bg-info text-dark';
    return 'bg-secondary text-light';
  }

  getStatusClass(status: string): string {
    const s = status.toUpperCase();
    if (s === 'SUCCESS' || s === 'COMPLETED' || s === 'MATCH') return 'text-success';
    if (s === 'FAILED' || s === 'ERROR' || s === 'DENIED') return 'text-danger';
    if (s === 'RETRY' || s === 'RECOVERING' || s === 'WAITING') return 'text-warning';
    return 'text-info';
  }
}
