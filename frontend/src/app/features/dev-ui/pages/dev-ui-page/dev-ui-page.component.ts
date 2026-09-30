import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { SpatialCardComponent } from '../../../../shared/ui/spatial-card/spatial-card.component';

@Component({
  selector: 'app-dev-ui-page',
  standalone: true,
  imports: [CommonModule, SpatialCardComponent],
  template: `
    <div class="dev-workspace">
      <!-- Top Overview Bar -->
      <div class="dev-header">
        <div class="header-info">
          <h1 class="dev-title">Developer Telemetry & Agent Studio</h1>
          <p class="dev-desc">Internal DAG execution traces, resource leases, and technical worker states</p>
        </div>
        <div class="header-actions">
          <button type="button" class="action-btn" (click)="stateService.refreshAuthoritativeState()">
            ↻ Refresh State
          </button>
        </div>
      </div>

      <!-- Telemetry & Health Grid -->
      <div class="dev-grid">
        <!-- System Health Subsystems -->
        <app-spatial-card title="Subsystem Health Telemetry" status="INFO">
          <div class="subsystems-list">
            <div class="sub-item">
              <span class="sub-name">API Gateway</span>
              <span class="sub-val" [attr.data-status]="stateService.health().gateway">{{ stateService.health().gateway }}</span>
            </div>
            <div class="sub-item">
              <span class="sub-name">Database (SQLite / LanceDB)</span>
              <span class="sub-val" [attr.data-status]="stateService.health().database">{{ stateService.health().database }}</span>
            </div>
            <div class="sub-item">
              <span class="sub-name">Ollama LLM Engine</span>
              <span class="sub-val" [attr.data-status]="stateService.health().ollama">{{ stateService.health().ollama }}</span>
            </div>
            <div class="sub-item">
              <span class="sub-name">Windows Automation Worker</span>
              <span class="sub-val" [attr.data-status]="stateService.health().windowsWorker">{{ stateService.health().windowsWorker }}</span>
            </div>
            <div class="sub-item">
              <span class="sub-name">Browser Automation Worker</span>
              <span class="sub-val" [attr.data-status]="stateService.health().browserWorker">{{ stateService.health().browserWorker }}</span>
            </div>
            <div class="sub-item">
              <span class="sub-name">Safety Policy & Consent Engine</span>
              <span class="sub-val" [attr.data-status]="stateService.health().safetyPolicy">{{ stateService.health().safetyPolicy }}</span>
            </div>
            <div class="sub-item">
              <span class="sub-name">Resource Lease Manager</span>
              <span class="sub-val" [attr.data-status]="stateService.health().leaseManager">{{ stateService.health().leaseManager }}</span>
            </div>
          </div>
        </app-spatial-card>

        <!-- Safety & Leases Status -->
        <app-spatial-card title="Safety & Resource Leases" status="INFO">
          <div class="subsystems-list">
            <div class="sub-item">
              <span class="sub-name">Policy Status</span>
              <span class="sub-val">{{ stateService.safety().policyStatus }}</span>
            </div>
            <div class="sub-item">
              <span class="sub-name">Active Lease ID</span>
              <span class="sub-val font-mono">{{ stateService.safety().activeLeaseId || 'None' }}</span>
            </div>
            <div class="sub-item">
              <span class="sub-name">Lease Status</span>
              <span class="sub-val">{{ stateService.safety().leaseStatus }}</span>
            </div>
            <div class="sub-item">
              <span class="sub-name">Emergency Stop Engaged</span>
              <span class="sub-val" [class.text-danger]="stateService.safety().emergencyStopped">{{ stateService.safety().emergencyStopped ? 'YES' : 'NO' }}</span>
            </div>
            <div class="sub-item">
              <span class="sub-name">Operator Contention</span>
              <span class="sub-val">{{ stateService.safety().contentionDetected ? 'DETECTED' : 'NONE' }}</span>
            </div>
          </div>
        </app-spatial-card>
      </div>

      <!-- Execution Event Log Stream -->
      <app-spatial-card title="Execution Timeline Events (Bounded Buffer)" status="INFO">
        <div class="timeline-table-wrap">
          <table class="dev-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Task ID</th>
                <th>Event Type</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              @for (item of stateService.timeline(); track item.id) {
                <tr>
                  <td class="font-mono">{{ item.timestamp | date:'HH:mm:ss.SSS' }}</td>
                  <td class="font-mono text-muted">{{ item.taskId }}</td>
                  <td class="event-cell font-mono">{{ item.eventType }}</td>
                  <td>
                    <span class="status-badge" [attr.data-status]="item.status">{{ item.status }}</span>
                  </td>
                  <td class="details-cell">{{ item.details || '-' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="empty-cell">No execution events recorded yet.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-spatial-card>
    </div>
  `,
  styles: [`
    .dev-workspace {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 1300px;
      margin: 0 auto;
      width: 100%;
    }

    .dev-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .dev-title {
      font-size: 20px;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0 0 4px 0;
    }

    .dev-desc {
      font-size: 13px;
      color: #94a3b8;
      margin: 0;
    }

    .action-btn {
      padding: 6px 14px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #cbd5e1;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
    }

    .dev-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .subsystems-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .sub-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      font-size: 13px;
    }

    .sub-name {
      color: #94a3b8;
    }

    .sub-val {
      font-weight: 600;
      color: #f1f5f9;
    }

    .sub-val[data-status="HEALTHY"] { color: #10b981; }
    .sub-val[data-status="DEGRADED"] { color: #f59e0b; }
    .sub-val[data-status="UNAVAILABLE"] { color: #ef4444; }

    .font-mono {
      font-family: monospace;
      font-size: 11px;
    }

    .text-danger {
      color: #ef4444 !important;
    }

    .text-muted {
      color: #64748b;
    }

    .timeline-table-wrap {
      overflow-x: auto;
      max-height: 420px;
    }

    .dev-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .dev-table th {
      text-align: left;
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      color: #64748b;
      font-weight: 600;
    }

    .dev-table td {
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      color: #cbd5e1;
    }

    .event-cell {
      color: #38bdf8;
    }

    .status-badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.06);
    }

    .status-badge[data-status="COMPLETED"] { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .status-badge[data-status="FAILED"] { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .status-badge[data-status="IN_PROGRESS"] { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
    .status-badge[data-status="RECOVERING"] { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }

    .empty-cell {
      text-align: center;
      padding: 24px;
      color: #64748b;
    }

    @media (max-width: 800px) {
      .dev-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DevUiPageComponent {
  readonly stateService = inject(OperatorStateService);
}
