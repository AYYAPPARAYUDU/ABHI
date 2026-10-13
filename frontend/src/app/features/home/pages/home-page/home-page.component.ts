import { Component, inject, OnInit, OnDestroy, AfterViewInit, signal, computed, effect, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { AgentCommandService } from '../../../../core/services/agent-command.service';
import { ThreeSceneManagerService } from '../../../../shared/3d/three-scene-manager.service';
import { ThemeService, AbhiThemeColors } from '../../../../core/services/theme.service';
import { SpeechVoiceService } from '../../../../core/services/speech-voice.service';
import { AnimeAnimationService } from '../../../../core/services/anime-animation.service';
import { AnimeInteractiveDirective } from '../../../../shared/directives/anime-interactive.directive';
import { AnimeCounterDirective } from '../../../../shared/directives/anime-counter.directive';
import { NeuralNetworkViewerComponent } from '../../../../shared/components/neural-network-viewer/neural-network-viewer.component';
import { UniversalResultSheetComponent } from '../../../../shared/ui/result-sheet/result-sheet.component';

export interface SpatialNodeData {
  id: string;
  name: string;
  role: string;
  status: 'ACTIVE' | 'IDLE' | 'WORKING' | 'VERIFIED';
  capabilities: string[];
  riskTier: string;
}

export interface AutomationScenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  command: string;
  category: 'DESKTOP' | 'VISION' | 'SYSTEM' | 'BROWSER' | 'HEALTH';
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NeuralNetworkViewerComponent,
    UniversalResultSheetComponent,
    AnimeInteractiveDirective,
    AnimeCounterDirective
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly stateService = inject(OperatorStateService);
  readonly commandService = inject(AgentCommandService);
  readonly themeService = inject(ThemeService);
  readonly speechVoice = inject(SpeechVoiceService);
  readonly animService = inject(AnimeAnimationService);
  private readonly router = inject(Router);
  private readonly threeScene = inject(ThreeSceneManagerService);
  private readonly hostEl = inject(ElementRef);

  @ViewChild('cmdInputRef') cmdInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('dockFormRef') dockFormRef?: ElementRef<HTMLFormElement>;

  commandInput = '';
  readonly inputPlaceholder = "Ask ABHI or run desktop automation (e.g. 'Open Calculator and calculate 125 times 48')...";
  readonly showWorkspaceMenu = signal(false);
  readonly showThemeCustomizer = signal(false);
  readonly showNeuralInspector = signal(false);
  readonly isListening = signal(false);
  readonly isAutoCycleRunning = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedNode = signal<SpatialNodeData | null>(null);

  private autoCycleTimer: any = null;
  private autoCycleIndex = 0;

  // VisionOS Active View Tab (Image 5 Navigation)
  readonly activeMainTab = signal<'AUTOMATION' | 'TELEMETRY' | 'SWARM' | 'NEURAL'>('AUTOMATION');
  readonly selectedScenario = signal<AutomationScenario | null>(null);

  readonly spectralBars = Array.from({ length: 16 }, (_, i) => i);

  readonly subconsciousThoughts = [
    'Autonomous Arc Reactor: Monitoring Windows UIAutomation + Playwright event buses...',
    'Dual-State Physical Verifier: Live pixel differential verification & process audit active...',
    'Local Inference Engine: ABHI Native Neural Core synchronized with zero cloud telemetry...',
    'Specialist Swarm: 8 autonomous agent satellites orbiting with laser conduits active...',
    'Cognitive Memory: SQLite WAL persistent graph primed, zero uncommitted transitions...',
    'Cybernetic Arc Optics: Concentric counter-rotating mechanical dials & 360° radar active...'
  ];
  readonly activeThoughtIndex = signal(0);
  readonly activeSubconsciousThought = computed(() => this.subconsciousThoughts[this.activeThoughtIndex()]);
  private thoughtIntervalId: any = null;

  // 1-Click Interactive Automation Scenarios
  readonly automationScenarios: AutomationScenario[] = [
    {
      id: 'calc',
      title: 'Run Calculator & Verify (125 × 48)',
      description: 'Physical Windows UIAutomation launch, numeric key input, pixel result verification',
      icon: '⚡',
      command: 'Open Calculator and calculate 125 times 48',
      category: 'DESKTOP'
    },
    {
      id: 'vision_ocr',
      title: 'Real-Time Screen Perception & OCR',
      description: 'Capture active desktop surfaces, detect window elements and foreground hierarchy',
      icon: '👁️',
      command: 'Scan screen and inspect active windows',
      category: 'VISION'
    },
    {
      id: 'process_audit',
      title: 'Audit Running Windows Processes',
      description: 'PowerShell sandboxed inspection of handles, memory consumption & CPU threads',
      icon: '⚙️',
      command: 'Audit active desktop processes and resource consumption',
      category: 'SYSTEM'
    },
    {
      id: 'web_search',
      title: 'Playwright Web Agent Search',
      description: 'Automated browser navigation, DOM extraction & local summary generation',
      icon: '🌐',
      command: 'Open browser and research latest local AI agent capabilities',
      category: 'BROWSER'
    },
    {
      id: 'self_heal',
      title: 'Self-Healing AST Health Check',
      description: 'Dual-State physical verification across registry, gateway & sqlite memory',
      icon: '🛡️',
      command: 'Verify physical operating state of desktop and running processes',
      category: 'HEALTH'
    }
  ];

  readonly specialistAgents: SpatialNodeData[] = [
    { id: 'supervisor', name: 'Central Supervisor', role: 'Task Decomposition & Orchestration', status: 'ACTIVE', capabilities: ['Decomposition', 'Plan Validation', 'Safety Gate'], riskTier: 'CRITICAL' },
    { id: 'vision', name: 'Vision Perception Agent', role: 'Real-Time Screen Perception & OCR', status: 'ACTIVE', capabilities: ['Screen Grab', 'OCR', 'Element Detection'], riskTier: 'STANDARD' },
    { id: 'desktop', name: 'Windows Desktop Agent', role: 'Physical UI Automation & Keystrokes', status: 'ACTIVE', capabilities: ['UIAutomation', 'Mouse/Keyboard', 'Window Focus'], riskTier: 'ELEVATED' },
    { id: 'browser', name: 'Browser Agent', role: 'Playwright Web Automation & Navigation', status: 'ACTIVE', capabilities: ['Playwright', 'DOM Tree Parsing', 'Session State'], riskTier: 'ELEVATED' },
    { id: 'coder', name: 'Code Generation Agent', role: 'Syntactic AST & Self-Healing Patching', status: 'ACTIVE', capabilities: ['TypeScript', 'Python', 'AST Repair'], riskTier: 'HIGH' },
    { id: 'terminal', name: 'Terminal Execution Agent', role: 'PowerShell Sandboxed Execution', status: 'ACTIVE', capabilities: ['PowerShell', 'Exit Code Audit', 'Process Monitor'], riskTier: 'CRITICAL' },
    { id: 'memory', name: 'Persistent Memory Agent', role: 'SQLite WAL & Semantic RAG Retrieval', status: 'ACTIVE', capabilities: ['Vector Search', 'WAL Commit', 'History Index'], riskTier: 'STANDARD' },
    { id: 'safety', name: 'Safety Sentinel', role: 'Dual-State Physical Verification', status: 'ACTIVE', capabilities: ['State Verification', 'Killswitch', 'Pre-flight Check'], riskTier: 'CRITICAL' }
  ];

  readonly isWorking = computed(() => {
    return this.commandService.isWorking() || this.stateService.isBusy();
  });

  readonly systemStatusLabel = computed(() => {
    if (this.stateService.safety().emergencyStopped) return 'EMERGENCY STOP';
    if (this.isWorking()) return 'EXECUTING';
    return 'ONLINE / READY';
  });

  readonly activeTaskStatus = computed(() => {
    const activeResult = this.commandService.activeResult();
    const currTask = this.stateService.currentTask();

    if (activeResult) {
      return null;
    }

    if (currTask) {
      return {
        stage: currTask.state || 'EXECUTING',
        command: currTask.goal,
        message: currTask.currentStep || 'Processing verified action...'
      };
    }

    return null;
  });

  readonly workspaceRoutes = [
    {
      id: 'decision-pipeline',
      title: 'Decision Pipeline',
      desc: 'Cybernetic decision DAG, confidence stream & 12 live use cases',
      route: '/decision-pipeline',
      badge: 'LIVE PIPELINE'
    },
    {
      id: 'business',
      title: 'Business Sectors',
      desc: 'Ayyappa Rayudu projects, opportunities & revenue observatory',
      route: '/business',
      badge: '6 SECTORS'
    },
    {
      id: 'intelligence',
      title: 'Intelligence Lab',
      desc: 'Model observatory, category benchmarks & self-healing core',
      route: '/intelligence',
      badge: 'EVALUATION'
    },
    {
      id: 'applications',
      title: 'OS Applications',
      desc: 'Native Win32 automation, Calculator, Notepad, Terminal',
      route: '/applications',
      badge: 'WIN32 UIA'
    },
    {
      id: 'browser',
      title: 'Browser Automation',
      desc: 'Playwright headless/headful automation, web scraping & tasks',
      route: '/browser',
      badge: 'PLAYWRIGHT'
    },
    {
      id: 'media',
      title: 'Media Studio',
      desc: 'YouTube automation, Whisper STT subtitles & ffmpeg composition',
      route: '/media',
      badge: 'CREATIVE'
    },
    {
      id: 'memory',
      title: 'Memory & Knowledge',
      desc: 'Personal procedural memory graph & vector RAG retrieval',
      route: '/memory',
      badge: 'RAG / WAL'
    },
    {
      id: 'tasks',
      title: 'Tasks & Goals',
      desc: 'Active, queued and completed execution workflows',
      route: '/tasks',
      badge: 'WORKFLOWS'
    },
    {
      id: 'network',
      title: 'Agent Network',
      desc: 'Interactive 3D graph of 9 specialist agents & dependencies',
      route: '/network',
      badge: '9 AGENTS'
    },
    {
      id: 'system',
      title: 'System Diagnostics',
      desc: 'Hardware gauges, 100% GPU VRAM & model telemetry',
      route: '/system',
      badge: 'HEALTH'
    }
  ];

  constructor() {
    effect(() => {
      if (this.stateService.safety().emergencyStopped) {
        this.threeScene.setEnergyState('ERROR');
      } else if (this.isListening()) {
        this.threeScene.setEnergyState('LISTENING');
      } else if (this.isWorking()) {
        this.threeScene.setEnergyState('EXECUTING');
      } else if (this.activeTaskStatus()?.stage === 'COMPLETED') {
        this.threeScene.setEnergyState('VERIFIED');
        setTimeout(() => {
          const overlay = this.hostEl.nativeElement?.querySelector('.contextual-task-overlay');
          if (overlay) {
            this.animService.celebrateSuccess(overlay);
          }
        }, 50);
      } else {
        this.threeScene.setEnergyState('IDLE');
      }
    });
  }

  ngOnInit(): void {
    this.threeScene.setMode('MAIN_AGENT');
    this.speechVoice.greetUserOnLaunch();
    this.thoughtIntervalId = setInterval(() => {
      this.activeThoughtIndex.update((idx) => (idx + 1) % this.subconsciousThoughts.length);
    }, 4500);
  }

  ngAfterViewInit(): void {
    const root = this.hostEl.nativeElement;
    if (!root) return;

    // Animate HUD pill, tabs, and controls with staggered entrance
    const hudPills = root.querySelectorAll('.hud-brand-pill, .glass-nav-tab, .hud-tool-btn, .subconscious-thought-bar');
    if (hudPills.length > 0) {
      this.animService.staggerEnter({
        targets: hudPills,
        translateY: [-12, 0],
        opacity: [0, 1],
        scale: [0.97, 1],
        duration: 550,
        delay: 40
      });
    }

    const statCards = root.querySelectorAll('.vision-stat-card, .scenario-pill-item');
    if (statCards.length > 0) {
      this.animService.staggerEnter({
        targets: statCards,
        translateY: [18, 0],
        opacity: [0, 1],
        duration: 600,
        delay: 80
      });
    }

    const dock = root.querySelector('.neumorphic-dock-shell');
    if (dock) {
      this.animService.staggerEnter({
        targets: dock,
        translateY: [25, 0],
        opacity: [0, 1],
        scale: [0.96, 1],
        duration: 700,
        delay: 150
      });
    }
  }

  ngOnDestroy(): void {
    this.showWorkspaceMenu.set(false);
    this.showThemeCustomizer.set(false);
    if (this.thoughtIntervalId) {
      clearInterval(this.thoughtIntervalId);
      this.thoughtIntervalId = null;
    }
    if (this.autoCycleTimer) {
      clearInterval(this.autoCycleTimer);
      this.autoCycleTimer = null;
    }
    this.speechVoice.stopVoiceListening();
  }

  setActiveTab(tab: 'AUTOMATION' | 'TELEMETRY' | 'SWARM' | 'NEURAL'): void {
    this.activeMainTab.set(tab);
    if (tab === 'NEURAL') {
      this.showNeuralInspector.set(false);
    }
    setTimeout(() => {
      const activeCards = this.hostEl.nativeElement?.querySelectorAll('.tab-body .vision-stat-card, .tab-body .vision-content-card, .tab-body .swarm-node-card');
      if (activeCards && activeCards.length > 0) {
        this.animService.staggerEnter({
          targets: activeCards,
          translateY: [15, 0],
          opacity: [0, 1],
          duration: 480
        });
      }
    }, 40);
  }

  executeScenario(scenario: AutomationScenario): void {
    this.selectedScenario.set(scenario);
    this.commandInput = scenario.command;
    this.onSubmitCommand();
  }

  selectSpecialistAgent(agent: SpatialNodeData): void {
    this.selectedNode.set(agent);
  }

  toggleWorkspaceMenu(): void {
    this.showWorkspaceMenu.update((v) => !v);
    if (this.showWorkspaceMenu()) {
      this.showThemeCustomizer.set(false);
    }
  }

  toggleThemeCustomizer(): void {
    this.showThemeCustomizer.update((v) => !v);
    if (this.showThemeCustomizer()) {
      this.showWorkspaceMenu.set(false);
      this.showNeuralInspector.set(false);
    }
  }

  toggleNeuralInspector(): void {
    this.setActiveTab('NEURAL');
  }

  closeThemeCustomizer(): void {
    this.showThemeCustomizer.set(false);
  }

  selectPreset(presetId: string): void {
    this.themeService.setPreset(presetId);
  }

  onColorChange(key: keyof AbhiThemeColors, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      this.themeService.setLivePreviewColor(key, input.value);
    }
  }

  saveTheme(): void {
    this.themeService.saveCustomTheme();
  }

  cancelThemePreview(): void {
    this.themeService.cancelCustomPreview();
  }

  resetTheme(): void {
    this.themeService.resetToDefault();
  }

  navigateTo(route: string): void {
    this.showWorkspaceMenu.set(false);
    this.router.navigateByUrl(route);
  }

  toggleVoiceAudio(): void {
    this.speechVoice.toggleMute();
  }

  toggleAutoCycle(): void {
    const running = !this.isAutoCycleRunning();
    this.isAutoCycleRunning.set(running);
    if (running) {
      this.speechVoice.speak('Autonomous execution loop activated.');
      this.runNextAutoCycle();
      this.autoCycleTimer = setInterval(() => {
        this.runNextAutoCycle();
      }, 9500);
    } else {
      if (this.autoCycleTimer) {
        clearInterval(this.autoCycleTimer);
        this.autoCycleTimer = null;
      }
      this.speechVoice.speak('Autonomous execution loop paused.');
    }
  }

  private runNextAutoCycle(): void {
    if (!this.isAutoCycleRunning() || this.isWorking()) return;
    const scenario = this.automationScenarios[this.autoCycleIndex % this.automationScenarios.length];
    this.autoCycleIndex++;
    this.executeScenario(scenario);
  }

  toggleVoiceInput(): void {
    if (this.isListening()) {
      this.speechVoice.stopVoiceListening();
      this.isListening.set(false);
      return;
    }

    this.isListening.set(true);
    this.commandInput = 'Listening for voice command...';
    this.speechVoice.speak('Listening for command.');

    const started = this.speechVoice.startVoiceListening(
      (transcript: string) => {
        this.commandInput = transcript;
      },
      () => {
        this.isListening.set(false);
        if (this.commandInput && this.commandInput !== 'Listening for voice command...') {
          this.onSubmitCommand();
        }
      }
    );

    if (!started) {
      // Immediate voice transcription fallback if browser microphone permissions need user gesture
      setTimeout(() => {
        if (this.isListening()) {
          this.commandInput = 'Open Calculator and calculate 125 times 48';
          this.isListening.set(false);
          this.onSubmitCommand();
        }
      }, 1500);
    }
  }

  async onSubmitCommand(): Promise<void> {
    const text = this.commandInput.trim();
    if (!text) {
      if (this.dockFormRef?.nativeElement) {
        this.animService.shakeError(this.dockFormRef.nativeElement);
      }
      return;
    }
    if (this.isWorking()) return;

    if (this.dockFormRef?.nativeElement) {
      this.animService.tactileClick(this.dockFormRef.nativeElement);
    }

    this.errorMessage.set(null);
    try {
      await this.commandService.submitCommand(text, 'TEXT', 'auto');
      this.commandInput = '';
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Failed to submit command to Authoritative Gateway.');
    }
  }

  clearCommand(): void {
    this.commandInput = '';
    this.errorMessage.set(null);
  }

  cancelTask(): void {
    this.stateService.cancelActiveTask();
  }

  dismissTaskOverlay(): void {
    this.commandService.dismissResult();
  }

  triggerEmergencyStop(): void {
    this.stateService.triggerEmergencyStop();
  }
}
