import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { OperatorStateService } from '../../../core/services/operator-state.service';
import { UserExperienceMode } from '../../../core/models/agent-experience.model';
import { ThemeService } from '../../../core/services/theme.service';

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

      <!-- Center: Futuristic Floating Navigation Ribbon (Zero Sidebar) -->
      <nav class="bar-nav-ribbon" aria-label="Futuristic Workspace Navigation">
        @for (item of navItems; track item.route) {
          <button
            type="button"
            class="ribbon-btn"
            [class.active]="isActive(item.route)"
            (click)="navigateTo(item.route)"
            [title]="item.label"
          >
            <span class="ribbon-icon">{{ item.icon }}</span>
            <span class="ribbon-label">{{ item.label }}</span>
          </button>
        }
      </nav>

      <!-- Right: Search/Command, Theme, Mode Switcher, Health, Emergency Stop -->
      <div class="bar-right">
        <!-- Command Palette Trigger -->
        <button
          type="button"
          class="command-trigger-btn"
          (click)="stateService.toggleCommandPalette(true)"
          title="Open Command Palette (Ctrl+K or ⌘K)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span class="trigger-label">Cmd</span>
          <kbd class="shortcut-badge">⌘K</kbd>
        </button>

        <!-- Theme Quick Cycler -->
        <button
          type="button"
          class="theme-quick-btn"
          (click)="cycleTheme()"
          [title]="'Active Theme: ' + themeService.activeTheme().label + ' (Click to Switch)'"
        >
          <span class="theme-icon">🎨</span>
          <span class="theme-name">{{ themeService.activeTheme().label }}</span>
        </button>

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
      top: 14px;
      z-index: 40;
      margin-bottom: 20px;
    }

    .contextual-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 10px 18px;
      background: var(--abhi-surface-raised, #ffffff);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border: 1px solid var(--abhi-border, rgba(11, 19, 41, 0.09));
      border-radius: var(--abhi-radius-control, 20px);
      box-shadow: var(--abhi-raised-shadow, 10px 10px 24px rgba(0, 0, 0, 0.08));
    }

    .bar-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 170px;
    }

    .page-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .page-symbol {
      color: var(--abhi-cyan, #0099cc);
      font-size: 14px;
      opacity: 0.9;
    }

    .page-title {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: var(--abhi-text-primary, #0b1329);
      margin: 0;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .active-task-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      background: rgba(0, 153, 204, 0.1);
      border: 1px solid rgba(0, 153, 204, 0.25);
      border-radius: 20px;
      font-size: 11px;
      color: var(--abhi-cyan, #0099cc);
    }

    .pulse-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--abhi-cyan, #0099cc);
      box-shadow: 0 0 6px var(--abhi-cyan, #0099cc);
      animation: pulse-dot 1.5s infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }

    /* Center Futuristic Navigation Ribbon */
    .bar-nav-ribbon {
      display: flex;
      align-items: center;
      gap: 4px;
      background: var(--abhi-surface-inset, #eaf0f8);
      border: 1px solid var(--abhi-border, rgba(11, 19, 41, 0.08));
      border-radius: 14px;
      padding: 4px;
      box-shadow: var(--abhi-inset-shadow, inset 2px 2px 5px rgba(0,0,0,0.04));
      overflow-x: auto;
    }

    .ribbon-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: 1px solid transparent;
      padding: 6px 12px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      color: var(--abhi-text-secondary, #475569);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      white-space: nowrap;
    }

    .ribbon-btn:hover {
      color: var(--abhi-text-primary, #0b1329);
      background: var(--abhi-surface-raised, #ffffff);
      border-color: var(--abhi-border, rgba(11, 19, 41, 0.1));
      transform: translateY(-1px);
    }

    .ribbon-btn.active {
      background: var(--abhi-surface-raised, #ffffff);
      color: var(--abhi-cyan, #0099cc);
      border-color: var(--abhi-border-active, rgba(0, 153, 204, 0.4));
      box-shadow: var(--abhi-raised-shadow, 4px 4px 10px rgba(0,0,0,0.06)), 0 0 10px var(--abhi-glow-primary, rgba(0, 153, 204, 0.2));
      font-weight: 700;
    }

    .ribbon-icon {
      font-size: 13px;
    }

    .bar-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .command-trigger-btn {
      height: 32px;
      background: var(--abhi-surface-inset, #eaf0f8);
      border: 1px solid var(--abhi-border, rgba(11, 19, 41, 0.09));
      border-radius: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 10px;
      color: var(--abhi-text-secondary, #475569);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .command-trigger-btn:hover {
      border-color: var(--abhi-border-active, rgba(0, 153, 204, 0.4));
      color: var(--abhi-text-primary, #0b1329);
    }

    .trigger-label {
      font-weight: 600;
    }

    .shortcut-badge {
      font-family: monospace;
      font-size: 9px;
      font-weight: 700;
      padding: 1px 4px;
      background: var(--abhi-surface-raised, #ffffff);
      border: 1px solid var(--abhi-border, rgba(11, 19, 41, 0.1));
      border-radius: 4px;
      color: var(--abhi-cyan, #0099cc);
    }

    .theme-quick-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 10px;
      background: var(--abhi-surface-inset, #eaf0f8);
      border: 1px solid var(--abhi-border, rgba(11, 19, 41, 0.09));
      border-radius: 10px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 600;
      color: var(--abhi-text-primary, #0b1329);
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .theme-quick-btn:hover {
      border-color: var(--abhi-cyan, #0099cc);
      transform: translateY(-1px);
    }

    .theme-icon {
      font-size: 12px;
    }

    .theme-name {
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .mode-switcher {
      display: flex;
      background: var(--abhi-surface-inset, #eaf0f8);
      border: 1px solid var(--abhi-border, rgba(11, 19, 41, 0.09));
      border-radius: 10px;
      padding: 2px;
      gap: 2px;
    }

    .mode-btn {
      background: none;
      border: none;
      padding: 4px 8px;
      font-size: 11px;
      font-weight: 500;
      color: var(--abhi-text-secondary, #475569);
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .mode-btn:hover {
      color: var(--abhi-text-primary, #0b1329);
    }

    .mode-btn.active {
      background: var(--abhi-surface-raised, #ffffff);
      color: var(--abhi-cyan, #0099cc);
      font-weight: 700;
      box-shadow: 0 2px 5px rgba(0,0,0,0.06);
    }

    .health-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: var(--abhi-surface-inset, #eaf0f8);
      border: 1px solid var(--abhi-border, rgba(11, 19, 41, 0.09));
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
      font-family: monospace;
      color: var(--abhi-text-secondary, #475569);
    }

    .health-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .health-pill[data-health="HEALTHY"] .health-dot { background: var(--abhi-success, #059669); box-shadow: 0 0 6px var(--abhi-success, #059669); }
    .health-pill[data-health="BUSY"] .health-dot { background: var(--abhi-cyan, #0099cc); box-shadow: 0 0 6px var(--abhi-cyan, #0099cc); }
    .health-pill[data-health="DEGRADED"] .health-dot { background: var(--abhi-warning, #d97706); box-shadow: 0 0 6px var(--abhi-warning, #d97706); }
    .health-pill[data-health="UNAVAILABLE"] .health-dot { background: var(--abhi-danger, #e11d48); box-shadow: 0 0 6px var(--abhi-danger, #e11d48); }

    .estop-btn {
      background: var(--abhi-surface-raised, #ffffff);
      border: 1px solid rgba(225, 29, 72, 0.35);
      color: var(--abhi-danger, #e11d48);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.08em;
      padding: 6px 10px;
      border-radius: 10px;
      box-shadow: var(--abhi-raised-shadow, 4px 4px 10px rgba(0, 0, 0, 0.06));
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .estop-btn:hover {
      background: var(--abhi-danger, #e11d48);
      color: #ffffff;
      box-shadow: 0 0 12px rgba(225, 29, 72, 0.4);
    }

    .estop-btn.active {
      background: var(--abhi-danger, #e11d48);
      color: #ffffff;
      cursor: not-allowed;
    }

    .bar-nav-ribbon::-webkit-scrollbar {
      display: none;
    }

    @media (max-width: 1180px) {
      .contextual-bar {
        display: grid;
        grid-template-columns: auto 1fr;
        grid-template-areas:
          "title tools"
          "nav nav";
        gap: 10px;
        padding: 10px 14px;
      }
      .bar-left {
        grid-area: title;
      }
      .bar-right {
        grid-area: tools;
        justify-content: flex-end;
      }
      .bar-nav-ribbon {
        grid-area: nav;
        width: 100%;
        box-sizing: border-box;
      }
    }

    @media (max-width: 768px) {
      .page-title {
        font-size: 11.5px;
      }
      .theme-name {
        display: none;
      }
      .trigger-label {
        display: none;
      }
      .ribbon-btn {
        padding: 5px 9px;
        font-size: 11px;
      }
    }
  `]
})
export class ContextualTopbarComponent {
  readonly stateService = inject(OperatorStateService);
  readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  navItems = [
    { route: '/home', label: '3D Core', icon: '🌐' },
    { route: '/network', label: 'Network', icon: '☊' },
    { route: '/intelligence', label: 'Neural Lab', icon: '🧠' },
    { route: '/business', label: 'Sectors', icon: '⛃' },
    { route: '/media', label: 'Media', icon: '✦' },
    { route: '/tasks', label: 'Tasks', icon: '⚡' },
    { route: '/resources', label: 'Governance', icon: '◰' },
    { route: '/system', label: 'Diagnostics', icon: '⚙' },
  ];

  currentRouteTitle = computed(() => {
    const url = this.router.url;
    if (url.startsWith('/home')) return 'Personal AI Space';
    if (url.startsWith('/network')) return 'Agent Network';
    if (url.startsWith('/intelligence')) return 'Neural & Intelligence';
    if (url.startsWith('/business')) return 'Business Sectors';
    if (url.startsWith('/media')) return 'Media Studio';
    if (url.startsWith('/tasks')) return 'Agentic Tasks';
    if (url.startsWith('/resources')) return 'Resource Governance';
    if (url.startsWith('/system')) return 'System Diagnostics';
    return 'ABHI AI';
  });

  healthStatus = computed(() => {
    if (this.stateService.safety().emergencyStopped) return 'STOPPED';
    if (this.stateService.isBusy()) return 'BUSY';
    return this.stateService.health().overall;
  });

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  navigateTo(route: string): void {
    this.router.navigateByUrl(route);
  }

  cycleTheme(): void {
    const presets = this.themeService.availablePresets;
    const currentId = this.themeService.activeTheme().id;
    const idx = presets.findIndex((p) => p.id === currentId);
    const nextIdx = (idx + 1) % presets.length;
    this.themeService.setPreset(presets[nextIdx].id);
  }

  setMode(mode: UserExperienceMode): void {
    this.stateService.setUserMode(mode);
  }
}
