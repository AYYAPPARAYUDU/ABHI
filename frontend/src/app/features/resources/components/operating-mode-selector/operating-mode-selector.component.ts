import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OperatingMode, DegradedMode, ResourcePressureLevel } from '../../models/resource.model';
import { AnimeInteractiveDirective } from '../../../../shared/directives/anime-interactive.directive';

@Component({
  selector: 'app-operating-mode-selector',
  standalone: true,
  imports: [CommonModule, AnimeInteractiveDirective],
  template: `
    <div class="mode-selector-card">
      <div class="state-indicator">
        <div class="status-dot" [ngClass]="getPressureDotClass()"></div>
        <div>
          <div class="state-title">
            System Resource State: <span class="state-val">{{ pressureLevel() }}</span>
          </div>
          <div class="state-subtitle">
            Runtime Mode: <span class="text-cyan">{{ degradedMode() }}</span>
          </div>
        </div>
      </div>

      <!-- Mode Selector Buttons -->
      <div class="button-group">
        <button
          type="button"
          appAnimeInteractive
          (click)="onSelectMode('BALANCED')"
          class="abhi-btn mode-btn"
          [class.active-cyan]="currentMode() === 'BALANCED'"
        >
          Balanced
        </button>

        <button
          type="button"
          appAnimeInteractive
          (click)="onSelectMode('PERFORMANCE')"
          class="abhi-btn mode-btn"
          [class.active-purple]="currentMode() === 'PERFORMANCE'"
        >
          Performance
        </button>

        <button
          type="button"
          appAnimeInteractive
          (click)="onSelectMode('CONSERVATIVE')"
          class="abhi-btn mode-btn"
          [class.active-amber]="currentMode() === 'CONSERVATIVE'"
        >
          Conservative
        </button>

        <button
          type="button"
          appAnimeInteractive
          (click)="onSelectMode('RESOURCE_SAVER')"
          class="abhi-btn mode-btn"
          [class.active-green]="currentMode() === 'RESOURCE_SAVER'"
        >
          Saver
        </button>

        <button
          type="button"
          appAnimeInteractive
          (click)="reconcile.emit()"
          class="abhi-btn reconcile-btn"
          title="Scan and reconcile orphaned worker processes"
        >
          🔄 Reconcile
        </button>
      </div>
    </div>
  `,
  styles: [`
    .mode-selector-card {
      background: var(--abhi-surface-raised, #0e1828);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: var(--abhi-radius-control, 16px);
      padding: 1.2rem 1.4rem;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      box-shadow: var(--abhi-raised-shadow);
    }
    .state-indicator {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }
    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      box-shadow: 0 0 10px currentColor;
      animation: pulseGlow 2s infinite ease-in-out;
    }
    .dot-normal { background-color: var(--abhi-success, #48dda2); color: #48dda2; }
    .dot-elevated { background-color: #facc15; color: #facc15; }
    .dot-high { background-color: var(--abhi-amber, #ffca70); color: #ffca70; }
    .dot-critical { background-color: var(--abhi-danger, #ff5b71); color: #ff5b71; }
    .state-title {
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--abhi-text-primary, #eef5ff);
    }
    .state-val {
      font-family: ui-monospace, monospace;
      color: #ffffff;
    }
    .state-subtitle {
      font-size: 0.76rem;
      color: var(--abhi-text-secondary, #a7b7cc);
      margin-top: 0.15rem;
    }
    .text-cyan {
      color: var(--abhi-cyan, #38d9ff);
      font-weight: 600;
    }
    .button-group {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }
    .mode-btn {
      padding: 0.4rem 0.85rem;
      font-size: 0.78rem;
    }
    .active-cyan {
      border-color: var(--abhi-cyan) !important;
      background: rgba(56, 217, 255, 0.18) !important;
      color: #38d9ff !important;
      box-shadow: 0 0 12px rgba(56, 217, 255, 0.3) !important;
    }
    .active-purple {
      border-color: #c084fc !important;
      background: rgba(192, 132, 252, 0.18) !important;
      color: #e9d5ff !important;
      box-shadow: 0 0 12px rgba(192, 132, 252, 0.3) !important;
    }
    .active-amber {
      border-color: var(--abhi-amber) !important;
      background: rgba(255, 202, 112, 0.18) !important;
      color: #ffca70 !important;
      box-shadow: 0 0 12px rgba(255, 202, 112, 0.3) !important;
    }
    .active-green {
      border-color: var(--abhi-success) !important;
      background: rgba(72, 221, 162, 0.18) !important;
      color: #48dda2 !important;
      box-shadow: 0 0 12px rgba(72, 221, 162, 0.3) !important;
    }
    .reconcile-btn {
      padding: 0.4rem 0.85rem;
      font-size: 0.78rem;
    }
  `]
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
        return 'dot-critical';
      case 'HIGH':
        return 'dot-high';
      case 'ELEVATED':
        return 'dot-elevated';
      default:
        return 'dot-normal dot-emerald';
    }
  }
}

