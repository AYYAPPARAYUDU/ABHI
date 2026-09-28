import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TelemetryService } from '../../services/telemetry.service';
import { TelemetryEvent } from '../../models/telemetry.model';

@Component({
  selector: 'app-telemetry-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="telemetry-card p-3">
      <!-- Header with Filter Tabs -->
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3 pb-2 border-bottom border-secondary border-opacity-25">
        <div class="d-flex align-items-center gap-2">
          <span class="panel-icon">📡</span>
          <h2 class="panel-title m-0">LIVE TELEMETRY STREAM</h2>
          <span class="badge bg-dark border border-secondary text-secondary font-monospace ms-2">
            {{ filteredEvents().length }} / {{ rawEvents().length }}
          </span>
        </div>

        <div class="d-flex align-items-center gap-2">
          <!-- Filter input -->
          <input
            type="text"
            class="form-control form-control-sm search-input font-monospace"
            placeholder="Filter events..."
            [ngModel]="filterText()"
            (ngModelChange)="filterText.set($event)"
          />
          
          <!-- Category Select -->
          <select
            class="form-select form-select-sm category-select font-monospace"
            [ngModel]="selectedCategory()"
            (ngModelChange)="selectedCategory.set($event)"
          >
            <option value="ALL">ALL CATEGORIES</option>
            <option value="ORCHESTRATION">ORCHESTRATION</option>
            <option value="WORKER">WORKER</option>
            <option value="GROUNDING">GROUNDING</option>
            <option value="VERIFICATION">VERIFICATION</option>
            <option value="RECOVERY">RECOVERY</option>
            <option value="SAFETY">SAFETY</option>
          </select>

          <!-- Clear buffer button -->
          <button
            class="btn btn-outline-secondary btn-sm font-monospace text-nowrap"
            (click)="clearBuffer()"
            title="Clear live memory buffer"
          >
            CLEAR
          </button>
        </div>
      </div>

      <!-- Events Stream Container -->
      <div class="events-scroll-container">
        <div *ngIf="filteredEvents().length === 0" class="text-center p-3 text-muted font-monospace small">
          No telemetry events match the current filter.
        </div>

        <div class="events-list">
          <div
            *ngFor="let evt of filteredEvents(); trackBy: trackByEventId"
            class="event-row p-2 mb-1 rounded"
            [ngClass]="getEventClass(evt)"
          >
            <div class="d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center gap-2 overflow-hidden">
                <span class="event-badge font-monospace" [ngClass]="getBadgeClass(evt)">
                  {{ evt.type }}
                </span>
                <span *ngIf="evt.component" class="event-source font-monospace text-muted small">
                  [{{ evt.component }}]
                </span>
              </div>
              <div class="d-flex align-items-center gap-2 text-nowrap">
                <span *ngIf="evt.status" class="event-status font-monospace small" [ngClass]="getStatusClass(evt.status)">
                  {{ evt.status }}
                </span>
                <span class="event-timestamp font-monospace text-secondary small">
                  {{ evt.timestamp | date:'HH:mm:ss.SSS' }}
                </span>
                <button
                  class="btn btn-link btn-xs p-0 text-decoration-none text-muted"
                  (click)="toggleDetails(evt)"
                  title="Toggle details"
                >
                  {{ isExpanded(evt) ? '▲' : '▼' }}
                </button>
              </div>
            </div>

            <!-- Expandable JSON Payload -->
            <div *ngIf="isExpanded(evt)" class="payload-box mt-2 p-2 rounded">
              <pre class="m-0 font-monospace small text-light">{{ getEventJson(evt) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
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
