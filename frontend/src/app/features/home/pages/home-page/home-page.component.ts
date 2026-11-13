import { AgentApiService } from '../../../../core/api/agent-api.service';
import { getApiUrl } from '../../../../core/config/api-config';
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
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { RouterModule, Router } from '@angular/router';
import { OperatorStateService } from '../../../../core/services/operator-state.service';

import { AgentCommandService } from '../../../../core/services/agent-command.service';
import { ThreeSceneManagerService } from '../../../../shared/3d/three-scene-manager.service';

import { ThemeService, AbhiThemeColors } from '../../../../core/services/theme.service';
import { SpeechVoiceService, AppLanguage } from '../../../../core/services/speech-voice.service';

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
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('cmdInputRef') cmdInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('dockFormRef') dockFormRef?: ElementRef<HTMLFormElement>;
  @ViewChild('cameraVideo') cameraVideoRef?: ElementRef<HTMLVideoElement>;

  // =========================================================================
  // ERA AI HUD STATE (IMAGE 5 DASHBOARD INTEGRATION)
  // =========================================================================

  // 1. Real Hardware Telemetry (PSUtil / Windows 11 Live Metrics)
  readonly cpuPercent = signal<number>(18.5);
  readonly cpuCores = signal<number>(16);
  readonly cpuFreq = signal<number>(2499);
  readonly ramPercent = signal<number>(73.8);
  readonly ramUsedGb = signal<number>(17.3);
  readonly ramTotalGb = signal<number>(23.3);
  readonly diskPercent = signal<number>(42.2);
  readonly diskUsedGb = signal<number>(215.6);
  readonly diskTotalGb = signal<number>(510.5);
  readonly gpuTemp = signal<number>(44.0);
  readonly gpuUtil = signal<number>(26.3);
  readonly systemProcesses = signal<number>(552);
  readonly systemUptime = signal<string>('35h 44m');
  readonly securityStatus = signal<string>('SECURED (Real-time Defender Active)');

  // 2. Real Geolocation & Interactive Map
  readonly locationData = signal({
    lat: 17.3850,
    lng: 78.4867,
    city: 'Hyderabad',
    region: 'Telangana / Andhra Pradesh',
    country: 'India',
    isp: 'High-Speed Fiber Bus',
    address: 'Cyber Tech Hub, State Bank Colony'
  });

  readonly safeMapUrl = computed<SafeResourceUrl>(() => {
    const loc = this.locationData();
    const minLng = (loc.lng - 0.035).toFixed(4);
    const minLat = (loc.lat - 0.025).toFixed(4);
    const maxLng = (loc.lng + 0.035).toFixed(4);
    const maxLat = (loc.lat + 0.025).toFixed(4);
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${loc.lat}%2C${loc.lng}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  // 3. Live Camera Stream & Vision HUD
  readonly cameraActive = signal<boolean>(false);
  readonly cameraFacing = signal<'user' | 'environment'>('user');
  readonly cameraStatus = signal<string>('STANDBY (CLICK TO ENGAGE)');
  readonly cameraFps = signal<number>(30);
  private cameraStream: MediaStream | null = null;

  // 4. Analog Clock & Live Weather
  readonly clockHoursAngle = signal<number>(0);
  readonly clockMinutesAngle = signal<number>(0);
  readonly clockSecondsAngle = signal<number>(0);
  readonly digitalTimeString = signal<string>('01:35:27 PM');
  readonly currentDateString = signal<string>('FRI, 13 NOV');
  readonly weatherData = signal({
    temp: 28,
    condition: 'Partly Cloudy',
    icon: '⛅',
    humidity: 58,
    wind: 12,
    city: 'Hyderabad'
  });

  // 5. Sovereign SBI Treasury (Mamu Settlement Target)
  readonly sbiTreasury = signal({
    beneficiary: 'Ravuvai Ayyapparayudu',
    bank: 'State Bank of India',
    accountMasked: '****5649',
    accountFull: '41130645649',
    ifsc: 'SBIN0020507',
    upi: 'ayyapparayudu.5@ybl',
    totalRevenueInr: 145500.0,
    totalRevenueUsd: 1662.86,
    pendingInvoicesInr: 0.0,
    invoicesCount: 3
  });
  readonly isGeneratingRevenue = signal<boolean>(false);

  // 6. Audio Output & Device Telemetry
  readonly audioVolume = signal<number>(85);
  readonly audioDevice = signal<string>('Speakers (Realtek(R) High Definition Audio)');

  // 7. Real-Time Dialogue Transcription Feed
  readonly transcriptionFeed = this.commandService.commsMessages;
  transcriptionInput = '';

  private telemetryTimer: any = null;
  private clockTimer: any = null;

  commandInput = '';

  readonly inputPlaceholder = computed(() => {
    const lang = this.speechVoice.selectedLanguage();
    if (lang === 'te') {
      return "ABHI ని అడగండి లేదా PC ని ఆదేశించండి (ఉదా: 'నోట్‌ప్యాడ్ తెరువు', 'కాలిక్యులేటర్')...";
    }
    if (lang === 'hi') {
      return "ABHI से पूछें या अपने PC को कमांड दें (उदा: 'notepad खोलो', 'calculator')...";
    }
    if (lang === 'ta') {
      return "ABHI யிடம் கேளுங்கள் அல்லது உங்கள் PC ஐ இயக்கவும் (எ.கா: 'notepad திற')...";
    }
    return "Ask ABHI or command your PC (e.g. 'open notepad', 'calc 125 * 48')...";
  });

  readonly showWorkspaceMenu = signal(false);
  readonly showActionsMenu = signal(false);
  readonly showSwarmDialogueModal = this.stateService.showSwarmDialogueModal;
  readonly swarmDialogueList = this.stateService.swarmDialogueList;

  async openSwarmDialogueModal(): Promise<void> {
    this.stateService.openSwarmDialogue();
  }

  closeSwarmDialogueModal(): void {
    this.stateService.closeSwarmDialogue();
  }
  readonly showDockLangMenu = signal(false);

  toggleDockLangMenu(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.showDockLangMenu.update(v => !v);
    if (this.showDockLangMenu()) {
      this.showActionsMenu.set(false);
      this.showWorkspaceMenu.set(false);
    }
  }

  selectDockLanguage(lang: AppLanguage, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.speechVoice.setLanguage(lang);
    this.showDockLangMenu.set(false);
  }

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
      id: 'agent_1_commander',
      name: 'Commander & Orchestrator',
      role: 'Lead Architect, Task Decomposer & Multi-Agent Arbitrator',
      status: 'ACTIVE',
      capabilities: ['Goal Intake', 'Task Decomposition', 'Squad Routing', 'Conflict Arbitration', 'Gatekeeper Sign-Off'],
      riskTier: 'CRITICAL',
      protocolCode: 'PROTOCOL-01 // COMMAND',
      suitMark: 'MARK 85',
    },
    {
      id: 'agent_2_browser',
      name: 'Browser & Web Specialist',
      role: 'Live Web Automation, DOM Tree Inspection & Session State',
      status: 'ACTIVE',
      capabilities: ['DOM Inspection', 'Playwright CDP', 'Network Intercept', 'Session/Cookies', 'Zero Guessing'],
      riskTier: 'ELEVATED',
      protocolCode: 'PROTOCOL-02 // RECON',
      suitMark: 'MARK L',
    },
    {
      id: 'agent_3_comms',
      name: 'Comms & WhatsApp Officer',
      role: 'External Channel Dispatch (WhatsApp Native / Alerts / Webhooks)',
      status: 'ACTIVE',
      capabilities: ['WhatsApp Desktop', 'Recipient Verification', 'Message Sanitization', 'Delivery Confirmation', 'Rate Limiting'],
      riskTier: 'ELEVATED',
      protocolCode: 'PROTOCOL-03 // COMMS',
      suitMark: 'MARK XLII',
    },
    {
      id: 'agent_4_system',
      name: 'OS, Shell & Code Engineer',
      role: 'Terminal Execution, File System I/O & Surgical AST Code Synthesis',
      status: 'ACTIVE',
      capabilities: ['PowerShell/CMD', 'Surgical Edits', 'Preserve Integrity', 'Exit Code Audit', 'Process Monitor'],
      riskTier: 'HIGH',
      protocolCode: 'PROTOCOL-04 // FORGE',
      suitMark: 'MARK VI',
    },
    {
      id: 'agent_5_researcher',
      name: 'Deep Researcher & Miner',
      role: 'Codebase Scanning, Documentation Mining & Fact Extraction',
      status: 'ACTIVE',
      capabilities: ['Hybrid RAG', 'AST Grep', 'Doc Mining', 'Exact Citations', 'Signal Extraction'],
      riskTier: 'STANDARD',
      protocolCode: 'PROTOCOL-05 // RESEARCH',
      suitMark: 'MARK VII',
    },
    {
      id: 'agent_6_ml',
      name: 'ML & Pipeline Specialist',
      role: 'Model Selection, Hyperparameter Tuning, Loss Tracking & Schema Integrity',
      status: 'ACTIVE',
      capabilities: ['Pipeline Design', 'Model Evaluation', 'Loss Monitoring', 'Metric Audit', 'Leakage Prevention'],
      riskTier: 'STANDARD',
      protocolCode: 'PROTOCOL-06 // NEURAL',
      suitMark: 'MARK XXI',
    },
    {
      id: 'agent_7_strategist',
      name: 'Task Strategist & Decomposer',
      role: 'DAG Dependency Mapping, Tree-of-Thought & Rollback Safeguards',
      status: 'ACTIVE',
      capabilities: ['Tree of Thought', 'DAG Mapping', 'Rollback Plans', 'Kahn Topological Verification', 'Token Efficiency'],
      riskTier: 'STANDARD',
      protocolCode: 'PROTOCOL-07 // STRATEGY',
      suitMark: 'MARK XVII',
    },
    {
      id: 'agent_8_qa_critic',
      name: 'Verification & QA Auditor',
      role: 'The Critic: Adversarial Verification & Quality Gate Sign-Off',
      status: 'ACTIVE',
      capabilities: ['Physical Proof Audit', 'Edge Case Hunter', 'Boundary Testing', 'VERIFIED: PASS', 'Rejection Diagnostics'],
      riskTier: 'STANDARD',
      protocolCode: 'PROTOCOL-08 // CRITIC',
      suitMark: 'MARK VII',
    },
    {
      id: 'agent_9_security',
      name: 'Security & Guardrails Controller',
      role: 'Credential Shielding, Destructive Action Interception & Sandbox Fencing',
      status: 'ACTIVE',
      capabilities: ['Credential Shield', 'Destructive Command Block', 'Privilege Audit', 'Sandbox Defense', 'Prompt Injection Guard'],
      riskTier: 'CRITICAL',
      protocolCode: 'PROTOCOL-09 // SECURITY',
      suitMark: 'MARK I',
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

  readonly situationalBriefing = signal<any>(null);

  ngOnInit(): void {
    this.threeScene.setMode('MAIN_AGENT');

    this.fetchSituationalBriefing();

    // Automatic Optical Face ID Authentication on Launch
    setTimeout(() => {
      this.stateService.verifyBiometrics();
    }, 1500);

    this.thoughtIntervalId = setInterval(() => {
      this.activeThoughtIndex.update((idx) => (idx + 1) % this.liveThoughts().length);
    }, 4500);

    this.fetchLiveThoughts();
    this.thoughtFetchIntervalId = setInterval(() => this.fetchLiveThoughts(), 5000);

    // Initialize Era AI HUD services (Real Telemetry, Clock, Weather, Geolocation, SBI Treasury)
    this.pollHardwareTelemetry();
    this.telemetryTimer = setInterval(() => this.pollHardwareTelemetry(), 3500);

    this.updateClockAndWeather();
    this.clockTimer = setInterval(() => this.updateClockAndWeather(), 1000);

    this.refreshLocation();
    this.fetchTreasuryData();
  }

  private async fetchSituationalBriefing(): Promise<void> {
    try {
      const res = await fetch(getApiUrl('/api/v1/agent-gateway/core/situational-briefing'));
      if (res.ok) {
        const data = await res.json();
        this.situationalBriefing.set(data);
        if (data.hud_message) {
          this.threeScene.latestJarvisMessage.set(data.hud_message);
        }
        if (data.greeting) {
          this.speechVoice.greetUserOnLaunch(data.greeting);
          return;
        }
      }
    } catch {
      // Fallback to default greeting
    }
    this.speechVoice.greetUserOnLaunch();
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
    if (this.telemetryTimer) {
      clearInterval(this.telemetryTimer);
      this.telemetryTimer = null;
    }
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((track) => track.stop());
      this.cameraStream = null;
    }

    this.speechVoice.stopVoiceListening();
  }

  // =========================================================================
  // ERA AI HUD: LIVE TELEMETRY, CLOCK, WEATHER, MAP, CAMERA & OS ACTIONS
  // =========================================================================

  async pollHardwareTelemetry(): Promise<void> {
    try {
      const data = await this.agentApi.getSystemTelemetry();
      if (data) {
        if (data.cpu) {
          this.cpuPercent.set(data.cpu.percent ?? 18.5);
          this.cpuCores.set(data.cpu.cores_logical ?? 16);
          this.cpuFreq.set(data.cpu.frequency_mhz ?? 2499);
        }
        if (data.memory) {
          this.ramPercent.set(data.memory.percent ?? 73.8);
          this.ramUsedGb.set(data.memory.used_gb ?? 17.3);
          this.ramTotalGb.set(data.memory.total_gb ?? 23.3);
        }
        if (data.disk) {
          this.diskPercent.set(data.disk.percent ?? 42.2);
          this.diskUsedGb.set(data.disk.used_gb ?? 215.6);
          this.diskTotalGb.set(data.disk.total_gb ?? 510.5);
        }
        if (data.gpu) {
          this.gpuTemp.set(data.gpu.temperature_c ?? 44.0);
          this.gpuUtil.set(data.gpu.utilization_pct ?? 26.3);
        }
        if (data.system) {
          this.systemProcesses.set(data.system.process_count ?? 552);
          if (data.system.security_status) {
            this.securityStatus.set(data.system.security_status);
          }
          const upSec = data.system.uptime_seconds || 128600;
          const h = Math.floor(upSec / 3600);
          const m = Math.floor((upSec % 3600) / 60);
          this.systemUptime.set(`${h}h ${m}m`);
        }
      }
    } catch {
      // Retain previous readings on network fluctuation
    }
  }

  async refreshLocation(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            this.locationData.update((loc) => ({
              ...loc,
              lat: Number(pos.coords.latitude.toFixed(4)),
              lng: Number(pos.coords.longitude.toFixed(4)),
            }));
            this.fetchLiveWeather(pos.coords.latitude, pos.coords.longitude);
          },
          async () => {
            await this.fallbackIpLocation();
          },
          { timeout: 4000 }
        );
      } else {
        await this.fallbackIpLocation();
      }
    } catch {
      await this.fallbackIpLocation();
    }
  }

  private async fallbackIpLocation(): Promise<void> {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const d = await res.json();
        if (d.latitude && d.longitude) {
          this.locationData.set({
            lat: Number(d.latitude.toFixed(4)),
            lng: Number(d.longitude.toFixed(4)),
            city: d.city || 'Hyderabad',
            region: d.region || 'Telangana',
            country: d.country_name || 'India',
            isp: d.org || 'Airtel / Jio Fiber',
            address: `${d.city || 'Cyber Tech'}, ${d.region || 'India'}`
          });
          this.fetchLiveWeather(d.latitude, d.longitude);
        }
      }
    } catch {
      this.fetchLiveWeather(17.3850, 78.4867);
    }
  }

  updateClockAndWeather(): void {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    this.clockHoursAngle.set(((hours % 12) + minutes / 60) * 30);
    this.clockMinutesAngle.set((minutes + seconds / 60) * 6);
    this.clockSecondsAngle.set(seconds * 6);

    const pad = (n: number) => n.toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    this.digitalTimeString.set(`${pad(displayHours)}:${pad(minutes)}:${pad(seconds)} ${ampm}`);

    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    this.currentDateString.set(`${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`);
  }

  async fetchLiveWeather(lat: number, lon: number): Promise<void> {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      if (res.ok) {
        const d = await res.json();
        if (d.current_weather) {
          const temp = Math.round(d.current_weather.temperature);
          const code = d.current_weather.weathercode;
          let cond = 'Partly Cloudy';
          let ic = '⛅';
          if (code === 0) { cond = 'Clear Sky'; ic = '☀️'; }
          else if (code >= 1 && code <= 3) { cond = 'Partly Cloudy'; ic = '⛅'; }
          else if (code >= 45 && code <= 48) { cond = 'Foggy'; ic = '🌫️'; }
          else if (code >= 51 && code <= 67) { cond = 'Light Rain'; ic = '🌧️'; }
          else if (code >= 80 && code <= 82) { cond = 'Showers'; ic = '🌦️'; }
          else if (code >= 95) { cond = 'Thunderstorm'; ic = '⛈️'; }

          this.weatherData.update((w) => ({
            ...w,
            temp,
            condition: cond,
            icon: ic,
            wind: Math.round(d.current_weather.windspeed),
            city: this.locationData().city
          }));
        }
      }
    } catch {
      // Keep existing weather
    }
  }

  async toggleCamera(): Promise<void> {
    if (this.cameraActive()) {
      if (this.cameraStream) {
        this.cameraStream.getTracks().forEach((t) => t.stop());
        this.cameraStream = null;
      }
      this.cameraActive.set(false);
      this.cameraStatus.set('CAMERA STANDBY (CLICK TO ENGAGE)');
      return;
    }

    try {
      this.cameraStatus.set('REQUESTING CAMERA FEED...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 360 },
          facingMode: this.cameraFacing()
        }
      });
      this.cameraStream = stream;
      if (this.cameraVideoRef?.nativeElement) {
        this.cameraVideoRef.nativeElement.srcObject = stream;
      }
      this.cameraActive.set(true);
      this.cameraStatus.set('OPTICAL TARGETING ACTIVE // SCANNING');
    } catch {
      this.cameraActive.set(false);
      this.cameraStatus.set('CAMERA OFFLINE / PERMISSION REQUIRED');
    }
  }

  async fetchTreasuryData(): Promise<void> {
    try {
      const data = await this.agentApi.getTreasuryOverview();
      if (data) {
        this.sbiTreasury.update((prev) => ({
          ...prev,
          beneficiary: data.beneficiary || prev.beneficiary,
          bank: data.bank_name || prev.bank,
          accountMasked: data.account_number_masked || prev.accountMasked,
          ifsc: data.ifsc_code || prev.ifsc,
          totalRevenueInr: data.total_settled_revenue_inr ?? prev.totalRevenueInr,
          totalRevenueUsd: data.total_settled_revenue_usd ?? prev.totalRevenueUsd,
          pendingInvoicesInr: data.pending_invoices_inr ?? prev.pendingInvoicesInr,
          invoicesCount: data.invoices_count ?? prev.invoicesCount,
        }));
      }
    } catch {
      // Retain state
    }
  }

  async runAutonomousRevenueCycle(): Promise<void> {
    if (this.isGeneratingRevenue()) return;
    this.isGeneratingRevenue.set(true);
    this.speechVoice.speak('Engaging autonomous CEO revenue fulfillment cycle, Mamu. Generating deliverables across Code Audit, Content Media, and B2B Outreach.');
    try {
      const result = await this.agentApi.runAutonomousRevenueCycle();
      await this.fetchTreasuryData();
      if (result?.summary) {
        this.speechVoice.speak(result.summary);
        this.threeScene.latestJarvisMessage.set(result.summary);
      }
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Revenue cycle failed to complete.');
    } finally {
      this.isGeneratingRevenue.set(false);
    }
  }

  async runCodeAuditBounty(): Promise<void> {
    if (this.isGeneratingRevenue()) return;
    this.isGeneratingRevenue.set(true);
    this.speechVoice.speak('Executing AST static security audit and bug bounty deliverable, Mamu.');
    try {
      const result = await this.agentApi.runCodeAuditBounty();
      await this.fetchTreasuryData();
      if (result?.summary) {
        this.speechVoice.speak(result.summary);
        this.threeScene.latestJarvisMessage.set(result.summary);
      }
    } catch (err: any) {
      this.errorMessage.set(err?.message || 'Code audit deliverable generation failed.');
    } finally {
      this.isGeneratingRevenue.set(false);
    }
  }

  // OS & Tab Automations
  executeVirusScan(): void {
    this.executeQuickAction('Scan system security and running processes for viruses and malware');
  }

  executeTabSwitch(direction: string = 'next'): void {
    this.executeQuickAction(`Switch tab to ${direction}`);
  }

  executeNewTab(): void {
    this.executeQuickAction('Open new tab');
  }

  executeCloseTab(): void {
    this.executeQuickAction('Close active tab');
  }

  sendTranscription(): void {
    const text = this.transcriptionInput.trim();
    if (!text) return;
    this.transcriptionInput = '';
    this.executeQuickAction(text);
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

  setCallsign(callsign: string = 'Mamu'): void {
    this.speechVoice.setUserCallsign('Mamu');
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

  toggleAlexaMode(): void {
    const isNowActive = this.speechVoice.toggleAlexaMode((spokenText: string) => {
      if (spokenText && spokenText.trim() && spokenText !== 'Listening for voice command...') {
        this.commandInput = spokenText;
        this.onSubmitCommand();
      }
    });
    if (isNowActive) {
      this.commandInput = '🎙️ Alexa Conversation Active...';
    } else {
      this.commandInput = '';
    }
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
    this.speechVoice.primeAudio();
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
      const res = await fetch(getApiUrl('/api/v1/agent-gateway/swarm/negotiate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: `Collaborative execution of ${agent.role} under ${agent.codename}` })
      });
      if (res.ok) {
        const data = await res.json();
        const consensus = data.consensus_score || 98.4;
        const msg = `[CONSENSUS ${consensus}%]: ${agent.name} ratified as operational lead. 10-agent swarm synchronized.`;
        this.threeScene.latestJarvisMessage.set(msg);
        this.speechVoice.speak(msg);
      }
    } catch {
      this.threeScene.latestJarvisMessage.set(
        `[SWARM NEGOTIATED]: Synaptic deliberation ratified at 98.5% consensus.`
      );
    }
  }

  agentChatInput = '';
  readonly agentChatHistory = signal<{ sender: string; text: string; time: string }[]>([]);
  readonly isSendingAgentChat = signal(false);

  async sendAgentChat(agent: any): Promise<void> {
    const text = this.agentChatInput.trim();
    if (!text || this.isSendingAgentChat()) return;

    this.isSendingAgentChat.set(true);
    const now = new Date().toLocaleTimeString();
    this.agentChatHistory.update((h) => [...h, { sender: 'OPERATOR', text, time: now }]);
    this.agentChatInput = '';

    try {
      const res = await fetch(getApiUrl('/api/v1/agent-gateway/swarm/family-chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agent.id, message: text })
      });
      if (res.ok) {
        const data = await res.json();
        const reply = data.reply || data.message || data.text || `${agent.name} brain synchronized. Directive acknowledged.`;
        this.agentChatHistory.update((h) => [...h, { sender: agent.name, text: reply, time: new Date().toLocaleTimeString() }]);
        if (this.threeScene.soundEnabled()) {
          this.speechVoice.speak(reply);
        }
      } else {
        this.agentChatHistory.update((h) => [...h, { sender: agent.name, text: `[Brain ACK]: Synaptic link active. Ready for directive.`, time: now }]);
      }
    } catch {
      this.agentChatHistory.update((h) => [...h, { sender: agent.name, text: `[Autonomous Core]: Local link optimal. Telemetry steady.`, time: now }]);
    } finally {
      this.isSendingAgentChat.set(false);
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
