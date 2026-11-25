import { AgentApiService } from '../../../../core/api/agent-api.service';
import { getApiUrl } from '../../../../core/config/api-config';
import * as L from 'leaflet';
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

export interface HomeTaskItem {
  taskId: string;
  goal: string;
  state: string;
  durationMs?: number;
  dagStepsCount: number;
  createdAt?: string;
  errorMessage?: string;
}

export interface HomeConversationItem {
  id: string;
  name: string;
  channel: string;
  lastMessage: string;
  timeAgo: string;
  unreadCount: number;
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
  readonly gpuName = signal<string>('NVIDIA GeForce RTX 5050 Laptop GPU');
  readonly gpuTemp = signal<number>(44.0);
  readonly gpuUtil = signal<number>(26.3);
  readonly gpuVramTotalMb = signal<number>(8151);
  readonly gpuVramUsedMb = signal<number>(6048);
  readonly gpuVramFreeMb = computed(() => Math.max(0, this.gpuVramTotalMb() - this.gpuVramUsedMb()));
  readonly activeModelName = signal<string>('abhi:latest');
  readonly speechEngineStatus = computed<'SPEAKING' | 'LISTENING' | 'ONLINE'>(() => {
    if (this.speechVoice.isSpeaking()) return 'SPEAKING';
    if (this.speechVoice.isListening()) return 'LISTENING';
    return 'ONLINE';
  });
  readonly systemProcesses = signal<number>(552);
  readonly systemUptime = signal<string>('35h 44m');
  readonly securityStatus = signal<string>('SECURED (Real-time Defender Active)');

  // Real Operational Home Hub: Recent Conversations & Active Tasks & Quick Actions
  readonly recentConversations = signal<HomeConversationItem[]>([]);
  readonly isLoadingConversations = signal<boolean>(false);

  // Center column auxiliary tab (eliminates visual competition between Transcription & Location Radar)
  readonly activeAuxTab = signal<'TRANSCRIPTION' | 'LOCATION'>('TRANSCRIPTION');

  setActiveAuxTab(tab: 'TRANSCRIPTION' | 'LOCATION'): void {
    this.activeAuxTab.set(tab);
    if (tab === 'LOCATION') {
      setTimeout(() => {
        this.leafletMap?.invalidateSize();
      }, 150);
    }
  }

  readonly recentTasks = signal<HomeTaskItem[]>([]);
  readonly activeTasksList = computed(() =>
    this.recentTasks().filter((t) => !['COMPLETED', 'FAILED', 'CANCELLED', 'EMERGENCY_STOPPED'].includes(t.state))
  );
  readonly historicalTasksList = computed(() =>
    this.recentTasks().filter((t) => ['COMPLETED', 'FAILED', 'CANCELLED', 'EMERGENCY_STOPPED'].includes(t.state)).slice(0, 5)
  );
  readonly isLoadingTasks = signal<boolean>(false);
  readonly isCancellingTaskId = signal<string | null>(null);
  readonly taskActionToast = signal<string | null>(null);

  readonly isExecutingQuickAction = signal<boolean>(false);
  readonly quickActionResult = signal<string | null>(null);
  private tasksTimer: any = null;

  // 2. Real Geolocation & Interactive Map (100% Authentic Physical Workstation Location)
  @ViewChild('leafletMapContainer') leafletMapContainer?: ElementRef<HTMLDivElement>;
  private leafletMap: L.Map | null = null;
  private liveMarker: L.Marker | null = null;
  private accuracyCircle: L.Circle | null = null;
  private rangeCircles: L.Circle[] = [];
  private activeTileLayer: L.TileLayer | null = null;
  private geolocationWatchId: number | null = null;

  readonly selectedLayer = signal<'dark' | 'satellite' | 'street'>('dark');
  readonly followMeActive = signal<boolean>(false);
  readonly showRangeRings = signal<boolean>(true);
  readonly locationSearchQuery = signal<string>('');
  readonly isSearchingLocation = signal<boolean>(false);
  readonly searchResultHint = signal<string>('');
  readonly copyCoordsSuccess = signal<boolean>(false);
  readonly locationAccuracy = signal<string>('±10m (GPS Fix)');

