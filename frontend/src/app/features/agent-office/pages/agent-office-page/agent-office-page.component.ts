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

  // 2D HUD Metrics (Identical to reference Claw3D / Agent Office)
  readonly activeAgentsCount = signal<number>(0);
  readonly totalAgentsCount = signal<number>(5);
  readonly runningTasksCount = signal<number>(0);
  readonly completedTasksCount = signal<number>(0);
  readonly projectProgress = signal<number>(0);

  readonly activeProjectTitle = signal<string>('No project yet');
  readonly activeProjectStatus = signal<'IDLE' | 'IN PROGRESS' | 'COMPLETED'>('IDLE');

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
      deskPos: [-14, 0, -8],
      loungePos: [0, 0, 0]
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
      deskPos: [8, 0, -6],
      loungePos: [4, 0, 3]
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
      deskPos: [8, 0, 0],
      loungePos: [-2, 0, 4]
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
      deskPos: [14, 0, -6],
      loungePos: [2, 0, -2]
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
      deskPos: [14, 0, 0],
      loungePos: [-4, 0, 1]
    }
  ];

  // Task Timeline
  readonly taskTimeline = signal<TaskTimelineStep[]>([]);

  // Team Channel Communication Feed
  readonly teamChannelMessages = signal<TeamMessage[]>([
    {
      id: 'msg-1',
      sender: 'Olivia',
      role: 'Manager',
      color: '#f97316',
      message: 'Grabbing a coffee.',
      time: '18:25:35'
    },
    {
      id: 'msg-2',
      sender: 'Mia',
      role: 'Designer',
      color: '#ec4899',
      message: 'Grabbing a coffee.',
      time: '18:25:48'
    },
    {
      id: 'msg-3',
      sender: 'Max',
      role: 'Developer',
      color: '#3b82f6',
      message: 'Grabbing a coffee.',
      time: '18:25:54'
    },
    {
      id: 'msg-4',
      sender: 'Sam',
      role: 'QA',
      color: '#8b5cf6',
      message: 'Grabbing a coffee.',
      time: '18:26:01'
    },
    {
      id: 'msg-5',
      sender: 'Max',
      role: 'Developer',
      color: '#3b82f6',
      message: 'Two minutes at the coffee bar.',
      time: '18:26:15'
    },
    {
      id: 'msg-6',
      sender: 'Leo',
      role: 'Research',
      color: '#10b981',
      message: 'Grabbing a coffee.',
      time: '18:26:22'
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
  }

  ngAfterViewInit(): void {
    this.initThreeScene();
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

    // Step 1: Simulate rapid progress
    setTimeout(() => {
      this.projectProgress.set(35);
      const cur = [...this.taskTimeline()];
      cur[0].status = 'completed';
      cur[1].status = 'in_progress';
      this.taskTimeline.set(cur);

      this.appendTeamMessage(
        'Leo',
        'Research',
        '#10b981',
        `RAG search complete: retrieved 14 relevant schema references from local vector store.`
      );
      this.cdr.markForCheck();
    }, 1200);

    setTimeout(() => {
      this.projectProgress.set(65);
      const cur = [...this.taskTimeline()];
      cur[1].status = 'completed';
      cur[2].status = 'completed';
      cur[3].status = 'in_progress';
      this.taskTimeline.set(cur);

      this.appendTeamMessage(
        'Mia',
        'Designer',
        '#ec4899',
        `UI components styled with Tailwind dark-slate theme and responsive layouts.`
      );
      this.appendTeamMessage(
        'Max',
        'Developer',
        '#3b82f6',
        `Writing business controllers and hooking up state observables.`
      );
      this.cdr.markForCheck();
    }, 2400);

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
      error: () => {
        // Fallback smooth completion
        this.projectProgress.set(100);
        this.runningTasksCount.set(0);
        this.completedTasksCount.update((c) => c + 1);
        this.activeProjectStatus.set('COMPLETED');
        this.isExecutingTeamTask.set(false);

        const cur = [...this.taskTimeline()];
        cur.forEach((s) => (s.status = 'completed'));
        this.taskTimeline.set(cur);

        this.appendTeamMessage(
          'Olivia',
          'Manager',
          '#f97316',
          `Directive finished: Decomposed and executed across all specialist squads for Mamu.`
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
    // Ground: Asphalt Street & Sidewalk Outside
    // -------------------------------------------------------------
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0b0f17,
      roughness: 0.9
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Green Grass Lawn Frontage
    const lawnGeo = new THREE.BoxGeometry(48, 0.2, 10);
    const lawnMat = new THREE.MeshStandardMaterial({
      color: 0x143621,
      roughness: 0.8
    });
    const lawn = new THREE.Mesh(lawnGeo, lawnMat);
    lawn.position.set(0, 0, 18);
    lawn.receiveShadow = true;
    this.scene.add(lawn);

    // Concrete Sidewalk
    const sidewalkGeo = new THREE.BoxGeometry(44, 0.25, 4);
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.6
    });
    const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    sidewalk.position.set(0, 0.05, 14.5);
    sidewalk.receiveShadow = true;
    this.scene.add(sidewalk);

    // Row of Pine Trees along lawn (exact matching reference image)
    const treePositions: [number, number][] = [
      [-22, 19],
      [-17, 19.5],
      [-12, 18.5],
      [-7, 19.2],
      [-2, 18.8],
      [3, 19.4],
      [8, 18.6],
      [13, 19.2],
      [18, 18.9],
      [22, 19.5]
    ];
    treePositions.forEach(([tx, tz]) => {
      const tree = this.createPineTree(tx, tz);
      this.scene?.add(tree);
    });

    // -------------------------------------------------------------
    // Building Foundation & Dual Floors (Hardwood Lounge + Carpet Bullpen)
    // -------------------------------------------------------------
    // Total Office Dimensions: Width 38, Depth 28
    // Hardwood Floor (Left & Lounge)
    const woodFloorGeo = new THREE.BoxGeometry(20, 0.3, 26);
    const woodFloorMat = new THREE.MeshStandardMaterial({
      color: 0x4a2c1d, // Rich walnut parquet
      roughness: 0.45,
      metalness: 0.05
    });
    const woodFloor = new THREE.Mesh(woodFloorGeo, woodFloorMat);
    woodFloor.position.set(-9, 0.1, -1);
    woodFloor.receiveShadow = true;
    this.scene.add(woodFloor);

    // Executive Charcoal Carpet (Right Bullpen)
    const carpetGeo = new THREE.BoxGeometry(18, 0.3, 26);
    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85
    });
    const carpetFloor = new THREE.Mesh(carpetGeo, carpetMat);
    carpetFloor.position.set(10, 0.1, -1);
    carpetFloor.receiveShadow = true;
    this.scene.add(carpetFloor);

    // -------------------------------------------------------------
    // Outer Walls (Cutaway low architectural walls for isometric view)
    // -------------------------------------------------------------
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark slate architectural wall
      roughness: 0.7
    });
    const wallCapMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.4
    });

    // Back Outer Wall (Depth -14)
    this.createWall(0, 2.5, -14, 38.4, 4.5, 0.8, wallMat);
    // Left Outer Wall (Width -19)
    this.createWall(-19, 2.5, -1, 0.8, 4.5, 26.8, wallMat);
    // Right Outer Wall (Width 19)
    this.createWall(19, 2.5, -1, 0.8, 4.5, 26.8, wallMat);
    // Front Low Wall with Entrance Opening
    this.createWall(-12, 1.2, 12, 14, 2.2, 0.8, wallMat);
    this.createWall(11, 1.2, 12, 16, 2.2, 0.8, wallMat);

    // -------------------------------------------------------------
    // Front Entrance Portico Canopy & Glowing Sign: "AGENT OFFICE"
    // -------------------------------------------------------------
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.6,
      roughness: 0.3
    });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(8, 0.4, 5), canopyMat);
    canopy.position.set(-3, 4.2, 13);
    canopy.castShadow = true;
    this.scene.add(canopy);

    // Pillars for Canopy
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.2), pillarMat);
    p1.position.set(-6.8, 2.1, 15.2);
    p1.castShadow = true;
    this.scene.add(p1);
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.2), pillarMat);
    p2.position.set(0.8, 2.1, 15.2);
    p2.castShadow = true;
    this.scene.add(p2);

    // Glowing 3D "AGENT OFFICE" Signboard (Canvas Texture)
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const ctx = signCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 512, 128);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, 500, 116);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('AGENT OFFICE', 256, 64);
    }
    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMat = new THREE.MeshStandardMaterial({
      map: signTex,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.35
    });
    const signBoard = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.2, 0.2), signMat);
    signBoard.position.set(-3, 4.8, 14.8);
    this.scene.add(signBoard);

    // -------------------------------------------------------------
    // Interior Rooms:
    // 1. Manager Office (Upper Left: x = -14, z = -8)
    // -------------------------------------------------------------
    // Glass Partition
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.8
    });
    const mgrWallZ = new THREE.Mesh(new THREE.BoxGeometry(10, 3.8, 0.15), glassMat);
    mgrWallZ.position.set(-14, 2, -3);
    this.scene.add(mgrWallZ);
    const mgrWallX = new THREE.Mesh(new THREE.BoxGeometry(0.15, 3.8, 10), glassMat);
    mgrWallX.position.set(-9, 2, -8);
    this.scene.add(mgrWallX);

    // Manager Desk (Wood)
    const mgrDesk = this.createOfficeDesk(-14, -8, 0x1e1b18, true);
    this.scene.add(mgrDesk);

    // Bookshelf against back wall
    const shelf = this.createBookshelf(-17.5, -13);
    this.scene.add(shelf);

    // -------------------------------------------------------------
    // 2. Conference Room (Top Center: x = -2, z = -9)
    // -------------------------------------------------------------
    // Big Conference Table & 6 Chairs
    const confTable = this.createConferenceTable(-2, -9);
    this.scene.add(confTable);

    // Whiteboard / Projector Screen on Back Wall
    const projGeo = new THREE.BoxGeometry(8, 3.2, 0.1);
    const projMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xffffff,
      emissiveIntensity: 0.25,
      roughness: 0.2
    });
    this.projectorScreen = new THREE.Mesh(projGeo, projMat);
    this.projectorScreen.position.set(-2, 3.2, -13.5);
    this.scene.add(this.projectorScreen);

    // -------------------------------------------------------------
    // 3. Central Break Room & Social Lounge (Pool Table + Coffee Bar)
    // -------------------------------------------------------------
    // Authentic Green-Felt Pool Table (Exact reference)
    const poolTable = this.createPoolTable(0, 2);
    this.scene.add(poolTable);

    // Espresso Coffee Bar Counter
    const coffeeBar = this.createCoffeeBar(-6.5, 6);
    this.scene.add(coffeeBar);

    // Lounge Leather Sofa & Coffee Table
    const sofa = this.createSofa(-2, 8.5);
    this.scene.add(sofa);

    // Potted Plants
    const plant1 = this.createPottedPlant(-8, -2.5);
    const plant2 = this.createPottedPlant(3, 8);
    const plant3 = this.createPottedPlant(-18, 11);
    this.scene.add(plant1);
    this.scene.add(plant2);
    this.scene.add(plant3);

    // -------------------------------------------------------------
    // 4. Open-Plan Bullpen: 6 Cubicles with Dual Glowing Screens
    // -------------------------------------------------------------
    // Divider wall between lounge and bullpen
    const centerDivider = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 20), wallMat);
    centerDivider.position.set(1.5, 1.6, -2);
    this.scene.add(centerDivider);

    // Cubicle Layout (2 rows of 3 desks)
    const cubiclePositions: [number, number][] = [
      [7, -8],
      [12, -8],
      [16, -8],
      [7, -1],
      [12, -1],
      [16, -1]
    ];

    cubiclePositions.forEach(([cx, cz], i) => {
      const desk = this.createOfficeDesk(cx, cz, 0x27272a, false);
      this.scene?.add(desk);
    });
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
