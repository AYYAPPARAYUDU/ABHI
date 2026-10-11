import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceLeaseDTO } from '../../models/resource.model';

@Component({
  selector: 'app-workload-queue-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="queue-card">
      <div class="queue-header-row">
        <div>
          <h3 class="queue-title">Active Resource Leases & Workload Queue</h3>
          <p class="queue-subtitle">Deterministic bounded resource allocations across tasks, models, and workers</p>
        </div>
        <span class="abhi-badge abhi-badge-cyan">
          {{ leases().length }} Active Leases
        </span>
      </div>

      @if (leases().length === 0) {
        <div class="empty-state">
          No active resource leases currently allocated. System running in baseline idle state.
        </div>
      } @else {
        <div class="table-responsive">
          <table class="abhi-table">
            <thead>
              <tr>
                <th>Lease ID</th>
                <th>Owner</th>
                <th>Resource</th>
                <th>Amount</th>
                <th>Priority</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              @for (lease of leases(); track lease.lease_id) {
                <tr>
                  <td class="font-mono text-muted">{{ lease.lease_id }}</td>
                  <td>
                    <span class="owner-type">{{ lease.owner_type }}</span>
                    <span class="owner-id font-mono">{{ lease.owner_id }}</span>
                  </td>
                  <td class="res-type">{{ lease.resource_type }}</td>
                  <td class="font-mono text-success">
                    {{ lease.granted_amount | number:'1.0-1' }}
                  </td>
                  <td>
                    <span class="font-mono priority-label">{{ getPriorityLabel(lease.priority) }}</span>
                  </td>
                  <td>
                    <span
                      class="abhi-badge"
                      [ngClass]="getLeaseStateClass(lease.state)"
                    >
                      {{ lease.state }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .queue-card {
      background: var(--abhi-surface-raised, #0e1828);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: var(--abhi-radius-control, 16px);
      padding: 1.25rem;
      box-shadow: var(--abhi-raised-shadow);
    }
    .queue-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }
    .queue-title {
      font-size: 0.92rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }
    .queue-subtitle {
      font-size: 0.75rem;
      color: var(--abhi-text-muted, #8193ac);
      margin: 0.2rem 0 0 0;
    }
    .empty-state {
      text-align: center;
      padding: 2rem;
      font-size: 0.78rem;
      color: var(--abhi-text-muted, #8193ac);
      background: var(--abhi-surface-inset, #080e18);
      border: 1px dashed var(--abhi-border);
      border-radius: var(--abhi-radius-md, 10px);
      box-shadow: var(--abhi-inset-shadow);
    }
    .table-responsive {
      overflow-x: auto;
      border-radius: var(--abhi-radius-md, 10px);
      border: 1px solid var(--abhi-border);
      box-shadow: var(--abhi-inset-shadow);
      background: var(--abhi-surface-inset, #080e18);
    }
    .abhi-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.8rem;
    }
    .abhi-table th {
      padding: 0.65rem 0.85rem;
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 0.05em;
      color: var(--abhi-text-secondary, #a7b7cc);
      background: rgba(0, 0, 0, 0.25);
      border-bottom: 1px solid var(--abhi-border);
    }
    .abhi-table td {
      padding: 0.6rem 0.85rem;
      border-bottom: 1px solid rgba(151, 185, 230, 0.07);
      color: var(--abhi-text-primary, #eef5ff);
    }
    .abhi-table tr:last-child td {
      border-bottom: none;
    }
    .abhi-table tr:hover td {
      background: rgba(56, 217, 255, 0.04);
    }
    .font-mono {
      font-family: ui-monospace, monospace;
    }
    .text-muted {
      color: var(--abhi-text-muted, #8193ac);
    }
    .text-success {
      color: var(--abhi-success, #48dda2);
    }
    .owner-type {
      font-weight: 600;
      display: block;
    }
    .owner-id {
      font-size: 0.7rem;
      color: var(--abhi-text-muted);
    }
    .res-type {
      font-weight: 600;
    }
    .priority-label {
      font-size: 0.75rem;
    }
  `]
})
export class WorkloadQueueTableComponent {
  leases = input<ResourceLeaseDTO[]>([]);

  getPriorityLabel(priority: number): string {
    if (priority >= 100) return 'P0 Safety';
    if (priority >= 90) return 'P1 Interactive';
    if (priority >= 80) return 'P2 Task';
    if (priority >= 70) return 'P3 Perception';
    if (priority >= 50) return 'P4 Indexing';
    if (priority >= 40) return 'P5 Eval';
    if (priority >= 30) return 'P6 Candidate';
    return 'P7 Maint';
  }

  getLeaseStateClass(state: string): string {
    switch (state) {
      case 'GRANTED':
      case 'ACTIVE':
        return 'abhi-badge-success';
      case 'RENEWED':
        return 'abhi-badge-cyan';
      case 'PREEMPTED':
        return 'abhi-badge-warning';
      default:
        return '';
    }
  }
}

