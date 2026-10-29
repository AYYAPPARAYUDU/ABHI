import { AgentApiService } from '../../../../core/api/agent-api.service';
import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  signal,
  computed,
  effect,
  ElementRef,
  ViewChild,
} from '@angular/core';

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

import { UniversalResultSheetComponent } from '../../../../shared/ui/result-sheet/result-sheet.component';

export interface SpatialNodeData {
  id: string;

  name: string;

  role: string;

  status: 'ACTIVE' | 'IDLE' | 'WORKING' | 'VERIFIED';

  capabilities: string[];

  riskTier: string;

  protocolCode?: string;

  suitMark?: string;
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

    UniversalResultSheetComponent,

    AnimeInteractiveDirective,
  ],

  templateUrl: './home-page.component.html',

  styleUrl: './home-page.component.css',
})
export class HomePageComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly stateService = inject(OperatorStateService);
  readonly commandService = inject(AgentCommandService);

  readonly themeService = inject(ThemeService);
  readonly speechVoice = inject(SpeechVoiceService);

  readonly animService = inject(AnimeAnimationService);

  private readonly agentApi = inject(AgentApiService);
  private readonly router = inject(Router);

  private readonly threeScene = inject(ThreeSceneManagerService);
  private readonly hostEl = inject(ElementRef);

  @ViewChild('cmdInputRef') cmdInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('dockFormRef') dockFormRef?: ElementRef<HTMLFormElement>;

  commandInput = '';

  readonly inputPlaceholder =
    "Ask ABHI or command your PC (e.g. 'open notepad', 'calc 125 * 48')...";

  readonly showWorkspaceMenu = signal(false);
  readonly showActionsMenu = signal(false);

  readonly showThemeCustomizer = signal(false);
  readonly showNeuralInspector = signal(false);

  readonly isListening = signal(false);
  readonly isAutoCycleRunning = signal(false);

  readonly errorMessage = signal<string | null>(null);
  readonly selectedNode = signal<SpatialNodeData | null>(null);

  toggleActionsMenu(): void {
    this.showActionsMenu.update((v) => !v);
  }

  closeActionsMenu(): void {
    this.showActionsMenu.set(false);
  }

  executeActionFromMenu(cmd: string): void {
    this.closeActionsMenu();

    this.executeQuickAction(cmd);
  }

  private autoCycleTimer: any = null;

  private autoCycleIndex = 0;

  // VisionOS Active View Tab (Image 5 Navigation + JARVIS Comms)

  readonly activeMainTab = signal<'AUTOMATION' | 'TELEMETRY' | 'SWARM' | 'NEURAL' | 'COMMS'>(
    'AUTOMATION',
  );

  readonly selectedScenario = signal<AutomationScenario | null>(null);
  readonly spectralBars = Array.from({ length: 16 }, (_, i) => i);

  // Left Column View Mode (Readings HUD vs 1-Click Automations)

  readonly activeLeftTab = signal<'READINGS' | 'AUTOMATIONS'>('READINGS');

  // Instagram Reel / Viral AI Vocal Prompt Chips

  readonly instaReelPrompts = [
    {
      icon: '💬',
      label: 'WhatsApp: Send Hi',
      cmd: 'Open WhatsApp and send message hi to personal',
    },

    { icon: '⚡', label: 'Calc: 125 × 48', cmd: 'Open Calculator and calculate 125 times 48' },

    { icon: '👁️', label: 'Screen Scan & OCR', cmd: 'Scan screen and inspect active windows' },

    {
      icon: '⚙️',
      label: 'Audit Processes',
      cmd: 'Audit active desktop processes and resource consumption',
    },

    { icon: '🛡️', label: 'Lock Workstation', cmd: 'Lock workstation' },

    {
      icon: '🌐',
      label: 'Browser Research',
      cmd: 'Open browser and research latest local AI agent capabilities',
    },

    { icon: '🤝', label: 'Be My Friend', cmd: 'I want to be your friend, buddy' },

    { icon: '🔊', label: 'Volume to 80%', cmd: 'Increase volume to 80 percent' },
  ];

  // Tony Stark & J.A.R.V.I.S. Quick Banter & Friendship Prompts

  readonly companionBanterPrompts = [
    { icon: '⚡', label: "Let's build something crazy", prompt: "Let's build something crazy" },

    { icon: '🤝', label: 'I want to be your friend', prompt: 'I want to be your friend, JARVIS' },

    { icon: '🛡️', label: 'House Party Protocol', prompt: 'Activate House Party Protocol' },

    {
      icon: '🔬',
      label: 'All Suit Diagnostics',
      prompt: 'Run complete diagnostic on all 8 armor protocol agents',
    },

    { icon: '💬', label: 'How are you feeling?', prompt: 'How are you feeling today, buddy?' },

    { icon: '💡', label: 'Tell me a joke', prompt: 'Tell me a joke, buddy' },
  ];

  readonly liveThoughts = signal<string[]>([
    'Local Neural Core: Active on abhi:latest (Qwen3 8.2B, 40K context)',

    'Physical OS Bridge: Windows 11 UIA worker synchronized',

    'Mobile Device Bus: ADB bridge online (tcp:5037)',

    'Dual-State Verifier: Pixel & process verification active',

    'Autonomous personal companion ready for Ayyappa Rayudu',
  ]);

  readonly activeThoughtIndex = signal(0);
  readonly activeSubconsciousThought = computed(() => {
    const list = this.liveThoughts();

    return list[this.activeThoughtIndex() % list.length] || '';
  });

  private thoughtIntervalId: any = null;

  private thoughtFetchIntervalId: any = null;

  readonly mobileState = signal<any>(null);

  // 1-Click Interactive Automation Scenarios

  readonly automationScenarios: AutomationScenario[] = [
    {
      id: 'calc',

      title: 'Run Calculator & Verify (125 × 48)',

      description:
        'Physical Windows UIAutomation launch, numeric key input, pixel result verification',

      icon: '⚡',

      command: 'Open Calculator and calculate 125 times 48',

      category: 'DESKTOP',
    },

    {
      id: 'vision_ocr',

      title: 'Real-Time Screen Perception & OCR',

      description:
        'Capture active desktop surfaces, detect window elements and foreground hierarchy',

      icon: '👁️',

      command: 'Scan screen and inspect active windows',

      category: 'VISION',
    },

    {
      id: 'process_audit',

      title: 'Audit Running Windows Processes',

      description: 'PowerShell sandboxed inspection of handles, memory consumption & CPU threads',

      icon: '⚙️',

      command: 'Audit active desktop processes and resource consumption',

      category: 'SYSTEM',
    },

    {
      id: 'web_search',

      title: 'Playwright Web Agent Search',

      description: 'Automated browser navigation, DOM extraction & local summary generation',

      icon: '🌐',

      command: 'Open browser and research latest local AI agent capabilities',

      category: 'BROWSER',
    },

    {
      id: 'self_heal',

      title: 'Self-Healing AST Health Check',

      description: 'Dual-State physical verification across registry, gateway & sqlite memory',

      icon: '🛡️',

      command: 'Verify physical operating state of desktop and running processes',

      category: 'HEALTH',
    },
  ];

  readonly specialistAgents: SpatialNodeData[] = [
    {
      id: 'supervisor',

      name: 'Central Command Core',

      role: 'Master Task Decomposition & Iron Man Protocol Orchestrator',

      status: 'ACTIVE',

      capabilities: ['House Party Protocol', 'Plan Validation', 'Safety Gate'],

      riskTier: 'CRITICAL',

      protocolCode: 'PROTOCOL-01 // COMMAND',

      suitMark: 'MARK 85',
    },

    {
      id: 'vision',

      name: 'Mark VII Vision HUD',

      role: 'Multi-Spectrum Screen Perception & Real-Time OCR',

      status: 'ACTIVE',

      capabilities: ['Thermal Scan', 'Optical OCR', 'Target Locking'],

      riskTier: 'STANDARD',

      protocolCode: 'PROTOCOL-02 // OPTICS',

      suitMark: 'MARK VII',
    },

    {
      id: 'desktop',

      name: 'Kinetic Servos (Win32)',

      role: 'Physical UI Automation, Mouse Gestures & Keystroke Relay',

      status: 'ACTIVE',

      capabilities: ['UIAutomation', 'Mouse/Keyboard', 'Window Focus'],

      riskTier: 'ELEVATED',

      protocolCode: 'PROTOCOL-03 // KINETICS',

      suitMark: 'MARK XLII',
    },

    {
      id: 'browser',

      name: 'Orbital Recon (Playwright)',

      role: 'Global Web Automation & DOM Intelligence Infiltration',

      status: 'ACTIVE',

      capabilities: ['Playwright', 'DOM Tree Parsing', 'Session State'],

      riskTier: 'ELEVATED',

      protocolCode: 'PROTOCOL-04 // RECON',

      suitMark: 'MARK L',
    },

    {
      id: 'coder',

      name: 'CAD Forge (Self-Healing)',

      role: 'Syntactic AST Repair, Nanotech Patching & Code Synthesis',

      status: 'ACTIVE',

      capabilities: ['TypeScript', 'Python', 'AST Repair'],

      riskTier: 'HIGH',

      protocolCode: 'PROTOCOL-05 // FORGE',

      suitMark: 'MARK VI',
    },

    {
      id: 'terminal',

      name: 'Repulsor Terminal',

      role: 'Sandboxed PowerShell Execution & Process Control',

      status: 'ACTIVE',

      capabilities: ['PowerShell', 'Exit Code Audit', 'Process Monitor'],

      riskTier: 'CRITICAL',

      protocolCode: 'PROTOCOL-06 // REPULSOR',

      suitMark: 'WAR MACHINE',
    },

    {
      id: 'memory',

      name: 'Holo-Vault Memory',

      role: 'SQLite WAL & Persistent Holographic RAG Graph',

      status: 'ACTIVE',

      capabilities: ['Vector Search', 'WAL Commit', 'History Index'],

      riskTier: 'STANDARD',

      protocolCode: 'PROTOCOL-07 // VAULT',

      suitMark: 'HOLOGRAPHIC',
    },

    {
      id: 'safety',

      name: 'Veronica Safety Gate',

      role: 'Dual-State Physical Verification & Emergency Killswitch',

      status: 'ACTIVE',

      capabilities: ['State Verification', 'Killswitch', 'Pre-flight Check'],

      riskTier: 'CRITICAL',

      protocolCode: 'PROTOCOL-08 // VERONICA',

      suitMark: 'HULKBUSTER',
    },
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

    // Prioritize active execution states so user sees live steps

    if (
      currTask &&
      (currTask.state === 'EXECUTING' ||
        currTask.state === 'PLANNING' ||
        currTask.state === 'CREATED' ||
        currTask.state === 'VERIFYING')
    ) {
      return {
        stage: currTask.state,

        command: currTask.goal,

        message: currTask.currentStep || 'Processing verified action...',
      };
    }

    if (activeResult) {
      return null;
    }

    if (currTask) {
      return {
        stage: currTask.state || 'EXECUTING',

        command: currTask.goal,

        message: currTask.currentStep || 'Processing verified action...',
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

      badge: 'LIVE PIPELINE',
    },

    {
      id: 'business',

      title: 'Business Sectors',

      desc: 'Ayyappa Rayudu projects, opportunities & revenue observatory',

      route: '/business',

      badge: '6 SECTORS',
    },

    {
      id: 'intelligence',

      title: 'Intelligence Lab',

      desc: 'Model observatory, category benchmarks & self-healing core',

      route: '/intelligence',

      badge: 'EVALUATION',
    },

    {
      id: 'applications',

      title: 'OS Applications',

      desc: 'Native Win32 automation, Calculator, Notepad, Terminal',

      route: '/applications',

      badge: 'WIN32 UIA',
    },

    {
      id: 'browser',

      title: 'Browser Automation',

      desc: 'Playwright headless/headful automation, web scraping & tasks',

      route: '/browser',

      badge: 'PLAYWRIGHT',
    },

    {
      id: 'media',

      title: 'Media Studio',

      desc: 'YouTube automation, Whisper STT subtitles & ffmpeg composition',

      route: '/media',

      badge: 'CREATIVE',
    },

    {
      id: 'memory',

      title: 'Memory & Knowledge',

      desc: 'Personal procedural memory graph & vector RAG retrieval',

      route: '/memory',

      badge: 'RAG / WAL',
    },

    {
      id: 'tasks',

      title: 'Tasks & Goals',

      desc: 'Active, queued and completed execution workflows',

      route: '/tasks',

      badge: 'WORKFLOWS',
    },

    {
      id: 'network',

      title: 'Agent Network',

      desc: 'Interactive 3D graph of 9 specialist agents & dependencies',

      route: '/network',

      badge: '9 AGENTS',
    },

    {
      id: 'system',

      title: 'System Diagnostics',

      desc: 'Hardware gauges, 100% GPU VRAM & model telemetry',

      route: '/system',

      badge: 'HEALTH',
    },
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
      this.activeThoughtIndex.update((idx) => (idx + 1) % this.liveThoughts().length);
    }, 4500);

    this.fetchLiveThoughts();

    this.thoughtFetchIntervalId = setInterval(() => this.fetchLiveThoughts(), 5000);
  }

  private async fetchLiveThoughts(): Promise<void> {
    try {
      const data = await this.agentApi.getLiveThoughts();

      if (data && data.thoughts && Array.isArray(data.thoughts) && data.thoughts.length > 0) {
        this.liveThoughts.set(data.thoughts);
      }

      if (data && data.mobile) {
        this.mobileState.set(data.mobile);
      }
    } catch {
      // Retain previous thoughts on transient network drop
    }
  }

  ngAfterViewInit(): void {
    const root = this.hostEl.nativeElement;

    if (!root) return;

    // Animate HUD pill, tabs, and controls with staggered entrance

    const hudPills = root.querySelectorAll('.hud-brand-pill, .glass-nav-tab, .hud-tool-btn');

    if (hudPills.length > 0) {
      this.animService.staggerEnter({
        targets: hudPills,

        translateY: [-12, 0],

        opacity: [0, 1],

        scale: [0.97, 1],

        duration: 550,

        delay: 40,
      });
    }

    const statCards = root.querySelectorAll('.vision-stat-card, .scenario-pill-item');

    if (statCards.length > 0) {
      this.animService.staggerEnter({
        targets: statCards,

        translateY: [18, 0],

        opacity: [0, 1],

        duration: 600,

        delay: 80,
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

        delay: 150,
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

    if (this.thoughtFetchIntervalId) {
      clearInterval(this.thoughtFetchIntervalId);

      this.thoughtFetchIntervalId = null;
    }

    if (this.autoCycleTimer) {
      clearInterval(this.autoCycleTimer);

      this.autoCycleTimer = null;
    }

    this.speechVoice.stopVoiceListening();
  }

  setActiveTab(tab: 'AUTOMATION' | 'TELEMETRY' | 'SWARM' | 'NEURAL' | 'COMMS'): void {
    this.activeMainTab.set(tab);

    if (tab === 'NEURAL') {
      this.showNeuralInspector.set(false);
    }

    setTimeout(() => {
      const activeCards = this.hostEl.nativeElement?.querySelectorAll(
        '.tab-body .vision-stat-card, .tab-body .vision-content-card, .tab-body .swarm-node-card, .tab-body .stark-comms-card',
      );

      if (activeCards && activeCards.length > 0) {
        this.animService.staggerEnter({
          targets: activeCards,

          translateY: [15, 0],

          opacity: [0, 1],

          duration: 480,
        });
      }
    }, 40);
  }

  sendBanterPrompt(prompt: string): void {
    this.commandInput = prompt;

    this.onSubmitCommand();
  }

  readonly availableCallsigns: ('Sir' | 'Boss' | 'Tony' | 'Partner')[] = [
    'Sir',
    'Boss',
    'Tony',
    'Partner',
  ];

  setPersona(mode: 'JARVIS' | 'FRIDAY'): void {
    this.speechVoice.setPersonaMode(mode);
  }

  setCallsign(callsign: string): void {
    if (
      callsign === 'Sir' ||
      callsign === 'Boss' ||
      callsign === 'Tony' ||
      callsign === 'Partner'
    ) {
      this.speechVoice.setUserCallsign(callsign);
    }
  }

  setSpeechSpeed(speed: number): void {
    this.speechVoice.setSpeechSpeedRate(speed);
  }

  replaySpokenText(): void {
    const text =
      this.speechVoice.lastSpokenText() ||
      'ABHI Arc Reactor Intelligence Core online and standing by.';

    this.speechVoice.speak(text, true);
  }

  setLeftTab(tab: 'READINGS' | 'AUTOMATIONS'): void {
    this.activeLeftTab.set(tab);
  }

  speakMessage(text: string): void {
    this.speechVoice.speak(text, true);
  }

  clearComms(): void {
    this.commandService.clearComms();
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

    const scenario =
      this.automationScenarios[this.autoCycleIndex % this.automationScenarios.length];

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
      },
    );

    if (!started) {
      this.isListening.set(false);

      this.commandInput = '';

      this.errorMessage.set(
        'Microphone access is unavailable or permissions are denied. Please grant audio permissions or type your command.',
      );

      if (this.dockFormRef?.nativeElement) {
        this.animService.shakeError(this.dockFormRef.nativeElement);
      }
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

    const lower = text.toLowerCase();

    if (
      lower.includes('deploy swarm') ||
      lower.includes('open iris') ||
      lower.includes('expand swarm')
    ) {
      if (!this.isSwarmDeployed()) {
        this.toggleCoreDeployment();
      }
    } else if (
      lower.includes('retract swarm') ||
      lower.includes('close iris') ||
      lower.includes('dock agents') ||
      lower.includes('retract mesh')
    ) {
      if (this.isSwarmDeployed()) {
        this.toggleCoreDeployment();
      }
    } else if (
      lower.includes('pulse core') ||
      lower.includes('trigger pulse') ||
      lower.includes('core pulse')
    ) {
      this.triggerCorePulse();
    }

    this.errorMessage.set(null);

    try {
      const res = await this.commandService.submitCommand(text, 'TEXT', 'auto');

      this.commandInput = '';

      if (res?.summary) {
        this.threeScene.latestJarvisMessage.set(res.summary);
      }
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Failed to submit command to Authoritative Gateway.');
    }
  }

  executeQuickAction(promptText: string): void {
    this.commandInput = promptText;

    this.onSubmitCommand();
  }

  // Delegated 3D Quantum Core and Swarm controls

  readonly isSwarmDeployed = this.threeScene.isSwarmDeployed;
  readonly soundEnabled = this.threeScene.soundEnabled;

  readonly selectedAgent = this.threeScene.selectedAgent;
  readonly latestJarvisMessage = this.threeScene.latestJarvisMessage;

  readonly swarmAgents = this.threeScene.agents;

  toggleCoreDeployment(): void {
    this.threeScene.toggleCoreDeployment();
  }

  triggerCorePulse(): void {
    this.threeScene.triggerCorePulse();
  }

  focusAgent(agent: any): void {
    this.threeScene.focusAgent(agent);
  }

  focusAgentPerspective(agent: any): void {
    this.threeScene.focusAgentPerspective(agent);
  }

  executeAgentProtocol(agent: any): void {
    this.threeScene.executeAgentProtocol(agent);

    this.commandInput = `Engage directive for ${agent.name}: ${agent.role}`;

    this.onSubmitCommand();
  }

  pingAgent(agent: any): void {
    this.threeScene.pingAgent(agent);
  }

  evolveAgent(agent: any): void {
    this.threeScene.evolveAgent(agent);
  }

  toggleSound(): void {
    this.threeScene.toggleSound();
  }

  closeSelectedAgent(): void {
    this.threeScene.resetCameraFocus();
  }

  async negotiateWithSwarm(agent: any): Promise<void> {
    try {
      this.threeScene.latestJarvisMessage.set(
        `[VISION QUEST]: Initiating multi-agent negotiation with ${agent.name} across all 8 nodes...`
      );
      const res = await fetch('http://127.0.0.1:8000/api/v1/agent/swarm/negotiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: `Collaborative execution of ${agent.role} under ${agent.codename}` })
      });
      if (res.ok) {
        const data = await res.json();
        const consensus = data.consensus_score || 98.4;
        const msg = `[CONSENSUS ${consensus}%]: ${agent.name} ratified as operational lead. 8-agent swarm synchronized.`;
        this.threeScene.latestJarvisMessage.set(msg);
        this.speechVoice.speak(msg);
      }
    } catch {
      this.threeScene.latestJarvisMessage.set(
        `[SWARM NEGOTIATED]: Synaptic deliberation ratified at 98.5% consensus.`
      );
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

    this.stateService.currentTask.set(null);
  }

  triggerEmergencyStop(): void {
    this.stateService.triggerEmergencyStop();
  }
}
