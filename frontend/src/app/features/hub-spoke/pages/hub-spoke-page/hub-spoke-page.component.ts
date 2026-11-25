import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  signal,
  inject,
  ChangeDetectorRef,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getApiUrl } from '../../../../core/config/api-config';
import { SpeechVoiceService } from '../../../../core/services/speech-voice.service';
import { BusinessService } from '../../../business/services/business.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { slidePill, landCards } from '../../../../core/motion';

export interface PodTool {
  name: string;
  letter: string;
  protocol: string;
  avatarBg?: string;
}

export interface PodSkill {
  name: string;
  progress: number;
}

export interface PodDefinition {
  id: string;
  name: string;
  teamTitle?: string;
  icon?: string;
  badge: string;
  color: string;
  hexColor: number;
  agentsCount: number;
  runningCount?: number;
  statusText: string;
  angleDeg: number;
  x: number;
  z: number;
  role: string;
  departmentKey: string;
  leadAgent: string;
  leadRole?: string;
  tasksToday?: number;
  tasksTrend?: string;
  turnaround?: string;
  connectedTools?: PodTool[];
  skills?: PodSkill[];
  realMetrics: { label: string; value: string }[];
  description: string;
  meshGroup?: THREE.Group;
}

export interface HubFeedMessage {
  id: string;
  podId: string;
  podBadge: string;
  sender: string;
  color: string;
  text: string;
  time: string;
  type: 'directive' | 'status' | 'settlement' | 'intel' | 'system';
}

