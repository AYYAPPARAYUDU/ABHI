import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatingMode, DegradedMode, ResourcePressureLevel } from '../../models/resource.model';

@Component({
  selector: 'app-operating-mode-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
      <div class="flex items-center gap-3">
        <div class="w-3 h-3 rounded-full animate-pulse" [ngClass]="getPressureDotClass()"></div>
        <div>
          <div class="text-sm font-semibold text-slate-200">
            System Resource State: <span class="font-bold">{{ pressureLevel() }}</span>
          </div>
          <div class="text-xs text-slate-400">
            Runtime Mode: <span class="text-cyan-400">{{ degradedMode() }}</span>
          </div>
        </div>
      </div>

      <!-- Mode Selector Buttons -->
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          (click)="onSelectMode('BALANCED')"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border"
          [ngClass]="currentMode() === 'BALANCED' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm' : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800'"
        >
          Balanced
        </button>

        <button
          type="button"
          (click)="onSelectMode('PERFORMANCE')"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border"
          [ngClass]="currentMode() === 'PERFORMANCE' ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm' : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800'"
        >
          Performance
        </button>

        <button
          type="button"
          (click)="onSelectMode('CONSERVATIVE')"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border"
          [ngClass]="currentMode() === 'CONSERVATIVE' ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm' : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800'"
        >
          Conservative
        </button>

        <button
          type="button"
          (click)="onSelectMode('RESOURCE_SAVER')"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border"
          [ngClass]="currentMode() === 'RESOURCE_SAVER' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm' : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800'"
        >
          Saver
        </button>

        <button
          type="button"
          (click)="reconcile.emit()"
          class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 transition-all"
          title="Scan and reconcile orphaned worker processes"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reconcile
        </button>
      </div>
    </div>
  `
})
export class OperatingModeSelectorComponent {
  currentMode = input<OperatingMode>('BALANCED');
  pressureLevel = input<ResourcePressureLevel>('NORMAL');
  degradedMode = input<DegradedMode>('FULL_CAPABILITY');

  modeChange = output<OperatingMode>();
  reconcile = output<void>();

  onSelectMode(mode: OperatingMode): void {
    this.modeChange.emit(mode);
  }

  getPressureDotClass(): string {
    switch (this.pressureLevel()) {
      case 'CRITICAL':
        return 'bg-red-500 shadow-red-500/50 shadow-sm';
      case 'HIGH':
        return 'bg-amber-500 shadow-amber-500/50 shadow-sm';
      case 'ELEVATED':
        return 'bg-yellow-400 shadow-yellow-400/50 shadow-sm';
      default:
        return 'bg-emerald-400 shadow-emerald-400/50 shadow-sm';
    }
  }
}
