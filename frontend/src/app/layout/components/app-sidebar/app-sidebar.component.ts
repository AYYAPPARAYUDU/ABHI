import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarService } from '../../../core/services/sidebar.service';
import { ThemeService } from '../../../core/services/theme.service';
import { OperatorStateService } from '../../../core/services/operator-state.service';

export interface NavItem {
  readonly route: string;
  readonly label: string;
  readonly icon: string;
  readonly badge?: string;
  readonly category?: string;
}

export interface NavSection {
  readonly category: string;
  readonly items: readonly NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './app-sidebar.component.html',
  styleUrl: './app-sidebar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppSidebarComponent {
  readonly sidebar = inject(SidebarService);
  readonly themeService = inject(ThemeService);
  readonly stateService = inject(OperatorStateService);

  readonly navSections: readonly NavSection[] = [
    {
      category: 'WORKSPACE',
      items: [
        { route: '/home', label: 'Home', icon: '🖥️' },
        { route: '/core', label: 'Arc Core', icon: '🌀' },
        { route: '/workspace', label: 'Workspace', icon: '🛰️' }
      ]
    },
    {
      category: 'OPERATIONS',
      items: [
        { route: '/messages', label: 'Messages & Comms', icon: '💬' },
        { route: '/business', label: 'Business', icon: '🏛️' }
      ]
    },
    {
      category: 'INTELLIGENCE & SYSTEM',
      items: [
        { route: '/architecture', label: 'Architecture', icon: '⚡' },
        { route: '/automation', label: 'Automation', icon: '⚙️' },
        { route: '/intelligence', label: 'Intelligence', icon: '🧠' },
        { route: '/system', label: 'System', icon: '📊' }
      ]
    }
  ];

  readonly safety = this.stateService.safety;
  readonly isWorking = computed(() => this.stateService.isBusy() || this.safety().emergencyStopped);

  readonly systemStatusLabel = computed(() => {
    if (this.safety().emergencyStopped) return 'HALTED';
    if (this.stateService.isBusy()) return 'WORKING';
    return 'PRIMED';
  });

  onLinkClick(): void {
    if (this.sidebar.isMobile()) {
      this.sidebar.close();
    }
  }

  toggleSidebarMode(): void {
    this.sidebar.toggleCompact();
  }

  toggleTheme(): void {
    const isLight = this.themeService.isLightMode();
    this.themeService.setMode(isLight ? 'dark' : 'light');
  }

  onBackdropClick(): void {
    this.sidebar.close();
  }
}
