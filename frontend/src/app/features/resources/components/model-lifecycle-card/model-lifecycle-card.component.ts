import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModelInstanceRecordDTO } from '../../models/resource.model';

@Component({
  selector: 'app-model-lifecycle-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="model-card">
      <div>
        <div class="card-header-row">
          <div>
            <div class="model-title-row">
              <span class="model-name">{{ model().model_id }}</span>
              @if (model().is_production) {
                <span class="abhi-badge abhi-badge-cyan">Production</span>
              } @else if (model().is_candidate) {
                <span class="abhi-badge abhi-badge-warning">Candidate</span>
              }
            </div>
            <div class="model-specs">
              {{ model().format }} • {{ model().quantization }} • {{ model().parameter_count }}
            </div>
          </div>

          <!-- Health / State Badge -->
          <span
            class="abhi-badge"
            [ngClass]="getStateBadgeClass()"
          >
            {{ model().state }}
          </span>
        </div>

        <div class="metrics-grid">
          <div class="metric-item">
            <span class="metric-label">Device:</span>
            <span class="metric-val">{{ model().device }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Context Tokens:</span>
            <span class="metric-val">{{ model().context_length | number }}</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Memory Footprint:</span>
            <span class="metric-val text-success">
              {{ (model().actual_memory_mb || model().estimated_memory_mb) | number:'1.0-0' }} MB
            </span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Est. KV-Cache:</span>
            <span class="metric-val">{{ model().estimated_kv_cache_mb | number:'1.0-1' }} MB</span>
          </div>
        </div>

        @if (model().error_message) {
          <div class="error-box">
            {{ model().error_message }}
          </div>
        }
      </div>

      <!-- Action Footer -->
      <div class="card-footer-row">
        <div class="use-count">
          Uses: <span class="use-num">{{ model().use_count }}</span>
        </div>

        <div class="actions">
          @if (isLoaded()) {
            <button
              type="button"
              (click)="onUnload()"
              class="abhi-btn btn-danger-soft"
            >
              Unload
            </button>
          } @else {
            <button
              type="button"
              (click)="onLoad()"
              class="abhi-btn abhi-btn-primary"
            >
              Load
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .model-card {
      background: var(--abhi-surface-raised, #0e1828);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: var(--abhi-radius-control, 16px);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: var(--abhi-raised-shadow);
      transition: all var(--abhi-transition-normal);
    }
    .model-card:hover {
      border-color: var(--abhi-border-active);
    }
    .card-header-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .model-title-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .model-name {
      font-size: 0.95rem;
      font-weight: 800;
      color: #ffffff;
    }
    .model-specs {
      font-size: 0.75rem;
      color: var(--abhi-text-muted, #8193ac);
      font-family: ui-monospace, monospace;
      margin-top: 0.2rem;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
      background: var(--abhi-surface-inset, #080e18);
      border: 1px solid var(--abhi-border);
      border-radius: var(--abhi-radius-md, 10px);
      padding: 0.75rem;
      margin: 0.75rem 0;
      box-shadow: var(--abhi-inset-shadow);
    }
    .metric-item {
      font-size: 0.75rem;
    }
    .metric-label {
      color: var(--abhi-text-muted, #8193ac);
      display: block;
      margin-bottom: 0.1rem;
    }
    .metric-val {
      font-weight: 700;
      font-family: ui-monospace, monospace;
      color: var(--abhi-text-primary, #eef5ff);
    }
    .text-success {
      color: var(--abhi-success, #48dda2);
    }
    .error-box {
      font-size: 0.75rem;
      color: #ff5b71;
      background: rgba(255, 91, 113, 0.1);
      border: 1px solid rgba(255, 91, 113, 0.3);
      padding: 0.5rem;
      border-radius: var(--abhi-radius-sm);
      margin-bottom: 0.75rem;
    }
    .card-footer-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--abhi-border);
      padding-top: 0.75rem;
      margin-top: 0.5rem;
    }
    .use-count {
      font-size: 0.75rem;
      color: var(--abhi-text-muted);
    }
    .use-num {
      font-family: ui-monospace, monospace;
      color: var(--abhi-text-primary);
      font-weight: 600;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .btn-danger-soft {
      background: rgba(255, 91, 113, 0.15);
      border-color: rgba(255, 91, 113, 0.35);
      color: #ff5b71;
      padding: 0.35rem 0.75rem;
      font-size: 0.78rem;
    }
    .btn-danger-soft:hover {
      background: rgba(255, 91, 113, 0.3);
      color: #ffffff;
    }
  `]
})
export class ModelLifecycleCardComponent {
  model = input.required<ModelInstanceRecordDTO>();

  load = output<string>();
  unload = output<{ modelId: string; force: boolean }>();

  isLoaded(): boolean {
    return ['LOADED', 'WARM', 'IN_USE', 'IDLE'].includes(this.model().state);
  }

  onLoad(): void {
    this.load.emit(this.model().model_id);
  }

  onUnload(): void {
    const isBusy = this.model().state === 'IN_USE';
    this.unload.emit({ modelId: this.model().model_id, force: isBusy });
  }

  getStateBadgeClass(): string {
    switch (this.model().state) {
      case 'IN_USE':
      case 'WARM':
      case 'LOADED':
        return 'abhi-badge-success';
      case 'IDLE':
        return 'abhi-badge-cyan';
      case 'QUARANTINED':
      case 'FAILED':
        return 'abhi-badge-danger';
      default:
        return '';
    }
  }
}

