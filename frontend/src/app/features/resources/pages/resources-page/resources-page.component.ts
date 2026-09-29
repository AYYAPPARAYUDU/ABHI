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
    <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
            Resource & Model Lifecycle Manager
          </h1>
          <p class="text-xs text-slate-400 mt-1">
            Local-First deterministic CPU, RAM, GPU, VRAM, and Model Cache orchestration for ABHI
          </p>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="onRefresh()"
            [disabled]="resourceService.isLoading()"
            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <svg
              class="w-3.5 h-3.5"
              [class.animate-spin]="resourceService.isLoading()"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <!-- Error Alert -->
      @if (resourceService.errorMessage()) {
        <div class="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
          <span>{{ resourceService.errorMessage() }}</span>
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
      <div>
        <div class="flex items-center justify-between mb-3">
          <div>
            <h2 class="text-sm font-semibold text-slate-100">Model Memory Lifecycle & Cache</h2>
            <p class="text-xs text-slate-400">Production and candidate model instances with VRAM gating</p>
          </div>
          <span class="text-xs font-mono text-slate-400">
            Loaded: {{ resourceService.summary()?.loaded_models_count || 0 }} / {{ resourceService.models().length }}
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
  `
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
