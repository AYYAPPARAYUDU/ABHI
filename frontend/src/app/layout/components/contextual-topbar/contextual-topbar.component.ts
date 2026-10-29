import { AgentApiService } from '../../../core/api/agent-api.service';
import { Component, inject, computed, AfterViewInit, ElementRef, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { OperatorStateService } from '../../../core/services/operator-state.service';
import { UserExperienceMode } from '../../../core/models/agent-experience.model';
import { ThemeService } from '../../../core/services/theme.service';
import { SpeechVoiceService } from '../../../core/services/speech-voice.service';
import { AnimeAnimationService } from '../../../core/services/anime-animation.service';
import { AnimeInteractiveDirective } from '../../../shared/directives/anime-interactive.directive';

@Component({
  selector: 'app-contextual-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule, AnimeInteractiveDirective],
  templateUrl: './contextual-topbar.component.html',
  styleUrl: './contextual-topbar.component.css'
})
export class ContextualTopbarComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly stateService = inject(OperatorStateService);
  readonly themeService = inject(ThemeService);
  readonly speechVoice = inject(SpeechVoiceService);
  readonly animService = inject(AnimeAnimationService);
  private readonly router = inject(Router);
  private readonly hostEl = inject(ElementRef);
  private readonly agentApi = inject(AgentApiService);
  readonly mobileStatus = signal<any>(null);
  private mobilePollInterval: any = null;

  readonly isMobileConnected = computed(() => this.mobileStatus()?.connected === true);
  readonly mobileLabel = computed(() => {
    const m = this.mobileStatus();
    if (!m || !m.connected) return 'Mobile Ready';
    const dev = m.device_info?.model || 'Device';
    const bat = m.battery?.level;
    return `${dev}${bat ? ' ' + bat + '%' : ''}`;
  });
  readonly mobileTooltip = computed(() => {
    const m = this.mobileStatus();
    if (!m || !m.connected) return 'Mobile Controller: ADB Ready on tcp:5037. Connect phone via USB or Wi-Fi to automate.';
    return `Connected Phone: ${m.device_info?.model || 'Android'} | Battery: ${m.battery?.level}% (${m.battery?.status})`;
  });

  readonly safety = this.stateService.safety;
  readonly isWorking = computed(() => this.stateService.isBusy() || this.safety().emergencyStopped);
  readonly systemStatusLabel = computed(() => {
    if (this.safety().emergencyStopped) return 'HALTED';
    if (this.stateService.isBusy()) return 'WORKING';
    return 'PRIMED';
  });

  // Reactive URL signal updated on every NavigationEnd
  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  navItems = [
    { route: '/home', label: '3D Core', icon: '🌐' },
    { route: '/decision-pipeline', label: 'Decisions', icon: '⚡' },
    { route: '/business', label: 'Sectors', icon: '⛃' },
    { route: '/intelligence', label: 'Neural Lab', icon: '🧠' },
    { route: '/applications', label: 'Apps', icon: '💻' },
    { route: '/browser', label: 'Browser', icon: '🌍' },
    { route: '/media', label: 'Media', icon: '✦' },
    { route: '/memory', label: 'Memory', icon: '◌' },
    { route: '/tasks', label: 'Tasks', icon: '◈' },
    { route: '/network', label: 'Network', icon: '☊' },
    { route: '/system', label: 'Diagnostics', icon: '⚙' },
  ];

  currentRouteTitle = computed(() => {
    const url = this.currentUrl() || this.router.url;
    if (url.startsWith('/home')) return 'Personal AI Space';
    if (url.startsWith('/decision-pipeline')) return 'Decision Pipeline';
    if (url.startsWith('/business')) return 'Business Sectors';
    if (url.startsWith('/intelligence')) return 'Neural & Intelligence';
    if (url.startsWith('/applications')) return 'Windows OS Applications';
    if (url.startsWith('/browser')) return 'AI Browser Automation';
    if (url.startsWith('/media-library')) return 'Multimodal Media Library';
    if (url.startsWith('/media')) return 'Media Studio';
    if (url.startsWith('/memory')) return 'Memory & Procedural RAG';
    if (url.startsWith('/tasks')) return 'Agentic Tasks';
    if (url.startsWith('/network')) return 'Agent Network';
    if (url.startsWith('/resources')) return 'Resource Governance';
    if (url.startsWith('/system')) return 'System Diagnostics';
    if (url.startsWith('/knowledge')) return 'Knowledge & Ontology';
    return 'ABHI AI';
  });

  healthStatus = computed(() => {
    if (this.stateService.safety().emergencyStopped) return 'STOPPED';
    if (this.stateService.isBusy()) return 'BUSY';
    return this.stateService.health().overall;
  });

  ngAfterViewInit(): void {
    const root = this.hostEl.nativeElement;
    if (!root) return;
    const ribbonButtons = root.querySelectorAll('.bar-nav-ribbon .ribbon-btn');
    if (ribbonButtons.length > 0) {
      this.animService.staggerEnter({
        targets: ribbonButtons,
        translateY: [-8, 0],
        opacity: [0, 1],
        scale: [0.95, 1],
        duration: 500,
        delay: 30
      });
    }
  }

  isActive(route: string): boolean {
    const url = this.currentUrl() || this.router.url;
    return url.startsWith(route);
  }

  navigateTo(route: string, event?: MouseEvent): void {
    if (event?.currentTarget) {
      this.animService.tactileClick(event.currentTarget as HTMLElement);
    }
    this.router.navigateByUrl(route);
  }

  ngOnInit(): void {
    this.fetchMobileStatus();
    this.mobilePollInterval = setInterval(() => this.fetchMobileStatus(), 6000);
  }

  ngOnDestroy(): void {
    if (this.mobilePollInterval) {
      clearInterval(this.mobilePollInterval);
      this.mobilePollInterval = null;
    }
  }

  private async fetchMobileStatus(): Promise<void> {
    try {
      const res = await this.agentApi.getMobileStatus();
      if (res && res.data) {
        this.mobileStatus.set(res.data);
      }
    } catch {
      // Retain previous status
    }
  }

  handleAvatarFallback(e: Event): void {
    (e.target as HTMLImageElement).src =
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><rect width="100%" height="100%" fill="%2300f0ff"/><text x="50%" y="55%" fill="%23000" font-size="12" font-family="sans-serif" font-weight="bold" dominant-baseline="middle" text-anchor="middle">AR</text></svg>';
  }

  cycleTheme(event?: MouseEvent): void {
    if (event?.currentTarget) {
      this.animService.tactileClick(event.currentTarget as HTMLElement);
    }
    const presets = this.themeService.availablePresets;
    const currentId = this.themeService.activeTheme().id;
    const idx = presets.findIndex((p) => p.id === currentId);
    const nextIdx = (idx + 1) % presets.length;
    this.themeService.setPreset(presets[nextIdx].id);
  }

  setMode(mode: UserExperienceMode): void {
    this.stateService.setUserMode(mode);
  }

  toggleVoiceAudio(): void {
    this.speechVoice.toggleMute();
  }

  openConsentModal(): void {
    // Reactive modal automatically bound to safety().consentPending
  }
}