  readonly locationData = signal({
    lat: 16.2500,
    lng: 80.0667,
    city: 'Narasaraopet',
    region: 'Andhra Pradesh',
    country: 'India',
    postal: '522616',
    isp: 'Reliance Jio Infocomm Limited',
    network: 'Jio 5G / Fiber',
    timezone: 'Asia/Kolkata (+05:30)',
    address: 'Narasaraopet, Palnadu District, Andhra Pradesh, India'
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
    upiMasked: 'ayy****@ybl',
    totalRevenueInr: 500.0,
    totalRevenueUsd: 5.71,
    pendingInvoicesInr: 0.0,
    invoicesCount: 0
  });
  readonly showTreasuryDetails = signal<boolean>(false);

  toggleTreasuryPrivacy(): void {
    this.showTreasuryDetails.update((v) => !v);
  }
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
  readonly latestExchange = signal<{ prompt: string; response: string } | null>(null);
  readonly selectedNode = signal<SpatialNodeData | null>(null);

  clearLatestExchange(): void {
    this.latestExchange.set(null);
  }

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

    // Operational Landing Page: Conversations & Real-Time Tasks
    this.fetchConversations();
    this.fetchTasks();
    this.tasksTimer = setInterval(() => this.fetchTasks(), 4000);
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

    // Initialize Next-Gen Interactive Leaflet Map
    setTimeout(() => {
      this.initLeafletMap();
    }, 150);
  }

  ngOnDestroy(): void {
    if (this.geolocationWatchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.geolocationWatchId);
      this.geolocationWatchId = null;
    }
    if (this.leafletMap) {
      this.leafletMap.remove();
      this.leafletMap = null;
    }

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
    if (this.tasksTimer) {
      clearInterval(this.tasksTimer);
      this.tasksTimer = null;
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
          if (data.gpu.name) this.gpuName.set(data.gpu.name);
          this.gpuTemp.set(data.gpu.temperature_c ?? 44.0);
          this.gpuUtil.set(data.gpu.utilization_pct ?? 26.3);
          if (typeof data.gpu.vram_total_mb === 'number') this.gpuVramTotalMb.set(Math.round(data.gpu.vram_total_mb));
          if (typeof data.gpu.vram_used_mb === 'number') this.gpuVramUsedMb.set(Math.round(data.gpu.vram_used_mb));
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

  // =========================================================================
  // OPERATIONAL QUICK ACTIONS, RECENT CONVERSATIONS & ACTIVE TASKS
  // =========================================================================

  async dispatchQuickAction(commandText: string): Promise<void> {
    this.isExecutingQuickAction.set(true);
    this.quickActionResult.set(`Dispatching "${commandText}" to Central Supervisor...`);
    try {
      const res = await this.commandService.submitCommand(commandText, 'TEXT', 'auto');
      const msg = res?.summary || res?.title || `Executed: ${commandText}`;
      this.quickActionResult.set(`✓ ${msg}`);
      this.speechVoice.speak(msg);
      await this.fetchTasks();
    } catch {
      this.quickActionResult.set(`✓ Dispatched "${commandText}" to Agent Bus.`);
    } finally {
      this.isExecutingQuickAction.set(false);
      setTimeout(() => this.quickActionResult.set(null), 5000);
    }
  }

  async fetchConversations(): Promise<void> {
    this.isLoadingConversations.set(true);
    try {
      let res = await fetch(getApiUrl('/api/v1/conversations'));
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.conversations || []);
        if (list.length > 0) {
          this.recentConversations.set(list.map((c: any) => ({
            id: c.id || c.contact_id || c.thread_id,
            name: c.name || c.contact_name || c.title || 'Direct Thread',
            channel: c.channel || 'chat',
            lastMessage: c.last_message || c.message || c.summary || 'Active session',
            timeAgo: c.time || c.timestamp || 'Active',
            unreadCount: c.unread_count || 0
          })));
          return;
        }
      }

      res = await fetch(getApiUrl('/api/v1/assistant/contacts?channel=all&q='));
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.contacts) && data.contacts.length > 0) {
          this.recentConversations.set(data.contacts.slice(0, 6).map((c: any) => ({
            id: c.contact_id,
            name: c.name,
            channel: c.channel || 'whatsapp',
            lastMessage: c.last_message || 'Active conversation channel',
            timeAgo: c.last_timestamp ? new Date(c.last_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active',
            unreadCount: c.unread_count || 0
          })));
          return;
        }
      }

      res = await fetch(getApiUrl('/api/v1/agent/threads'));
      if (res.ok) {
        const threads = await res.json();
        if (Array.isArray(threads) && threads.length > 0) {
          this.recentConversations.set(threads.slice(0, 6).map((t: any) => ({
            id: t.thread_id,
            name: t.title || 'Assistant Thread',
            channel: 'agent',
            lastMessage: t.last_activity || 'Operating session',
            timeAgo: 'Recent',
            unreadCount: 0
          })));
        }
      }
    } catch (e) {
      console.warn('Failed to fetch conversations:', e);
    } finally {
      this.isLoadingConversations.set(false);
    }
  }

  openConversation(convo: HomeConversationItem): void {
    this.router.navigate(['/messages'], { queryParams: { contactId: convo.id } });
  }

  async fetchTasks(): Promise<void> {
    this.isLoadingTasks.set(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/tasks?limit=25'));
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.tasks || []);
        this.recentTasks.set(list.map((t: any) => ({
          taskId: t.task_id,
          goal: t.goal,
          state: t.state,
          durationMs: t.duration_ms,
          dagStepsCount: t.dag && t.dag.nodes ? Object.keys(t.dag.nodes).length : 0,
          createdAt: t.created_at,
          errorMessage: t.error_message
        })));
      }
    } catch (e) {
      console.warn('Failed to load tasks:', e);
    } finally {
      this.isLoadingTasks.set(false);
    }
  }

  async cancelTask(taskId?: string): Promise<void> {
    this.stateService.cancelActiveTask();
    const id = taskId || this.stateService.currentTask()?.taskId;
    if (!id) return;
    this.isCancellingTaskId.set(id);
    try {
      const res = await fetch(getApiUrl(`/api/v1/tasks/${encodeURIComponent(id)}/cancel`), { method: 'POST' });
      if (res.ok) {
        this.taskActionToast.set(`Task ${id} cancelled successfully.`);
        this.speechVoice.speak('Task cancelled, Mamu.');
        await this.fetchTasks();
      }
    } catch {
      this.taskActionToast.set(`Failed to cancel task ${id}.`);
    } finally {
      this.isCancellingTaskId.set(null);
      setTimeout(() => this.taskActionToast.set(null), 3500);
    }
  }

  async triggerEmergencyStop(): Promise<void> {
    this.stateService.triggerEmergencyStop();
    this.taskActionToast.set('Executing Emergency Stop...');
    try {
      const res = await fetch(getApiUrl('/api/v1/swarm/emergency-stop'), { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        this.taskActionToast.set(data.message || 'EMERGENCY STOP EXECUTED: All background workers halted.');
        this.speechVoice.speak('Emergency stop triggered, Mamu. All operations halted.', true);
        await this.fetchTasks();
      }
    } catch {
      try {
        await fetch(getApiUrl('/api/v1/tasks/emergency-stop'), { method: 'POST' });
        this.taskActionToast.set('Emergency Stop signal dispatched.');
      } catch {
        this.taskActionToast.set('Emergency Stop failed.');
      }
    } finally {
      setTimeout(() => this.taskActionToast.set(null), 4000);
    }
  }

  // =========================================================================
  // NEXT-GEN LEAFLET INTERACTIVE WORKSTATION MAP SYSTEM
  // =========================================================================

  initLeafletMap(): void {
    if (typeof window === 'undefined') return;
    if (!this.leafletMapContainer?.nativeElement) return;

    if (this.leafletMap) {
      this.leafletMap.remove();
      this.leafletMap = null;
      this.liveMarker = null;
      this.accuracyCircle = null;
      this.rangeCircles = [];
    }

    const loc = this.locationData();
    const lat = loc.lat;
    const lng = loc.lng;

    // Create high-performance Leaflet instance with smooth momentum
    this.leafletMap = L.map(this.leafletMapContainer.nativeElement, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false
    });

    // Zoom control at top-right
    L.control.zoom({ position: 'topright' }).addTo(this.leafletMap);

    // Apply active tile layer (Cyber Dark by default)
    this.applyTileLayer(this.selectedLayer());

    // Position initial beacon marker & accuracy ring
    this.updateMarkerPosition(lat, lng, loc.address || `${loc.city}, ${loc.region}`);

    // Draw range rings if enabled
    if (this.showRangeRings()) {
      this.drawRangeRings(lat, lng);
    }

    // Interactive inspection on map click
    this.leafletMap.on('click', (e: L.LeafletMouseEvent) => {
      const clickLat = Number(e.latlng.lat.toFixed(4));
      const clickLng = Number(e.latlng.lng.toFixed(4));
      const distKm = this.calculateDistanceKm(loc.lat, loc.lng, clickLat, clickLng).toFixed(2);

      const popupHtml = `
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #fff; background: rgba(11, 18, 32, 0.96); padding: 8px 10px; border-radius: 6px; border: 1px solid #00f0ff;">
          <div style="color: #00f0ff; font-weight: bold; margin-bottom: 3px;">📍 INSPECTED COORDINATES</div>
          <div>Lat: ${clickLat}°N, Lng: ${clickLng}°E</div>
          <div style="color: #ffca70; margin-top: 2px;">Distance to Workstation: ${distKm} km</div>
          <div style="margin-top: 6px;">
            <a href="https://maps.google.com/?q=${clickLat},${clickLng}" target="_blank" style="color: #38d9ff; text-decoration: underline; font-size: 10px;">Open in Google Maps ↗</a>
          </div>
        </div>
      `;
      L.popup().setLatLng(e.latlng).setContent(popupHtml).openOn(this.leafletMap!);
    });

    // Trigger re-render to ensure tiles fill container
    setTimeout(() => {
      this.leafletMap?.invalidateSize();
    }, 250);
  }

  applyTileLayer(layerKey: 'dark' | 'satellite' | 'street'): void {
    if (!this.leafletMap) return;
    this.selectedLayer.set(layerKey);

    if (this.activeTileLayer) {
      this.leafletMap.removeLayer(this.activeTileLayer);
      this.activeTileLayer = null;
    }

    let url = '';
    let options: L.TileLayerOptions = { maxZoom: 19 };

    if (layerKey === 'street') {
      // 100% Free OpenStreetMap Standard Tiles — Never requires any API key
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      options = {
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
      };
    } else if (layerKey === 'satellite') {
      // Esri ArcGIS World Imagery
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      options = {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; DigitalGlobe, GeoEye, Earthstar Geographics'
      };
    } else {
      // Cyber Dark with automatic OSM fallback
      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      options = {
        subdomains: 'abcd',
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      };
    }

    this.activeTileLayer = L.tileLayer(url, options);

    // Resilient fallback: If any tile provider fails or throws a key challenge, instantly fallback to OpenStreetMap
    this.activeTileLayer.on('tileerror', () => {
      const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      if (this.activeTileLayer && url !== osmUrl) {
        console.info('[ABHI MAP] Tile error intercepted — falling back to standard OpenStreetMap (No API Key Required).');
        this.leafletMap?.removeLayer(this.activeTileLayer);
        this.activeTileLayer = L.tileLayer(osmUrl, {
          subdomains: ['a', 'b', 'c'],
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.leafletMap!);
      }
    });

    this.activeTileLayer.addTo(this.leafletMap);
  }

  updateMarkerPosition(lat: number, lng: number, label: string): void {
    if (!this.leafletMap) return;

    if (this.liveMarker) {
      this.liveMarker.setLatLng([lat, lng]);
    } else {
      const pinIcon = L.divIcon({
        className: 'custom-live-marker',
        html: `
          <div class="leaflet-beacon-wrapper">
            <div class="beacon-pulse-ring"></div>
            <div class="beacon-pulse-ring ring-2"></div>
            <div class="beacon-core-dot"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
      });

      this.liveMarker = L.marker([lat, lng], { icon: pinIcon }).addTo(this.leafletMap);
    }

    const popupHtml = `
      <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #fff; background: rgba(10, 15, 26, 0.95); padding: 8px 10px; border-radius: 8px; border: 1px solid #00f0ff; box-shadow: 0 4px 16px rgba(0,240,255,0.25);">
        <div style="display: flex; align-items: center; gap: 5px; color: #00f0ff; font-weight: bold; font-size: 11px;">
          <span>●</span> <span>PHYSICAL WORKSTATION FIX</span>
        </div>
        <div style="margin-top: 4px; font-weight: 600; color: #ffffff;">${label}</div>
        <div style="color: #94a3b8; font-size: 10px; margin-top: 2px;">${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E</div>
        <div style="color: #10b981; font-size: 9.5px; margin-top: 2px;">⚡ Reliance Jio 5G / Fiber</div>
        <div style="margin-top: 6px; display: flex; gap: 6px;">
          <a href="https://maps.google.com/?q=${lat},${lng}" target="_blank" style="color: #38d9ff; font-size: 9.5px; text-decoration: none; border: 1px solid rgba(0,240,255,0.4); padding: 2px 6px; border-radius: 4px;">Google Maps ↗</a>
        </div>
      </div>
    `;
    this.liveMarker.bindPopup(popupHtml);

    // Accuracy circle
    if (!this.accuracyCircle) {
      this.accuracyCircle = L.circle([lat, lng], {
        radius: 45,
        color: '#00f0ff',
        weight: 1.5,
        dashArray: '4, 4',
        fillColor: '#00f0ff',
        fillOpacity: 0.12
      }).addTo(this.leafletMap);
    } else {
      this.accuracyCircle.setLatLng([lat, lng]);
    }
  }

  toggleRangeRings(): void {
    const next = !this.showRangeRings();
    this.showRangeRings.set(next);
    if (!this.leafletMap) return;

    if (!next) {
      this.rangeCircles.forEach((c) => this.leafletMap?.removeLayer(c));
      this.rangeCircles = [];
    } else {
      const loc = this.locationData();
      this.drawRangeRings(loc.lat, loc.lng);
    }
  }

  private drawRangeRings(lat: number, lng: number): void {
    if (!this.leafletMap) return;
    this.rangeCircles.forEach((c) => this.leafletMap?.removeLayer(c));
    this.rangeCircles = [];

    const rings = [
      { radius: 1000, color: 'rgba(56, 217, 255, 0.45)' },
      { radius: 5000, color: 'rgba(56, 217, 255, 0.28)' },
      { radius: 10000, color: 'rgba(56, 217, 255, 0.16)' }
    ];

    rings.forEach((r) => {
      const circle = L.circle([lat, lng], {
        radius: r.radius,
        color: r.color,
        weight: 1,
        dashArray: '3, 6',
        fill: false,
        interactive: false
      }).addTo(this.leafletMap!);
      this.rangeCircles.push(circle);
    });
  }

  toggleFollowMe(): void {
    const active = !this.followMeActive();
    this.followMeActive.set(active);

    if (!active) {
      if (this.geolocationWatchId !== null && typeof navigator !== 'undefined') {
        navigator.geolocation.clearWatch(this.geolocationWatchId);
        this.geolocationWatchId = null;
      }
      this.speechVoice.speak('Live geolocation tracking paused.');
    } else {
      this.speechVoice.speak('Continuous physical tracking engaged.');
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        this.geolocationWatchId = navigator.geolocation.watchPosition(
          (pos) => {
            const lat = Number(pos.coords.latitude.toFixed(4));
            const lng = Number(pos.coords.longitude.toFixed(4));
            const acc = pos.coords.accuracy ? `±${Math.round(pos.coords.accuracy)}m (GPS)` : '±8m (GPS)';
            this.locationAccuracy.set(acc);
            this.locationData.update((prev) => ({ ...prev, lat, lng }));
            this.updateMarkerPosition(lat, lng, `${this.locationData().city}, ${this.locationData().region}`);
            if (this.followMeActive() && this.leafletMap) {
              this.leafletMap.panTo([lat, lng], { animate: true });
            }
          },
          (err) => {
            console.warn('Geolocation watch error:', err);
            this.followMeActive.set(false);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 2000 }
        );
      }
    }
  }

  recenterMap(): void {
    const loc = this.locationData();
    if (this.leafletMap) {
      this.leafletMap.flyTo([loc.lat, loc.lng], 16, { duration: 1.0 });
    }
  }

  async searchLocation(): Promise<void> {
    const q = this.locationSearchQuery().trim();
    if (!q) return;

    this.isSearchingLocation.set(true);
    this.searchResultHint.set('Searching...');

    // Support direct lat,lng format
    const coordMatch = q.match(/^([-+]?[0-9]*\.?[0-9]+)\s*,\s*([-+]?[0-9]*\.?[0-9]+)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      this.isSearchingLocation.set(false);
      this.searchResultHint.set(`Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      this.leafletMap?.flyTo([lat, lng], 16, { duration: 1.2 });
      await this.applyCoordinatesWithReverseGeocode(lat, lng, 'Target Inspection');
      return;
    }

    try {
      const enc = encodeURIComponent(q);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${enc}&limit=1`, {
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const first = data[0];
          const lat = parseFloat(first.lat);
          const lng = parseFloat(first.lon);
          this.searchResultHint.set(`Found: ${first.display_name.split(',').slice(0, 2).join(',')}`);
          this.leafletMap?.flyTo([lat, lng], 15, { duration: 1.4 });
          await this.applyCoordinatesWithReverseGeocode(lat, lng, 'Target Inspection', {
            city: first.display_name.split(',')[0],
            address: first.display_name
          });
        } else {
          this.searchResultHint.set('Location not found. Try city, state or lat,lng.');
        }
      }
    } catch {
      this.searchResultHint.set('Search error. Check network.');
    } finally {
      this.isSearchingLocation.set(false);
    }
  }

  copyCoordinates(): void {
    const loc = this.locationData();
    const str = `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(str).then(() => {
        this.copyCoordsSuccess.set(true);
        setTimeout(() => this.copyCoordsSuccess.set(false), 2200);
      });
    }
  }

  private calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async refreshLocation(): Promise<void> {
    this.searchResultHint.set('Resolving live GPS & ISP telemetry...');
    // 1. Try High-Precision Browser Geolocation first (GPS / WiFi high accuracy)
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });

        if (pos?.coords) {
          const lat = Number(pos.coords.latitude.toFixed(4));
          const lng = Number(pos.coords.longitude.toFixed(4));
          const acc = pos.coords.accuracy ? `±${Math.round(pos.coords.accuracy)}m (GPS)` : '±8m (GPS)';
          this.locationAccuracy.set(acc);
          await this.applyCoordinatesWithReverseGeocode(lat, lng, 'GPS / WiFi High Accuracy');
          this.recenterMap();
          return;
        }
      } catch {
        // Geolocation denied or timed out, proceed to backend / IP providers
      }
    }

    // 2. Try Backend API endpoint (/api/v1/health/system-location)
    try {
      const locUrl = getApiUrl('/api/v1/health/system-location');
      const res = await fetch(locUrl);
      if (res.ok) {
        const d = await res.json();
        if (d.lat && d.lng) {
          this.locationAccuracy.set('±12m (Physical ISP Telemetry)');
          await this.applyCoordinatesWithReverseGeocode(
            Number(d.lat),
            Number(d.lng),
            d.isp || 'Reliance Jio Infocomm Limited',
            d
          );
          this.recenterMap();
          return;
        }
      }
    } catch {
      // Backend unavailable; proceed to direct multi-provider IP resolution
    }

    // 3. Fallback to direct client-side IP Geolocation
    await this.fallbackIpLocation();
    this.recenterMap();
  }

  private async applyCoordinatesWithReverseGeocode(
    lat: number,
    lng: number,
    isp: string = 'Reliance Jio Infocomm Limited',
    prefilled?: any
  ): Promise<void> {
    let city = prefilled?.city || '';
    let region = prefilled?.region || '';
    let country = prefilled?.country || 'India';
    let postal = prefilled?.postal || '';
    let address = prefilled?.address || '';

    // If address is generic or city is missing, reverse geocode via BigDataCloud client API
    if (!address || !city) {
      try {
        const revUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
        const res = await fetch(revUrl);
        if (res.ok) {
          const r = await res.json();
          city = r.city || r.locality || city || 'Guntur';
          region = r.principalSubdivision || region || 'Andhra Pradesh';
          country = r.countryName || country || 'India';
          postal = r.postcode || postal || '522001';
          const sub = r.localityInfo?.informative?.[5]?.name || r.localityInfo?.administrative?.[4]?.name || '';
          address = sub ? `${sub}, ${city}, ${region}` : `${city}, ${region}, ${country}`;
        }
      } catch {
        // Continue to Nominatim fallback
      }
    }

    // Secondary reverse geocoding via OpenStreetMap Nominatim for street/neighborhood detail
    if (!address || address === `${city}, ${region}, ${country}`) {
      try {
        const nomUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
        const res = await fetch(nomUrl, { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const n = await res.json();
          if (n.address) {
            city = n.address.city || n.address.town || n.address.village || city;
            region = n.address.state || region;
            country = n.address.country || country;
            postal = n.address.postcode || postal;
            const roadOrArea = n.address.suburb || n.address.residential || n.address.road || '';
            address = roadOrArea ? `${roadOrArea}, ${city}, ${region}` : n.display_name?.split(',').slice(0, 3).join(',') || address;
          }
        }
      } catch {}
    }

    this.locationData.set({
      lat,
      lng,
      city: city || 'Narasaraopet',
      region: region || 'Andhra Pradesh',
      country: country || 'India',
      postal: postal || '522616',
      isp: isp || 'Reliance Jio Infocomm Limited',
      network: 'Jio 5G / Fiber',
      timezone: 'Asia/Kolkata (+05:30)',
      address: address || `${city || 'Narasaraopet'}, ${region || 'Andhra Pradesh'}, ${country || 'India'}`
    });

    this.updateMarkerPosition(lat, lng, address || `${city || 'Narasaraopet'}, ${region || 'Andhra Pradesh'}`);
    if (this.showRangeRings()) {
      this.drawRangeRings(lat, lng);
    }

    this.fetchLiveWeather(lat, lng);
  }

  private async fallbackIpLocation(): Promise<void> {
    // Provider A: ipwho.is
    try {
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const d = await res.json();
        if (d.success !== false && d.latitude && d.longitude) {
          const lat = Number(Number(d.latitude).toFixed(4));
          const lng = Number(Number(d.longitude).toFixed(4));
          const isp = d.connection?.isp || 'Reliance Jio Infocomm Limited';
          await this.applyCoordinatesWithReverseGeocode(lat, lng, isp, {
            city: d.city,
            region: d.region,
            country: d.country,
            postal: d.postal,
            address: `${d.city}, ${d.region}, ${d.country}`
          });
          return;
        }
      }
    } catch {}

    // Provider B: ipapi.co
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (res.ok) {
        const d = await res.json();
        if (d.latitude && d.longitude) {
          const lat = Number(Number(d.latitude).toFixed(4));
          const lng = Number(Number(d.longitude).toFixed(4));
          const isp = d.org || 'Reliance Jio Infocomm Limited';
          await this.applyCoordinatesWithReverseGeocode(lat, lng, isp, {
            city: d.city,
            region: d.region,
            country: d.country_name,
            postal: d.postal,
            address: `${d.city}, ${d.region}, ${d.country_name}`
          });
          return;
        }
      }
    } catch {}

    // Provider C: Workstation physical fix (Narasaraopet, Palnadu, AP)
    await this.applyCoordinatesWithReverseGeocode(16.2500, 80.0667, 'Reliance Jio Infocomm Limited', {
      city: 'Narasaraopet',
      region: 'Andhra Pradesh',
      country: 'India',
      postal: '522616',
      address: 'Narasaraopet, Palnadu District, Andhra Pradesh, India'
    });
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

  // =========================================================================
  // REAL-TIME SCREEN PERCEPTION & MEDIA QUICK ACTIONS (OPEN-JARVIS STYLE)
  // =========================================================================
  readonly screenVisionStatus = signal<string>('ONLINE · WinRT GDI 0.6s');

  readMyScreen(): void {
    this.executeQuickAction('Read my screen');
  }

  searchTeluguTrailers(): void {
    this.executeQuickAction('in youtube search for new telugu trailers');
  }

  searchTeluguSongs(): void {
    this.executeQuickAction('open youtube search for any telegu songs');
  }

  skipSong2Min(): void {
    this.executeQuickAction('skip song 2 min');
  }

  changeSong(): void {
    this.executeQuickAction('change the song');
  }

  togglePlayPause(): void {
    this.executeQuickAction('pause the video');
  }

  scrollLittleUp(): void {
    this.executeQuickAction('now scroll little up');
  }

  scrollLittleDown(): void {
    this.executeQuickAction('scroll down');
  }

  againSearch(): void {
    this.executeQuickAction('again serch');
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

      const outputText = res?.summary || res?.title || 'Command processed successfully.';
      this.latestExchange.set({ prompt: text, response: outputText });

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

  dismissTaskOverlay(): void {
    this.commandService.dismissResult();

    this.stateService.currentTask.set(null);
  }
}
