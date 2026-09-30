import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { OperatorStateService } from '../../../core/services/operator-state.service';
import { UserExperienceMode } from '../../../core/models/agent-experience.model';

@Component({
  selector: 'app-contextual-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="contextual-bar" role="banner">
      <!-- Left: Context Title & Active Status -->
      <div class="bar-left">
        <div class="page-title-wrap">
          <span class="page-symbol">◈</span>
          <h1 class="page-title">{{ currentRouteTitle() }}</h1>
        </div>

        @if (stateService.isBusy()) {
          <div class="active-task-pill" title="Active background agent operation">
            <span class="pulse-indicator"></span>
            <span class="pill-text">{{ stateService.currentTask()?.currentStep || 'Working…' }}</span>
          </div>
        }
      </div>

      <!-- Center: Command Palette Trigger Button -->
      <div class="bar-center">
        <button
          type="button"
          class="command-trigger-btn"
          (click)="stateService.toggleCommandPalette(true)"
          title="Open Command Palette (Ctrl+K or ⌘K)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span class="trigger-label">What should ABHI do?</span>
          <kbd class="shortcut-badge">⌘K</kbd>
        </button>
      </div>

      <!-- Right: User Mode Switcher, System Health, Emergency Stop -->
      <div class="bar-right">
        <!-- User Mode Toggle Pill -->
        <div class="mode-switcher" role="radiogroup" aria-label="Experience Mode">
          <button
            type="button"
            class="mode-btn"
            [class.active]="stateService.userMode() === 'USER'"
            (click)="setMode('USER')"
            title="User Mode: Minimal outcome-focused interface"
          >
            User
          </button>
          <button
            type="button"
            class="mode-btn"
            [class.active]="stateService.userMode() === 'ADVANCED'"
            (click)="setMode('ADVANCED')"
            title="Advanced Mode: Workflows, pipelines, lineage"
          >
            Adv
          </button>
          <button
            type="button"
            class="mode-btn"
            [class.active]="stateService.userMode() === 'DEVELOPER'"
            (click)="setMode('DEVELOPER')"
            title="Developer Mode: Telemetry, leases, runtime diagnostics"
          >
            Dev
          </button>
        </div>

        <!-- Health Indicator -->
        <div class="health-pill" [attr.data-health]="healthStatus()" [title]="'System Status: ' + healthStatus()">
          <span class="health-dot"></span>
          <span class="health-label">{{ healthStatus() }}</span>
        </div>

        <!-- Emergency Stop Quick Trigger -->
        @if (stateService.safety().emergencyStopped) {
          <button
            type="button"
            class="estop-btn active"
            disabled
            title="System Emergency Stopped"
          >
            STOPPED
          </button>
        } @else {
          <button
            type="button"
            class="estop-btn"
            (click)="stateService.triggerEmergencyStop()"
            title="Immediate Emergency Stop"
          >
            E-STOP
          </button>
        }
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      position: sticky;
      top: 16px;
      z-index: 40;
      margin-bottom: 20px;
    }

    .contextual-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 18px;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    }

    .bar-left {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 180px;
    }

    .page-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .page-symbol {
      color: #38bdf8;
      font-size: 14px;
      opacity: 0.8;
    }

    .page-title {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.05em;
      color: #f1f5f9;
      margin: 0;
      text-transform: uppercase;
    }

    .active-task-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 20px;
      font-size: 11px;
      color: #38bdf8;
      animation: fadeIn 0.3s ease;
    }

    .pulse-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 6px #38bdf8;
      animation: pulse-dot 1.5s infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }

    .bar-center {
      flex: 1;
      max-width: 480px;
      display: flex;
      justify-content: center;
    }

    .command-trigger-btn {
      width: 100%;
      max-width: 360px;
      height: 36px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 12px;
      color: #94a3b8;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .command-trigger-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(56, 189, 248, 0.4);
      color: #f1f5f9;
      box-shadow: 0 0 16px rgba(6, 182, 212, 0.15);
    }

    .trigger-label {
      flex: 1;
      text-align: left;
      font-weight: 400;
    }

    .shortcut-badge {
      font-family: monospace;
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      color: #cbd5e1;
    }

    .bar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .mode-switcher {
      display: flex;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 2px;
      gap: 2px;
    }

    .mode-btn {
      background: none;
      border: none;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 500;
      color: #94a3b8;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .mode-btn:hover {
      color: #f1f5f9;
    }

    .mode-btn.active {
      background: rgba(56, 189, 248, 0.2);
      color: #38bdf8;
      font-weight: 600;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    .health-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
    }

    .health-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .health-pill[data-health="HEALTHY"] .health-dot { background: #10b981; box-shadow: 0 0 6px #10b981; }
    .health-pill[data-health="BUSY"] .health-dot { background: #38bdf8; box-shadow: 0 0 6px #38bdf8; }
    .health-pill[data-health="DEGRADED"] .health-dot { background: #f59e0b; box-shadow: 0 0 6px #f59e0b; }
    .health-pill[data-health="UNAVAILABLE"] .health-dot { background: #ef4444; box-shadow: 0 0 6px #ef4444; }

    .estop-btn {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 4px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .estop-btn:hover {
      background: rgba(239, 68, 68, 0.3);
      border-color: #ef4444;
      color: #ffffff;
      box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
    }

    .estop-btn.active {
      background: #ef4444;
      color: #ffffff;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.6);
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .contextual-bar {
        padding: 8px 12px;
      }
      .bar-center, .mode-switcher, .health-pill {
        display: none !important;
      }
    }
  `]
})
export class ContextualTopbarComponent {
  readonly stateService = inject(OperatorStateService);
  private readonly router = inject(Router);

  currentRouteTitle = computed(() => {
    const url = this.router.url;
    if (url.startsWith('/home')) return 'Personal AI Space';
    if (url.startsWith('/console')) return 'Interactive Console';
    if (url.startsWith('/tasks')) return 'Agentic Tasks';
    if (url.startsWith('/applications')) return 'Applications';
    if (url.startsWith('/browser')) return 'AI Browser Workspace';
    if (url.startsWith('/media-library')) return 'Multimodal Library';
    if (url.startsWith('/media')) return 'Media Creative Studio';
    if (url.startsWith('/memory')) return 'Personal Memory';
    if (url.startsWith('/perception')) return 'Spatial Perception';
    if (url.startsWith('/avatar')) return 'Avatar Presence';
    if (url.startsWith('/system')) return 'System Diagnostics';
    if (url.startsWith('/dev-ui')) return 'Developer Studio';
    return 'ABHI AI';
  });

  healthStatus = computed(() => {
    if (this.stateService.safety().emergencyStopped) return 'STOPPED';
    if (this.stateService.isBusy()) return 'BUSY';
    return this.stateService.health().overall;
  });

  setMode(mode: UserExperienceMode): void {
    this.stateService.setUserMode(mode);
  }
}
