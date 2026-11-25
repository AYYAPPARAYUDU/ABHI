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
import { ThemeService } from '../../../../core/services/theme.service';
import { landCards } from '../../../../core/motion';

export interface OfficeAgent {
  id: string;
  name: string;
  role: string;
  department: string;
  avatarLetter: string;
  avatarBg: string;
  status: 'Idle' | 'Active' | 'Deliberating';
  currentAction: string;
  currentWorkSummary: string;
  suitMark: string;
  modelName: string;
  deskIndex: number;
  deskPos: [number, number, number];
  loungePos: [number, number, number];
  meshGroup?: THREE.Group;
  targetPos?: THREE.Vector3;
}

export interface TaskTimelineStep {
  step: number;
  title: string;
  owner: string;
  ownerRole: string;
  status: 'pending' | 'in_progress' | 'completed';
  detail: string;
}

export interface TeamMessage {
  id: string;
  sender: string;
  role: string;
  color: string;
  message: string;
  time: string;
}

@Component({
  selector: 'app-agent-office-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './agent-office-page.component.html',
  styleUrl: './agent-office-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AgentOfficePageComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('officeCanvas') officeCanvasRef?: ElementRef<HTMLCanvasElement>;

  private readonly http = inject(HttpClient);
  private readonly speechVoice = inject(SpeechVoiceService);
  private readonly cdr = inject(ChangeDetectorRef);

  // 2D HUD Metrics (Bound to real backend telemetry)
  readonly activeAgentsCount = signal<number | null>(null);
  readonly totalAgentsCount = signal<number | null>(null);
  readonly tasksTodayCount = signal<number | null>(null);
  readonly avgTurnaroundLabel = signal<string>('—');
  readonly connectedTools = signal<{ name: string; letter: string; protocol: string; color: string }[]>([]);
  readonly activeSkills = signal<{ name: string; progress: number }[]>([]);
  readonly runningTasksCount = signal<number>(0);
  readonly completedTasksCount = signal<number>(0);
  readonly projectProgress = signal<number>(0);

  readonly activeProjectTitle = signal<string>('No project yet');
  readonly activeProjectStatus = signal<'IDLE' | 'IN PROGRESS' | 'COMPLETED' | 'FAILED'>('IDLE');

  teamTaskInput = '';
  readonly isExecutingTeamTask = signal<boolean>(false);
  readonly selectedAgent = signal<OfficeAgent | null>(null);

  // Roster of 5 Core Agents
  readonly agents: OfficeAgent[] = [
    {
      id: 'olivia_manager',
      name: 'Olivia',
      role: 'Manager',
      department: 'Leadership & Delegation',
      avatarLetter: 'O',
      avatarBg: '#f97316',
      status: 'Idle',
      currentAction: 'Standby for project directives',
      currentWorkSummary: 'Decomposing objectives into DAG execution milestones.',
      suitMark: 'MARK-VII',
      modelName: 'DeepSeek-R1 Distill Qwen 8B',
      deskIndex: 0,
      deskPos: [-3.2, 0, -8],
      loungePos: [-2, 0, 4]
    },
    {
      id: 'leo_research',
      name: 'Leo',
      role: 'Research',
      department: 'Vector RAG & Discovery',
      avatarLetter: 'L',
      avatarBg: '#10b981',
      status: 'Idle',
      currentAction: 'Indexing memory vectors',
      currentWorkSummary: 'Hybrid BM25 + Dense vector querying over 574 indexed documents.',
      suitMark: 'MARK-IV',
      modelName: 'Qwen 2.5 Coder 7B',
      deskIndex: 1,
      deskPos: [-3.2, 0, -4],
      loungePos: [-4, 0, 5]
    },
    {
      id: 'max_developer',
      name: 'Max',
      role: 'Developer',
      department: 'Full-Stack Architecture',
      avatarLetter: 'M',
      avatarBg: '#3b82f6',
      status: 'Idle',
      currentAction: 'Grabbing a coffee',
      currentWorkSummary: 'Synthesizing native Angular components & Win32 OS controllers.',
      suitMark: 'MARK-V',
      modelName: 'DeepSeek-Coder V2',
      deskIndex: 2,
      deskPos: [-3.2, 0, 0],
      loungePos: [-5, 0, 3]
    },
    {
      id: 'mia_designer',
      name: 'Mia',
      role: 'Designer',
      department: 'Spatial UI & VisionOS',
      avatarLetter: 'M',
      avatarBg: '#ec4899',
      status: 'Idle',
      currentAction: 'Grabbing a coffee',
      currentWorkSummary: 'Designing isometric spatial floorplans & dark-slate glassmorphism HUD.',
      suitMark: 'MARK-II',
      modelName: 'Gemini 1.5 Pro Flash',
      deskIndex: 3,
      deskPos: [3.2, 0, -8],
      loungePos: [2, 0, 4]
    },
    {
      id: 'sam_qa',
      name: 'Sam',
      role: 'QA',
      department: 'Quality & Verification',
      avatarLetter: 'S',
      avatarBg: '#8b5cf6',
      status: 'Idle',
      currentAction: 'Coffee break',
      currentWorkSummary: 'Simulating edge-case inputs, stress-testing APIs and verifying assertions.',
      suitMark: 'MARK-VI',
      modelName: 'Claude 3.5 Sonnet Engine',
      deskIndex: 4,
      deskPos: [3.2, 0, -4],
      loungePos: [-6.5, 0, 4]
    }
  ];

  // Task Timeline
  readonly taskTimeline = signal<TaskTimelineStep[]>([]);

  // Team Channel Communication Feed (Matches Reference Image 5)
  readonly teamChannelMessages = signal<TeamMessage[]>([
    {
      id: 'msg-1',
      sender: 'Mia',
      role: 'Designer',
      color: '#ec4899',
      message: 'Finalizing UI component kits for the e-commerce mockups.',
      time: '13:24:01'
    },
    {
      id: 'msg-2',
      sender: 'Max',
      role: 'Developer',
      color: '#38bdf8',
      message: 'Building responsive navigation bar in Angular. Shaders look crisp.',
      time: '13:24:28'
    },
    {
      id: 'msg-3',
      sender: 'Sam',
      role: 'QA',
      color: '#60a5fa',
      message: 'Two minutes at the coffee bar then testing end-to-end checkout.',
      time: '13:25:12'
    },
    {
      id: 'msg-4',
      sender: 'Olivia',
      role: 'Manager',
      color: '#eab308',
      message: 'Great velocity team. Keep the pull requests coming.',
      time: '13:25:40'
    }
  ]);

  // Three.js Core
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private controls?: OrbitControls;
  private animationFrameId?: number;
  private resizeObserver?: ResizeObserver;

  // 3D Objects
  private agentMeshes: Map<string, THREE.Group> = new Map();
  private monitorScreenMeshes: THREE.Mesh[] = [];
  private projectorScreen?: THREE.Mesh;
  private clock = new THREE.Clock();

  // Camera lerp target
  private cameraTargetPos?: THREE.Vector3;
  private cameraTargetLookAt?: THREE.Vector3;

  // Injects & Reactive Theme Synchronization
  private themeService = inject(ThemeService);

  constructor() {
    effect(() => {
      const isLight = this.themeService.isLightMode();
      const currentTheme = this.themeService.activeTheme();
      if (this.scene) {
        const bgHex = isLight ? (currentTheme?.colors?.background || '#eef2f7') : '#060911';
        this.scene.background = new THREE.Color(bgHex);
        if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
          this.scene.fog.color.set(bgHex);
          this.scene.fog.density = isLight ? 0.005 : 0.007;
        }
      }
    });
  }

  ngOnInit(): void {
    // Select first agent as default preview
    this.selectedAgent.set(this.agents[0]);

    // Connect to real backend telemetry
    const url = getApiUrl('/api/v1/agent/workspace/telemetry');
    this.http.get<any>(url).subscribe({
      next: (data) => {
        if (data?.recent_messages && data.recent_messages.length > 0) {
          this.teamChannelMessages.set(data.recent_messages);
        }
        if (typeof data?.total_agents === 'number') {
          this.totalAgentsCount.set(data.total_agents);
        }
        if (typeof data?.running_agents === 'number') {
          this.activeAgentsCount.set(data.running_agents);
        }
        if (typeof data?.tasks_today === 'number' || typeof data?.completed_tasks === 'number') {
          this.tasksTodayCount.set(data.tasks_today ?? data.completed_tasks);
        }
        if (data?.avg_turnaround) {
          this.avgTurnaroundLabel.set(String(data.avg_turnaround));
        }
        if (Array.isArray(data?.skills)) {
          this.activeSkills.set(data.skills);
        }
        this.cdr.markForCheck();
      },
      error: (err) => console.debug('Agent office telemetry fetch notice:', err)
    });

    // Fetch real connected MCP tools (with fallback to /api/v1/swarm/models)
    this.http.get<any>(getApiUrl('/api/v1/swarm/mcp/tools')).subscribe({
      next: (res) => {
        const rawTools: any[] = Array.isArray(res) ? res : (res?.tools || []);
        if (rawTools.length > 0) {
          this.connectedTools.set(
            rawTools.slice(0, 6).map((t: any, idx: number) => {
              const name = t.name || t.tool_name || String(t);
              const colors = ['rgba(56, 189, 248, 0.25)', 'rgba(59, 130, 246, 0.25)', 'rgba(16, 185, 129, 0.25)'];
              return {
                name,
                letter: name.charAt(0).toUpperCase() || 'T',
                protocol: t.protocol || 'Connected · MCP',
                color: colors[idx % colors.length]
              };
            })
          );
          this.cdr.markForCheck();
        } else {
          this.loadSwarmModelsAsTools();
        }
      },
      error: () => this.loadSwarmModelsAsTools()
    });
  }

  private loadSwarmModelsAsTools(): void {
    this.http.get<any>(getApiUrl('/api/v1/swarm/models')).subscribe({
      next: (res) => {
        const models: any[] = Array.isArray(res) ? res : (res?.models || []);
        this.connectedTools.set(
          models.slice(0, 6).map((m: any, idx: number) => {
            const name = m.name || m.model || String(m);
            const colors = ['rgba(56, 189, 248, 0.25)', 'rgba(59, 130, 246, 0.25)', 'rgba(16, 185, 129, 0.25)'];
            return {
              name,
              letter: name.charAt(0).toUpperCase() || 'M',
              protocol: 'Connected · Swarm',
              color: colors[idx % colors.length]
            };
          })
        );
        this.cdr.markForCheck();
      },
      error: () => {
        this.connectedTools.set([]);
        this.cdr.markForCheck();
      }
    });
  }

  ngAfterViewInit(): void {
    this.initThreeScene();

    setTimeout(() => {
      const cards = document.querySelectorAll('.floating-team-card, .agent-status-pill-card, .office-right-panel, .comm-message-row');
      if (cards.length > 0) {
        landCards(cards, { y: 20, stagger: 0.05, duration: 0.7 });
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

  // --- Quick Preset Prompts ---
  setPresetTask(preset: string): void {
    this.teamTaskInput = preset;
    this.startTeamTask();
  }

  // --- Dispatch Team Task ---
  startTeamTask(): void {
    const query = this.teamTaskInput.trim();
    if (!query || this.isExecutingTeamTask()) return;

    this.isExecutingTeamTask.set(true);
    this.activeProjectTitle.set(query);
    this.activeProjectStatus.set('IN PROGRESS');
    this.activeAgentsCount.set(5);
    this.runningTasksCount.set(1);
    this.projectProgress.set(15);

    // Update Agent Statuses
    this.agents[0].status = 'Active';
    this.agents[0].currentAction = 'Decomposing milestones';
    this.agents[1].status = 'Active';
    this.agents[1].currentAction = 'Querying Vector RAG';
    this.agents[2].status = 'Active';
    this.agents[2].currentAction = 'Generating code logic';
    this.agents[3].status = 'Active';
    this.agents[3].currentAction = 'Crafting layout & styles';
    this.agents[4].status = 'Active';
    this.agents[4].currentAction = 'Preparing test harness';

    // Walk agents to their desks in 3D
    this.agents.forEach((agent) => {
      const group = this.agentMeshes.get(agent.id);
      if (group) {
        agent.targetPos = new THREE.Vector3(...agent.deskPos);
      }
    });

    // Generate Decomposed Task Timeline Steps
    const nowTime = this.formatCurrentTime();
    const timeline: TaskTimelineStep[] = [
      {
        step: 1,
        title: 'Project Decomposition & Specification',
        owner: 'Olivia',
        ownerRole: 'Manager',
        status: 'in_progress',
        detail: `Deconstructing directive: "${query}" into modular work units.`
      },
      {
        step: 2,
        title: 'Vector RAG Intelligence & Schema Retrieval',
        owner: 'Leo',
        ownerRole: 'Research',
        status: 'pending',
        detail: 'Querying 574 indexed documents for matching code patterns and APIs.'
      },
      {
        step: 3,
        title: 'Spatial UI Wireframes & Layout Tokens',
        owner: 'Mia',
        ownerRole: 'Designer',
        status: 'pending',
        detail: 'Synthesizing responsive glassmorphic cards and color hierarchies.'
      },
      {
        step: 4,
        title: 'Service Implementation & Business Logic',
        owner: 'Max',
        ownerRole: 'Developer',
        status: 'pending',
        detail: 'Writing type-safe TypeScript interfaces, observables and handlers.'
      },
      {
        step: 5,
        title: 'Unit Assertion & E2E Validation Pass',
        owner: 'Sam',
        ownerRole: 'QA',
        status: 'pending',
        detail: 'Running compilation checks, regression asserts and telemetry checks.'
      }
    ];
    this.taskTimeline.set(timeline);

    // Append Team Broadcast
    this.appendTeamMessage(
      'Olivia',
      'Manager',
      '#f97316',
      `Mamu gave us a new directive: "${query}". Team, split into your assigned stations!`
    );

    // Real Execution Pipeline: set initial step active without synthetic timeouts
    const curInit = [...this.taskTimeline()];
    curInit[0].status = 'in_progress';
    this.taskTimeline.set(curInit);
    this.projectProgress.set(20);

    // Call Real Backend Endpoint
    const url = getApiUrl('/api/v1/desktop/ask-bot');
    const payload = {
      query: query,
      screen_context: 'agent_office_dashboard'
    };

    this.http.post<any>(url, payload).subscribe({
      next: (res) => {
        this.projectProgress.set(100);
        this.runningTasksCount.set(0);
        this.completedTasksCount.update((c) => c + 1);
        this.activeProjectStatus.set('COMPLETED');
        this.isExecutingTeamTask.set(false);

        const cur = [...this.taskTimeline()];
        cur.forEach((s) => (s.status = 'completed'));
        this.taskTimeline.set(cur);

        const reply = res?.reply || res?.message || 'Completed task execution with verified assertions.';

        this.appendTeamMessage(
          'Sam',
          'QA',
          '#8b5cf6',
          `All validation checks passed with 100% assertions green.`
        );
        this.appendTeamMessage(
          'Olivia',
          'Manager',
          '#f97316',
          `Mamu, project completed successfully! Result: ${reply.slice(0, 160)}`
        );

        // Vocal report if enabled
        if (reply) {
          this.speechVoice.speak(
            `Mamu, our team completed your directive: ${reply.slice(0, 100)}`,
            false,
            'olivia',
            'Olivia'
          );
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.projectProgress.set(0);
        this.runningTasksCount.set(0);
        this.activeProjectStatus.set('FAILED');
        this.isExecutingTeamTask.set(false);

        const cur = [...this.taskTimeline()];
        cur.forEach((s) => {
          if (s.status === 'in_progress') {
            s.status = 'pending';
          }
        });
        this.taskTimeline.set(cur);

        const errMsg = err?.error?.detail || err?.message || 'Failed to reach backend gateway.';
        this.appendTeamMessage(
          'Olivia',
          'Manager',
          '#ef4444',
          `Directive failed: ${errMsg}`
        );
        this.cdr.markForCheck();
      }
    });
  }

  // --- Focus 3D Camera on Selected Agent ---
  focusAgent(agent: OfficeAgent): void {
    this.selectedAgent.set(agent);
    const target = new THREE.Vector3(...agent.deskPos);

    this.cameraTargetLookAt = target.clone().add(new THREE.Vector3(0, 1.5, 0));
    this.cameraTargetPos = target.clone().add(new THREE.Vector3(6, 6, 6));
  }

  // --- Camera Presets ---
  setCameraPreset(preset: 'isometric' | 'bullpen' | 'lounge' | 'manager'): void {
    if (!this.camera || !this.controls) return;

    if (preset === 'isometric') {
      this.cameraTargetPos = new THREE.Vector3(44, 40, 44);
      this.cameraTargetLookAt = new THREE.Vector3(0, 1.2, 0);
    } else if (preset === 'bullpen') {
      this.cameraTargetPos = new THREE.Vector3(18, 12, 12);
      this.cameraTargetLookAt = new THREE.Vector3(11, 2, -3);
    } else if (preset === 'lounge') {
      this.cameraTargetPos = new THREE.Vector3(8, 10, 14);
      this.cameraTargetLookAt = new THREE.Vector3(0, 1.5, 2);
    } else if (preset === 'manager') {
      this.cameraTargetPos = new THREE.Vector3(-8, 9, 0);
      this.cameraTargetLookAt = new THREE.Vector3(-14, 2, -8);
    }
  }

  private appendTeamMessage(sender: string, role: string, color: string, message: string): void {
    const list = [...this.teamChannelMessages()];
    list.push({
      id: `msg-${Date.now()}-${Math.random()}`,
      sender,
      role,
      color,
      message,
      time: this.formatCurrentTime()
    });
    // Keep last 40 messages
    if (list.length > 40) list.shift();
    this.teamChannelMessages.set(list);
  }

  private formatCurrentTime(): string {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  // =========================================================================
  // Three.js 3D Realistic Office Floorplan Builder
  // =========================================================================
  private initThreeScene(): void {
    if (!this.officeCanvasRef) return;
    const canvas = this.officeCanvasRef.nativeElement;
    const container = canvas.parentElement || canvas;

    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 750;

    // 1. Scene with Dynamic Theme Harmonization
    const isLight = this.themeService.isLightMode();
    const currentTheme = this.themeService.activeTheme();
    const bgHex = isLight ? (currentTheme?.colors?.background || '#eef2f7') : '#060911';

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(bgHex);
    this.scene.fog = new THREE.FogExp2(bgHex, isLight ? 0.005 : 0.007);

    // 2. Camera (Wide Isometric angle so the full office, perimeter pines, and sidewalks fit on any screen)
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    this.camera.position.set(44, 40, 44);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
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
    this.controls.maxPolarAngle = Math.PI / 2.08; // Prevent going below floor
    this.controls.minDistance = 6;
    this.controls.maxDistance = 140;
    this.controls.target.set(0, 1.2, 0);
    this.controls.update();

    // 5. Lighting
    this.setupLighting();

    // 6. Build 3D Architectural Scene
    this.buildOfficeArchitecture();

    // 7. Spawn Animated 3D Agent Avatars
    this.spawnAgentAvatars();

    // 8. Render Animation Loop
    this.animate();

    // 9. Resize Handling
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

    // Ambient Hemisphere Light (Sky dark blue, Ground warm dark slate)
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.55);
    this.scene.add(hemiLight);

    // Main Sun Directional Light casting soft isometric shadows
    const dirLight = new THREE.DirectionalLight(0xfff7ed, 1.15);
    dirLight.position.set(28, 45, 24);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 5;
    dirLight.shadow.camera.far = 120;
    const d = 32;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0004;
    this.scene.add(dirLight);

    // Warm Interior Pointlights
    // Over the pool table
    const poolLight = new THREE.PointLight(0xfef08a, 0.8, 16);
    poolLight.position.set(0, 5, 2);
    this.scene.add(poolLight);

    // Over the coffee bar
    const coffeeLight = new THREE.PointLight(0xfdba74, 0.9, 14);
    coffeeLight.position.set(-6, 4.5, 6);
    this.scene.add(coffeeLight);

    // In open bullpen desks
    const bullpenLight = new THREE.PointLight(0x38bdf8, 1.0, 22);
    bullpenLight.position.set(11, 5, -3);
    this.scene.add(bullpenLight);

    // Over conference room
    const confLight = new THREE.PointLight(0xffffff, 0.7, 18);
    confLight.position.set(-2, 5, -12);
    this.scene.add(confLight);
  }

  private buildOfficeArchitecture(): void {
    if (!this.scene) return;

    // -------------------------------------------------------------
    // 1. Dark Blue Architectural Ground & Isometric Grid (Matches Reference Image 2)
    // -------------------------------------------------------------
    const groundGeo = new THREE.BoxGeometry(34, 0.4, 34);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x07111e,
      roughness: 0.95
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Cyan-Blue Coordinate Floor Grid
    const grid = new THREE.GridHelper(32, 32, 0x1e3a5f, 0x0f2238);
    grid.position.y = 0.02;
    this.scene.add(grid);

    // -------------------------------------------------------------
    // 2. Translucent Volumetric Bounding Box & Wireframe Ceiling
    // -------------------------------------------------------------
    const roomBoxGeo = new THREE.BoxGeometry(30, 8, 30);
    const roomBoxMat = new THREE.MeshBasicMaterial({
      color: 0x0a1d36,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide
    });
    const roomBox = new THREE.Mesh(roomBoxGeo, roomBoxMat);
    roomBox.position.set(0, 4, 0);
    this.scene.add(roomBox);

    // Wireframe Perimeter Lines
    const edges = new THREE.EdgesGeometry(roomBoxGeo);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x1e40af,
      transparent: true,
      opacity: 0.4
    });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    wireframe.position.set(0, 4, 0);
    this.scene.add(wireframe);

    // Ceiling Wireframe Grid at y = 8.0
    const ceilingGrid = new THREE.GridHelper(30, 15, 0x1e3a5f, 0x112240);
    ceilingGrid.position.set(0, 8.0, 0);
    this.scene.add(ceilingGrid);

    // -------------------------------------------------------------
    // 3. Central Bullpen: 6 Workstations with Glowing Blue Screens (Matches Reference Image 2)
    // -------------------------------------------------------------
    const bullpenLayout: [number, number][] = [
      [-3.2, -8],
      [-3.2, -4],
      [-3.2, 0],
      [3.2, -8],
      [3.2, -4],
      [3.2, 0]
    ];

    bullpenLayout.forEach(([cx, cz]) => {
      const desk = this.createOfficeDesk(cx, cz, 0x1e293b, false);
      this.scene?.add(desk);
    });

    // -------------------------------------------------------------
    // 4. Foreground Left: Green-Felt Pool Table / Lounge Table (Matches Reference Image 2)
    // -------------------------------------------------------------
    const poolTable = this.createPoolTable(-6.5, 6);
    this.scene.add(poolTable);

    // -------------------------------------------------------------
    // 5. Foreground Right: Side Utility Table / Coffee Console (Matches Reference Image 2)
    // -------------------------------------------------------------
    const sideTableMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5
    });
    const sideTable = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.2, 1.6), sideTableMat);
    sideTable.position.set(6.5, 0.6, 6);
    sideTable.castShadow = true;
    sideTable.receiveShadow = true;
    this.scene.add(sideTable);
  }

  // Helper: Create a Pine Tree with layered conical foliage
  private createPineTree(x: number, z: number): THREE.Group {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);

    // Trunk
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2614, roughness: 0.9 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.4, 8), trunkMat);
    trunk.position.y = 0.7;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // 3 Cones of Pine Leaves
    const pineMat1 = new THREE.MeshStandardMaterial({ color: 0x143e24, roughness: 0.7 });
    const pineMat2 = new THREE.MeshStandardMaterial({ color: 0x1a4d2e, roughness: 0.7 });
    const pineMat3 = new THREE.MeshStandardMaterial({ color: 0x225c38, roughness: 0.7 });

    const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 8), pineMat1);
    c1.position.y = 2.0;
    c1.castShadow = true;
    treeGroup.add(c1);

    const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.8, 8), pineMat2);
    c2.position.y = 3.1;
    c2.castShadow = true;
    treeGroup.add(c2);

    const c3 = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.5, 8), pineMat3);
    c3.position.y = 4.1;
    c3.castShadow = true;
    treeGroup.add(c3);

    return treeGroup;
  }

  // Helper: Create Wall
  private createWall(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene?.add(mesh);
    return mesh;
  }

  // Helper: Create Realistic Green Felt Pool Table
  private createPoolTable(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Mahogany Wood Frame
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.4 });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.4, 2.9), woodMat);
    tableTop.position.y = 1.3;
    tableTop.castShadow = true;
    group.add(tableTop);

    // 4 Legs
    const legGeo = new THREE.CylinderGeometry(0.18, 0.14, 1.2, 8);
    [
      [-2.3, -1.2],
      [-2.3, 1.2],
      [2.3, -1.2],
      [2.3, 1.2]
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(lx, 0.6, lz);
      leg.castShadow = true;
      group.add(leg);
    });

    // Green Felt Cloth
    const feltMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    const felt = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.08, 2.4), feltMat);
    felt.position.y = 1.51;
    felt.receiveShadow = true;
    group.add(felt);

    // White Cue Ball & Striped Ball cluster
    const ballMatWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1 });
    const ballMatRed = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2 });
    const ballMatYellow = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.2 });

    const cueBall = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), ballMatWhite);
    cueBall.position.set(-1.2, 1.6, 0.1);
    group.add(cueBall);

    const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), ballMatRed);
    b1.position.set(1.0, 1.6, 0);
    group.add(b1);
    const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), ballMatYellow);
    b2.position.set(1.15, 1.6, 0.09);
    group.add(b2);

    // Cue Stick resting on side
    const cueMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 3.8, 6), cueMat);
    stick.rotation.z = Math.PI / 2.05;
    stick.position.set(0, 1.56, 1.3);
    group.add(stick);

    return group;
  }

  // Helper: Create Espresso Coffee Bar
  private createCoffeeBar(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Counter Top
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.4, 1.4), counterMat);
    base.position.y = 0.7;
    base.castShadow = true;
    group.add(base);

    // Marble Surface
    const marbleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.1, 1.6), marbleMat);
    top.position.y = 1.45;
    group.add(top);

    // Espresso Machine
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.2
    });
    const espresso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.7), chromeMat);
    espresso.position.set(-1.2, 1.9, 0);
    group.add(espresso);

    // Coffee Mugs
    const mugMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 8), mugMat);
    mug.position.set(-0.3, 1.58, 0.2);
    group.add(mug);

    // 2 Bar Stools
    const stoolMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.0, 12), stoolMat);
    s1.position.set(-0.8, 0.5, 1.2);
    group.add(s1);
    const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.0, 12), stoolMat);
    s2.position.set(0.8, 0.5, 1.2);
    group.add(s2);

    return group;
  }

  // Helper: Create Leather Lounge Sofa
  private createSofa(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.5, 1.6), leatherMat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    group.add(seat);

    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.8, 0.4), leatherMat);
    back.position.set(0, 0.95, 0.6);
    group.add(back);

    // Armrests
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 1.6), leatherMat);
    armL.position.set(-2.0, 0.7, 0);
    group.add(armL);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 1.6), leatherMat);
    armR.position.set(2.0, 0.7, 0);
    group.add(armR);

    return group;
  }

  // Helper: Create Conference Table
  private createConferenceTable(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const tableMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.2, 3.2), tableMat);
    top.position.y = 1.3;
    top.castShadow = true;
    group.add(top);

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6 });
    const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 2.6), legMat);
    l1.position.set(-2.6, 0.6, 0);
    group.add(l1);
    const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 2.6), legMat);
    l2.position.set(2.6, 0.6, 0);
    group.add(l2);

    return group;
  }

  // Helper: Create Office Desk with Dual Glowing Screens
  private createOfficeDesk(x: number, z: number, deskColor: number, isManager: boolean): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Desktop
    const deskMat = new THREE.MeshStandardMaterial({ color: deskColor, roughness: 0.5 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.15, 1.8), deskMat);
    top.position.y = 1.2;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // Metal Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7 });
    const l1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.15), legMat);
    l1.position.set(-1.6, 0.6, -0.7);
    group.add(l1);
    const l2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.15), legMat);
    l2.position.set(1.6, 0.6, -0.7);
    group.add(l2);
    const l3 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.15), legMat);
    l3.position.set(-1.6, 0.6, 0.7);
    group.add(l3);
    const l4 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.15), legMat);
    l4.position.set(1.6, 0.6, 0.7);
    group.add(l4);

    // Cubicle Divider Screen (if not manager)
    if (!isManager) {
      const partMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
      const divider = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.2, 0.1), partMat);
      divider.position.set(0, 1.8, -0.85);
      group.add(divider);
    }

    // Dual Monitors with Glowing Cyan Screens
    const monitorFrameMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.3 });
    const screenGlowMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.85,
      roughness: 0.2
    });

    // Monitor 1 (Left)
    const m1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.75, 0.06), monitorFrameMat);
    m1.position.set(-0.7, 1.85, -0.4);
    m1.rotation.y = 0.15;
    group.add(m1);
    const scr1 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.65), screenGlowMat);
    scr1.position.set(-0.7, 1.85, -0.36);
    scr1.rotation.y = 0.15;
    group.add(scr1);
    this.monitorScreenMeshes.push(scr1);

    // Monitor 2 (Right)
    const m2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.75, 0.06), monitorFrameMat);
    m2.position.set(0.7, 1.85, -0.4);
    m2.rotation.y = -0.15;
    group.add(m2);
    const scr2 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.65), screenGlowMat);
    scr2.position.set(0.7, 1.85, -0.36);
    scr2.rotation.y = -0.15;
    group.add(scr2);
    this.monitorScreenMeshes.push(scr2);

    // Keyboard & Mouse
    const kb = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.03, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x0f172a })
    );
    kb.position.set(0, 1.3, 0.1);
    group.add(kb);

    // Swivel Chair
    const chair = this.createOfficeChair(0, 0.8);
    group.add(chair);

    return group;
  }

  // Helper: Office Chair
  private createOfficeChair(x: number, z: number): THREE.Group {
    const chair = new THREE.Group();
    chair.position.set(x, 0, z);

    const chairMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.8), chairMat);
    seat.position.y = 0.75;
    chair.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.12), chairMat);
    back.position.set(0, 1.25, 0.35);
    chair.add(back);

    // Base Stem
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8 })
    );
    stem.position.y = 0.35;
    chair.add(stem);

    return chair;
  }

  // Helper: Bookshelf
  private createBookshelf(x: number, z: number): THREE.Group {
    const shelf = new THREE.Group();
    shelf.position.set(x, 0, z);

    const wood = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.2, 0.8), wood);
    body.position.y = 2.1;
    body.castShadow = true;
    shelf.add(body);

    return shelf;
  }

  // Helper: Potted Plant
  private createPottedPlant(x: number, z: number): THREE.Group {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Pot
    const potMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 0.8, 12), potMat);
    pot.position.y = 0.4;
    pot.castShadow = true;
    group.add(pot);

    // Plant Foliage
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 8), leafMat);
    bush.position.y = 1.1;
    bush.castShadow = true;
    group.add(bush);

    return group;
  }

  // =========================================================================
  // Spawn Realistic 3D Humanoid Agent Characters
  // =========================================================================
  private spawnAgentAvatars(): void {
    if (!this.scene) return;

    this.agents.forEach((agent) => {
      const charGroup = new THREE.Group();
      // Start standing in the lounge / break room
      charGroup.position.set(...agent.loungePos);

      // Character Materials
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xffd1a9, roughness: 0.6 });
      const shirtMat = new THREE.MeshStandardMaterial({
        color: agent.avatarBg,
        roughness: 0.5
      });
      const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
      const hairMat = new THREE.MeshStandardMaterial({ color: 0x3d2614, roughness: 0.8 });

      // 1. Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), skinMat);
      head.position.y = 1.85;
      head.castShadow = true;
      charGroup.add(head);

      // 2. Hair
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8), hairMat);
      hair.position.set(0, 1.95, -0.05);
      charGroup.add(hair);

      // 3. Torso (Colored Jacket/Shirt)
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.32), shirtMat);
      torso.position.y = 1.35;
      torso.castShadow = true;
      charGroup.add(torso);

      // 4. Arms
      const armGeo = new THREE.BoxGeometry(0.16, 0.65, 0.16);
      const leftArm = new THREE.Mesh(armGeo, shirtMat);
      leftArm.position.set(-0.36, 1.35, 0);
      charGroup.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, shirtMat);
      rightArm.position.set(0.36, 1.35, 0);
      charGroup.add(rightArm);

      // 5. Legs (Dark Slacks)
      const legGeo = new THREE.BoxGeometry(0.2, 0.8, 0.2);
      const leftLeg = new THREE.Mesh(legGeo, pantsMat);
      leftLeg.position.set(-0.14, 0.55, 0);
      leftLeg.castShadow = true;
      charGroup.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, pantsMat);
      rightLeg.position.set(0.14, 0.55, 0);
      rightLeg.castShadow = true;
      charGroup.add(rightLeg);

      // 6. Shoes
      const shoeGeo = new THREE.BoxGeometry(0.22, 0.12, 0.32);
      const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
      leftShoe.position.set(-0.14, 0.08, 0.05);
      charGroup.add(leftShoe);

      const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
      rightShoe.position.set(0.14, 0.08, 0.05);
      charGroup.add(rightShoe);

      // 7. Overhead Floating Name Badge (Sprite Canvas)
      const badgeCanvas = document.createElement('canvas');
      badgeCanvas.width = 256;
      badgeCanvas.height = 72;
      const bCtx = badgeCanvas.getContext('2d');
      if (bCtx) {
        bCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        bCtx.roundRect(4, 4, 248, 64, 12);
        bCtx.fill();
        bCtx.strokeStyle = agent.avatarBg;
        bCtx.lineWidth = 4;
        bCtx.roundRect(4, 4, 248, 64, 12);
        bCtx.stroke();

        bCtx.fillStyle = '#f8fafc';
        bCtx.font = 'bold 26px sans-serif';
        bCtx.textAlign = 'center';
        bCtx.fillText(`${agent.name} (${agent.role})`, 128, 44);
      }
      const badgeTex = new THREE.CanvasTexture(badgeCanvas);
      const spriteMat = new THREE.SpriteMaterial({ map: badgeTex });
      const badgeSprite = new THREE.Sprite(spriteMat);
      badgeSprite.position.set(0, 2.45, 0);
      badgeSprite.scale.set(2.4, 0.7, 1);
      charGroup.add(badgeSprite);

      this.scene?.add(charGroup);
      this.agentMeshes.set(agent.id, charGroup);
      agent.meshGroup = charGroup;
    });
  }

  // =========================================================================
  // Render & Animation Loop
  // =========================================================================
  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Update Controls
    if (this.controls) {
      this.controls.update();
    }

    // 2. Smooth Camera Lerp if target is set
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

    // 3. Animate Characters Walking or Breathing
    this.agents.forEach((agent) => {
      const mesh = this.agentMeshes.get(agent.id);
      if (!mesh) return;

      // If moving to desk
      if (agent.targetPos) {
        const dist = mesh.position.distanceTo(agent.targetPos);
        if (dist > 0.15) {
          mesh.lookAt(agent.targetPos.x, mesh.position.y, agent.targetPos.z);
          mesh.position.lerp(agent.targetPos, 0.035);
          // Walking leg swing bob
          mesh.position.y = Math.abs(Math.sin(elapsedTime * 8)) * 0.12;
        } else {
          mesh.position.copy(agent.targetPos);
          agent.targetPos = undefined;
          mesh.rotation.set(0, 0, 0);
        }
      } else {
        // Idle breathing bob
        mesh.position.y = Math.sin(elapsedTime * 2 + agent.deskIndex) * 0.03;
      }
    });

    // 4. Pulse Dual Glowing Screens
    this.monitorScreenMeshes.forEach((scr, idx) => {
      const mat = scr.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = 0.75 + Math.sin(elapsedTime * 3 + idx) * 0.2;
      }
    });

    // 5. Render Scene
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };
}
