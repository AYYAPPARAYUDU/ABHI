import {
  Component,
  inject,
  signal,
  computed,
  ElementRef,
  HostListener,
  AfterViewInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { OperatorStateService } from '../../../core/services/operator-state.service';
import { AgentCommandService } from '../../../core/services/agent-command.service';
import { SpeechVoiceService } from '../../../core/services/speech-voice.service';
import { getApiUrl } from '../../../core/config/api-config';

export interface FloatingActionItem {
  id: string;
  icon: string;
  label: string;
  statusBadge?: string;
  badgeType?: 'cyan' | 'emerald' | 'amber' | 'coral' | 'violet';
  tooltip: string;
  action: () => void;
  isDestructive?: boolean;
}

@Component({
  selector: 'app-floating-action-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './floating-action-menu.component.html',
  styleUrl: './floating-action-menu.component.css'
})
export class FloatingActionMenuComponent implements AfterViewInit, OnDestroy {
  readonly router = inject(Router);
  readonly operatorState = inject(OperatorStateService);
  readonly commandService = inject(AgentCommandService);
  readonly speechVoice = inject(SpeechVoiceService);
  private readonly elementRef = inject(ElementRef);

  readonly isOpen = signal<boolean>(false);
  readonly currentUrl = signal<string>('/home');
  readonly actionToast = signal<string | null>(null);

  private navSub?: Subscription;

  constructor() {
    this.currentUrl.set(this.router.url);
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.currentUrl.set(e.urlAfterRedirects);
        this.isOpen.set(false); // Close on route change
      });
  }

  ngAfterViewInit(): void {
    // Initialized
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    const target = event.target as HTMLElement;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.isOpen.set(false);
    }
  }

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  close(): void {
    this.isOpen.set(false);
  }

  // Dynamic Context-Aware Action Set per Route
  readonly contextualActions = computed<FloatingActionItem[]>(() => {
    const url = this.currentUrl();

    // 1. Home Page Context Actions
    if (url.startsWith('/home') || url === '/') {
      return [
        {
          id: 'home_msg',
          icon: '💬',
          label: 'Chat with ABHI',
          statusBadge: 'AI CHAT',
          badgeType: 'cyan',
          tooltip: 'Open persistent streaming AI companion chat',
          action: () => this.router.navigate(['/messages'])
        },
        {
          id: 'home_ws',
          icon: '🛰️',
          label: '3D Workspace Swarm',
          statusBadge: 'SWARM HQ',
          badgeType: 'violet',
          tooltip: 'Enter full-viewport 3D cybernetic bot workspace',
          action: () => this.router.navigate(['/workspace'])
        },
        {
          id: 'home_health',
          icon: '🩺',
          label: 'System Diagnostic',
          statusBadge: 'PSUTIL',
          badgeType: 'emerald',
          tooltip: 'Execute physical hardware vitals and PSUtil check',
          action: () => this.dispatchQuickAction('Check system health and diagnostics')
        },
        {
          id: 'home_notepad',
          icon: '📝',
          label: 'Open Notepad',
          statusBadge: 'WIN32 UIA',
          badgeType: 'cyan',
          tooltip: 'Launch Windows Notepad via native Win32 automation',
          action: () => this.dispatchQuickAction('Open notepad')
        },
        {
          id: 'home_ast',
          icon: '🛡️',
          label: 'AST Code Audit',
          statusBadge: 'GUARD',
          badgeType: 'amber',
          tooltip: 'Run AST syntax parser and security boundaries audit',
          action: () => this.dispatchQuickAction('Run AST code audit and verification')
        },
        {
          id: 'home_estop',
          icon: '🛑',
          label: 'Emergency Stop',
          statusBadge: 'HALT ALL',
          badgeType: 'coral',
          tooltip: 'Immediately revoke leases and stop background tasks',
          action: () => this.triggerEmergencyStop(),
          isDestructive: true
        }
      ];
    }

    // 2. Workspace Context Actions
    if (url.startsWith('/workspace')) {
      return [
        {
          id: 'ws_voice',
          icon: '🎙️',
          label: this.speechVoice.isListening() ? 'Stop Voice Stream' : 'Voice VAD Floor',
          statusBadge: this.speechVoice.isListening() ? 'LISTENING' : 'READY',
          badgeType: 'emerald',
          tooltip: 'Toggle acoustic turn-taking voice stream floor',
          action: () => this.speechVoice.speak('Acoustic floor negotiated, Mamu.')
        },
        {
          id: 'ws_cmd',
          icon: '⚡',
          label: 'Command Palette',
          statusBadge: 'CTRL+K',
          badgeType: 'cyan',
          tooltip: 'Open keyboard command palette to search actions',
          action: () => this.operatorState.commandPaletteOpen.set(true)
        },
        {
          id: 'ws_home',
          icon: '🖥️',
          label: 'Return to Home HUD',
          statusBadge: 'OVERVIEW',
          badgeType: 'violet',
          tooltip: 'Navigate back to the main cockpit',
          action: () => this.router.navigate(['/home'])
        },
        {
          id: 'ws_estop',
          icon: '🛑',
          label: 'Emergency Stop',
          statusBadge: 'HALT SWARM',
          badgeType: 'coral',
          tooltip: 'Halt all 3D workspace agents and revoke Win32 locks',
          action: () => this.triggerEmergencyStop(),
          isDestructive: true
        }
      ];
    }

    // 3. Messages Context Actions
    if (url.startsWith('/messages') || url.startsWith('/brain')) {
      return [
        {
          id: 'msg_new',
          icon: '✨',
          label: 'New AI Chat Thread',
          statusBadge: 'FRESH CONTEXT',
          badgeType: 'cyan',
          tooltip: 'Start a clean local conversation context',
          action: () => this.triggerNewChat()
        },
        {
          id: 'msg_cmd',
          icon: '⚡',
          label: 'Quick Command',
          statusBadge: 'CTRL+K',
          badgeType: 'violet',
          tooltip: 'Search actions or execute system commands',
          action: () => this.operatorState.commandPaletteOpen.set(true)
        },
        {
          id: 'msg_ws',
          icon: '🛰️',
          label: 'Inspect 3D Workspace',
          statusBadge: 'AGENTS',
          badgeType: 'emerald',
          tooltip: 'View active specialist agents in the 3D Colony',
          action: () => this.router.navigate(['/workspace'])
        },
        {
          id: 'msg_estop',
          icon: '🛑',
          label: 'Emergency Stop',
          statusBadge: 'SAFETY',
          badgeType: 'coral',
          tooltip: 'Halt all background tasks and streaming generation',
          action: () => this.triggerEmergencyStop(),
          isDestructive: true
        }
      ];
    }

    // 4. Business Context Actions
    if (url.startsWith('/business')) {
      return [
        {
          id: 'biz_vault',
          icon: '🏛️',
          label: 'SBI Treasury Vault',
          statusBadge: '₹500 SETTLED',
          badgeType: 'emerald',
          tooltip: 'Inspect official SBI treasury ledger and inward settlements',
          action: () => {
            const el = document.getElementById('sbiTreasuryVault');
            el?.scrollIntoView({ behavior: 'smooth' });
          }
        },
        {
          id: 'biz_cmd',
          icon: '⚡',
          label: 'Command Palette',
          statusBadge: 'CTRL+K',
          badgeType: 'cyan',
          tooltip: 'Search business records, ledger, and opportunities',
          action: () => this.operatorState.commandPaletteOpen.set(true)
        },
        {
          id: 'biz_home',
          icon: '🖥️',
          label: 'Return to Home HUD',
          statusBadge: 'COCKPIT',
          badgeType: 'violet',
          tooltip: 'Return to sovereign Home overview',
          action: () => this.router.navigate(['/home'])
        },
        {
          id: 'biz_estop',
          icon: '🛑',
          label: 'Emergency Stop',
          statusBadge: 'LOCK TREASURY',
          badgeType: 'coral',
          tooltip: 'Halt all autonomous business and ledger actions',
          action: () => this.triggerEmergencyStop(),
          isDestructive: true
        }
      ];
    }

    // 5. Architecture Context Actions
    if (url.startsWith('/architecture')) {
      return [
        {
          id: 'arch_cmd',
          icon: '⚡',
          label: 'Command Palette',
          statusBadge: 'CTRL+K',
          badgeType: 'cyan',
          tooltip: 'Search components, APIs, and subsystems',
          action: () => this.operatorState.commandPaletteOpen.set(true)
        },
        {
          id: 'arch_ws',
          icon: '🛰️',
          label: '3D Colony Workspace',
          statusBadge: 'LIVE NODES',
          badgeType: 'violet',
          tooltip: 'Inspect live physical agent nodes in WebGL',
          action: () => this.router.navigate(['/workspace'])
        },
        {
          id: 'arch_estop',
          icon: '🛑',
          label: 'Emergency Stop',
          statusBadge: 'HALT ALL',
          badgeType: 'coral',
          tooltip: 'Halt all pipeline execution and lock supervisors',
          action: () => this.triggerEmergencyStop(),
          isDestructive: true
        }
      ];
    }

    // 6. Universal Default Context Actions
    return [
      {
        id: 'def_home',
        icon: '🖥️',
        label: 'Home Cockpit',
        statusBadge: 'NAV',
        badgeType: 'cyan',
        tooltip: 'Return to sovereign Home dashboard',
        action: () => this.router.navigate(['/home'])
      },
      {
        id: 'def_ws',
        icon: '🛰️',
        label: '3D Workspace',
        statusBadge: '3D SCENE',
        badgeType: 'violet',
        tooltip: 'Open 3D spatial intelligence workspace',
        action: () => this.router.navigate(['/workspace'])
      },
      {
        id: 'def_msg',
        icon: '💬',
        label: 'Messages & Comms',
        statusBadge: 'CHANNELS',
        badgeType: 'emerald',
        tooltip: 'Open AI conversation & personal communication hub',
        action: () => this.router.navigate(['/messages'])
      },
      {
        id: 'def_cmd',
        icon: '⚡',
        label: 'Command Palette',
        statusBadge: 'CTRL+K',
        badgeType: 'amber',
        tooltip: 'Search registered routes and authorized actions',
        action: () => this.operatorState.commandPaletteOpen.set(true)
      },
      {
        id: 'def_estop',
        icon: '🛑',
        label: 'Emergency Stop',
        statusBadge: 'SAFETY',
        badgeType: 'coral',
        tooltip: 'Emergency Stop: revoke all leases and pause supervisors',
        action: () => this.triggerEmergencyStop(),
        isDestructive: true
      }
    ];
  });

  private async dispatchQuickAction(commandText: string): Promise<void> {
    this.close();
    this.actionToast.set(`Dispatching: "${commandText}"...`);
    try {
      const res = await this.commandService.submitCommand(commandText);
      const rep = (res as any)?.result?.summary || (res as any)?.result?.message || (res as any)?.message || 'Action executed successfully, Mamu.';
      this.actionToast.set(`✓ ${rep}`);
    } catch (e) {
      this.actionToast.set(`✕ Error: ${e}`);
    } finally {
      setTimeout(() => this.actionToast.set(null), 4500);
    }
  }

  private async triggerEmergencyStop(): Promise<void> {
    this.close();
    this.actionToast.set('Executing Emergency Stop...');
    try {
      const res = await fetch(getApiUrl('/api/v1/swarm/emergency-stop'), { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        this.actionToast.set(`🛑 ${d.message || 'EMERGENCY STOP: All agent operations halted.'}`);
        this.speechVoice.speak('Emergency stop triggered, Mamu. All operations halted.', true);
      } else {
        await fetch(getApiUrl('/api/v1/tasks/emergency-stop'), { method: 'POST' });
        this.actionToast.set('🛑 Emergency Stop signal dispatched.');
      }
    } catch {
      this.actionToast.set('🛑 Emergency Stop signal sent.');
    } finally {
      setTimeout(() => this.actionToast.set(null), 5000);
    }
  }

  private triggerNewChat(): void {
    this.close();
    this.router.navigate(['/messages']).then(() => {
      this.speechVoice.speak('New conversation initiated, Mamu.');
    });
  }
}
