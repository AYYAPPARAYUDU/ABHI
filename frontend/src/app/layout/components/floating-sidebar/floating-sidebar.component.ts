import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { OperatorStateService } from '../../../core/services/operator-state.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
  badge?: string;
  devOnly?: boolean;
}

@Component({
  selector: 'app-floating-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside
      class="floating-dock"
      [class.collapsed]="stateService.sidebarCollapsed()"
      [attr.aria-label]="'Primary Application Navigation'"
    >
      <!-- Brand Logo / Core Identity -->
      <div class="dock-header">
        <a routerLink="/home" class="brand-link" title="ABHI AI Computer">
          <div class="brand-orb">
            <span class="orb-core"></span>
            <span class="orb-pulse"></span>
          </div>
          @if (!stateService.sidebarCollapsed()) {
            <div class="brand-text">
              <span class="brand-title">ABHI</span>
              <span class="brand-subtitle">AI OS</span>
            </div>
          }
        </a>
      </div>

      <!-- Navigation Links -->
      <nav class="dock-nav" role="navigation">
        <ul class="nav-list">
          @for (item of navItems; track item.path) {
            @if (!item.devOnly || stateService.userMode() === 'DEVELOPER') {
              <li class="nav-item">
                <a
                  [routerLink]="item.path"
                  routerLinkActive="active"
                  [routerLinkActiveOptions]="{ exact: item.exact || false }"
                  class="nav-link"
                  [title]="item.label"
                >
                  <span class="nav-icon" [innerHTML]="item.icon"></span>
                  @if (!stateService.sidebarCollapsed()) {
                    <span class="nav-label">{{ item.label }}</span>
                  }
                  @if (item.badge && !stateService.sidebarCollapsed()) {
                    <span class="nav-badge">{{ item.badge }}</span>
                  }
                </a>
              </li>
            }
          }
        </ul>
      </nav>

      <!-- Bottom Utility: Mode Indicator & Collapse Toggle -->
      <div class="dock-footer">
        @if (!stateService.sidebarCollapsed()) {
          <div class="mode-indicator" [attr.data-mode]="stateService.userMode()">
            <span class="mode-dot"></span>
            <span class="mode-label">{{ stateService.userMode() }} MODE</span>
          </div>
        }
        <button
          type="button"
          class="collapse-btn"
          (click)="stateService.toggleSidebar()"
          [title]="stateService.sidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
          [attr.aria-expanded]="!stateService.sidebarCollapsed()"
        >
          <svg
            class="collapse-icon"
            [class.flipped]="stateService.sidebarCollapsed()"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="11 17 6 12 11 7"></polyline>
            <polyline points="18 17 13 12 18 7"></polyline>
          </svg>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    :host {
      display: block;
      z-index: 50;
    }

    .floating-dock {
      position: fixed;
      top: 16px;
      bottom: 16px;
      left: 16px;
      width: 220px;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      display: flex;
      flex-direction: column;
      padding: 16px 10px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
      transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s ease;
      user-select: none;
    }

    .floating-dock.collapsed {
      width: 68px;
    }

    .dock-header {
      padding-bottom: 16px;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .brand-link {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: inherit;
      padding: 4px 6px;
      border-radius: 12px;
    }

    .brand-orb {
      position: relative;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #06b6d4, #3b82f6 60%, #1e1b4b);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 15px rgba(6, 182, 212, 0.4);
      flex-shrink: 0;
    }

    .orb-core {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 0 8px #38bdf8;
    }

    .orb-pulse {
      position: absolute;
      inset: -3px;
      border-radius: 50%;
      border: 1px solid rgba(56, 189, 248, 0.6);
      animation: pulse-ring 3s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    }

    @keyframes pulse-ring {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.15); opacity: 0.2; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }

    .brand-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.08em;
      background: linear-gradient(135deg, #ffffff 40%, #93c5fd);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand-subtitle {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.15em;
      color: #64748b;
    }

    .dock-nav {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: none;
    }

    .dock-nav::-webkit-scrollbar {
      display: none;
    }

    .nav-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 12px;
      color: #94a3b8;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
      position: relative;
      white-space: nowrap;
    }

    .nav-link:hover {
      background: rgba(255, 255, 255, 0.06);
      color: #f1f5f9;
      transform: translateX(2px);
    }

    .nav-link.active {
      background: linear-gradient(90deg, rgba(6, 182, 212, 0.15), rgba(59, 130, 246, 0.05));
      color: #38bdf8;
      font-weight: 600;
      border: 1px solid rgba(56, 189, 248, 0.2);
      box-shadow: 0 0 12px rgba(6, 182, 212, 0.15);
    }

    .nav-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .nav-badge {
      margin-left: auto;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 6px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    .dock-footer {
      padding-top: 12px;
      margin-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .mode-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.05em;
      padding: 4px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.04);
      color: #64748b;
    }

    .mode-indicator[data-mode="USER"] .mode-dot { background: #10b981; box-shadow: 0 0 6px #10b981; }
    .mode-indicator[data-mode="ADVANCED"] .mode-dot { background: #f59e0b; box-shadow: 0 0 6px #f59e0b; }
    .mode-indicator[data-mode="DEVELOPER"] .mode-dot { background: #ec4899; box-shadow: 0 0 6px #ec4899; }

    .mode-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .collapse-btn {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .collapse-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #f1f5f9;
    }

    .collapse-icon.flipped {
      transform: rotate(180deg);
    }

    @media (max-width: 768px) {
      .floating-dock {
        top: auto;
        left: 12px;
        right: 12px;
        bottom: 12px;
        width: auto !important;
        height: 64px;
        flex-direction: row;
        padding: 6px 12px;
        border-radius: 18px;
      }

      .dock-header, .dock-footer, .nav-label, .nav-badge {
        display: none !important;
      }

      .dock-nav {
        display: flex;
        width: 100%;
        align-items: center;
      }

      .nav-list {
        flex-direction: row;
        justify-content: space-around;
        width: 100%;
      }

      .nav-link {
        padding: 10px;
        border-radius: 12px;
      }
    }
  `]
})
export class FloatingSidebarComponent {
  readonly stateService = inject(OperatorStateService);

  readonly navItems: NavItem[] = [
    {
      path: '/home',
      label: 'Home',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      exact: true
    },
    {
      path: '/console',
      label: 'Ask / Agent',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
    },
    {
      path: '/tasks',
      label: 'Tasks',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>'
    },
    {
      path: '/applications',
      label: 'Apps',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>'
    },
    {
      path: '/browser',
      label: 'Browser',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
    },
    {
      path: '/media',
      label: 'Media Studio',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>'
    },
    {
      path: '/media-library',
      label: 'Media Library',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 8 7 4-7 4V8Z"/></svg>'
    },
    {
      path: '/memory',
      label: 'Memory',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="M2 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M12 22v-4"/><path d="m19.07 19.07-2.83-2.83"/><path d="M22 12h-4"/><path d="m19.07 4.93-2.83 2.83"/></svg>'
    },
    {
      path: '/perception',
      label: 'Perception',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>'
    },
    {
      path: '/avatar',
      label: 'Avatar',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
    },
    {
      path: '/system',
      label: 'System',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
    },
    {
      path: '/dev-ui',
      label: 'Developer Studio',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
      devOnly: true
    }
  ];
}
