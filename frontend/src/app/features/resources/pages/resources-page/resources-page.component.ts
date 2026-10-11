import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceService } from '../../services/resource.service';
import { OperatingMode } from '../../models/resource.model';
import { HardwareGaugePanelComponent } from '../../components/hardware-gauge-panel/hardware-gauge-panel.component';
import { OperatingModeSelectorComponent } from '../../components/operating-mode-selector/operating-mode-selector.component';
import { ModelLifecycleCardComponent } from '../../components/model-lifecycle-card/model-lifecycle-card.component';
import { WorkloadQueueTableComponent } from '../../components/workload-queue-table/workload-queue-table.component';

@Component({
  selector: 'app-resources-page',
  standalone: true,
  imports: [
    CommonModule,
    HardwareGaugePanelComponent,
    OperatingModeSelectorComponent,
    ModelLifecycleCardComponent,
    WorkloadQueueTableComponent
  ],
  template: `
    <div class="resources-page-container">
      <!-- Header -->
      <div class="page-header-row">
        <div>
          <h1 class="page-title">
            <span class="pulse-dot"></span>
            Resource & Model Lifecycle Manager
          </h1>
          <p class="page-subtitle">
            Local-First deterministic CPU, RAM, GPU, VRAM, and Model Cache orchestration for ABHI
          </p>
        </div>

        <div class="header-actions">
          <button
            type="button"
            (click)="onRefresh()"
            [disabled]="resourceService.isLoading()"
            class="abhi-btn abhi-btn-primary"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <!-- Error Alert -->
      @if (resourceService.errorMessage()) {
        <div class="alert-error">
          <span>⚠️ {{ resourceService.errorMessage() }}</span>
        </div>
      }

      <!-- Operating Mode & State Bar -->
      <app-operating-mode-selector
        [currentMode]="resourceService.operatingMode()"
        [pressureLevel]="resourceService.pressureLevel()"
        [degradedMode]="resourceService.summary()?.degraded_mode || 'FULL_CAPABILITY'"
        (modeChange)="onModeChange($event)"
        (reconcile)="onReconcile()"
      />

      <!-- Hardware Gauges -->
      <app-hardware-gauge-panel
        [inventory]="resourceService.summary()?.hardware || null"
        [ramUsagePercent]="resourceService.ramUsagePercent()"
        [vramUsagePercent]="resourceService.vramUsagePercent()"
      />

      <!-- Managed Models Section -->
      <div class="models-section">
        <div class="section-header-row">
          <div>
            <h2 class="section-title">Model Memory Lifecycle & Cache</h2>
            <p class="section-subtitle">Production and candidate model instances with VRAM gating</p>
          </div>
          <span class="abhi-badge abhi-badge-cyan">
            Loaded: {{ resourceService.summary()?.loaded_models_count || 0 }} / {{ resourceService.models().length }}
          </span>
        </div>

        <div class="models-grid">
          @for (model of resourceService.models(); track model.model_id) {
            <app-model-lifecycle-card
              [model]="model"
              (load)="onLoadModel($event)"
              (unload)="onUnloadModel($event)"
            />
          }
        </div>
      </div>

      <!-- Active Leases Queue -->
      <app-workload-queue-table
        [leases]="resourceService.activeLeases()"
      />
    </div>
  `,
  styles: [`
    .resources-page-container {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      color: var(--abhi-text-primary, #eef5ff);
      max-width: 1600px;
      margin: 0 auto;
    }
    .page-header-row {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
    }
    @media (min-width: 768px) {
      .page-header-row {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }
    .page-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin: 0;
      letter-spacing: -0.01em;
    }
    .pulse-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--abhi-cyan, #38d9ff);
      box-shadow: 0 0 10px var(--abhi-cyan);
    }
    .page-subtitle {
      font-size: 0.8rem;
      color: var(--abhi-text-muted, #8193ac);
      margin: 0.35rem 0 0 0;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .alert-error {
      background: rgba(255, 91, 113, 0.12);
      border: 1px solid rgba(255, 91, 113, 0.35);
      color: #ff5b71;
      padding: 0.85rem 1.2rem;
      border-radius: var(--abhi-radius-md, 10px);
      font-size: 0.82rem;
    }
    .models-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .section-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .section-title {
      font-size: 0.95rem;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }
    .section-subtitle {
      font-size: 0.76rem;
      color: var(--abhi-text-muted, #8193ac);
      margin: 0.2rem 0 0 0;
    }
    .models-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.25rem;
    }
  `]
})
export class ResourcesPageComponent implements OnInit {
  resourceService = inject(ResourceService);

  ngOnInit(): void {
    this.resourceService.fetchSummary().subscribe();
  }

  onRefresh(): void {
    this.resourceService.fetchSummary().subscribe();
  }

  onModeChange(mode: OperatingMode): void {
    this.resourceService.setOperatingMode(mode).subscribe();
  }

  onLoadModel(modelId: string): void {
    this.resourceService.loadModel(modelId).subscribe();
  }

  onUnloadModel(event: { modelId: string; force: boolean }): void {
    this.resourceService.unloadModel(event.modelId, event.force).subscribe();
  }

  onReconcile(): void {
    this.resourceService.reconcileOrphans().subscribe();
  }
}