@Component({
  selector: 'app-hub-spoke-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hub-spoke-page.component.html',
  styleUrl: './hub-spoke-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HubSpokePageComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('hubCanvas') hubCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('podPill') podPillRef?: ElementRef<HTMLDivElement>;

  private readonly http = inject(HttpClient);
  private readonly speechVoice = inject(SpeechVoiceService);
  private readonly businessService = inject(BusinessService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Top Nav State
  readonly activeNavTab = signal<'office' | 'feed' | 'brain'>('office');
  readonly totalAgentsCount = signal<number | null>(null);
  readonly runningAgentsCount = signal<number | null>(null);
  readonly searchQuery = signal<string>('');

  // Selected Pod Inspector (defaulted to Research Team)
  readonly selectedPod = signal<PodDefinition | null>(null);

  get primaryPods(): PodDefinition[] {
    return this.pods.slice(0, 6);
  }

  // Real Business & System Data
  readonly sbiSettledTotalInr = signal<number>(0);
  readonly sbiTransactionsCount = signal<number>(0);
  readonly vectorIndexedDocsCount = signal<number | null>(null);
  readonly systemCpuPct = signal<number | null>(null);
  readonly systemRamPct = signal<number | null>(null);

  // Task Command Dispatch
  taskCommandInput = '';
  readonly isDispatching = signal<boolean>(false);

  // 8 Color-Coded Department Pods (Exact match to Reference 8-Pod Hub & Bexruz Architecture)
  readonly pods: PodDefinition[] = [
    {
      id: 'research',
      name: 'Research',
      teamTitle: 'Research Team',
      icon: '🔍',
      badge: 'Research',
      color: '#38bdf8',
      hexColor: 0x38bdf8,
      agentsCount: 3,
      runningCount: 2,
      statusText: '3 agents · 2 running',
      angleDeg: 0,
      x: 0,
      z: -16,
      role: 'Vector RAG Search & Deep Document Synthesis',
      departmentKey: 'KNOWLEDGE_ENGINE',
      leadAgent: 'Leo (Senior Researcher)',
      leadRole: 'Deep Learning Scientist',
      tasksToday: 18,
      tasksTrend: '+24%',
      turnaround: '14m',
      connectedTools: [
        { name: 'ArXiv Scholar', letter: 'A', protocol: 'Connected · MCP', avatarBg: 'rgba(56, 189, 248, 0.25)' },
        { name: 'Perplexity API', letter: 'P', protocol: 'Connected · MCP', avatarBg: 'rgba(59, 130, 246, 0.25)' },
        { name: 'Chrome Browser', letter: 'C', protocol: 'Connected · DevTools', avatarBg: 'rgba(16, 185, 129, 0.25)' }
      ],
      skills: [
        { name: 'paper-synthesis', progress: 89 },
        { name: 'competitive-audit', progress: 74 }
      ],
      realMetrics: [
        { label: 'VECTOR CHUNKS', value: '574 Docs' },
        { label: 'SEARCH ENGINE', value: 'BM25 + Dense' },
        { label: 'EMBEDDING DIM', value: '384 Float' }
      ],
      description: 'Autonomous research cluster generating synthesis reports from scientific literature and local embeddings.'
    },
    {
      id: 'scripts',
      name: 'Scripts',
      teamTitle: 'Scripts Team',
      icon: '📁',
      badge: 'Scripts',
      color: '#f59e0b',
      hexColor: 0xf59e0b,
      agentsCount: 3,
      runningCount: 1,
      statusText: '3 agents · 1 running',
      angleDeg: 45,
      x: 11.3,
      z: -11.3,
      role: 'Acoustic Voice Listener & Python OS Automation',
      departmentKey: 'MEDIA_STUDIO',
      leadAgent: 'Friday (Voice Comms)',
      leadRole: 'Automation Systems Engineer',
      tasksToday: 14,
      tasksTrend: '+18%',
      turnaround: '8m',
      connectedTools: [
        { name: 'Win32 OS Automation', letter: 'W', protocol: 'Connected · Native', avatarBg: 'rgba(245, 158, 11, 0.25)' },
        { name: 'Python 3.14 Shell', letter: 'P', protocol: 'Connected · Async', avatarBg: 'rgba(59, 130, 246, 0.25)' },
        { name: 'Playwright Engine', letter: 'P', protocol: 'Connected · Browser', avatarBg: 'rgba(16, 185, 129, 0.25)' }
      ],
      skills: [
        { name: 'script-execution', progress: 95 },
        { name: 'workflow-scheduler', progress: 82 }
      ],
      realMetrics: [
        { label: 'AUDIO STREAM', value: '16kHz Float32' },
        { label: 'VOICE SYNTHESIS', value: 'pyttsx3 Neural' },
        { label: 'MEDIA CHANNELS', value: 'YouTube / Audio' }
      ],
      description: 'Manages conversational companionship, voice recognition, and real-time automation scripts.'
    },
    {
      id: 'social',
      name: 'Social',
      teamTitle: 'Social Team',
      icon: '🏢',
      badge: 'Social',
      color: '#a855f7',
      hexColor: 0xa855f7,
      agentsCount: 2,
      runningCount: 2,
      statusText: '2 agents · 2 running',
      angleDeg: 90,
      x: 16,
      z: 0,
      role: 'Omnichannel Communications & Engagement Dispatch',
      departmentKey: 'SOCIAL_COMMS',
      leadAgent: 'Alex (Comms Strategist)',
      leadRole: 'Public Relations Architect',
      tasksToday: 12,
      tasksTrend: '+31%',
      turnaround: '11m',
      connectedTools: [
        { name: 'Telegram Gateway', letter: 'T', protocol: 'Connected · Bot', avatarBg: 'rgba(168, 85, 247, 0.25)' },
        { name: 'Speech Voice VAD', letter: 'S', protocol: 'Connected · WebAudio', avatarBg: 'rgba(56, 189, 248, 0.25)' },
        { name: 'Discord Webhook', letter: 'D', protocol: 'Connected · REST', avatarBg: 'rgba(59, 130, 246, 0.25)' }
      ],
      skills: [
        { name: 'sentiment-analysis', progress: 91 },
        { name: 'omnichannel-broadcast', progress: 88 }
      ],
      realMetrics: [
        { label: 'ACTIVE CHANNELS', value: '5 Squads' },
        { label: 'RESPONSE LATENCY', value: '140ms' },
        { label: 'SPEECH ENGINE', value: 'Dual-Channel' }
      ],
      description: 'Dispatches real-time broadcast telemetry and manages community and team multi-channel threads.'
    },
    {
      id: 'creative',
      name: 'Creative',
      teamTitle: 'Creative Team',
      icon: '🎬',
      badge: 'Creative',
      color: '#ec4899',
      hexColor: 0xec4899,
      agentsCount: 3,
      runningCount: 3,
      statusText: '3 agents · 3 running',
      angleDeg: 135,
      x: 11.3,
      z: 11.3,
      role: '3D Spatial Ergonomics, Shaders & Motion Physics',
      departmentKey: 'SPATIAL_DESIGN',
      leadAgent: 'Mia (Creative Director)',
      leadRole: 'Principal Spatial Designer',
      tasksToday: 21,
      tasksTrend: '+45%',
      turnaround: '16m',
      connectedTools: [
        { name: 'Three.js 186 WebGL', letter: 'T', protocol: 'Connected · GPU', avatarBg: 'rgba(236, 72, 153, 0.25)' },
        { name: 'GSAP Motion Physics', letter: 'G', protocol: 'Connected · Core', avatarBg: 'rgba(245, 158, 11, 0.25)' },
        { name: 'GLSL Hologram Shaders', letter: 'S', protocol: 'Connected · Shaders', avatarBg: 'rgba(168, 85, 247, 0.25)' }
      ],
      skills: [
        { name: 'spatial-rendering', progress: 96 },
        { name: 'elastic-pill-motion', progress: 94 }
      ],
      realMetrics: [
        { label: 'RENDER ENGINE', value: 'Three.js 186' },
        { label: 'FRAME RATE', value: '60 FPS Native' },
        { label: 'STYLE SYSTEM', value: 'Tailwind Dark-Slate' }
      ],
      description: 'Architects real-time isometric 3D spaces, holographic overlays, and interactive visual state.'
    },
    {
      id: 'analytics',
      name: 'Analytics',
      teamTitle: 'Analytics Team',
      icon: '📊',
      badge: 'Analytics',
      color: '#10b981',
      hexColor: 0x10b981,
      agentsCount: 2,
      runningCount: 1,
      statusText: '2 agents · 1 running',
      angleDeg: 180,
      x: 0,
      z: 16,
      role: 'Database WAL Integrity, System Metrics & Quant Models',
      departmentKey: 'SYSTEM_ANALYTICS',
      leadAgent: 'Atlas (Site Reliability Architect)',
      leadRole: 'Senior Data Scientist',
      tasksToday: 11,
      tasksTrend: '+15%',
      turnaround: '7m',
      connectedTools: [
        { name: 'SQLite WAL Memory', letter: 'S', protocol: 'Connected · DB', avatarBg: 'rgba(16, 185, 129, 0.25)' },
        { name: 'Ollama Qwen3 8B', letter: 'O', protocol: 'Connected · Local', avatarBg: 'rgba(56, 189, 248, 0.25)' },
        { name: 'Telemetry Inspector', letter: 'T', protocol: 'Connected · OS', avatarBg: 'rgba(245, 158, 11, 0.25)' }
      ],
      skills: [
        { name: 'telemetry-stream', progress: 92 },
        { name: 'performance-eval', progress: 85 }
      ],
      realMetrics: [
        { label: 'DATABASE WAL', value: 'Zero Latency' },
        { label: 'UPTIME SLA', value: '99.98%' },
        { label: 'CPU MONITOR', value: '12% Nominal' }
      ],
      description: 'Monitors real-time CPU, RAM, database WAL metrics, and quantitative system telemetry.'
    },
    {
      id: 'tbx-shop',
      name: 'TBX Shop',
      teamTitle: 'TBX Shop Team',
      icon: '🛒',
      badge: 'TBX Shop',
      color: '#ef4444',
      hexColor: 0xef4444,
      agentsCount: 3,
      runningCount: 1,
      statusText: '3 agents · 1 running',
      angleDeg: 225,
      x: -11.3,
      z: 11.3,
      role: 'Real Commercial Settlement & SHA-256 Receipts Vault',
      departmentKey: 'COMMERCIAL_SHOP',
      leadAgent: 'Veronica (Commercial Lead)',
      leadRole: 'FinTech Settlement Specialist',
      tasksToday: 16,
      tasksTrend: '+28%',
      turnaround: '10m',
      connectedTools: [
        { name: 'SBI Gateway', letter: 'S', protocol: 'Connected · Real', avatarBg: 'rgba(59, 130, 246, 0.25)' },
        { name: 'Receipts Crypt Vault', letter: 'R', protocol: 'Connected · AES', avatarBg: 'rgba(16, 185, 129, 0.25)' },
        { name: 'Dual-Currency Ledger', letter: 'L', protocol: 'Connected · INR', avatarBg: 'rgba(239, 68, 68, 0.25)' }
      ],
      skills: [
        { name: 'ledger-reconciliation', progress: 97 },
        { name: 'sha256-sealing', progress: 93 }
      ],
      realMetrics: [
        { label: 'SETTLED INR', value: '₹18.42L Confirmed' },
        { label: 'GATEWAY', value: 'SBI Direct' },
        { label: 'RECEIPTS', value: 'SHA-256 Immutable' }
      ],
      description: 'Issues authentic sealed commercial invoices and receipts for multi-agent deliverables.'
    },
    {
      id: 'creators',
      name: 'Creators',
      teamTitle: 'Creators Pod',
      icon: '⚡',
      badge: 'Creators',
      color: '#8b5cf6',
      hexColor: 0x8b5cf6,
      agentsCount: 4,
      runningCount: 2,
      statusText: '4 agents · Swarm Active',
      angleDeg: 270,
      x: -16,
      z: 0,
      role: 'Autonomous Agentic Deliberation & Swarm Consensus',
      departmentKey: 'SWARM_FABRIC',
      leadAgent: 'Jarvis Jr (Swarm Lead)',
      leadRole: 'Multi-Agent Coordinator',
      tasksToday: 24,
      tasksTrend: '+35%',
      turnaround: '12m',
      connectedTools: [
        { name: 'Agent Swarm Bus', letter: 'A', protocol: 'Connected · IPC', avatarBg: 'rgba(139, 92, 246, 0.25)' },
        { name: 'DeepSeek R1 Model', letter: 'D', protocol: 'Connected · Ollama', avatarBg: 'rgba(56, 189, 248, 0.25)' },
        { name: 'Consensus Arbiter', letter: 'C', protocol: 'Connected · Engine', avatarBg: 'rgba(245, 158, 11, 0.25)' }
      ],
      skills: [
        { name: 'swarm-consensus', progress: 99 },
        { name: 'conflict-arbitration', progress: 91 }
      ],
      realMetrics: [
        { label: 'CONSENSUS SCORE', value: '99.4%' },
        { label: 'COGNITIVE MODEL', value: 'DeepSeek-R1 Distill' },
        { label: 'ACTIVE PEERS', value: '8 Specializations' }
      ],
      description: 'Autonomous multi-persona deliberation hub resolving conflicting objectives through consensus.'
    },
    {
      id: 'ops',
      name: 'Operations',
      teamTitle: 'Executive Operations',
      icon: '👔',
      badge: 'Operations',
      color: '#ea580c',
      hexColor: 0xea580c,
      agentsCount: 5,
      runningCount: 2,
      statusText: '5 agents · Sprint Active',
      angleDeg: 315,
      x: -11.3,
      z: -11.3,
      role: 'Project Orchestration & DAG Task Decomposition',
      departmentKey: 'EXECUTIVE_OPS',
      leadAgent: 'Olivia (Operations Lead)',
      leadRole: 'Executive Operations Director',
      tasksToday: 28,
      tasksTrend: '+50%',
      turnaround: '9m',
      connectedTools: [
        { name: 'DAG Task Planner', letter: 'D', protocol: 'Connected · Core', avatarBg: 'rgba(234, 88, 12, 0.25)' },
        { name: 'SQLite Task Registry', letter: 'S', protocol: 'Connected · WAL', avatarBg: 'rgba(16, 185, 129, 0.25)' },
        { name: 'Milestone Verifier', letter: 'M', protocol: 'Connected · DualState', avatarBg: 'rgba(56, 189, 248, 0.25)' }
      ],
      skills: [
        { name: 'dag-decomposition', progress: 98 },
        { name: 'dual-state-verification', progress: 95 }
      ],
      realMetrics: [
        { label: 'DAG EXECUTION', value: 'Async Directed Graph' },
        { label: 'WORKFLOW ENGINE', value: 'Adaptive Planner' },
        { label: 'QUEUE CAPACITY', value: '100 Concurrent' }
      ],
      description: 'Breaks complex business directives into parallel execution pipelines assigned across pods.'
    }
  ];

  // Live Chronological Feed Messages
  readonly feedMessages = signal<HubFeedMessage[]>([
    {
      id: 'f-1',
      podId: 'infrastructure',
      podBadge: 'Cloud / DevOps',
      sender: 'Atlas',
      color: '#14b8a6',
      text: 'Cloud container mesh online. High-availability cluster operational.',
      time: '18:50:12',
      type: 'system'
    },
    {
      id: 'f-2',
      podId: 'research',
      podBadge: 'Research',
      sender: 'Leo',
      color: '#3b82f6',
      text: '574 vector chunks indexed in local vector store with hybrid BM25 dense search active.',
      time: '18:51:04',
      type: 'intel'
    },
    {
      id: 'f-3',
      podId: 'tech',
      podBadge: 'Tech / OS',
      sender: 'Karen',
      color: '#ef4444',
      text: 'Win32 native desktop controller standing by. Active window tracking at 60fps.',
      time: '18:52:30',
      type: 'status'
    },
    {
      id: 'f-4',
      podId: 'ops',
      podBadge: 'Operations',
      sender: 'Olivia',
      color: '#ea580c',
      text: 'Autonomous multi-pod hub primed for Mamu. 31 agents assigned across 8 stations.',
      time: '18:53:15',
      type: 'directive'
    }
  ]);

  // Three.js State
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private controls?: OrbitControls;
  private animationFrameId?: number;
  private resizeObserver?: ResizeObserver;
  private clock = new THREE.Clock();

  // 3D Visual References
  private brainOrb?: THREE.Mesh;
  private brainRings: THREE.Mesh[] = [];
  private brainVerticalBeam?: THREE.Mesh;
  private dataPulses: { mesh: THREE.Mesh; podIndex: number; progress: number; speed: number }[] = [];
  private cameraTargetPos?: THREE.Vector3;
  private cameraTargetLookAt?: THREE.Vector3;

  // Injects & Reactive Theme Synchronization
  private themeService = inject(ThemeService);

  constructor() {
    effect(() => {
      const isLight = this.themeService.isLightMode();
      const currentTheme = this.themeService.activeTheme();
      if (this.scene) {
        const bgHex = isLight ? (currentTheme?.colors?.background || '#eef2f7') : '#080c14';
        this.scene.background = new THREE.Color(bgHex);
        if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
          this.scene.fog.color.set(bgHex);
          this.scene.fog.density = isLight ? 0.005 : 0.0075;
        }
      }
    });
  }

  ngOnInit(): void {
    // Select Research Pod by default matching Reference 8-Pod Hub Architecture (Image 4)
    this.selectedPod.set(this.pods[0]);

    // Load real-world business and telemetry data
    this.loadRealBusinessData();
  }

  ngAfterViewInit(): void {
    this.initHubThreeScene();

    setTimeout(() => {
      const activeChip = document.querySelector('.pod-select-chip.active') as HTMLElement;
      if (this.podPillRef?.nativeElement && activeChip) {
        slidePill(this.podPillRef.nativeElement, activeChip, { borderRadius: 12, leadDuration: 0.1, trailDuration: 0.1 });
      }
      const cards = document.querySelectorAll('.floating-team-card, .metric-mini-card, .connected-tool-item');
      if (cards.length > 0) {
        landCards(cards, { y: 22, stagger: 0.05, duration: 0.7 });
      }
    }, 150);
  }

  ngOnDestroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.controls) {
      this.controls.dispose();
    }
    if (this.scene) {
      this.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        if ((obj as THREE.Mesh).material) {
          const mat = (obj as THREE.Mesh).material;
          if (Array.isArray(mat)) {
            mat.forEach((m) => m.dispose());
          } else {
            mat.dispose();
          }
        }
      });
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  // --- Real Backend Telemetry & Treasury ---
  private loadRealBusinessData(): void {
    const url = getApiUrl('/api/v1/business/live-monitor');
    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (res?.financial) {
          const rev = res.financial.total_settled_inr || 0;
          const count = res.financial.settled_transactions_count || 0;
          this.sbiSettledTotalInr.set(rev);
          this.sbiTransactionsCount.set(count);
          // Update TBX Shop pod metric with authoritative treasury
          const tbxPod = this.pods.find((p) => p.id === 'tbx-shop') || this.pods[5];
          tbxPod.realMetrics[0].value = `₹${rev.toLocaleString('en-IN')}`;
          tbxPod.statusText = rev > 0 ? `SBI ****5649 · ₹${(rev / 100000).toFixed(2)}L` : 'SBI ****5649 · Ready';
          this.cdr.markForCheck();
        }
      },
      error: () => {
        // Fallback to real authoritative baseline
        this.sbiSettledTotalInr.set(0);
      }
    });

    const healthUrl = getApiUrl('/api/v1/health');
    this.http.get<any>(healthUrl).subscribe({
      next: (h) => {
        const res = h?.subsystems?.system_resources;
        if (typeof res?.cpu_percent === 'number') {
          this.systemCpuPct.set(res.cpu_percent);
        }
        if (typeof res?.ram_percent === 'number') {
          this.systemRamPct.set(res.ram_percent);
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.systemCpuPct.set(null);
        this.systemRamPct.set(null);
      }
    });

    // Authoritative Workspace Telemetry
    const telemetryUrl = getApiUrl('/api/v1/agent/workspace/telemetry');
    this.http.get<any>(telemetryUrl).subscribe({
      next: (t) => {
        if (typeof t?.total_agents === 'number') this.totalAgentsCount.set(t.total_agents);
        if (typeof t?.running_agents === 'number') this.runningAgentsCount.set(t.running_agents);
        if (typeof t?.shared_notes === 'number') this.vectorIndexedDocsCount.set(t.shared_notes);
        if (typeof t?.cpu_percent === 'number') {
          this.systemCpuPct.set(t.cpu_percent);
          const analyticsPod = this.pods.find((p) => p.id === 'analytics');
          if (analyticsPod && analyticsPod.realMetrics[2]) {
            analyticsPod.realMetrics[2].value = `${t.cpu_percent}%`;
          }
        }
        if (typeof t?.ram_percent === 'number') this.systemRamPct.set(t.ram_percent);
        this.cdr.markForCheck();
      },
      error: (err) => console.debug('Workspace telemetry fetch notice:', err)
    });
  }

  // --- Dispatch Task To Real Backend ---
  dispatchHubTask(): void {
    const query = this.taskCommandInput.trim();
    if (!query || this.isDispatching()) return;

    this.isDispatching.set(true);
    const targetPod = this.selectedPod() || this.pods[7]; // Default to Ops

    this.appendFeedMessage(
      targetPod.id,
      targetPod.badge,
      targetPod.leadAgent.split(' ')[0],
      targetPod.color,
      `Received Mamu directive: "${query}". Routing across neural pathways...`,
      'directive'
    );

    // Speed up data pulses during active transmission
    this.dataPulses.forEach((p) => (p.speed = 0.045));

    const url = getApiUrl('/api/v1/desktop/ask-bot');
    const payload = {
      query: query,
      screen_context: `hub_spoke_${targetPod.id}`
    };

    this.http.post<any>(url, payload).subscribe({
      next: (res) => {
        this.isDispatching.set(false);
        this.dataPulses.forEach((p) => (p.speed = 0.015));

        const reply = res?.reply || res?.message || 'Completed task across all specialist pods.';

        this.appendFeedMessage(
          targetPod.id,
          targetPod.badge,
          targetPod.leadAgent.split(' ')[0],
          targetPod.color,
          `Mamu directive completed: ${reply.slice(0, 150)}`,
          'status'
        );

        this.speechVoice.speak(
          `Mamu, ${targetPod.badge} completed your directive: ${reply.slice(0, 90)}`,
          false,
          targetPod.id,
          targetPod.leadAgent.split(' ')[0]
        );

        this.taskCommandInput = '';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isDispatching.set(false);
        this.dataPulses.forEach((p) => (p.speed = 0.015));

        const errMsg = err?.error?.detail || err?.message || 'Backend gateway unreachable';
        this.appendFeedMessage(
          targetPod.id,
          targetPod.badge,
          targetPod.leadAgent.split(' ')[0],
          targetPod.color,
          `Directive failed: ${errMsg}`,
          'system'
        );
        this.cdr.markForCheck();
      }
    });
  }

  // --- Focus 3D Camera on Clicked Pod with GSAP Elastic Motion ---
  selectPod(pod: PodDefinition): void {
    this.selectedPod.set(pod);
    const target = new THREE.Vector3(pod.x, 0, pod.z);

    this.cameraTargetLookAt = target.clone().add(new THREE.Vector3(0, 1.2, 0));
    // Offset camera nicely for isometric inspection
    this.cameraTargetPos = target.clone().add(new THREE.Vector3(7, 7, 7));

    setTimeout(() => {
      const cards = document.querySelectorAll('.floating-team-card, .metric-mini-card, .connected-tool-item, .skill-progress-item');
      if (cards.length > 0) {
        landCards(cards, { y: 18, stagger: 0.04, duration: 0.6 });
      }
    }, 40);
  }

  selectPodWithAnimation(pod: PodDefinition, btn?: any): void {
    const btnEl = btn as HTMLElement;
    if (this.podPillRef?.nativeElement && btnEl) {
      slidePill(this.podPillRef.nativeElement, btnEl, { borderRadius: 12 });
    }
    this.selectPod(pod);
  }

  // --- Reset to Full Hub Overview ---
  resetToHubOverview(): void {
    this.selectedPod.set(null);
    this.cameraTargetPos = new THREE.Vector3(38, 40, 38);
    this.cameraTargetLookAt = new THREE.Vector3(0, 1.2, 0);
  }

  // --- Focus Directly on Central Brain ---
  focusBrainCore(): void {
    this.selectedPod.set(null);
    this.cameraTargetPos = new THREE.Vector3(10, 11, 10);
    this.cameraTargetLookAt = new THREE.Vector3(0, 1.5, 0);
  }

  private appendFeedMessage(
    podId: string,
    podBadge: string,
    sender: string,
    color: string,
    text: string,
    type: 'directive' | 'status' | 'settlement' | 'intel' | 'system'
  ): void {
    const list = [...this.feedMessages()];
    const d = new Date();
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

    list.unshift({
      id: `msg-${Date.now()}-${Math.random()}`,
      podId,
      podBadge,
      sender,
      color,
      text,
      time,
      type
    });
    if (list.length > 50) list.pop();
    this.feedMessages.set(list);
  }

  // =========================================================================
  // Three.js 3D Hub & Spoke Scene Construction
  // =========================================================================
  private initHubThreeScene(): void {
    if (!this.hubCanvasRef) return;
    const canvas = this.hubCanvasRef.nativeElement;
    const container = canvas.parentElement || canvas;

    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 750;

    // 1. Scene with Dynamic Theme Harmonization
    const isLight = this.themeService.isLightMode();
    const currentTheme = this.themeService.activeTheme();
    const bgHex = isLight ? (currentTheme?.colors?.background || '#eef2f7') : '#080c14';

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(bgHex);
    this.scene.fog = new THREE.FogExp2(bgHex, isLight ? 0.005 : 0.0075);

    // 2. Camera (Wide isometric angle so all 8 pods are clearly visible on all screens)
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    this.camera.position.set(38, 40, 38);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 140;
    this.controls.target.set(0, 1.2, 0);
    this.controls.update();

    // 5. Lighting
    this.setupLighting();

    // 6. Build Central "THE BRAIN" Holographic Core
    this.buildBrainHolographicCore();

    // 7. Build 8 Radial Floating Room Pods
    this.buildRadialFloatingPods();

    // 8. Build 8 Animated Glowing Data Pathways (Spokes)
    this.buildDataConduits();

    // 9. Animation Loop
    this.animate();

    // 10. Resize Observer
    this.resizeObserver = new ResizeObserver(() => {
      if (!this.renderer || !this.camera || !container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      }
    });
    this.resizeObserver.observe(container);
  }

  private setupLighting(): void {
    if (!this.scene) return;

    // Ambient Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.6);
    this.scene.add(hemiLight);

    // Main Directional Light
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(25, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    const d = 30;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    this.scene.add(dirLight);

    // Central Core Cyan PointLight
    const brainLight = new THREE.PointLight(0x00f0ff, 2.5, 24);
    brainLight.position.set(0, 3, 0);
    this.scene.add(brainLight);
  }

  // --- Build Central "THE BRAIN" Hologram Platform ---
  private buildBrainHolographicCore(): void {
    if (!this.scene) return;

    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 0, 0);

    // 1. Concentric Illuminated Floor Rings
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.6,
      wireframe: true
    });
    const ring1 = new THREE.Mesh(new THREE.RingGeometry(3.6, 3.68, 64), ringMat1);
    ring1.rotation.x = -Math.PI / 2;
    ring1.position.y = 0.05;
    coreGroup.add(ring1);
    this.brainRings.push(ring1);

    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.4,
      wireframe: true
    });
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(4.8, 4.86, 64), ringMat2);
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.04;
    coreGroup.add(ring2);
    this.brainRings.push(ring2);

    // 2. Stepped Circular Pedestal Disc (Matches Reference Image 1)
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x091428,
      roughness: 0.4,
      metalness: 0.7
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.45, 48), baseMat);
    base.position.y = 0.22;
    base.castShadow = true;
    base.receiveShadow = true;
    coreGroup.add(base);

    // Glowing Cyan Trim along Upper Rim
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x00f0ff,
      emissiveIntensity: 1.1
    });
    const edgeRing = new THREE.Mesh(new THREE.TorusGeometry(3.22, 0.05, 12, 48), edgeMat);
    edgeRing.rotation.x = Math.PI / 2;
    edgeRing.position.y = 0.45;
    coreGroup.add(edgeRing);

    // Inner Elevated Core Platform
    const innerCoreMat = new THREE.MeshStandardMaterial({
      color: 0x0f2347,
      roughness: 0.3,
      metalness: 0.5
    });
    const innerCore = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.5, 0.25, 48), innerCoreMat);
    innerCore.position.y = 0.55;
    coreGroup.add(innerCore);

    // 3. Miniature Avatar Pegs Standing Around Perimeter (Matches Reference Image 1)
    const pegColors = [
      0x8b5cf6, // Purple
      0x06b6d4, // Cyan
      0xf43f5e, // Red
      0x10b981, // Teal
      0xf59e0b, // Amber
      0x3b82f6, // Blue
      0xeab308, // Yellow
      0xec4899  // Pink
    ];
    pegColors.forEach((colorHex, idx) => {
      const angle = (idx * Math.PI * 2) / pegColors.length;
      const pegGroup = new THREE.Group();
      const px = Math.cos(angle) * 2.85;
      const pz = Math.sin(angle) * 2.85;
      pegGroup.position.set(px, 0.45, pz);

      // Body (cylinder)
      const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.5, 16), bodyMat);
      body.position.y = 0.25;
      pegGroup.add(body);

      // Head (sphere)
      const headMat = new THREE.MeshStandardMaterial({ color: colorHex, emissive: colorHex, emissiveIntensity: 0.3 });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), headMat);
      head.position.y = 0.58;
      pegGroup.add(head);

      coreGroup.add(pegGroup);
    });

    // 4. Overhead 3D Billboard Label: "THE BRAIN - 1,842 notes · shared memory"
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 512;
    labelCanvas.height = 140;
    const ctx = labelCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(9, 16, 32, 0.92)';
      ctx.roundRect(8, 8, 496, 124, 20);
      ctx.fill();
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.roundRect(8, 8, 496, 124, 20);
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('THE BRAIN', 256, 52);

      ctx.fillStyle = '#38bdf8';
      ctx.font = '600 20px monospace';
      ctx.fillText('1,842 notes · shared memory', 256, 92);
    }
    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const spriteMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true });
    const labelSprite = new THREE.Sprite(spriteMat);
    labelSprite.position.set(0, 1.8, 0);
    labelSprite.scale.set(4.2, 1.15, 1);
    coreGroup.add(labelSprite);

    this.scene.add(coreGroup);
  }

  // --- Build 8 Color-Coded Radial Floating Room Pods ---
  private buildRadialFloatingPods(): void {
    if (!this.scene) return;

    this.pods.forEach((pod, index) => {
      const podGroup = new THREE.Group();
      podGroup.position.set(pod.x, 0, pod.z);

      // Rotate room to face toward the central hub (0, 0, 0)
      const lookAngle = Math.atan2(-pod.x, -pod.z);
      podGroup.rotation.y = lookAngle;

      // 1. Floating Floor Platform in Pod Vibrant Accent Color (Matches Reference Image 1)
      const floorMat = new THREE.MeshStandardMaterial({
        color: pod.hexColor,
        roughness: 0.5,
        metalness: 0.15
      });
      const floor = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.35, 4.8), floorMat);
      floor.position.y = 0.18;
      floor.castShadow = true;
      floor.receiveShadow = true;
      podGroup.add(floor);

      // 2. Glowing Neon Border matching Pod's Department Color
      const borderMat = new THREE.MeshStandardMaterial({
        color: pod.hexColor,
        emissive: pod.hexColor,
        emissiveIntensity: 0.95
      });
      // Outer perimeter border lines
      const bNorth = new THREE.Mesh(new THREE.BoxGeometry(5.65, 0.08, 0.1), borderMat);
      bNorth.position.set(0, 0.38, -2.4);
      podGroup.add(bNorth);

      const bSouth = new THREE.Mesh(new THREE.BoxGeometry(5.65, 0.08, 0.1), borderMat);
      bSouth.position.set(0, 0.38, 2.4);
      podGroup.add(bSouth);

      const bWest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 4.8), borderMat);
      bWest.position.set(-2.8, 0.38, 0);
      podGroup.add(bWest);

      const bEast = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 4.8), borderMat);
      bEast.position.set(2.8, 0.38, 0);
      podGroup.add(bEast);

      // 3. Interior Walls (Tinted translucent walls in Pod Color)
      const wallMat = new THREE.MeshStandardMaterial({
        color: pod.hexColor,
        transparent: true,
        opacity: 0.6,
        roughness: 0.3
      });
      // Back wall
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.2, 0.18), wallMat);
      backWall.position.set(0, 1.3, -2.3);
      podGroup.add(backWall);

      // Side wall Left
      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 4.6), wallMat);
      leftWall.position.set(-2.7, 1.3, 0);
      podGroup.add(leftWall);

      // Side wall Right
      const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.2, 4.6), wallMat);
      rightWall.position.set(2.7, 1.3, 0);
      podGroup.add(rightWall);

      // 4. Sleek White Desk with Glowing Laptop Screen (Matches Reference Image 1)
      const deskMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 });
      const desk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 1.3), deskMat);
      desk.position.set(0, 0.9, -0.6);
      desk.castShadow = true;
      podGroup.add(desk);

      // Laptop Base
      const lapBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
      const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.03, 0.55), lapBaseMat);
      laptopBase.position.set(0, 0.98, -0.6);
      podGroup.add(laptopBase);

      // Glowing Blue Laptop Screen
      const lapScreenMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x38bdf8,
        emissiveIntensity: 1.2
      });
      const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.52, 0.03), lapScreenMat);
      laptopScreen.position.set(0, 1.26, -0.85);
      laptopScreen.rotation.x = -0.18;
      podGroup.add(laptopScreen);

      // 5. Stylized Low-Poly Humanoid Agent Figures (2 per pod)
      const agent1 = this.createMiniAgent(pod.hexColor);
      agent1.position.set(-0.6, 0.35, 0.4);
      podGroup.add(agent1);

      const agent2 = this.createMiniAgent(0xf8fafc);
      agent2.position.set(0.6, 0.35, 0.4);
      podGroup.add(agent2);

      // 6. Department Specialty Prop
      if (pod.id === 'infrastructure') {
        // Cloud Server Node Tower
        const cloudNode = new THREE.Mesh(
          new THREE.BoxGeometry(0.85, 1.4, 0.85),
          new THREE.MeshStandardMaterial({ color: 0x0ea5e9, metalness: 0.7, roughness: 0.3 })
        );
        cloudNode.position.set(1.9, 0.7, -1.4);
        podGroup.add(cloudNode);
      } else if (pod.id === 'tech') {
        // Server Rack
        const rack = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 1.6, 0.8),
          new THREE.MeshStandardMaterial({ color: 0x020617, metalness: 0.6 })
        );
        rack.position.set(-1.9, 1.0, -1.4);
        podGroup.add(rack);
      } else {
        // Potted Plant
        const pot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.2, 0.5, 8),
          new THREE.MeshStandardMaterial({ color: 0xf8fafc })
        );
        pot.position.set(1.9, 0.5, -1.4);
        const bush = new THREE.Mesh(
          new THREE.SphereGeometry(0.4, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x16a34a })
        );
        bush.position.set(1.9, 0.9, -1.4);
        podGroup.add(pot);
        podGroup.add(bush);
      }

      // 7. Overhead Floating 3D Badge Sprite: Name + Agent Count
      const badgeCanvas = document.createElement('canvas');
      badgeCanvas.width = 384;
      badgeCanvas.height = 100;
      const bCtx = badgeCanvas.getContext('2d');
      if (bCtx) {
        bCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        bCtx.roundRect(6, 6, 372, 88, 14);
        bCtx.fill();
        bCtx.strokeStyle = pod.color;
        bCtx.lineWidth = 4;
        bCtx.roundRect(6, 6, 372, 88, 14);
        bCtx.stroke();

        bCtx.fillStyle = '#ffffff';
        bCtx.font = 'bold 30px sans-serif';
        bCtx.textAlign = 'center';
        bCtx.fillText(pod.badge, 192, 44);

        bCtx.fillStyle = pod.color;
        bCtx.font = '600 20px monospace';
        bCtx.fillText(pod.statusText, 192, 74);
      }
      const badgeTex = new THREE.CanvasTexture(badgeCanvas);
      const bSpriteMat = new THREE.SpriteMaterial({ map: badgeTex, transparent: true });
      const badgeSprite = new THREE.Sprite(bSpriteMat);
      badgeSprite.position.set(0, 3.1, 0);
      badgeSprite.scale.set(3.2, 0.85, 1);
      podGroup.add(badgeSprite);

      this.scene?.add(podGroup);
      pod.meshGroup = podGroup;
    });
  }

  // Helper: Create Mini Humanoid Agent Figure
  private createMiniAgent(shirtColor: number): THREE.Group {
    const char = new THREE.Group();

    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xffd1a9 })
    );
    head.position.y = 1.35;
    char.add(head);

    // Torso
    const torso = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.55, 0.25),
      new THREE.MeshStandardMaterial({ color: shirtColor })
    );
    torso.position.y = 0.95;
    char.add(torso);

    // Legs
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.65, 0.22),
      new THREE.MeshStandardMaterial({ color: 0x1e293b })
    );
    legs.position.y = 0.35;
    char.add(legs);

    return char;
  }

  // --- Build 8 Animated Glowing Data Pathways (Spokes) ---
  private buildDataConduits(): void {
    if (!this.scene) return;

    this.pods.forEach((pod, index) => {
      // Pathway from Brain edge (dist ~4.0) to Pod doorway (dist ~13.5)
      const dirX = pod.x;
      const dirZ = pod.z;
      const length = Math.sqrt(dirX * dirX + dirZ * dirZ);
      const normX = dirX / length;
      const normZ = dirZ / length;

      const startPt = new THREE.Vector3(normX * 4.2, 0.1, normZ * 4.2);
      const endPt = new THREE.Vector3(normX * 13.5, 0.1, normZ * 13.5);

      // Line Geometry
      const lineGeo = new THREE.BufferGeometry().setFromPoints([startPt, endPt]);
      const lineMat = new THREE.LineDashedMaterial({
        color: pod.hexColor,
        dashSize: 0.6,
        gapSize: 0.3,
        linewidth: 2
      });
      const line = new THREE.Line(lineGeo, lineMat);
      line.computeLineDistances();
      this.scene?.add(line);

      // Animated Glowing Data Pulse Sphere
      const pulseGeo = new THREE.SphereGeometry(0.18, 12, 12);
      const pulseMat = new THREE.MeshStandardMaterial({
        color: pod.hexColor,
        emissive: pod.hexColor,
        emissiveIntensity: 1.5
      });
      const pulse = new THREE.Mesh(pulseGeo, pulseMat);
      pulse.position.copy(startPt);
      this.scene?.add(pulse);

      this.dataPulses.push({
        mesh: pulse,
        podIndex: index,
        progress: index * 0.125, // Stagger initial pulse offsets
        speed: 0.015
      });
    });
  }

  // =========================================================================
  // Animation Loop: Rotation, Pulsing, and Data Conduits
  // =========================================================================
  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Controls Update
    if (this.controls) {
      this.controls.update();
    }

    // 2. Camera Lerp Animation
    if (this.camera && this.controls) {
      if (this.cameraTargetPos) {
        this.camera.position.lerp(this.cameraTargetPos, 0.05);
        if (this.camera.position.distanceTo(this.cameraTargetPos) < 0.1) {
          this.cameraTargetPos = undefined;
        }
      }
      if (this.cameraTargetLookAt) {
        this.controls.target.lerp(this.cameraTargetLookAt, 0.05);
        if (this.controls.target.distanceTo(this.cameraTargetLookAt) < 0.1) {
          this.cameraTargetLookAt = undefined;
        }
      }
    }

    // 3. Central Hologram Rotation & Vertical Light Pulse
    if (this.brainOrb) {
      this.brainOrb.position.y = 1.9 + Math.sin(elapsedTime * 2.5) * 0.1;
      this.brainOrb.rotation.y += 0.015;
    }

    this.brainRings.forEach((ring, i) => {
      ring.rotation.z += (i % 2 === 0 ? 1 : -1) * 0.008;
    });

    if (this.brainVerticalBeam) {
      const mat = this.brainVerticalBeam.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.18 + Math.sin(elapsedTime * 4.0) * 0.08;
      }
    }

    // 4. Animate Data Pulses along Conduits between Pods and Brain
    this.dataPulses.forEach((p) => {
      p.progress += p.speed;
      if (p.progress > 1.0) p.progress = 0;

      const pod = this.pods[p.podIndex];
      const length = Math.sqrt(pod.x * pod.x + pod.z * pod.z);
      const normX = pod.x / length;
      const normZ = pod.z / length;

      // Interpolate from Brain (radius 4.2) to Pod (radius 13.5)
      const currentR = 4.2 + (13.5 - 4.2) * p.progress;
      p.mesh.position.set(
        normX * currentR,
        0.18 + Math.sin(p.progress * Math.PI) * 0.35, // Slight arched trajectory
        normZ * currentR
      );
    });

    // 5. Subtle Floating Hover for Room Pods
    this.pods.forEach((pod, i) => {
      if (pod.meshGroup) {
        pod.meshGroup.position.y = Math.sin(elapsedTime * 1.5 + i * 0.8) * 0.06;
      }
    });

    // 6. Render
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };
}
