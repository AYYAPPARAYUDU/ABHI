// ThreeSceneManagerService — Pure Quantum Dot Sphere Core & Multi-Agent Swarm with Holographic HUD
// Features:
// 1. Pure Fibonacci Quantum Dot Particle Ball (3,200 dots) with sinusoidal quantum wave pulse displacement
// 2. Concentrated Radiant Arc Singularity + Atmospheric Plasma Corona Glow + Invisible Raycast Hit Sphere
// 3. Multi-Agent Swarm: Concealed inside Singularity -> Smooth Kinematic Eruption on Click with Micro-Particle Clouds & Laser Tethers
// 4. Dynamic 3D Inter-Agent Synaptic Network Mesh (Perimeter + Cross Synapses)
// 5. Interactive Raycast Clicking (Core Ball & Agent Orbs) + Mouse Drag Rotation + Wheel Zoom
// 6. Web Audio API Holographic Sound Effects Synthesizer (deploy, dock, pulse, beep)
// 7. Ambient Micro-Starfield (1,200 stars) + Accretion Vortex (700 sparks) + Curved Horizon Disc + Atmospheric Fog

import { Injectable, NgZone, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import * as THREE from 'three';
import { SpatialEnvironmentMode } from '../../core/models/agent-experience.model';
import { ThemeService, AbhiThemeColors } from '../../core/services/theme.service';
import { SpeechVoiceService } from '../../core/services/speech-voice.service';

export interface AgentNode {
  id: string;
  name: string;
  codename: string;
  role: string;
  status: 'DORMANT' | 'ORBITING' | 'LOCKED' | 'EXECUTING' | 'EVOLVING';
  color: string;
  hexColor: number;
  icon: string;
  angle: number;
  elevation: number;
  speed: number;
  orbitRadius: number;
  inclination?: number;
  orbitSpeed?: number;
  description: string;
  subsystem: string;
  load: string;
  synapticRate: string;
  neuralEfficiency: string;
  bondLevel?: number;
  bondStatus?: string;
  lastChatter?: string;
  packetsExchanged?: number;
}

export interface AgentSatelliteNode {
  group: THREE.Group;
  conduit: THREE.Line;
  spark: THREE.Mesh;
  baseAngle: number;
  speed: number;
  radius: number;
  height: number;
  colorHex: number;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class ThreeSceneManagerService {
  private themeService = inject(ThemeService);
  private loopStartTime = Date.now();
  private ngZone = inject(NgZone);
  private speechVoice = inject(SpeechVoiceService);

  // Component Signals & State
  readonly isSwarmDeployed = signal<boolean>(true);
  readonly soundEnabled = signal<boolean>(true);
  readonly selectedAgent = signal<AgentNode | null>(null);
  readonly agentFocused$ = new Subject<AgentNode>();
  readonly hoveredAgent = signal<AgentNode | null>(null);
  readonly latestJarvisMessage = signal<string | null>(
    'Quantum Core online. Synchronizing situational perception...'
  );

  // 10 Advanced Autonomous Sub-Agents (Single Unified Celestial Flow Formation)
  readonly agents = signal<AgentNode[]>([
    {
      id: 'agent_1_commander',
      name: 'COMMANDER',
      codename: 'MARK-85',
      role: 'Lead Architect & Multi-Agent Arbitrator',
      status: 'DORMANT',
      color: '#00f0ff',
      hexColor: 0x00f0ff,
      icon: '👑',
      angle: 0 * (2 * Math.PI / 10),
      elevation: 0.0,
      speed: 0.85,
      orbitRadius: 11.2,
      inclination: 0.0,
      orbitSpeed: 0.052,
      description: 'Decomposes complex user goals, delegates tickets to specialist squads, arbitrates conflicts, and ensures quality gate sign-off for Mamu.',
      subsystem: 'COMMAND SQUAD',
      load: 'COORDINATING // 100%',
      synapticRate: '48.0 TB/s',
      neuralEfficiency: '100%',
    },
    {
      id: 'agent_2_browser',
      name: 'SYNTHEX-WEB',
      codename: 'MARK-L',
      role: 'Browser & Web Automation Specialist',
      status: 'DORMANT',
      color: '#10b981',
      hexColor: 0x10b981,
      icon: '🌐',
      angle: 1 * (2 * Math.PI / 10),
      elevation: 0.45,
      speed: 0.85,
      orbitRadius: 12.8,
      inclination: 0.18,
      orbitSpeed: 0.052,
      description: 'Interacts with live web applications, inspects DOM trees, handles cookies/sessions, and automates UI flows with zero guessing.',
      subsystem: 'EXECUTION SQUAD',
      load: 'DOM TREE READY',
      synapticRate: '34.8 TB/s',
      neuralEfficiency: '99.4%',
    },
    {
      id: 'agent_3_comms',
      name: 'NEXUS-COMMS',
      codename: 'MARK-XLII',
      role: 'Communications & WhatsApp Officer',
      status: 'DORMANT',
      color: '#3b82f6',
      hexColor: 0x3b82f6,
      icon: '💬',
      angle: 2 * (2 * Math.PI / 10),
      elevation: 0.70,
      speed: 0.85,
      orbitRadius: 11.2,
      inclination: 0.24,
      orbitSpeed: 0.052,
      description: 'Dispatches external messages across native WhatsApp Desktop, Slack, and email with recipient verification & delivery confirmation.',
      subsystem: 'EXECUTION SQUAD',
      load: 'CHANNELS SYNCHED',
      synapticRate: '28.2 TB/s',
      neuralEfficiency: '99.7%',
    },
    {
      id: 'agent_4_system',
      name: 'ARCHON-FORGE',
      codename: 'MARK-VI',
      role: 'OS, Shell & Code Engineer',
      status: 'DORMANT',
      color: '#f59e0b',
      hexColor: 0xf59e0b,
      icon: '⚙️',
      angle: 3 * (2 * Math.PI / 10),
      elevation: 0.45,
      speed: 0.85,
      orbitRadius: 12.8,
      inclination: 0.18,
      orbitSpeed: 0.052,
      description: 'Executes terminal commands, edits files with surgical precision, compiles code, and validates exit codes and processes.',
      subsystem: 'EXECUTION SQUAD',
      load: 'FREQ 6.2 GHz',
      synapticRate: '38.1 TB/s',
      neuralEfficiency: '99.9%',
    },
    {
      id: 'agent_5_researcher',
      name: 'AURA-RESEARCH',
      codename: 'MARK-VII',
      role: 'Deep Researcher & Data Miner',
      status: 'DORMANT',
      color: '#a855f7',
      hexColor: 0xa855f7,
      icon: '🔍',
      angle: 4 * (2 * Math.PI / 10),
      elevation: 0.0,
      speed: 0.85,
      orbitRadius: 11.2,
      inclination: 0.0,
      orbitSpeed: 0.052,
      description: 'Mines codebases, documentations, APIs, and web resources systematically; extracts grounded facts with exact citations.',
      subsystem: 'INTELLIGENCE SQUAD',
      load: 'HYBRID RAG ACTIVE',
      synapticRate: '22.0 TB/s',
      neuralEfficiency: '98.9%',
    },
    {
      id: 'agent_6_ml',
      name: 'SYNAPSE-ML',
      codename: 'MARK-XXI',
      role: 'ML & Pipeline Specialist',
      status: 'DORMANT',
      color: '#ec4899',
      hexColor: 0xec4899,
      icon: '🧠',
      angle: 5 * (2 * Math.PI / 10),
      elevation: -0.45,
      speed: 0.85,
      orbitRadius: 12.8,
      inclination: -0.18,
      orbitSpeed: 0.052,
      description: 'Engineers data pipelines, tracks training loss/accuracy, selects models, tunes hyperparameters, and prevents data leakage.',
      subsystem: 'INTELLIGENCE SQUAD',
      load: 'ACCURACY 99.4%',
      synapticRate: '41.0 TB/s',
      neuralEfficiency: '100%',
    },
    {
      id: 'agent_7_strategist',
      name: 'CHRONOS-PLAN',
      codename: 'MARK-XVII',
      role: 'Task Strategist & Decomposer',
      status: 'DORMANT',
      color: '#6366f1',
      hexColor: 0x6366f1,
      icon: '🗺️',
      angle: 6 * (2 * Math.PI / 10),
      elevation: -0.70,
      speed: 0.85,
      orbitRadius: 11.2,
      inclination: -0.24,
      orbitSpeed: 0.052,
      description: 'Transforms ambiguous goals into Kahn-verified Execution DAGs with dependency mapping, rollback plans, and token efficiency.',
      subsystem: 'INTELLIGENCE SQUAD',
      load: 'DAG VERIFIED',
      synapticRate: '27.5 TB/s',
      neuralEfficiency: '99.6%',
    },
    {
      id: 'agent_8_qa_critic',
      name: 'AEGIS-CRITIC',
      codename: 'MARK-VII',
      role: 'Verification & QA Auditor (The Critic)',
      status: 'DORMANT',
      color: '#84cc16',
      hexColor: 0x84cc16,
      icon: '🛡️',
      angle: 7 * (2 * Math.PI / 10),
      elevation: -0.45,
      speed: 0.85,
      orbitRadius: 12.8,
      inclination: -0.18,
      orbitSpeed: 0.052,
      description: 'The final quality gate for Mamu. Never trusts unproven assertions; tests edge cases and requires physical proof before issuing VERIFIED: PASS.',
      subsystem: 'QUALITY & GOVERNANCE',
      load: 'PASS 100%',
      synapticRate: '19.6 TB/s',
      neuralEfficiency: '100%',
    },
    {
      id: 'agent_9_security',
      name: 'SENTINEL-GUARD',
      codename: 'MARK-I',
      role: 'Security & Access Controller',
      status: 'DORMANT',
      color: '#ef4444',
      hexColor: 0xef4444,
      icon: '🔒',
      angle: 8 * (2 * Math.PI / 10),
      elevation: 0.0,
      speed: 0.85,
      orbitRadius: 11.2,
      inclination: 0.0,
      orbitSpeed: 0.052,
      description: 'Shields sensitive credentials, blocks destructive operations, defends against prompt injections, and guards system boundaries.',
      subsystem: 'QUALITY & GOVERNANCE',
      load: 'SHIELDS ONLINE',
      synapticRate: '16.4 TB/s',
      neuralEfficiency: '99.9%',
    },
    {
      id: 'agent_10_mobile',
      name: 'DROIDMARK-MOBILE',
      codename: 'MARK-50',
      role: 'Mobile & Notification Intelligence Specialist',
      status: 'DORMANT',
      color: '#38bdf8',
      hexColor: 0x38bdf8,
      icon: '📱',
      angle: 9 * (2 * Math.PI / 10),
      elevation: 0.35,
      speed: 0.85,
      orbitRadius: 12.8,
      inclination: 0.12,
      orbitSpeed: 0.052,
      description: 'Autonomous zero-cable mobile synchronization, 1080x2400 FHD+ display mirroring, notification intelligence, and smart-reply synthesis.',
      subsystem: 'MOBILE & HARDWARE SQUAD',
      load: 'WIRELESS 5555 ACTIVE',
      synapticRate: '35.4 TB/s',
      neuralEfficiency: '99.8%',
    },
  ]);

  // Three.js 3D Engine State
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private animationFrameId: number | null = null;
  private raycaster: THREE.Raycaster | null = null;
  private mouse = new THREE.Vector2();

  // 3D Core Visual Objects
  private centralCoreGroup: THREE.Group | null = null;
  private quantumDotSphere: THREE.Points | null = null;
  private quantumOriginalPositions: Float32Array | null = null;
  private quantumOriginalColors: Float32Array | null = null;
  private innerSingularityMesh: THREE.Mesh | null = null;
  private coreCoronaMesh: THREE.Mesh | null = null;
  private coreHitSphere: THREE.Mesh | null = null;

  // Concentric Calibrated HUD Dials (Integrated into Central Core)
  private hudSegmentedRing1: THREE.Group | null = null;
  private hudSegmentedRing2: THREE.Group | null = null;
  private hudSegmentedRing3: THREE.Group | null = null;
  private hudAzimuthTicks: THREE.LineSegments | null = null;
  private hudRadarSweeper: THREE.Line | null = null;
  private hudOuterRing: THREE.Mesh | null = null;
  private hudBracketGroup: THREE.Group | null = null;
  private shockwaveMeshes: { mesh: THREE.Mesh; phase: number; speed: number }[] = [];
  private voiceRippleRings: { mesh: THREE.Mesh; phase: number; baseRadius: number }[] = [];

  // Multi-Agent Mesh Mapping (Quantum Dot Balls + Nuclei + Micro-Rings)
  private agentMeshMap: Map<string, {
    group: THREE.Group;
    orb: THREE.Mesh; // Raycast hit sphere
    dotBall: THREE.Points; // Colored Fibonacci Quantum Dot Ball
    innerNucleus: THREE.Mesh; // Crystalline emissive polyhedral nucleus
    microRing: THREE.Mesh; // Orbiting micro-torus ring
    haloCloud?: THREE.Points; // Surrounding particle aura
    beam: THREE.Line;
    currentRadius: number;
    currentScale: number;
  }> = new Map();

  private interAgentMeshLines: THREE.LineSegments | null = null;
  private cachedAgentVectors: THREE.Vector3[] = [];

  // 3D Architectural Spatial Volume for Agent Swarm Home
  private swarmArchitectureGroup: THREE.Group | null = null;
  private volumetricColumns: { mesh: THREE.Mesh; baseOpacity: number; phase: number }[] = [];
  private podHitMeshes: THREE.Mesh[] = [];
  private homePodHitMeshes: THREE.Mesh[] = [];
  private workspaceStationHitMeshes: THREE.Mesh[] = [];
  private floatingConsoles: { mesh: THREE.Mesh; baseY: number; phase: number }[] = [];
  private groundRadarMesh: THREE.LineSegments | null = null;
  private agentBots: { group: THREE.Group; baseY: number; phase: number }[] = [];

  // 10 Specialist Architectural Station Coordinates across the Spatial Hexagonal Colony
  readonly stationPositions = [
    { x: 0, z: -9.2 },
    { x: 5.4, z: -7.4 },
    { x: 8.7, z: -2.8 },
    { x: 8.7, z: 2.8 },
    { x: 5.4, z: 7.4 },
    { x: 0, z: 9.2 },
    { x: -5.4, z: 7.4 },
    { x: -8.7, z: 2.8 },
    { x: -8.7, z: -2.8 },
    { x: -5.4, z: -7.4 },
  ];

  // Billboard nameplates tracking for anti-overlap and focused highlight
  private orbitalSprites: THREE.Sprite[] = [];
  private workspaceSprites: THREE.Sprite[] = [];
  private responsiveScaleFactor = 1.0;

  // Smooth Cinematic Camera Transitions (Default Centered Majestic Perspective)
  private targetCameraPos = new THREE.Vector3(0, 3.2, 21.0);
  private currentCameraPos = new THREE.Vector3(0, 3.2, 21.0);
  private targetCameraLookAt = new THREE.Vector3(0, -0.8, 0);
  private currentCameraLookAt = new THREE.Vector3(0, -0.8, 0);

  // Stardust & Ambient Starfield
  private ambientStarSystem: THREE.Points | null = null;
  private particleSystem: THREE.Points | null = null;
  private particleCount = 700;
  private particleAngles: Float32Array | null = null;
  private particleRadii: Float32Array | null = null;
  private particleSpeeds: Float32Array | null = null;
  private particleHeights: Float32Array | null = null;
  private horizonDisc: THREE.LineSegments | null = null;
  private networkNodeGroup: THREE.Group | null = null;
  private sectorGroup: THREE.Group | null = null;
  private workspaceGroup: THREE.Group | null = null;
  private automationGroup: THREE.Group | null = null;
  private mediaGroup: THREE.Group | null = null;
  private workspaceBotAvatars: {
    group: THREE.Group;
    phase: number;
    basePos: THREE.Vector3;
    toolMesh?: THREE.Mesh;
    headMesh?: THREE.Mesh;
    leftArm?: THREE.Mesh;
    rightArm?: THREE.Mesh;
  }[] = [];
  private workspaceRadarDish: THREE.Group | THREE.Mesh | null = null;
  private automationDataPackets: { mesh: THREE.Mesh; t: number; speed: number; curve: THREE.CatmullRomCurve3 }[] = [];
  private mediaSpectrumBars: THREE.Mesh[] = [];

  // Dynamic Colony Life & Miniature Base Visuals ("Bot Crossing" Features)
  private rovingCourierBots: {
    group: THREE.Group;
    t: number;
    speed: number;
    curve: THREE.CatmullRomCurve3;
  }[] = [];
  private weldingSparks: THREE.Points | null = null;
  private weldingSparkVels: Float32Array | null = null;
  private scanningLaserCone: THREE.Mesh | null = null;
  private verificationScanSheet: THREE.Mesh | null = null;
  private nexusAcousticRings: { mesh: THREE.Mesh; phase: number }[] = [];
  private stationMarkers: { mesh: THREE.Mesh; agentId: string; baseY: number; phase: number }[] = [];
  private orbitalMarkers: { mesh: THREE.Mesh; agentId: string; baseY: number; phase: number }[] = [];

  // Dynamic Universal Theme Synchronization tracking
  private themeColorMeshes: { mesh: THREE.Mesh | THREE.Line | THREE.LineSegments; isSecondary?: boolean }[] = [];
  private themeColorLights: { light: THREE.Light; isSecondary?: boolean }[] = [];
  private workspaceHexEdgeMat: THREE.LineBasicMaterial | null = null;
  private workspaceTileMat: THREE.MeshStandardMaterial | null = null;
  private workspaceCommandDomeMat: THREE.MeshStandardMaterial | null = null;
  private workspaceRadarDishMat: THREE.MeshStandardMaterial | null = null;
  private workspaceHemiLight: THREE.HemisphereLight | null = null;
  private workspaceSunLight: THREE.DirectionalLight | null = null;
  private workspaceFillLight: THREE.DirectionalLight | null = null;
  private workspaceSpecularSunLight: THREE.DirectionalLight | null = null;
  private workspaceBotChassisMaterials: {
    torsoMat: THREE.MeshStandardMaterial;
    headMat: THREE.MeshStandardMaterial;
    agentHex: number;
  }[] = [];

  // Public reference for backward compatibility
  orbitalCore: THREE.Group | THREE.Mesh | null = null;

  // Lighting
  private ambientLight: THREE.AmbientLight | null = null;
  private pointLight1: THREE.PointLight | null = null;
  private pointLight2: THREE.PointLight | null = null;
  private pointLightCore: THREE.PointLight | null = null;

  // Web Audio Context
  private audioCtx: AudioContext | null = null;

  // Interaction & Rotation
  private isDragging = false;
  private prevMouse = { x: 0, y: 0 };
  private sceneRotation = { x: 0.15, y: 0 };
  private targetRotation = { x: 0.15, y: 0 };
  private targetMouseParallax = { x: 0, y: 0, z: 0 };

  // Runtime State
  private isRunning = false;
  private isReducedMotion = false;
  private isWebGLAvailable = true;
  private currentMode: SpatialEnvironmentMode = 'DEFAULT';
  private energyState: 'IDLE' | 'LISTENING' | 'EXECUTING' | 'VERIFIED' | 'ERROR' = 'IDLE';

  constructor() {
    this.initAudio();
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.isReducedMotion = mediaQuery.matches;
        mediaQuery.addEventListener?.('change', (e) => {
          this.isReducedMotion = e.matches;
        });
      } catch {
        // Fallback
      }
    }
  }

  // --- SCI-FI HUD AUDIO GENERATOR (WEB AUDIO API) ---
  private initAudio(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    } catch {
      // Audio guard
    }
  }

  playHoloSound(type: 'burst' | 'deploy' | 'beep' | 'pulse' | 'dock'): void {
    if (!this.soundEnabled() || !this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'deploy') {
        // Iris opening whoosh & upward frequency sweep
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.4);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (type === 'dock') {
        // Deep implosion & lock tone
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.35);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'pulse') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1100, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch {
      // Audio guard
    }
  }

  toggleSound(): void {
    this.soundEnabled.update((v) => !v);
    if (this.soundEnabled()) this.playHoloSound('beep');
  }

  // --- THREE.JS INITIALIZATION ---

  init(canvas: HTMLCanvasElement): boolean {
    try {
      this.pause();
      this.isRunning = false;

      const width = canvas.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1280);
      const height = canvas.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 800);

      // 1. Scene & Camera Setup
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x01040a, 0.022);

      this.camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1000);
      this.camera.position.set(0, 3.2, 21.0);
      this.camera.lookAt(0, -0.8, 0);

      // 2. High-Performance WebGL Renderer
      if (this.renderer) {
        this.renderer.dispose();
      }
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setSize(width, height, false);
      this.renderer.setPixelRatio(Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.setClearColor(0x000000, 0);

      this.raycaster = new THREE.Raycaster();

      // 3. Ambient & Point Lighting
      this.ambientLight = new THREE.AmbientLight(0x0284c7, 1.8);
      this.scene.add(this.ambientLight);

      this.pointLight1 = new THREE.PointLight(0x00f0ff, 6.0, 100, 1.5);
      this.pointLight1.position.set(6, 6, 10);
      this.scene.add(this.pointLight1);

      this.pointLight2 = new THREE.PointLight(0xa855f7, 4.5, 90, 1.5);
      this.pointLight2.position.set(-6, -5, 8);
      this.scene.add(this.pointLight2);

      this.pointLightCore = new THREE.PointLight(0x00f0ff, 8.0, 40, 2.0);
      this.pointLightCore.position.set(0, 0, 0);
      this.scene.add(this.pointLightCore);

      // 4. Construct Scene Visuals
      this.buildQuantumDotCore();
      this.buildAmbientStarfield();
      this.buildMultiAgents();
      this.createHolographicHorizonDisc();
      this.createSwarmHomeArchitecture();
      this.createNetworkGraphVisuals();
      this.createBusinessSectorVisuals();
      this.createWorkspaceBaseEnvironment();
      this.createAutomationEnvironment();
      this.createMediaEnvironment();

      // 5. Interaction Listeners
      this.setupCanvasInteractions(canvas);

      // Apply active theme colors
      const currentTheme = this.themeService.activeTheme();
      if (currentTheme) {
        this.updateThemeColors(currentTheme.colors);
      }

      this.isRunning = true;
      this.isWebGLAvailable = true;
      this.startAnimationLoop();
      return true;
    } catch (err) {
      console.error('ThreeSceneManagerService init failed:', err);
      this.isWebGLAvailable = false;
      return false;
    }
  }

  /**
   * Builds the pure Quantum Dot Fibonacci Sphere Core and inner Arc Singularity.
   */
  private buildQuantumDotCore(): void {
    if (!this.scene) return;

    this.centralCoreGroup = new THREE.Group();
    this.centralCoreGroup.rotation.x = 0.15;
    this.centralCoreGroup.position.set(0, 0, 0);

    // 1. Concentrated Radiant Arc Singularity
    const singGeo = new THREE.SphereGeometry(1.6, 32, 32);
    const singMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
    });
    this.innerSingularityMesh = new THREE.Mesh(singGeo, singMat);
    this.centralCoreGroup.add(this.innerSingularityMesh);
    this.themeColorMeshes.push({ mesh: this.innerSingularityMesh });

    // 2. Atmospheric Plasma Corona Glow (Volumetric Soft Shell)
    const coronaGeo = new THREE.SphereGeometry(2.1, 32, 32);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    this.coreCoronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    this.centralCoreGroup.add(this.coreCoronaMesh);
    this.themeColorMeshes.push({ mesh: this.coreCoronaMesh });

    // 3. PURE HIGH-DENSITY QUANTUM DOT PARTICLE BALL (3,200 Holographic Dots)
    const particleCount = 3200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sphereRadius = 3.8;

    // Distribute via Fibonacci Sphere Algorithm
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < particleCount; i++) {
      const theta = (2 * Math.PI * i) / goldenRatio;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / particleCount);

      const r = sphereRadius;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Pure stark cyan, electric azure, and pure white gradient
      const cGrad = (y + sphereRadius) / (sphereRadius * 2);
      colors[i * 3] = 0.1 + cGrad * 0.8;
      colors[i * 3 + 1] = 0.85 + cGrad * 0.15;
      colors[i * 3 + 2] = 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.quantumOriginalPositions = new Float32Array(positions);
    this.quantumOriginalColors = new Float32Array(colors);

    const material = new THREE.PointsMaterial({
      size: 0.13,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });

    this.quantumDotSphere = new THREE.Points(geometry, material);
    this.centralCoreGroup.add(this.quantumDotSphere);

    // 4. Concentric Calibrated Precision Arcs (HUD Dials)
    this.hudSegmentedRing1 = new THREE.Group();
    const seg1Mat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 4; i++) {
      const startAngle = i * (Math.PI / 2);
      const arcGeo = new THREE.RingGeometry(2.35, 2.55, 32, 1, startAngle, Math.PI * 0.35);
      const arcMesh = new THREE.Mesh(arcGeo, seg1Mat);
      arcMesh.position.z = 0.05;
      this.hudSegmentedRing1.add(arcMesh);
      this.themeColorMeshes.push({ mesh: arcMesh });
    }
    this.centralCoreGroup.add(this.hudSegmentedRing1);

    // 5. 360° Azimuth Tick Marks
    const tickPoints: THREE.Vector3[] = [];
    const totalTicks = 72;
    for (let i = 0; i < totalTicks; i++) {
      const angle = (i / totalTicks) * Math.PI * 2;
      const isMajor = i % 6 === 0;
      const rInner = 2.75;
      const rOuter = isMajor ? 3.05 : 2.90;
      tickPoints.push(
        new THREE.Vector3(Math.cos(angle) * rInner, Math.sin(angle) * rInner, 0.05),
        new THREE.Vector3(Math.cos(angle) * rOuter, Math.sin(angle) * rOuter, 0.05)
      );
    }
    const ticksGeo = new THREE.BufferGeometry().setFromPoints(tickPoints);
    const ticksMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    this.hudAzimuthTicks = new THREE.LineSegments(ticksGeo, ticksMat);
    this.centralCoreGroup.add(this.hudAzimuthTicks);
    this.themeColorMeshes.push({ mesh: this.hudAzimuthTicks });

    // 6. Rotating 360° Radar Scanner Beam
    const radarPoints = [
      new THREE.Vector3(0, 0, 0.1),
      new THREE.Vector3(4.2, 0, 0.1),
    ];
    const radarGeo = new THREE.BufferGeometry().setFromPoints(radarPoints);
    const radarMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    this.hudRadarSweeper = new THREE.Line(radarGeo, radarMat);
    this.centralCoreGroup.add(this.hudRadarSweeper);

    // 7. RAYCAST TARGET SPHERE (Enables clicking the central core)
    const hitGeo = new THREE.SphereGeometry(2.3, 16, 16);
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.001,
      depthWrite: false,
    });
    this.coreHitSphere = new THREE.Mesh(hitGeo, hitMat);
    this.coreHitSphere.userData = { isCoreTarget: true };
    this.centralCoreGroup.add(this.coreHitSphere);

    this.scene.add(this.centralCoreGroup);
    this.orbitalCore = this.centralCoreGroup;

    // 8. Expanding Volumetric Shockwave Rings
    this.shockwaveMeshes = [];
    for (let i = 0; i < 3; i++) {
      const sGeo = new THREE.RingGeometry(1.5, 1.75, 64);
      const sMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const sMesh = new THREE.Mesh(sGeo, sMat);
      sMesh.rotation.x = Math.PI / 2;
      sMesh.visible = false;
      this.scene.add(sMesh);
      this.themeColorMeshes.push({ mesh: sMesh });
      this.shockwaveMeshes.push({
        mesh: sMesh,
        phase: i * (1.0 / 3.0),
        speed: 0.45,
      });
    }

    // 9. Dedicated Acoustic Voice Shockwave Rings (Expanding sound ripples during speech)
    this.voiceRippleRings = [];
    for (let i = 0; i < 3; i++) {
      const vGeo = new THREE.TorusGeometry(3.8, 0.035, 16, 64);
      const vMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
      });
      const vMesh = new THREE.Mesh(vGeo, vMat);
      vMesh.rotation.x = Math.PI * 0.5;
      vMesh.visible = false;
      this.centralCoreGroup.add(vMesh);
      this.themeColorMeshes.push({ mesh: vMesh });
      this.voiceRippleRings.push({
        mesh: vMesh,
        phase: i * (1.0 / 3.0),
        baseRadius: 3.8,
      });
    }
  }

  /**
   * Deep Cosmic Ambient Micro-Starfield (1,200 fine twinkling pinpoint stars).
   */
  private buildAmbientStarfield(): void {
    // Disabled per user instruction: clean, pure cosmic gradient background without scattered space dot clutter.
    if (!this.scene) return;
    this.ambientStarSystem = new THREE.Group() as any;
  }

  /**
   * Advanced Multi-Agents construction:
   * Multi-colored Quantum Dot Balls with inner crystalline nuclei,
   * orbiting micro-torus rings, and enlarged raycast hit spheres.
   */
  private buildMultiAgents(): void {
    if (!this.scene) return;
    this.agentMeshMap.clear();
    this.orbitalSprites = [];

    const phiRatio = (1 + Math.sqrt(5)) / 2;

    this.agents().forEach((agent) => {
      const group = new THREE.Group();

      // 1. Quantum Dot Ball: spherical Fibonacci point cloud (192 colored dots)
      const dotCount = 192;
      const dotGeo = new THREE.BufferGeometry();
      const dotPos = new Float32Array(dotCount * 3);
      const dotColors = new Float32Array(dotCount * 3);
      const c = new THREE.Color(agent.hexColor);

      for (let i = 0; i < dotCount; i++) {
        const theta = 2 * Math.PI * i / phiRatio;
        const phi = Math.acos(1 - 2 * (i + 0.5) / dotCount);
        const r = 0.72;
        dotPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        dotPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        dotPos[i * 3 + 2] = r * Math.cos(phi);

        dotColors[i * 3] = c.r;
        dotColors[i * 3 + 1] = c.g;
        dotColors[i * 3 + 2] = c.b;
      }
      dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
      dotGeo.setAttribute('color', new THREE.BufferAttribute(dotColors, 3));
      const dotMat = new THREE.PointsMaterial({
        size: 0.12,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      });
      const dotBall = new THREE.Points(dotGeo, dotMat);
      group.add(dotBall);

      // 2. Inner Radiant Crystalline Nucleus
      const innerGeo = new THREE.OctahedronGeometry(0.38, 2);
      const innerMat = new THREE.MeshStandardMaterial({
        color: agent.hexColor,
        emissive: agent.hexColor,
        emissiveIntensity: 0.90,
        roughness: 0.18,
        metalness: 0.8,
      });
      const innerNucleus = new THREE.Mesh(innerGeo, innerMat);
      group.add(innerNucleus);

      // 3. Orbiting Micro-Torus Ring
      const ringGeo = new THREE.TorusGeometry(0.95, 0.022, 12, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: agent.hexColor,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
      });
      const microRing = new THREE.Mesh(ringGeo, ringMat);
      microRing.rotation.x = Math.PI * 0.25;
      group.add(microRing);

      // 4. Pure luminous core - particle dot clouds removed per user instruction

      // 5. Enlarged Raycast Hit-Sphere (r = 1.6) for effortless 100% click hit rate
      const hitGeo = new THREE.SphereGeometry(1.6, 16, 16);
      const hitMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.001,
        depthWrite: false,
      });
      const hitSphere = new THREE.Mesh(hitGeo, hitMat);
      hitSphere.userData = { agentId: agent.id, agent };
      group.add(hitSphere);

      // 6. Tactile Holographic Diamond Beacon over Orbiting Agent
      const oMarkerGeo = new THREE.OctahedronGeometry(0.18, 0);
      const oMarkerMat = new THREE.MeshBasicMaterial({
        color: agent.hexColor,
      });
      const oMarkerMesh = new THREE.Mesh(oMarkerGeo, oMarkerMat);
      oMarkerMesh.position.set(0, 1.25, 0);
      group.add(oMarkerMesh);
      this.orbitalMarkers.push({ mesh: oMarkerMesh, agentId: agent.id, baseY: 1.25, phase: this.orbitalMarkers.length * 0.78 });

      // 7. Floating 3D Nameplate Sprite over Orbiting Agent (Cleanly hidden unless hovered/selected)
      const nameplate = this.createAgentBillboardSprite(agent);
      nameplate.position.set(0, 1.85, 0);
      nameplate.visible = false;
      if (nameplate.material instanceof THREE.SpriteMaterial) {
        nameplate.material.opacity = 0.0;
      }
      group.add(nameplate);
      this.orbitalSprites.push(nameplate);

      // Energy Laser Tether Beam linking Agent to Central Singularity
      const beamGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      const beamMat = new THREE.LineBasicMaterial({
        color: agent.hexColor,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const beam = new THREE.Line(beamGeo, beamMat);
      this.scene?.add(beam);

      // Concealed inside core at startup
      group.scale.set(1.0, 1.0, 1.0);
      group.position.set(0, 0, 0);

      this.scene?.add(group);
      this.agentMeshMap.set(agent.id, {
        group,
        orb: hitSphere,
        dotBall,
        innerNucleus,
        microRing,
        beam,
        currentRadius: agent.orbitRadius,
        currentScale: 1.0,
      });
    });

    // Inter-Agent Synaptic Network Mesh (Single Harmonious Perimeter Flow Loop)
    const agentCount = this.agents().length;
    const meshLineCount = agentCount;
    const meshPositions = new Float32Array(meshLineCount * 2 * 3);
    const meshGeo = new THREE.BufferGeometry();
    meshGeo.setAttribute('position', new THREE.BufferAttribute(meshPositions, 3));

    const meshMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.interAgentMeshLines = new THREE.LineSegments(meshGeo, meshMat);
    this.scene.add(this.interAgentMeshLines);
  }

  /**
   * Curved Holographic Tactical Horizon Disc (fading gracefully into fog).
   */
  private createHolographicHorizonDisc(): void {
    if (!this.scene) return;

    const linePoints: THREE.Vector3[] = [];
    const floorY = -6.5;
    const radii = [6.0, 11.0, 16.0, 22.0, 28.0, 35.0];
    const segments = 64;

    radii.forEach((r) => {
      for (let i = 0; i < segments; i++) {
        const a1 = (i / segments) * Math.PI * 2;
        const a2 = ((i + 1) / segments) * Math.PI * 2;
        linePoints.push(
          new THREE.Vector3(Math.cos(a1) * r, floorY, Math.sin(a1) * r),
          new THREE.Vector3(Math.cos(a2) * r, floorY, Math.sin(a2) * r)
        );
      }
    });

    const spokes = 12;
    for (let s = 0; s < spokes; s++) {
      const angle = (s / spokes) * Math.PI * 2;
      linePoints.push(
        new THREE.Vector3(Math.cos(angle) * 5.0, floorY, Math.sin(angle) * 5.0),
        new THREE.Vector3(Math.cos(angle) * 35.0, floorY, Math.sin(angle) * 35.0)
      );
    }

    const horizonGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const horizonMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
    });

    this.horizonDisc = new THREE.LineSegments(horizonGeo, horizonMat);
    this.scene.add(this.horizonDisc);
  }

  /**
   * Generates a realistic dynamic holographic console screen texture for an agent pod.
   */
  private createPodConsoleTexture(agent: any): THREE.CanvasTexture {
    if (typeof document === 'undefined') {
      return new THREE.CanvasTexture({} as any);
    }
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext ? canvas.getContext('2d') : null;
    if (ctx) {
      // Dark cybernetic holographic glass background
      ctx.fillStyle = 'rgba(2, 9, 22, 0.92)';
      ctx.fillRect(0, 0, 512, 256);

      // Border in signature neon color
      ctx.strokeStyle = agent.hexColor || '#00f0ff';
      ctx.lineWidth = 4;
      ctx.strokeRect(6, 6, 500, 244);

      // Corner Reticle Brackets
      ctx.fillStyle = agent.hexColor || '#00f0ff';
      ctx.fillRect(6, 6, 24, 6);
      ctx.fillRect(6, 6, 6, 24);
      ctx.fillRect(482, 6, 24, 6);
      ctx.fillRect(500, 6, 6, 24);
      ctx.fillRect(6, 244, 24, 6);
      ctx.fillRect(6, 226, 6, 24);
      ctx.fillRect(482, 244, 24, 6);
      ctx.fillRect(500, 226, 6, 24);

      // Header Bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(10, 10, 492, 42);

      ctx.fillStyle = agent.hexColor || '#00f0ff';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(agent.name, 22, 38);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '14px monospace';
      ctx.fillText(`// ${agent.codename || 'MARK-II'}`, 280, 38);

      // Body: Role & Subsystem
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`ROLE: ${agent.role || 'Specialist'}`, 22, 85);

      ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
      ctx.font = '14px monospace';
      ctx.fillText(`SUBSYSTEM: ${agent.subsystem || 'Autonomous'}`, 22, 115);
      ctx.fillText(`LATENCY: ${agent.latencyMs || 12}ms · LOAD: ${agent.load || 'OPTIMAL'}`, 22, 142);

      // Cybernetic Waveform Graph
      ctx.strokeStyle = agent.hexColor || '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < 468; x += 8) {
        const y = 195 + Math.sin(x * 0.08) * 16 + (Math.random() - 0.5) * 6;
        if (x === 0) ctx.moveTo(22 + x, y);
        else ctx.lineTo(22 + x, y);
      }
      ctx.stroke();

      // Status Pill
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.fillRect(22, 220, 160, 22);
      ctx.strokeStyle = '#10b981';
      ctx.strokeRect(22, 220, 160, 22);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('● SYNAPSE 99.2%', 32, 235);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * 3D Architectural Spatial Volume for Multi-Agent Swarm:
   * Multi-tier stepped Cybernetic Citadel dais,
   * 8 radial docking pods with glowing accent rims,
   * volumetric holographic light columns rising into space,
   * floating holographic data console screens in 3D,
   * radial energy causeway bridges, dedicated pod lighting, and architectural pylons.
   */
  private createSwarmHomeArchitecture(): void {
    if (!this.scene) return;
    this.swarmArchitectureGroup = new THREE.Group();
    this.podHitMeshes = [];
    this.homePodHitMeshes = [];
    this.floatingConsoles = [];

    // Dedicated 4-Point Colony Studio Lighting Rig for 3D Core Space (Matching Workspace metallic luster)
    const homeSpecSun = new THREE.DirectionalLight(0xfffbf0, 3.2);
    homeSpecSun.position.set(0, 24, -22);
    this.swarmArchitectureGroup.add(homeSpecSun);

    const homeSun = new THREE.DirectionalLight(0xfffaed, 2.4);
    homeSun.position.set(16, 26, 16);
    this.swarmArchitectureGroup.add(homeSun);

    const homeFill = new THREE.DirectionalLight(0x38bdf8, 2.2);
    homeFill.position.set(-16, 22, -14);
    this.swarmArchitectureGroup.add(homeFill);

    const homeHemi = new THREE.HemisphereLight(0x00f0ff, 0x0c1e3d, 1.6);
    this.swarmArchitectureGroup.add(homeHemi);

    // 1. Central Multi-Tier Hexagonal Citadel Dais with metallic luster matching Workspace
    const baseGeo = new THREE.CylinderGeometry(13.5, 14.5, 0.4, 6);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x11213b,
      roughness: 0.28,
      metalness: 0.58,
      emissive: 0x06111f,
      emissiveIntensity: 0.12,
    });
    const baseDais = new THREE.Mesh(baseGeo, baseMat);
    baseDais.position.y = -5.8;
    this.swarmArchitectureGroup.add(baseDais);

    // Glowing edge contours for the central citadel
    const edgesGeo = new THREE.EdgesGeometry(baseGeo);
    const edgesMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const baseEdges = new THREE.LineSegments(edgesGeo, edgesMat);
    baseEdges.position.y = -5.8;
    this.swarmArchitectureGroup.add(baseEdges);

    // Upper stepped dais
    const stepGeo = new THREE.CylinderGeometry(8.5, 9.2, 0.35, 6);
    const stepMesh = new THREE.Mesh(stepGeo, baseMat);
    stepMesh.position.y = -5.45;
    this.swarmArchitectureGroup.add(stepMesh);

    const stepEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(stepGeo),
      new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
      })
    );
    stepEdges.position.y = -5.45;
    this.swarmArchitectureGroup.add(stepEdges);

    // Ground Radar Rings embedded in citadel floor
    const radarLines: THREE.Vector3[] = [];
    const radarRadii = [3.5, 6.2, 9.8, 12.8];
    radarRadii.forEach((r) => {
      for (let i = 0; i < 48; i++) {
        const a1 = (i / 48) * Math.PI * 2;
        const a2 = ((i + 1) / 48) * Math.PI * 2;
        radarLines.push(
          new THREE.Vector3(Math.cos(a1) * r, -5.76, Math.sin(a1) * r),
          new THREE.Vector3(Math.cos(a2) * r, -5.76, Math.sin(a2) * r)
        );
      }
    });
    const radarGeo = new THREE.BufferGeometry().setFromPoints(radarLines);
    const radarMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
    });
    this.groundRadarMesh = new THREE.LineSegments(radarGeo, radarMat);
    this.swarmArchitectureGroup.add(this.groundRadarMesh);

    // 2. 8 Dedicated Volumetric Docking Chambers & Hexagonal Sector Platforms (Inspired by Planetary Base)
    this.volumetricColumns = [];
    const radius = 9.8;
    const agentList = this.agents();

    agentList.forEach((agent, index) => {
      const angle = (index / agentList.length) * Math.PI * 2;
      const posX = Math.cos(angle) * radius;
      const posZ = Math.sin(angle) * radius;
      const posY = -5.0;

      const podGroup = new THREE.Group();
      podGroup.position.set(posX, posY, posZ);
      podGroup.userData = { agentId: agent.id, agent };

      // Dedicated PointLight casting agent's signature neon glow onto pod platform
      const podLight = new THREE.PointLight(agent.hexColor, 2.2, 6.5, 1.2);
      podLight.position.set(0, 0.8, 0);
      podGroup.add(podLight);

      // Modular Hexagonal Sector Platform (Image 1 Cybernetic Base Colony)
      const padGeo = new THREE.CylinderGeometry(2.2, 2.5, 0.35, 6);
      const padMat = new THREE.MeshStandardMaterial({
        color: 0x11213b,
        roughness: 0.28,
        metalness: 0.58,
        emissive: 0x06111f,
        emissiveIntensity: 0.12,
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.userData = { agentId: agent.id, agent };
      podGroup.add(pad);

      // Hexagonal Perimeter Neon Accent Border
      const hexEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(padGeo),
        new THREE.LineBasicMaterial({
          color: agent.hexColor,
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
        })
      );
      podGroup.add(hexEdges);

      // Sci-Fi Architectural Module / Habitat Dome (Image 1 style)
      const domeGeo = new THREE.SphereGeometry(0.75, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const domeMat = new THREE.MeshStandardMaterial({
        color: 0x0d213f,
        roughness: 0.25,
        metalness: 0.9,
      });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      dome.position.y = 0.18;
      dome.userData = { agentId: agent.id, agent };
      podGroup.add(dome);

      // Energy Observation Ring around dome
      const rimGeo = new THREE.TorusGeometry(0.74, 0.03, 12, 32);
      const rimMat = new THREE.MeshBasicMaterial({
        color: agent.hexColor,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.x = Math.PI * 0.5;
      rim.position.y = 0.42;
      podGroup.add(rim);

      // Station Radial Energy Causeway connecting Central Citadel to this Pod
      const causewayGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -5.45, 0),
        new THREE.Vector3(posX, posY, posZ),
      ]);
      const causewayMat = new THREE.LineBasicMaterial({
        color: agent.hexColor,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
      });
      const causeway = new THREE.Line(causewayGeo, causewayMat);
      this.swarmArchitectureGroup?.add(causeway);

      // Refined, Low-Profile Holographic Emitter Beacon (Non-Obtrusive, 1.2 height instead of giant 8.5 slab)
      const colHeight = 1.2;
      const colGeo = new THREE.CylinderGeometry(0.35, 0.35, colHeight, 16, 1, true);
      const colMat = new THREE.MeshBasicMaterial({
        color: agent.hexColor,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const colMesh = new THREE.Mesh(colGeo, colMat);
      colMesh.position.y = colHeight * 0.5 + 0.3;
      colMesh.userData = { agentId: agent.id, agent };
      podGroup.add(colMesh);

      this.volumetricColumns.push({
        mesh: colMesh,
        baseOpacity: 0.12,
        phase: index * 0.78,
      });

      // Holographic Workstation Console Screen (Clean on-demand projection in 3D)
      const consoleTex = this.createPodConsoleTexture(agent);
      const consoleGeo = new THREE.PlaneGeometry(2.3, 1.35);
      const consoleMat = new THREE.MeshBasicMaterial({
        map: consoleTex,
        transparent: true,
        opacity: 0.0, // Hidden in default view to keep the world clean & spacious!
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const consoleMesh = new THREE.Mesh(consoleGeo, consoleMat);
      consoleMesh.position.set(0, 1.5, 1.35);
      consoleMesh.rotation.y = Math.PI;
      consoleMesh.visible = false;
      consoleMesh.userData = { agentId: agent.id, agent };
      podGroup.add(consoleMesh);
      this.floatingConsoles.push({ mesh: consoleMesh, baseY: 1.5, phase: index * 0.78 });

      // Raycast Hit Cylinder for the entire 3D pod volume (guarantees 100% click accessibility)
      const hitPodGeo = new THREE.CylinderGeometry(2.4, 2.4, 6.0, 16);
      const hitPodMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.001,
        depthWrite: false,
      });
      const hitPod = new THREE.Mesh(hitPodGeo, hitPodMat);
      hitPod.position.y = 3.0;
      hitPod.userData = { agentId: agent.id, agent };
      podGroup.add(hitPod);
      this.podHitMeshes.push(hitPod);
      this.homePodHitMeshes.push(hitPod);

      // 3 Sleek Architectural Pylons around pod
      for (let p = 0; p < 3; p++) {
        const pAngle = (p / 3) * Math.PI * 2;
        const pGeo = new THREE.BoxGeometry(0.08, 1.2, 0.08);
        const pMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
        emissive: agent.hexColor,
        emissiveIntensity: 0.25,
          roughness: 0.4,
          metalness: 0.8,
        });
        const pylon = new THREE.Mesh(pGeo, pMat);
        pylon.position.set(Math.cos(pAngle) * 1.5, 0.6, Math.sin(pAngle) * 1.5);
        podGroup.add(pylon);

        // Pylon Tip Light
        const tipGeo = new THREE.SphereGeometry(0.05, 8, 8);
        const tipMat = new THREE.MeshBasicMaterial({
          color: agent.hexColor,
          blending: THREE.AdditiveBlending,
        });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.set(Math.cos(pAngle) * 1.5, 1.25, Math.sin(pAngle) * 1.5);
        podGroup.add(tip);
      }

      this.swarmArchitectureGroup?.add(podGroup);
    });

    this.scene.add(this.swarmArchitectureGroup);
  }

  private createNetworkGraphVisuals(): void {
    if (!this.scene) return;
    this.networkNodeGroup = new THREE.Group();
    this.networkNodeGroup.visible = false;
    this.scene.add(this.networkNodeGroup);
  }

  private createBusinessSectorVisuals(): void {
    if (!this.scene) return;
    this.sectorGroup = new THREE.Group();
    this.sectorGroup.visible = false;

    const sectorDefs = [
      { id: 'automation_services', name: 'Automation Services', color: 0x06b6d4, pos: new THREE.Vector3(-8.0, 2.0, -4.0) },
      { id: 'digital_products', name: 'Digital Products', color: 0x3b82f6, pos: new THREE.Vector3(-4.0, -1.5, 4.0) },
      { id: 'media_studio', name: 'Content & Media Studio', color: 0xa855f7, pos: new THREE.Vector3(0.0, 4.0, -6.0) },
      { id: 'software_tools', name: 'Software Tools', color: 0x10b981, pos: new THREE.Vector3(4.0, -2.0, 3.0) },
      { id: 'research_products', name: 'Research & Data', color: 0xf59e0b, pos: new THREE.Vector3(7.0, 3.0, -3.0) },
      { id: 'workflow_solutions', name: 'Workflow Solutions', color: 0xec4899, pos: new THREE.Vector3(2.0, -4.0, 6.0) },
    ];

    sectorDefs.forEach((def) => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.copy(def.pos);

      const coreGeo = new THREE.IcosahedronGeometry(0.85, 1);
      const coreMat = new THREE.MeshStandardMaterial({
        color: def.color,
        emissive: def.color,
        emissiveIntensity: 0.5,
        roughness: 0.25,
        metalness: 0.8,
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      nodeGroup.add(coreMesh);

      const ringGeo = new THREE.TorusGeometry(1.4, 0.04, 16, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI * 0.35;
      nodeGroup.add(ringMesh);

      const points = [new THREE.Vector3(0, 0, 0), def.pos];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.25,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      this.sectorGroup!.add(line);

      this.sectorGroup!.add(nodeGroup);
    });
    this.scene.add(this.sectorGroup);
  }

  /**
   * Generates a high-contrast 3D Sprite billboard nameplate for an agent.
   */
  private createAgentBillboardSprite(agent: AgentNode): THREE.Sprite {
    if (typeof document === 'undefined') {
      return new THREE.Sprite();
    }
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(5, 12, 28, 0.92)';
      ctx.beginPath();
      if ((ctx as any).roundRect) {
        (ctx as any).roundRect(4, 4, 312, 72, 14);
      } else {
        ctx.rect(4, 4, 312, 72);
      }
      ctx.fill();

      ctx.strokeStyle = agent.color || '#00f0ff';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.fillStyle = agent.color || '#00f0ff';
      ctx.beginPath();
      ctx.arc(36, 40, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(agent.name, 58, 30);

      ctx.fillStyle = agent.color || '#38bdf8';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`[${agent.codename}] · 100% BOND`, 58, 54);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(3.4, 0.85, 1);
    sprite.userData = { agentId: agent.id, agent };
    return sprite;
  }

  /**
   * 3D Cybernetic Colony & Multi-Agent Living Base (Image 1 "Bot Crossing" Style):
   * Expansive hexagonal planetary surface with 37 interlocking terraced hex tiles,
   * Central Autonomous Command Hub with rotating radar array & geodesic dome,
   * 8 distinct architectural specialist stations with dedicated robotic bots,
   * Autonomous roving courier droids, solar array fields, supply cargo depots,
   * drone landing pads, active welding sparks, and LiDAR scanning cones.
   */
  private createWorkspaceBaseEnvironment(): void {
    if (!this.scene) return;
    this.workspaceGroup = new THREE.Group();
    this.workspaceGroup.visible = false;
    this.workspaceBotAvatars = [];
    this.workspaceSprites = [];
    this.stationMarkers = [];
    this.rovingCourierBots = [];
    this.nexusAcousticRings = [];
    this.workspaceStationHitMeshes = [];
    this.workspaceBotChassisMaterials = [];

    // 1. Dedicated Studio Lighting Rig for Hexagonal Base Colony
    // Soft overhead ambient light ensuring all 37 tiles and stations are clearly visible with cybernetic sheen
    const ambientColonyLight = new THREE.AmbientLight(0x182c4d, 1.8);
    this.workspaceGroup.add(ambientColonyLight);

    // Key Light 1 (Overhead Sun): Positioned directly above at (0, 26, 0)
    // Evenly illuminates all 37 hex tiles from top-down so top view is crystal clear and intelligible
    const topSunLight = new THREE.DirectionalLight(0xfffbf0, 1.5);
    topSunLight.position.set(0, 26, 0);
    this.workspaceGroup.add(topSunLight);
    this.workspaceSpecularSunLight = topSunLight;

    // Key Light 2 (Warm Angled Sun): From upper right (14, 22, 14)
    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.5);
    sunLight.position.set(14, 22, 14);
    this.workspaceGroup.add(sunLight);
    this.workspaceSunLight = sunLight;

    // Key Light 3 (Cool Sci-Fi Fill): Cyan fill from upper left (-14, 20, -12)
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    fillLight.position.set(-14, 20, -12);
    this.workspaceGroup.add(fillLight);
    this.workspaceFillLight = fillLight;
    this.themeColorLights.push({ light: fillLight, isSecondary: true });

    // Key Light 4 (Atmospheric Hemisphere Light): Soft sky-to-ground ambient bounce
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x071529, 1.4);
    this.workspaceGroup.add(hemiLight);
    this.workspaceHemiLight = hemiLight;

    // 2. Expansive 37-Tile Hexagonal Terrain Base (q, r hex axial coordinates)
    const hexCoords: { q: number; r: number }[] = [];
    const hexRadius = 3.6;
    const hexHeight = 0.5;

    for (let q = -3; q <= 3; q++) {
      const r1 = Math.max(-3, -q - 3);
      const r2 = Math.min(3, -q + 3);
      for (let r = r1; r <= r2; r++) {
        hexCoords.push({ q, r });
      }
    }

    const baseHexGeo = new THREE.CylinderGeometry(hexRadius * 0.96, hexRadius, hexHeight, 6);
    this.workspaceTileMat = new THREE.MeshStandardMaterial({
      color: 0x0f223d,
      roughness: 0.42,
      metalness: 0.55,
      emissive: 0x061426,
      emissiveIntensity: 0.16,
    });
    this.workspaceHexEdgeMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const standardTileMat = this.workspaceTileMat;
    const hexEdgeMat = this.workspaceHexEdgeMat;

    // Functional tile categorization for peripheral colony structures
    const solarCoords = new Set(['-2,-1', '2,-3', '-1,3', '3,0']);
    const cargoCoords = new Set(['0,-3', '3,-2', '-3,2', '0,3']);
    const landingCoords = new Set(['-3,1', '2,1']);
    const capacitorCoords = new Set(['-1,-2', '1,2']);

    hexCoords.forEach((coord) => {
      const x = hexRadius * Math.sqrt(3) * (coord.q + coord.r / 2);
      const z = hexRadius * (3 / 2) * coord.r;
      const distFromCenter = Math.sqrt(x * x + z * z);
      const y = -4.8 - Math.min(1.2, distFromCenter * 0.04) + Math.sin(coord.q * 1.5 + coord.r) * 0.10;

      const tileMesh = new THREE.Mesh(baseHexGeo, standardTileMat);
      tileMesh.position.set(x, y, z);
      this.workspaceGroup?.add(tileMesh);

      const edgeMesh = new THREE.LineSegments(new THREE.EdgesGeometry(baseHexGeo), hexEdgeMat);
      edgeMesh.position.set(x, y, z);
      this.workspaceGroup?.add(edgeMesh);

      const coordKey = `${coord.q},${coord.r}`;

      // Build Peripheral Colony Props (From Image 1 "Bot Crossing")
      if (solarCoords.has(coordKey)) {
        // Solar Array Field: Dual tilted photovoltaic wings
        const solarGroup = new THREE.Group();
        solarGroup.position.set(x, y + hexHeight * 0.5, z);
        [-0.85, 0.85].forEach((sx) => {
          const pylon = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.1, 0.8, 8),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 })
          );
          pylon.position.set(sx, 0.4, 0);
          solarGroup.add(pylon);

          const panel = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 0.05, 0.8),
            new THREE.MeshStandardMaterial({ color: 0x071e3d, metalness: 0.95, roughness: 0.2 })
          );
          panel.position.set(sx, 0.8, 0);
          panel.rotation.x = -Math.PI * 0.18;
          solarGroup.add(panel);

          const gridLine = new THREE.Mesh(
            new THREE.PlaneGeometry(1.15, 0.75),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.45 })
          );
          gridLine.position.set(sx, 0.83, 0);
          gridLine.rotation.x = -Math.PI * 0.18;
          solarGroup.add(gridLine);
          this.themeColorMeshes.push({ mesh: gridLine, isSecondary: true });
        });
        this.workspaceGroup?.add(solarGroup);
      } else if (cargoCoords.has(coordKey)) {
        // Tech Supply / Cargo Depot: Stacks of colorful modular containers (Image 1 style)
        const cargoGroup = new THREE.Group();
        cargoGroup.position.set(x, y + hexHeight * 0.5, z);

        // Crimson Hazard Crate
        const crate1 = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.5, 0.9),
          new THREE.MeshStandardMaterial({ color: 0x991b1b, metalness: 0.8, roughness: 0.35 })
        );
        crate1.position.set(-0.5, 0.25, -0.3);
        cargoGroup.add(crate1);

        // Electric Cyan Coolant Pods
        [-0.2, 0.3].forEach((cx, cIdx) => {
          const tank = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.2, 0.7, 12),
            new THREE.MeshStandardMaterial({ color: 0x0891b2, metalness: 0.9, roughness: 0.2 })
          );
          tank.position.set(cx, 0.35, 0.4 + cIdx * 0.25);
          cargoGroup.add(tank);
        });

        // Emerald Energy Cell
        const crate2 = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.45, 0.55),
          new THREE.MeshStandardMaterial({ color: 0x059669, metalness: 0.85, roughness: 0.3 })
        );
        crate2.position.set(0.55, 0.22, -0.4);
        cargoGroup.add(crate2);

        // Amber Nanite Chest Stacked on Top
        const crateTop = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.35, 0.5),
          new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.25 })
        );
        crateTop.position.set(-0.5, 0.68, -0.3);
        cargoGroup.add(crateTop);

        // Status beacon LED
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0x10b981 })
        );
        beacon.position.set(-0.5, 0.9, -0.3);
        cargoGroup.add(beacon);

        this.workspaceGroup?.add(cargoGroup);
      } else if (landingCoords.has(coordKey)) {
        // Drone Landing Pad: High-visibility concentric targets & corner beacons
        const padGroup = new THREE.Group();
        padGroup.position.set(x, y + hexHeight * 0.5 + 0.02, z);

        const circle1 = new THREE.Mesh(
          new THREE.RingGeometry(0.8, 0.95, 24),
          new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide })
        );
        circle1.rotation.x = -Math.PI * 0.5;
        padGroup.add(circle1);
        this.themeColorMeshes.push({ mesh: circle1 });

        const circle2 = new THREE.Mesh(
          new THREE.RingGeometry(1.4, 1.55, 24),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
        );
        circle2.rotation.x = -Math.PI * 0.5;
        padGroup.add(circle2);
        this.themeColorMeshes.push({ mesh: circle2, isSecondary: true });

        // Corner runway strobe lights
        [-1.6, 1.6].forEach((lx) => {
          [-1.6, 1.6].forEach((lz) => {
            const strobe = new THREE.Mesh(
              new THREE.CylinderGeometry(0.06, 0.08, 0.3, 8),
              new THREE.MeshBasicMaterial({ color: 0x00f0ff })
            );
            strobe.position.set(lx, 0.15, lz);
            padGroup.add(strobe);
            this.themeColorMeshes.push({ mesh: strobe });
          });
        });
        this.workspaceGroup?.add(padGroup);
      } else if (capacitorCoords.has(coordKey)) {
        // Power Storage Capacitor: Heavy electromagnetic coils
        const capGroup = new THREE.Group();
        capGroup.position.set(x, y + hexHeight * 0.5, z);

        const coilCore = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.4, 1.2, 16),
          new THREE.MeshStandardMaterial({ color: 0x091c38, metalness: 0.9 })
        );
        coilCore.position.y = 0.6;
        capGroup.add(coilCore);

        [0.3, 0.6, 0.9].forEach((cy) => {
          const coilRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.55, 0.05, 8, 24),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
          );
          coilRing.rotation.x = Math.PI * 0.5;
          coilRing.position.y = cy;
          capGroup.add(coilRing);
          this.themeColorMeshes.push({ mesh: coilRing, isSecondary: true });
        });
        this.workspaceGroup?.add(capGroup);
      }
    });

    // 3. Central Autonomous Command Hub (Image 1 Observatory Biosphere)
    const hubBaseGeo = new THREE.CylinderGeometry(2.6, 3.0, 0.7, 6);
    const hubBase = new THREE.Mesh(
      hubBaseGeo,
      new THREE.MeshStandardMaterial({
        color: 0x0c2547,
        roughness: 0.25,
        metalness: 0.92,
      })
    );
    hubBase.position.set(0, -4.1, 0);
    this.workspaceGroup.add(hubBase);

    // Elevated terrace deck
    const deckGeo = new THREE.CylinderGeometry(1.9, 2.1, 0.3, 32);
    const deck = new THREE.Mesh(
      deckGeo,
      new THREE.MeshStandardMaterial({
        color: 0x081b33,
        roughness: 0.2,
        metalness: 0.95,
      })
    );
    deck.position.set(0, -3.6, 0);
    this.workspaceGroup.add(deck);

    // Geodesic Translucent Command Dome
    const domeGeo = new THREE.SphereGeometry(1.4, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    this.workspaceCommandDomeMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.45,
      roughness: 0.1,
      metalness: 0.9,
    });
    const dome = new THREE.Mesh(domeGeo, this.workspaceCommandDomeMat);
    dome.position.set(0, -3.45, 0);
    this.workspaceGroup.add(dome);

    // Central Spinning Holo-Core inside dome
    const coreHolo = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.5, 2),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      })
    );
    coreHolo.position.set(0, -2.8, 0);
    this.workspaceGroup.add(coreHolo);

    // Central Rotating Radar Array (Sweeps 360 over colony)
    const mastGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.6, 8);
    const mast = new THREE.Mesh(mastGeo, new THREE.MeshStandardMaterial({ color: 0x334155 }));
    mast.position.set(0, -2.6, 0);
    this.workspaceGroup.add(mast);

    const radarGroup = new THREE.Group();
    radarGroup.position.set(0, -1.8, 0);

    const radarDishGeo = new THREE.CylinderGeometry(0.65, 0.15, 0.18, 16);
    this.workspaceRadarDishMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      metalness: 0.85,
      roughness: 0.2,
    });
    const radarDish = new THREE.Mesh(radarDishGeo, this.workspaceRadarDishMat);
    radarDish.rotation.z = Math.PI * 0.35;
    radarGroup.add(radarDish);

    const radarAntenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    radarAntenna.position.set(0.35, 0.25, 0);
    radarGroup.add(radarAntenna);

    this.workspaceRadarDish = radarGroup;
    this.workspaceGroup.add(radarGroup);

    // 4. 8 Specialist Architectural Modules & Autonomous Bots
    const agentList = this.agents();
    const stationPositions = this.stationPositions;

    agentList.forEach((agent, i) => {
      const pos = stationPositions[i % stationPositions.length];
      const stationGroup = new THREE.Group();
      stationGroup.position.set(pos.x, -4.2, pos.z);
      stationGroup.userData = { agentId: agent.id, agent };

      // Radial Power Conduit connecting Station back to Central Command Hub
      const conduitGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.1, 0),
        new THREE.Vector3(-pos.x, 0.4, -pos.z),
      ]);
      const conduitLine = new THREE.Line(
        conduitGeo,
        new THREE.LineBasicMaterial({
          color: agent.hexColor,
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending,
        })
      );
      stationGroup.add(conduitLine);

      // Station Hexagonal Platform Pad (Tuned roughness: 0.20, metalness: 0.88 with subtle emissive reflection)
      const padGeo = new THREE.CylinderGeometry(2.2, 2.5, 0.4, 6);
      const padMat = new THREE.MeshStandardMaterial({
        color: 0x081e3a,
        roughness: 0.20,
        metalness: 0.88,
        emissive: agent.hexColor,
        emissiveIntensity: 0.16,
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      stationGroup.add(pad);

      // Neon Platform Rim
      const padBorder = new THREE.LineSegments(
        new THREE.EdgesGeometry(padGeo),
        new THREE.LineBasicMaterial({
          color: agent.hexColor,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
        })
      );
      stationGroup.add(padBorder);

      // Glowing Inner Neon Rings on Station Platform (High-tech concentric rings)
      const innerRingGeo = new THREE.RingGeometry(1.35, 1.48, 32);
      const innerRingMat = new THREE.MeshBasicMaterial({
        color: agent.hexColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });
      const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
      innerRing.rotation.x = -Math.PI * 0.5;
      innerRing.position.y = 0.21;
      stationGroup.add(innerRing);

      const coreRingGeo = new THREE.RingGeometry(0.72, 0.80, 32);
      const coreRingMat = new THREE.MeshBasicMaterial({
        color: agent.hexColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
      });
      const coreRing = new THREE.Mesh(coreRingGeo, coreRingMat);
      coreRing.rotation.x = -Math.PI * 0.5;
      coreRing.position.y = 0.21;
      stationGroup.add(coreRing);

      // Dedicated Downward Illumination Light (Warm neon point light)
      const pLight = new THREE.PointLight(agent.hexColor, 2.0, 8.0, 1.4);
      pLight.position.set(0, 1.5, 0);
      stationGroup.add(pLight);

      // Dedicated Overhead Downward Spotlight casting gentle cone on station & bot
      const overheadLight = new THREE.SpotLight(0xffffff, 2.0, 9.0, Math.PI * 0.42, 0.55, 1.4);
      overheadLight.position.set(0, 2.8, 0);
      const overheadTarget = new THREE.Object3D();
      overheadTarget.position.set(0, 0, 0);
      stationGroup.add(overheadTarget);
      overheadLight.target = overheadTarget;
      stationGroup.add(overheadLight);

      // --- Distinct Architectural Building per Agent ---
      const buildingGroup = new THREE.Group();
      buildingGroup.position.set(0.65, 0.2, -0.65);

      if (i === 0) {
        // SENTINEL-X: Cyber Defense Bastion with kinetic deflector pylons
        const bastionGeo = new THREE.BoxGeometry(0.9, 1.6, 0.9);
        const bastion = new THREE.Mesh(bastionGeo, new THREE.MeshStandardMaterial({ color: 0x091e38, metalness: 0.9 }));
        buildingGroup.add(bastion);
        const pylonOffsets = [{ x: -0.6, z: -0.6 }, { x: 0.6, z: -0.6 }, { x: -0.6, z: 0.6 }, { x: 0.6, z: 0.6 }];
        pylonOffsets.forEach((po) => {
          const pyl = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.8, 8), new THREE.MeshBasicMaterial({ color: agent.hexColor }));
          pyl.position.set(po.x, 0.2, po.z);
          buildingGroup.add(pyl);
        });
        const shieldRing = new THREE.Mesh(
          new THREE.TorusGeometry(1.1, 0.03, 12, 32),
          new THREE.MeshBasicMaterial({ color: agent.hexColor, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
        );
        shieldRing.rotation.x = Math.PI * 0.5;
        shieldRing.position.y = 0.9;
        buildingGroup.add(shieldRing);
      } else if (i === 1) {
        // SYNTHEX: Satellite Telemetry Uplink Dish & Solar Tracker
        const baseMast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
        buildingGroup.add(baseMast);
        const dish = new THREE.Mesh(
          new THREE.SphereGeometry(0.8, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.4),
          new THREE.MeshStandardMaterial({ color: 0x0a3328, metalness: 0.85, roughness: 0.25 })
        );
        dish.rotation.x = -Math.PI * 0.35;
        dish.position.set(0, 0.9, 0);
        buildingGroup.add(dish);
        const feedHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), new THREE.MeshBasicMaterial({ color: agent.hexColor }));
        feedHorn.position.set(0, 1.15, 0.3);
        buildingGroup.add(feedHorn);
      } else if (i === 2) {
        // ARCHON: Microcode Avionics Forge Hangar & Welding Laser Arm
        const hangar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.9, 0.9, 1.4, 16, 1, false, 0, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0x271905, metalness: 0.9, roughness: 0.3 })
        );
        hangar.rotation.z = Math.PI * 0.5;
        hangar.position.y = 0.45;
        buildingGroup.add(hangar);

        // Robotic Gantry Arm
        const armBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x475569 }));
        armBase.position.set(0, 0.7, 0);
        buildingGroup.add(armBase);

        // Dynamic Animated Welding Sparks Particle System
        const sparkCount = 48;
        const sparkGeo = new THREE.BufferGeometry();
        const sparkPos = new Float32Array(sparkCount * 3);
        const sparkVels = new Float32Array(sparkCount * 3);
        for (let sp = 0; sp < sparkCount; sp++) {
          sparkPos[sp * 3] = 0;
          sparkPos[sp * 3 + 1] = 0.65;
          sparkPos[sp * 3 + 2] = 0;
          const a = Math.random() * Math.PI * 2;
          const s = 0.8 + Math.random() * 1.4;
          sparkVels[sp * 3] = Math.cos(a) * s;
          sparkVels[sp * 3 + 1] = 1.0 + Math.random() * 1.5;
          sparkVels[sp * 3 + 2] = Math.sin(a) * s;
        }
        sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
        const sparkMat = new THREE.PointsMaterial({
          color: 0xf59e0b,
          size: 0.08,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
        });
        this.weldingSparks = new THREE.Points(sparkGeo, sparkMat);
        this.weldingSparkVels = sparkVels;
        buildingGroup.add(this.weldingSparks);
      } else if (i === 3) {
        // AURA-VISION: LiDAR & Optic Recon Observatory with Scanning Laser Cone
        const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.7, 16), new THREE.MeshStandardMaterial({ color: 0x180d2b }));
        buildingGroup.add(baseCyl);
        const obsDome = new THREE.Mesh(
          new THREE.SphereGeometry(0.72, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
          new THREE.MeshStandardMaterial({ color: 0x2e1059, metalness: 0.85 })
        );
        obsDome.position.y = 0.35;
        buildingGroup.add(obsDome);
        const lensEye = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), new THREE.MeshBasicMaterial({ color: agent.hexColor }));
        lensEye.position.set(0, 0.6, 0.55);
        buildingGroup.add(lensEye);

        // Active Scanning Laser Cone Sweeping Across the Ground
        const coneGeo = new THREE.ConeGeometry(1.4, 2.8, 16, 1, true);
        const coneMat = new THREE.MeshBasicMaterial({
          color: agent.hexColor,
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const scanCone = new THREE.Mesh(coneGeo, coneMat);
        scanCone.rotation.x = Math.PI;
        scanCone.position.set(0, 0.6, 1.2);
        buildingGroup.add(scanCone);
        this.scanningLaserCone = scanCone;
      } else if (i === 4) {
        // CHRONOS: Tactical Trajectory Engine & Gyro Chrono-Spire
        const chronoPillar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), new THREE.MeshStandardMaterial({ color: 0x240a0c }));
        buildingGroup.add(chronoPillar);
        [-1, 1].forEach((side) => {
          const wing = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.6), new THREE.MeshStandardMaterial({ color: 0x050e1f, metalness: 0.95 }));
          wing.position.set(side * 0.85, 0.7, 0);
          wing.rotation.z = side * 0.35;
          buildingGroup.add(wing);
        });
        // Gyro ring
        const gyroRing = new THREE.Mesh(
          new THREE.TorusGeometry(0.65, 0.03, 12, 24),
          new THREE.MeshBasicMaterial({ color: agent.hexColor, transparent: true, opacity: 0.8 })
        );
        gyroRing.position.y = 0.8;
        gyroRing.rotation.x = Math.PI * 0.3;
        buildingGroup.add(gyroRing);
      } else if (i === 5) {
        // SYNAPSE-AI: Deep Cognitive Bio-Neural Containment Vats
        [-0.45, 0.45].forEach((vx, vIdx) => {
          const vat = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 1.1, 16),
            new THREE.MeshStandardMaterial({ color: 0x2d0826, transparent: true, opacity: 0.75, metalness: 0.9 })
          );
          vat.position.set(vx, 0.55, vIdx === 0 ? -0.2 : 0.2);
          buildingGroup.add(vat);
          const fluid = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.85, 12), new THREE.MeshBasicMaterial({ color: agent.hexColor, transparent: true, opacity: 0.85 }));
          fluid.position.copy(vat.position);
          buildingGroup.add(fluid);
        });
      } else if (i === 6) {
        // AEGIS-SENTRY: Dual-State Verification Gantry with Traveling Laser Scan Sheet
        const archLeft = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.3, 0.15), new THREE.MeshStandardMaterial({ color: 0x112908 }));
        archLeft.position.set(-0.6, 0.65, 0);
        buildingGroup.add(archLeft);
        const archRight = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.3, 0.15), new THREE.MeshStandardMaterial({ color: 0x112908 }));
        archRight.position.set(0.6, 0.65, 0);
        buildingGroup.add(archRight);
        const beamBar = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.12, 0.15), new THREE.MeshStandardMaterial({ color: 0x112908 }));
        beamBar.position.set(0, 1.3, 0);
        buildingGroup.add(beamBar);

        // Traveling Laser Sheet moving vertically
        const scanSheet = new THREE.Mesh(
          new THREE.PlaneGeometry(1.1, 0.06),
          new THREE.MeshBasicMaterial({ color: agent.hexColor, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
        );
        scanSheet.position.set(0, 0.65, 0);
        buildingGroup.add(scanSheet);
        this.verificationScanSheet = scanSheet;
      } else if (i === 9) {
        // DROIDMARK-MOBILE: 5G Cellular Tower & Zero-Cable Wireless Sync Beacon with Holographic Mobile Frame
        const towerGeo = new THREE.CylinderGeometry(0.08, 0.25, 2.2, 8);
        const towerMat = new THREE.MeshStandardMaterial({ color: 0x082f49, metalness: 0.95, roughness: 0.15 });
        const tower = new THREE.Mesh(towerGeo, towerMat);
        tower.position.y = 1.1;
        buildingGroup.add(tower);

        // Holographic Smartphone Display Screen
        const phoneHoloGeo = new THREE.BoxGeometry(0.8, 1.4, 0.05);
        const phoneHoloMat = new THREE.MeshBasicMaterial({
          color: agent.hexColor,
          wireframe: true,
          transparent: true,
          opacity: 0.85
        });
        const phoneHolo = new THREE.Mesh(phoneHoloGeo, phoneHoloMat);
        phoneHolo.position.set(0, 1.6, 0.3);
        phoneHolo.rotation.y = Math.PI * 0.15;
        buildingGroup.add(phoneHolo);

        // 5G Signal Emitting Wave Rings
        for (let w = 0; w < 3; w++) {
          const wRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.35 + w * 0.2, 0.02, 8, 24),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending })
          );
          wRing.rotation.x = Math.PI * 0.5;
          wRing.position.y = 1.8 + w * 0.15;
          buildingGroup.add(wRing);
        }
      } else {
        // NEXUS-STARK: Resonance Comms Spire with Expanding Acoustic Shockwave Rings
        const spire = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.0, 8), new THREE.MeshStandardMaterial({ color: 0x091b38, metalness: 0.9 }));
        spire.position.y = 1.0;
        buildingGroup.add(spire);

        [0.6, 1.1, 1.6].forEach((ry) => {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5 - ry * 0.15, 0.025, 8, 24), new THREE.MeshBasicMaterial({ color: agent.hexColor, transparent: true, opacity: 0.85 }));
          ring.rotation.x = Math.PI * 0.5;
          ring.position.y = ry;
          buildingGroup.add(ring);
        });

        // 3 Expanding Acoustic Waves
        for (let w = 0; w < 3; w++) {
          const wRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.5, 0.02, 8, 24),
            new THREE.MeshBasicMaterial({ color: agent.hexColor, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending })
          );
          wRing.rotation.x = Math.PI * 0.5;
          wRing.position.y = 1.9;
          buildingGroup.add(wRing);
          this.nexusAcousticRings.push({ mesh: wRing, phase: w * 0.33 });
        }
      }

      stationGroup.add(buildingGroup);

      // --- Animated Autonomous Cybernetic Bot Avatar (Image 1 bots doing physical work!) ---
      const botGroup = new THREE.Group();
      const botBasePos = new THREE.Vector3(-0.6, 0.5, 0.6);
      botGroup.position.copy(botBasePos);

      // Bot Torso
      const torsoGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.5, 12);
      const torsoMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        emissive: agent.hexColor,
        emissiveIntensity: 0.28,
        metalness: 0.88,
        roughness: 0.20,
      });
      const torso = new THREE.Mesh(torsoGeo, torsoMat);
      botGroup.add(torso);

      // Bot Head
      const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const headMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: agent.hexColor,
        emissiveIntensity: 0.28,
        metalness: 0.92,
        roughness: 0.20,
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 0.38;
      botGroup.add(head);

      this.workspaceBotChassisMaterials.push({
        torsoMat,
        headMat,
        agentHex: agent.hexColor,
      });

      // Illuminated Glowing Chest Arc Reactor Badge
      const chestBadgeGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.04, 16);
      const chestBadgeMat = new THREE.MeshBasicMaterial({
        color: agent.hexColor,
        blending: THREE.AdditiveBlending,
      });
      const chestBadge = new THREE.Mesh(chestBadgeGeo, chestBadgeMat);
      chestBadge.rotation.x = Math.PI * 0.5;
      chestBadge.position.set(0, 0.05, 0.24);
      botGroup.add(chestBadge);

      // Glowing LED Visor Eye
      const visorGeo = new THREE.BoxGeometry(0.2, 0.08, 0.12);
      const visorMat = new THREE.MeshBasicMaterial({
        color: agent.hexColor,
        blending: THREE.AdditiveBlending,
      });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 0.38, 0.11);
      botGroup.add(visor);

      // Articulated Left Arm
      const lArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.38, 8), new THREE.MeshStandardMaterial({ color: 0x334155 }));
      lArm.position.set(-0.25, 0.12, 0.05);
      botGroup.add(lArm);

      // Articulated Right Arm (Tool Arm)
      const rArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.38, 8), new THREE.MeshStandardMaterial({ color: 0x334155 }));
      rArm.position.set(0.25, 0.12, 0.05);
      botGroup.add(rArm);

      // Hover Thruster Ring
      const thruster = new THREE.Mesh(
        new THREE.RingGeometry(0.08, 0.24, 16),
        new THREE.MeshBasicMaterial({
          color: agent.hexColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
        })
      );
      thruster.rotation.x = Math.PI * 0.5;
      thruster.position.y = -0.28;
      botGroup.add(thruster);

      stationGroup.add(botGroup);

      this.workspaceBotAvatars.push({
        group: botGroup,
        phase: i * 0.85,
        basePos: botBasePos,
        toolMesh: rArm,
        headMesh: head,
        leftArm: lArm,
        rightArm: rArm,
      });

      // 5. Tactile Holographic Diamond Beacon above Station (Clean Sci-Fi Marker)
      const sMarkerGeo = new THREE.OctahedronGeometry(0.24, 0);
      const sMarkerMat = new THREE.MeshBasicMaterial({
        color: agent.hexColor,
      });
      const sMarkerMesh = new THREE.Mesh(sMarkerGeo, sMarkerMat);
      sMarkerMesh.position.set(0, 2.3, 0);
      stationGroup.add(sMarkerMesh);
      this.stationMarkers.push({ mesh: sMarkerMesh, agentId: agent.id, baseY: 2.3, phase: i * 0.78 });

      // 6. Floating 3D Billboard Label (Cleanly revealed on hover or selection — zero permanent overlap!)
      const sprite = this.createAgentBillboardSprite(agent);
      sprite.position.set(0, 3.2, 0);
      sprite.visible = false;
      if (sprite.material instanceof THREE.SpriteMaterial) {
        sprite.material.opacity = 0.0;
      }
      stationGroup.add(sprite);
      this.workspaceSprites.push(sprite);

      // 7. Tactile Invisible Raycast Hit Cylinder (Effortless click detection)
      const hitGeo = new THREE.CylinderGeometry(2.8, 2.8, 5.0, 16);
      const hitMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.001,
        depthWrite: false,
      });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.y = 2.2;
      hitMesh.userData = { agentId: agent.id, agent };
      stationGroup.add(hitMesh);
      stationGroup.userData = { agentId: agent.id, agent };
      this.podHitMeshes.push(hitMesh);
      this.workspaceStationHitMeshes.push(hitMesh);

      this.workspaceGroup?.add(stationGroup);
    });

    // 8. Autonomous Roving Courier Bots across Hexagonal Base ("Bot Crossing" Feature)
    // Smooth closed spline connecting all stations
    const patrolCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -4.3, -8.8),
      new THREE.Vector3(4.0, -4.3, -7.0),
      new THREE.Vector3(7.6, -4.3, -4.8),
      new THREE.Vector3(8.5, -4.3, -1.0),
      new THREE.Vector3(9.2, -4.3, 2.4),
      new THREE.Vector3(7.0, -4.3, 6.0),
      new THREE.Vector3(4.8, -4.3, 8.8),
      new THREE.Vector3(0, -4.3, 9.4),
      new THREE.Vector3(-4.8, -4.3, 8.8),
      new THREE.Vector3(-7.0, -4.3, 6.0),
      new THREE.Vector3(-9.2, -4.3, 2.4),
      new THREE.Vector3(-8.5, -4.3, -1.0),
      new THREE.Vector3(-7.6, -4.3, -4.8),
      new THREE.Vector3(-4.0, -4.3, -7.0),
    ], true);

    const courierSpeeds = [0.035, 0.032, 0.038];
    const courierColors = [0x00f0ff, 0x10b981, 0xf59e0b];

    for (let c = 0; c < 3; c++) {
      const courierGroup = new THREE.Group();

      // Rounded hover chassis
      const chassis = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.32, 0.22, 12),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 })
      );
      chassis.position.y = 0.15;
      courierGroup.add(chassis);

      // Dual sensor eye visor
      const eye = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.08, 0.1),
        new THREE.MeshBasicMaterial({ color: courierColors[c] })
      );
      eye.position.set(0, 0.22, 0.14);
      courierGroup.add(eye);

      // Glowing Data Cargo Module on back
      const cargoModule = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.22, 0.22),
        new THREE.MeshStandardMaterial({ color: courierColors[c], emissive: courierColors[c], emissiveIntensity: 0.8 })
      );
      cargoModule.position.set(0, 0.36, -0.05);
      courierGroup.add(cargoModule);

      this.workspaceGroup.add(courierGroup);
      this.rovingCourierBots.push({
        group: courierGroup,
        t: c * 0.33,
        speed: courierSpeeds[c],
        curve: patrolCurve,
      });
    }

    this.scene.add(this.workspaceGroup);
  }

  /**
   * 3D Cybernetic Automation Nexus:
   * Floating Server Racks, Android Phone 3D Model, Desktop App Frames, and Flowing Fiber Conduits.
   */
  private createAutomationEnvironment(): void {
    if (!this.scene) return;
    this.automationGroup = new THREE.Group();
    this.automationGroup.visible = false;
    this.automationDataPackets = [];

    [-6.5, -4.5].forEach((rx) => {
      const rackGeo = new THREE.BoxGeometry(1.4, 4.8, 1.2);
      const rackMat = new THREE.MeshStandardMaterial({
        color: 0x050c1a,
        roughness: 0.35,
        metalness: 0.85,
      });
      const rack = new THREE.Mesh(rackGeo, rackMat);
      rack.position.set(rx, 0.5, -3.0);
      this.automationGroup?.add(rack);

      const rackEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(rackGeo),
        new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.55 })
      );
      rackEdges.position.copy(rack.position);
      this.automationGroup?.add(rackEdges);
    });

    const phoneGeo = new THREE.BoxGeometry(1.4, 2.8, 0.12);
    const phoneMat = new THREE.MeshStandardMaterial({
      color: 0x0b1f3d,
      roughness: 0.2,
      metalness: 0.9,
    });
    const phone = new THREE.Mesh(phoneGeo, phoneMat);
    phone.position.set(5.5, 1.0, 0);
    phone.rotation.y = -Math.PI * 0.15;
    this.automationGroup.add(phone);

    const phoneScreenGeo = new THREE.PlaneGeometry(1.28, 2.55);
    const phoneScreenMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });
    const phoneScreen = new THREE.Mesh(phoneScreenGeo, phoneScreenMat);
    phoneScreen.position.set(5.5, 1.0, 0.07);
    phoneScreen.rotation.y = -Math.PI * 0.15;
    this.automationGroup.add(phoneScreen);

    const appGeo = new THREE.PlaneGeometry(3.2, 2.0);
    const appMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    const appMesh = new THREE.Mesh(appGeo, appMat);
    appMesh.position.set(0, 2.2, -2.0);
    this.automationGroup.add(appMesh);

    const curve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-5.0, 1.0, -3.0),
      new THREE.Vector3(-1.5, 2.2, -2.5),
      new THREE.Vector3(0, 2.2, -2.0),
      new THREE.Vector3(2.5, 1.8, -1.0),
      new THREE.Vector3(5.5, 1.0, 0),
    ]);

    const curveGeo = new THREE.BufferGeometry().setFromPoints(curve1.getPoints(48));
    const curveMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    const curveLine = new THREE.Line(curveGeo, curveMat);
    this.automationGroup.add(curveLine);

    for (let p = 0; p < 8; p++) {
      const pGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const pMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        blending: THREE.AdditiveBlending,
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      this.automationGroup.add(pMesh);
      this.automationDataPackets.push({
        mesh: pMesh,
        t: p / 8,
        speed: 0.22,
        curve: curve1,
      });
    }

    this.scene.add(this.automationGroup);
  }

  /**
   * 3D Spatial Holographic Creative Studio:
   * Curved cinema canvas viewport, audio equalizer spectrum bars, and chromatic prism.
   */
  private createMediaEnvironment(): void {
    if (!this.scene) return;
    this.mediaGroup = new THREE.Group();
    this.mediaGroup.visible = false;
    this.mediaSpectrumBars = [];

    const canvasGeo = new THREE.PlaneGeometry(9.6, 5.4);
    const canvasMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    const canvasMesh = new THREE.Mesh(canvasGeo, canvasMat);
    canvasMesh.position.set(0, 1.2, -4.0);
    this.mediaGroup.add(canvasMesh);

    const borderGeo = new THREE.EdgesGeometry(canvasGeo);
    const borderMat = new THREE.LineBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const border = new THREE.LineSegments(borderGeo, borderMat);
    border.position.copy(canvasMesh.position);
    this.mediaGroup.add(border);

    const barCount = 24;
    for (let b = 0; b < barCount; b++) {
      const angle = ((b / (barCount - 1)) - 0.5) * Math.PI * 0.7;
      const x = Math.sin(angle) * 6.5;
      const z = -Math.cos(angle) * 6.5 + 3.0;
      const barGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 8);
      const barMat = new THREE.MeshBasicMaterial({
        color: b % 2 === 0 ? 0x00f0ff : 0xa855f7,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(x, -2.0, z);
      this.mediaGroup.add(bar);
      this.mediaSpectrumBars.push(bar);
    }

    const prismGeo = new THREE.OctahedronGeometry(0.75, 1);
    const prismMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xa855f7,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.9,
      wireframe: true,
    });
    const prism = new THREE.Mesh(prismGeo, prismMat);
    prism.position.set(0, 4.5, -3.5);
    this.mediaGroup.add(prism);

    this.scene.add(this.mediaGroup);
  }

  /**
   * Set up Raycast clicks, mouse drag rotation, and scroll wheel zoom.
   */
  private setupCanvasInteractions(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.prevMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('mousemove', (e) => {
      const normX = (e.clientX / (window.innerWidth || 1920)) - 0.5;
      const normY = (e.clientY / (window.innerHeight || 1080)) - 0.5;
      this.targetMouseParallax.x = normX * 2.2;
      this.targetMouseParallax.z = normY * 1.5;

      if (this.isDragging) {
        const dx = e.clientX - this.prevMouse.x;
        const dy = e.clientY - this.prevMouse.y;
        this.targetRotation.y += dx * 0.005;
        this.targetRotation.x += dy * 0.005;
        this.prevMouse = { x: e.clientX, y: e.clientY };
      }
    });

    // Touch support
    canvas.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    canvas.addEventListener('touchmove', (e: TouchEvent) => {
      if (this.isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - this.prevMouse.x;
        const dy = e.touches[0].clientY - this.prevMouse.y;
        this.targetRotation.y += dx * 0.008;
        this.targetRotation.x += dy * 0.008;
        this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    // Camera Zoom
    canvas.addEventListener('wheel', (e) => {
      if (this.camera) {
        this.camera.position.z = Math.min(Math.max(this.camera.position.z + e.deltaY * 0.015, 10), 34);
      }
    });

    // RAYCAST CLICK HANDLER (Direct clicks on the Central Core, Orbiting Agents, or Colony Stations)
    canvas.addEventListener('click', (e) => {
      console.log('>>> ThreeScene canvas clicked at clientX=', e.clientX, 'clientY=', e.clientY, 'mode=', this.currentMode);
      if (!this.camera || !this.raycaster) return;

      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      const isHome = this.currentMode === 'MAIN_AGENT' || this.currentMode === 'DEFAULT';

      if (isHome) {
        // 1. Check click on Orbiting Agents in 3D Core
        const agentGroups = Array.from(this.agentMeshMap.values()).map((m) => m.group);
        const agentHits = this.raycaster.intersectObjects(agentGroups, true);
        if (agentHits.length > 0) {
          let obj: THREE.Object3D | null = agentHits[0].object;
          while (obj && !obj.userData?.['agentId'] && !obj.userData?.['agent'] && obj.parent) {
            obj = obj.parent;
          }
          const agentId = obj?.userData?.['agentId'];
          const found = obj?.userData?.['agent'] || this.agents().find((a) => a.id === agentId);
          if (found) {
            this.ngZone.run(() => this.focusAgent(found));
            return;
          }
        }

        // 2. Check click on Central Core Hit Sphere (strictly restricted to home mode & visible core)
        if (this.coreHitSphere && this.centralCoreGroup?.visible) {
          const coreHits = this.raycaster.intersectObject(this.coreHitSphere, false);
          if (coreHits.length > 0) {
            this.ngZone.run(() => this.toggleCoreDeployment());
            return;
          }
        }
      } else if (this.currentMode === 'WORKSPACE') {
        // 1. High-precision click detection on dedicated workspace station hit meshes
        const stationHits = this.raycaster.intersectObjects(this.workspaceStationHitMeshes, true);
        if (stationHits.length > 0) {
          const hitObj = stationHits[0].object;
          const agent = hitObj.userData?.['agent'] || this.agents().find((a) => a.id === hitObj.userData?.['agentId']);
          if (agent) {
            this.ngZone.run(() => this.focusAgent(agent));
            return;
          }
        }

        // 2. Fallback check across all workspace station children, ignoring flat ground tiles
        if (this.workspaceGroup) {
          const allHits = this.raycaster.intersectObjects(this.workspaceGroup.children, true);
          for (const hit of allHits) {
            let cur: THREE.Object3D | null = hit.object;
            while (cur && cur !== this.workspaceGroup) {
              if (cur.userData?.['agent']) {
                this.ngZone.run(() => this.focusAgent(cur!.userData['agent']));
                return;
              }
              if (cur.userData?.['agentId']) {
                const found = this.agents().find((a) => a.id === cur!.userData['agentId']);
                if (found) {
                  this.ngZone.run(() => this.focusAgent(found));
                  return;
                }
              }
              cur = cur.parent;
            }
          }
        }
      }

      // Clicked in empty outside space: smoothly deselect in MAIN_AGENT mode (preserve WORKSPACE station focus)
      if (this.currentMode !== 'WORKSPACE') {
        this.ngZone.run(() => {
          if (this.selectedAgent()) {
            this.resetCameraFocus();
          }
        });
      }
    });

    // POINTER HOVER FEEDBACK (Cursor changes to pointer over tactile 3D nodes & pods + Dynamic Hover HUD)
    canvas.addEventListener('pointermove', (e) => {
      if (!this.camera || !this.raycaster) return;
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const isHome = this.currentMode === 'MAIN_AGENT' || this.currentMode === 'DEFAULT';
      const testObjects: THREE.Object3D[] = [];

      if (isHome) {
        Array.from(this.agentMeshMap.values()).forEach((m) => testObjects.push(m.group));
        if (this.coreHitSphere && this.centralCoreGroup?.visible) {
          testObjects.push(this.coreHitSphere);
        }
      } else if (this.currentMode === 'WORKSPACE') {
        testObjects.push(...this.workspaceStationHitMeshes);
      }

      const hits = this.raycaster.intersectObjects(testObjects, true);
      canvas.style.cursor = hits.length > 0 ? 'pointer' : 'default';

      let hovered: AgentNode | null = null;
      if (hits.length > 0) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && !obj.userData?.['agent'] && !obj.userData?.['agentId'] && obj.parent) {
          obj = obj.parent;
        }
        if (obj?.userData?.['agent']) {
          hovered = obj.userData['agent'];
        } else if (obj?.userData?.['agentId']) {
          hovered = this.agents().find((a) => a.id === obj?.userData['agentId']) || null;
        }
      }

      if (this.hoveredAgent()?.id !== hovered?.id) {
        this.ngZone.run(() => {
          this.hoveredAgent.set(hovered);
          this.updateBillboardLabelVisibility();
        });
      }
    });
  }

  // --- ACTIONS: IRIS CORE UNPACKING & RECALL ---

  toggleCoreDeployment(): void {
    this.isSwarmDeployed.update((v) => !v);
    const deployed = this.isSwarmDeployed();

    if (deployed) {
      this.playHoloSound('deploy');
      this.latestJarvisMessage.set(
        'Specialist agents deployed and ready.'
      );
      this.agents.update((list) =>
        list.map((a) => ({ ...a, status: 'ORBITING' }))
      );
      this.startMultiAgentBondLoop();
    } else {
      this.playHoloSound('dock');
      this.latestJarvisMessage.set(
        'All specialist agents docked.'
      );
      this.agents.update((list) =>
        list.map((a) => ({ ...a, status: 'DORMANT' }))
      );
      this.resetCameraFocus();
    }
  }

  triggerCorePulse(): void {
    this.playHoloSound('pulse');
    this.targetRotation.y += Math.PI * 0.4;
    this.latestJarvisMessage.set('Core systems harmonized.');
  }

  focusAgent(agent: AgentNode): void {
    if (!this.isSwarmDeployed() && (this.currentMode === 'MAIN_AGENT' || this.currentMode === 'DEFAULT')) {
      this.toggleCoreDeployment();
    }
    const prev = this.selectedAgent();
    this.selectedAgent.set(agent);
    if (prev?.id !== agent.id) {
      this.agentFocused$.next(agent);
    }
    this.playHoloSound('beep');
    this.latestJarvisMessage.set(
      `Active focus: ${agent.name}. Workstation synchronized.`
    );

    const agentList = this.agents();
    const index = agentList.findIndex((a) => a.id === agent.id);

    if (this.currentMode === 'WORKSPACE') {
      // In WORKSPACE colony:
      const safeIndex = index >= 0 ? index : 0;
      const pos = this.stationPositions[safeIndex % this.stationPositions.length];
      const stationX = pos.x;
      const stationZ = pos.z;

      // Calculate angle of this station in the XZ plane
      const stationAngle = Math.atan2(stationZ, stationX);

      // Rotate the 3D colony around Y so this station rotates directly to the FRONT of the user's screen!
      // In Three.js, front of screen is +Z (angle = Math.PI / 2)
      this.targetRotation.y = (Math.PI / 2) - stationAngle;
      this.targetRotation.x = 0.08; // Gentle eye-level perspective looking directly into the workstation

      // Smoothly zoom camera to frame the front station and animated bot avatar perfectly centered
      this.targetCameraPos.set(0, 0.2, 17.2);
      this.targetCameraLookAt.set(0, -3.4, 9.0);
    } else {
      // MAIN_AGENT / DEFAULT mode:
      // Real-time orbital angle calculation so agent swings directly to the FRONT-CENTER of the main screen!
      const meshData = this.agentMeshMap.get(agent.id);
      let currentAngle = agent.angle;
      if (meshData) {
        const time = (Date.now() - this.loopStartTime) / 1000;
        currentAngle = agent.angle + time * 0.085;
      }
      this.targetRotation.y = (Math.PI / 2) - currentAngle;
      this.targetRotation.x = 0.12;

      // Frame the agent in front, with the central quantum core behind it
      this.targetCameraPos.set(0, 1.8, 16.8);
      this.targetCameraLookAt.set(0, 0.5, 8.8);
    }

    // Reveal focused agent console and hide others for clean spacious view
    this.floatingConsoles.forEach((fc) => {
      const match = fc.mesh.userData['agentId'] === agent.id;
      fc.mesh.visible = match;
      if (fc.mesh.material instanceof THREE.MeshBasicMaterial) {
        fc.mesh.material.opacity = match ? 0.95 : 0.0;
      }
    });

    this.updateBillboardLabelVisibility();
  }

  resetCameraFocus(): void {
    this.selectedAgent.set(null);
    this.floatingConsoles.forEach((fc) => {
      fc.mesh.visible = false;
      if (fc.mesh.material instanceof THREE.MeshBasicMaterial) {
        fc.mesh.material.opacity = 0.0;
      }
    });

    // Reset rotation smoothly back to default panoramic overview
    this.targetRotation.y = 0;
    this.targetRotation.x = this.currentMode === 'WORKSPACE' ? 0 : 0.15;

    this.applyResponsiveCamera();
    this.updateBillboardLabelVisibility();
  }

  focusAgentPerspective(agent: AgentNode): void {
    this.playHoloSound('beep');
    this.targetRotation.y = -agent.angle;
    this.targetRotation.x = 0.1;
  }

  executeAgentProtocol(agent: AgentNode): void {
    this.playHoloSound('deploy');
    this.agents.update((list) =>
      list.map((a) => (a.id === agent.id ? { ...a, status: 'EXECUTING' } : a))
    );
    this.latestJarvisMessage.set(
      `Directive engaged for [${agent.name}]: Executing ${agent.role.toUpperCase()}. Systems synchronized.`
    );
  }

  pingAgent(agent: AgentNode): void {
    this.playHoloSound('beep');
    const newBond = Math.min(100.0, +((agent.bondLevel || 99.0) + 0.25).toFixed(2));
    const newPackets = (agent.packetsExchanged || 1000) + 5;
    const ack = `Synaptic pulse ACK from ${agent.name}. Bond elevated to ${newBond}%. Telemetry verified.`;

    this.agents.update((list) =>
      list.map((a) =>
        a.id === agent.id
          ? {
              ...a,
              bondLevel: newBond,
              bondStatus: `${newBond.toFixed(1)}% SYNERGIZED`,
              lastChatter: ack,
              packetsExchanged: newPackets
            }
          : a
      )
    );

    if (this.selectedAgent()?.id === agent.id) {
      this.selectedAgent.update((cur) =>
        cur
          ? {
              ...cur,
              bondLevel: newBond,
              bondStatus: `${newBond.toFixed(1)}% SYNERGIZED`,
              lastChatter: ack,
              packetsExchanged: newPackets
            }
          : null
      );
    }

    const meshData = this.agentMeshMap.get(agent.id);
    if (meshData && meshData.beam) {
      (meshData.beam.material as THREE.LineBasicMaterial).opacity = 1.0;
      setTimeout(() => {
        if (meshData && meshData.beam) {
          (meshData.beam.material as THREE.LineBasicMaterial).opacity = 0.45;
        }
      }, 500);
    }

    this.latestJarvisMessage.set(`Ping acknowledged for ${agent.name}. Synchronization at ${newBond}%.`);
  }

  evolveAgent(agent: AgentNode): void {
    this.playHoloSound('deploy');
    const newBond = 100.0;
    const newPackets = (agent.packetsExchanged || 1000) + 15;
    const evolvedMsg = `Self-evolution verified. AST compiled with 0 defects. Full synergy locked at 100%.`;

    this.agents.update((list) =>
      list.map((a) =>
        a.id === agent.id
          ? {
              ...a,
              bondLevel: newBond,
              bondStatus: '100.0% FULLY SYNERGIZED',
              lastChatter: evolvedMsg,
              neuralEfficiency: '100%',
              packetsExchanged: newPackets,
              status: 'ORBITING'
            }
          : a
      )
    );

    if (this.selectedAgent()?.id === agent.id) {
      this.selectedAgent.update((cur) =>
        cur
          ? {
              ...cur,
              bondLevel: newBond,
              bondStatus: '100.0% FULLY SYNERGIZED',
              lastChatter: evolvedMsg,
              neuralEfficiency: '100%',
              packetsExchanged: newPackets,
              status: 'ORBITING'
            }
          : null
      );
    }

    this.latestJarvisMessage.set(`${agent.name} upgraded: ${evolvedMsg}`);
  }

  private bondChatterTimer: any = null;
  private bondAgentIndex = 0;

  startMultiAgentBondLoop(): void {
    if (this.bondChatterTimer) return;

    const chatterPresets: Record<string, string[]> = {
      'agent-sentinel': [
        'System security is active and intact, Sir.',
        'All boundaries are monitored. No unauthorized activities detected.',
        'Protection matrix is fully operational and guarding your workspace.'
      ],
      'agent-synthex': [
        'Browser environment is synchronized and ready.',
        'Web connection is completely stable with minimal latency.',
        'Telemetry stream is running smoothly in the background.'
      ],
      'agent-archon': [
        'Workspace code has been checked. Everything is clean and building properly.',
        'Compiler engines are pre-warmed and ready for your code updates.',
        'Codebase integrity verified with zero compilation errors.'
      ],
      'agent-aura': [
        'Screen vision parser is focused on your foreground window.',
        'All UI elements and spatial coordinates are clearly aligned.',
        'Visual scanning is active and tracking smoothly.'
      ],
      'agent-chronos': [
        'Execution timeline is optimized for fast processing.',
        'Task schedule is completely cleared and ready for your next request.',
        'Workflow priorities have been organized for peak efficiency.'
      ],
      'agent-synapse': [
        'Local intelligence model is preloaded and ready to reason with you.',
        'Working memory is refreshed and prepared for deep problem solving.',
        'Neural assistants are aligned with your goals.'
      ],
      'agent-aegis': [
        'All task records and state changes have been physically verified.',
        'System storage is verified and completely synchronized.',
        'State integrity audit completed with complete success.'
      ],
      'agent-nexus': [
        'Voice channel is calibrated with natural human warmth.',
        'Audio resonance is balanced and ready for operator input.',
        'Voice assistant is listening and ready whenever you speak.'
      ]
    };

    this.bondChatterTimer = setInterval(() => {
      const agentList = this.agents();
      if (agentList.length === 0) return;

      const targetAgent = agentList[this.bondAgentIndex % agentList.length];
      this.bondAgentIndex++;

      const presets = chatterPresets[targetAgent.id] || ['Synaptic link verified.'];
      const chatter = presets[Math.floor(Math.random() * presets.length)];
      const newBond = Math.min(100.0, +((targetAgent.bondLevel || 99.0) + 0.05).toFixed(2));
      const newPackets = (targetAgent.packetsExchanged || 1000) + 1;

      this.agents.update((list) =>
        list.map((a) =>
          a.id === targetAgent.id
            ? {
                ...a,
                bondLevel: newBond,
                bondStatus: `${newBond.toFixed(1)}% SYNERGIZED`,
                lastChatter: chatter,
                packetsExchanged: newPackets
              }
            : a
        )
      );

      if (this.selectedAgent()?.id === targetAgent.id) {
        this.selectedAgent.update((cur) =>
          cur
            ? {
                ...cur,
                bondLevel: newBond,
                bondStatus: `${newBond.toFixed(1)}% SYNERGIZED`,
                lastChatter: chatter,
                packetsExchanged: newPackets
              }
            : null
        );
      }

      const meshData = this.agentMeshMap.get(targetAgent.id);
      if (meshData && meshData.beam) {
        (meshData.beam.material as THREE.LineBasicMaterial).opacity = 0.95;
        setTimeout(() => {
          if (meshData && meshData.beam) {
            (meshData.beam.material as THREE.LineBasicMaterial).opacity = 0.45;
          }
        }, 400);
      }

      this.latestJarvisMessage.set(`${targetAgent.name}: "${chatter}"`);
    }, 2800);
  }

  // --- 60 FPS ANIMATION LOOP ---
  private startAnimationLoop(): void {
    this.ngZone.runOutsideAngular(() => {
      this.loopStartTime = Date.now();
      let lastTime = performance.now();
      const startTime = lastTime;

      const animate = () => {
        if (!this.isRunning) return;

        const now = performance.now();
        const delta = Math.min((now - lastTime) / 1000, 0.1);
        const time = (now - startTime) / 1000;
        lastTime = now;

        // 1. Smooth Euler Rotation interpolation
        this.sceneRotation.x += (this.targetRotation.x - this.sceneRotation.x) * 0.08;
        this.sceneRotation.y += (this.targetRotation.y - this.sceneRotation.y) * 0.08;

        if (this.scene) {
          this.scene.rotation.x = this.sceneRotation.x;
          this.scene.rotation.y = this.sceneRotation.y;
        }

        // Floating Levitation & Mouse Parallax for the Quantum Dot Core Ball
        if (this.centralCoreGroup) {
          const floatY = Math.sin(time * 0.8) * 0.35;
          this.centralCoreGroup.position.y = floatY;
          this.centralCoreGroup.position.x += (this.targetMouseParallax.x - this.centralCoreGroup.position.x) * 0.04;
          this.centralCoreGroup.position.z += (this.targetMouseParallax.z - this.centralCoreGroup.position.z) * 0.04;
        }

        // 2. Steady, Pristine Spherical Quantum Dot Core (Zero Wave Warping)
        const isSpeaking = this.speechVoice.isSpeaking();
        if (this.quantumDotSphere && this.quantumOriginalPositions) {
          const posAttr = this.quantumDotSphere.geometry.attributes['position'] as THREE.BufferAttribute;
          const positions = posAttr.array as Float32Array;

          // Ensure dots remain pristine at their exact Fibonacci sphere positions (r = 3.8)
          if (positions[0] !== this.quantumOriginalPositions[0]) {
            positions.set(this.quantumOriginalPositions);
            posAttr.needsUpdate = true;
          }

          if (this.quantumOriginalColors) {
            const colorAttr = this.quantumDotSphere.geometry.attributes['color'] as THREE.BufferAttribute;
            if (colorAttr) {
              const colors = colorAttr.array as Float32Array;
              if (colors[0] !== this.quantumOriginalColors[0]) {
                colors.set(this.quantumOriginalColors);
                colorAttr.needsUpdate = true;
              }
            }
          }

          // Maintain only gentle smooth rotation
          this.quantumDotSphere.rotation.y = time * 0.03;
          this.quantumDotSphere.rotation.x = 0;
        }

        // Hide expanding shockwave meshes and voice ripple rings around the core
        if (this.voiceRippleRings.length > 0) {
          this.voiceRippleRings.forEach((ring) => {
            ring.mesh.visible = false;
          });
        }
        if (this.shockwaveMeshes.length > 0) {
          this.shockwaveMeshes.forEach((item) => {
            item.mesh.visible = false;
          });
        }

        // 3. Inner Arc Singularity & Corona (Pristine, Calm, and Steady — Zero Rigid Shaking)
        if (this.innerSingularityMesh) {
          const pulse = isSpeaking ? (1.0 + Math.abs(Math.sin(time * 15.0)) * 0.08) : (1 + Math.sin(time * 1.2) * 0.03);
          this.innerSingularityMesh.scale.set(pulse, pulse, pulse);
        }
        if (this.coreCoronaMesh) {
          const coronaPulse = isSpeaking ? (1.0 + Math.sin(time * 12.0) * 0.12) : (1 + Math.sin(time * 0.9 + 1) * 0.04);
          this.coreCoronaMesh.scale.set(coronaPulse, coronaPulse, coronaPulse);
          this.coreCoronaMesh.rotation.y = -time * (isSpeaking ? 0.04 : 0.015);
        }

        // 4. Concentric Arcs & Radar Sweep (Voice accelerated when speaking)
        const dialSpeed = isSpeaking ? 2.2 : 1.0;
        if (this.hudSegmentedRing1) {
          this.hudSegmentedRing1.rotation.z = time * 0.08 * dialSpeed;
        }
        if (this.hudAzimuthTicks) {
          this.hudAzimuthTicks.rotation.z = -time * 0.03 * dialSpeed;
        }
        if (this.hudRadarSweeper) {
          this.hudRadarSweeper.rotation.z = -time * 0.35 * dialSpeed;
        }

        // 5. Ambient Micro-Starfield Subtle Rotation
        if (this.ambientStarSystem) {
          this.ambientStarSystem.rotation.y = time * 0.008;
          this.ambientStarSystem.rotation.x = Math.sin(time * 0.005) * 0.01;
        }

        // 6. Shockwave Ripple Waves (Cleanly Disabled For Ultra-Clean Aesthetics)
        if (this.shockwaveMeshes.length > 0) {
          this.shockwaveMeshes.forEach((item) => {
            item.mesh.visible = false;
          });
        }

        // 7. Multi-Agent Eruption & Inter-Agent Synaptic Trajectory Mesh (Zero-allocation)
        const isDeployed = this.isSwarmDeployed();
        const agentCount = this.agents().length;
        while (this.cachedAgentVectors.length < agentCount) {
          this.cachedAgentVectors.push(new THREE.Vector3());
        }

        this.agents().forEach((agent, index) => {
          const data = this.agentMeshMap.get(agent.id);
          if (!data) return;

          // Anti-Colliding Concentric Tri-Orbital Hierarchy (Generous Radial Clearances)
          const targetRadius = isDeployed ? agent.orbitRadius : 0;
          const targetScale = isDeployed ? 1 : 0.001;

          // Smooth kinematic interpolation
          data.currentRadius += (targetRadius - data.currentRadius) * 0.08;
          data.currentScale += (targetScale - data.currentScale) * 0.08;

          data.group.scale.set(data.currentScale, data.currentScale, data.currentScale);

          // Volumetric 3D Multi-Planar Gyroscopic Celestial Orbit Coordinates
          const speed = agent.orbitSpeed || 0.050;
          const currentAngle = agent.angle + time * speed;
          const inc = agent.inclination || 0.0;
          const r = data.currentRadius;

          // Spherical Gyroscopic Inclined Orbit Coordinates:
          const unTiltedX = Math.cos(currentAngle) * r;
          const unTiltedZ = Math.sin(currentAngle) * r;
          const cosInc = Math.cos(inc);
          const sinInc = Math.sin(inc);

          // 3D Rotated Position along Inclination Plane:
          const posX = unTiltedX;
          const posY = agent.elevation + unTiltedZ * sinInc + Math.sin(time * 0.45 + index * 1.2) * 0.32;
          const posZ = unTiltedZ * cosInc;

          // Realistic Speech Acoustic Vibration on Agent when Speaking or Selected
          const isSelected = this.selectedAgent()?.id === agent.id;
          const agentVibration = (isSpeaking && isSelected) ? Math.sin(time * 42.0) * 0.08 : 0;
          data.group.position.set(posX, posY + agentVibration, posZ);
          this.cachedAgentVectors[index].set(posX, posY + agentVibration, posZ);

          // Vibrate inner nucleus and dot ball when speaking
          if (data.innerNucleus && isSpeaking && isSelected) {
            const vibScale = 1.0 + Math.sin(time * 36.0) * 0.15;
            data.innerNucleus.scale.set(vibScale, vibScale, vibScale);
          } else if (data.innerNucleus) {
            data.innerNucleus.scale.set(1, 1, 1);
          }

          // Orbit micro quantum particle halo around each agent
          if (data.haloCloud) {
            data.haloCloud.rotation.y += 0.01;
            data.haloCloud.rotation.x += 0.008;
          }
          if (data.dotBall) {
            data.dotBall.rotation.y += 0.015;
          }
          if (data.microRing) {
            data.microRing.rotation.z += 0.02;
          }
          if (data.innerNucleus) {
            data.innerNucleus.rotation.x += 0.012;
            data.innerNucleus.rotation.y += 0.016;
          }
        });

        // 7b. N-Body Pairwise Collision Avoidance Solver (Strict Physical Separation, 8 Relaxation Passes, minClearance = 6.8)
        if (isDeployed && agentCount >= 2) {
          const minClearance = 6.8;
          const minClearanceSq = minClearance * minClearance;
          for (let pass = 0; pass < 8; pass++) {
            for (let i = 0; i < agentCount; i++) {
              for (let j = i + 1; j < agentCount; j++) {
                const vA = this.cachedAgentVectors[i];
                const vB = this.cachedAgentVectors[j];
                const dx = vA.x - vB.x;
                const dy = vA.y - vB.y;
                const dz = vA.z - vB.z;
                const dSq = dx * dx + dy * dy + dz * dz;
                if (dSq < minClearanceSq && dSq > 0.0001) {
                  const dist = Math.sqrt(dSq);
                  const halfOverlap = (minClearance - dist) * 0.5;
                  const invDist = 1.0 / dist;
                  const nx = dx * invDist;
                  const ny = dy * invDist;
                  const nz = dz * invDist;
                  vA.x += nx * halfOverlap;
                  vA.y += ny * halfOverlap;
                  vA.z += nz * halfOverlap;
                  vB.x -= nx * halfOverlap;
                  vB.y -= ny * halfOverlap;
                  vB.z -= nz * halfOverlap;
                }
              }
            }
          }

          // Apply resolved non-colliding positions and update tether laser beams
          this.agents().forEach((agent, index) => {
            const data = this.agentMeshMap.get(agent.id);
            if (!data) return;
            const pos = this.cachedAgentVectors[index];
            data.group.position.copy(pos);

            if (data.beam && data.beam.geometry) {
              const attr = data.beam.geometry.attributes['position'] as THREE.BufferAttribute;
              if (attr) {
                const arr = attr.array as Float32Array;
                arr[0] = 0;
                arr[1] = 0;
                arr[2] = 0;
                arr[3] = pos.x;
                arr[4] = pos.y;
                arr[5] = pos.z;
                attr.needsUpdate = true;
              }
              (data.beam.material as THREE.LineBasicMaterial).opacity = isDeployed ? data.currentScale * 0.55 : 0;
            }
          });
        }

        // 8. Dynamically re-link Inter-Agent Synaptic Stream (Single Continuous Flow Loop with Razor Edges)
        if (this.interAgentMeshLines && agentCount >= 2) {
          const attr = this.interAgentMeshLines.geometry.attributes['position'] as THREE.BufferAttribute;
          if (attr) {
            const arr = attr.array as Float32Array;
            let ptr = 0;
            for (let i = 0; i < agentCount; i++) {
              const next = (i + 1) % agentCount;

              // Pure single perimeter stream segment: agent(i) -> agent(next)
              arr[ptr++] = this.cachedAgentVectors[i].x;
              arr[ptr++] = this.cachedAgentVectors[i].y;
              arr[ptr++] = this.cachedAgentVectors[i].z;
              arr[ptr++] = this.cachedAgentVectors[next].x;
              arr[ptr++] = this.cachedAgentVectors[next].y;
              arr[ptr++] = this.cachedAgentVectors[next].z;
            }
            attr.needsUpdate = true;
          }

          const pulseOpacity = (0.35 + Math.sin(time * 3.0) * 0.12) * (isDeployed ? 1 : 0);
          (this.interAgentMeshLines.material as THREE.LineBasicMaterial).opacity = pulseOpacity;
        }

        // 9. Volumetric Energy Columns Pulse & Swarm Architecture
        if (this.volumetricColumns.length > 0) {
          this.volumetricColumns.forEach((col) => {
            const pulse = Math.sin(time * 2.2 + col.phase);
            (col.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0.06, col.baseOpacity + pulse * 0.08);
            col.mesh.rotation.y = time * 0.12;
          });
        }

        // Floating Holographic Workstation Consoles Levitation
        if (this.floatingConsoles.length > 0) {
          this.floatingConsoles.forEach((c) => {
            c.mesh.position.y = c.baseY + Math.sin(time * 1.8 + c.phase) * 0.08;
          });
        }

        // Ground Radar Rotation
        if (this.groundRadarMesh) {
          this.groundRadarMesh.rotation.y = time * 0.03;
        }

        // 10. Workspace Autonomous Bot Avatars & Colony Life ("Bot Crossing" Live Base)
        if (this.workspaceGroup?.visible) {
          if (this.workspaceRadarDish) {
            this.workspaceRadarDish.rotation.y = time * 0.8;
          }

          // AURA-VISION Scanning Laser Cone Sweep
          if (this.scanningLaserCone) {
            this.scanningLaserCone.rotation.z = Math.sin(time * 1.5) * 0.35;
            this.scanningLaserCone.rotation.x = Math.PI + Math.cos(time * 1.2) * 0.25;
          }

          // AEGIS-SENTRY Traveling Verification Laser Sheet
          if (this.verificationScanSheet) {
            this.verificationScanSheet.position.y = 0.35 + Math.abs(Math.sin(time * 2.2)) * 0.85;
          }

          // ARCHON Dynamic Welding Sparks
          if (this.weldingSparks && this.weldingSparkVels) {
            const posAttr = this.weldingSparks.geometry.attributes['position'] as THREE.BufferAttribute;
            const positions = posAttr.array as Float32Array;
            const vels = this.weldingSparkVels;
            const sCount = positions.length / 3;
            for (let s = 0; s < sCount; s++) {
              positions[s * 3] += vels[s * 3] * delta;
              positions[s * 3 + 1] += vels[s * 3 + 1] * delta;
              positions[s * 3 + 2] += vels[s * 3 + 2] * delta;
              vels[s * 3 + 1] -= 9.8 * delta; // Gravity
              // Reset spark if it falls below or lifetime expires
              if (positions[s * 3 + 1] < 0.05 || Math.random() < 0.04) {
                positions[s * 3] = 0;
                positions[s * 3 + 1] = 0.65;
                positions[s * 3 + 2] = 0;
                const angle = Math.random() * Math.PI * 2;
                const spd = 0.8 + Math.random() * 1.4;
                vels[s * 3] = Math.cos(angle) * spd;
                vels[s * 3 + 1] = 1.0 + Math.random() * 1.5;
                vels[s * 3 + 2] = Math.sin(angle) * spd;
              }
            }
            posAttr.needsUpdate = true;
          }

          // NEXUS-STARK Expanding Acoustic Ripple Rings
          if (this.nexusAcousticRings.length > 0) {
            this.nexusAcousticRings.forEach((ring) => {
              ring.phase = (ring.phase + delta * 0.7) % 1.0;
              const scale = 0.3 + ring.phase * 1.8;
              ring.mesh.scale.set(scale, scale, scale);
              const alpha = Math.sin(ring.phase * Math.PI) * 0.65;
              (ring.mesh.material as THREE.MeshBasicMaterial).opacity = alpha;
            });
          }

          // Station Specialist Bots Articulated Idle / Work Animation
          if (this.workspaceBotAvatars.length > 0) {
            this.workspaceBotAvatars.forEach((bot) => {
              const botAngle = time * 0.85 + bot.phase;
              bot.group.position.x = bot.basePos.x + Math.cos(botAngle) * 0.45;
              bot.group.position.z = bot.basePos.z + Math.sin(botAngle) * 0.45;
              bot.group.position.y = 0.52 + Math.abs(Math.sin(time * 3.4 + bot.phase)) * 0.08;
              bot.group.rotation.y = -botAngle + Math.PI / 2;

              if (bot.headMesh) {
                bot.headMesh.rotation.y = Math.sin(time * 1.5 + bot.phase) * 0.35;
              }
              if (bot.leftArm) {
                bot.leftArm.rotation.x = Math.sin(time * 3.4 + bot.phase) * 0.5;
              }
              if (bot.rightArm) {
                bot.rightArm.rotation.x = -Math.sin(time * 3.4 + bot.phase) * 0.5;
              }
            });
          }

          // Autonomous Roving Courier Bots patrolling between stations ("Bot Crossing")
          if (this.rovingCourierBots.length > 0) {
            this.rovingCourierBots.forEach((courier) => {
              courier.t = (courier.t + delta * courier.speed) % 1.0;
              const pos = courier.curve.getPointAt(courier.t);
              const tangent = courier.curve.getTangentAt(courier.t);
              courier.group.position.copy(pos);
              courier.group.position.y = -4.3 + Math.abs(Math.sin(time * 4.0 + courier.t * 10)) * 0.06;
              const lookTarget = pos.clone().add(tangent);
              courier.group.lookAt(lookTarget);
            });
          }

          // Station Holographic Diamond Markers Levitation & Rotation
          if (this.stationMarkers.length > 0) {
            this.stationMarkers.forEach((m) => {
              m.mesh.rotation.y = time * 1.4 + m.phase;
              m.mesh.position.y = m.baseY + Math.sin(time * 2.5 + m.phase) * 0.12;
            });
          }
        }

        // Orbital Markers rotation in Home mode
        const isHome = this.currentMode === 'MAIN_AGENT' || this.currentMode === 'DEFAULT';
        if (this.orbitalMarkers.length > 0 && isHome) {
          this.orbitalMarkers.forEach((m) => {
            m.mesh.rotation.y = time * 1.8 + m.phase;
          });
        }

        // 11. Automation Nexus Flowing High-Speed Data Packets
        if (this.automationDataPackets.length > 0 && this.automationGroup?.visible) {
          this.automationDataPackets.forEach((pkt) => {
            pkt.t = (pkt.t + delta * pkt.speed) % 1.0;
            const pt = pkt.curve.getPoint(pkt.t);
            pkt.mesh.position.copy(pt);
          });
        }

        // 12. Media Studio Dynamic Audio Spectrum Equalizer Bars
        if (this.mediaSpectrumBars.length > 0 && this.mediaGroup?.visible) {
          this.mediaSpectrumBars.forEach((bar, bIdx) => {
            const scaleY = 1.0 + Math.sin(time * 4.0 + bIdx * 0.45) * 0.85 + Math.sin(time * 7.5 + bIdx) * 0.4;
            bar.scale.set(1.0, Math.max(0.2, scaleY), 1.0);
          });
        }

        // 13. Smooth Cinematic Camera Glide & Framing
        if (this.camera) {
          this.currentCameraPos.lerp(this.targetCameraPos, 0.045);
          this.currentCameraLookAt.lerp(this.targetCameraLookAt, 0.045);
          this.camera.position.copy(this.currentCameraPos);
          this.camera.lookAt(this.currentCameraLookAt);
        }

        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }

        this.animationFrameId = requestAnimationFrame(animate);
      };

      this.animationFrameId = requestAnimationFrame(animate);
    });
  }

  getBaseCameraForMode(mode: SpatialEnvironmentMode): { pos: THREE.Vector3; lookAt: THREE.Vector3 } {
    if (mode === 'WORKSPACE') {
      return {
        pos: new THREE.Vector3(0, 7.5, 21.5),
        lookAt: new THREE.Vector3(0, -3.8, 0),
      };
    } else if (mode === 'AUTOMATION') {
      return {
        pos: new THREE.Vector3(0, 7.5, 19.0),
        lookAt: new THREE.Vector3(0, 1.2, 0),
      };
    } else if (mode === 'MEDIA') {
      return {
        pos: new THREE.Vector3(0, 3.5, 16.5),
        lookAt: new THREE.Vector3(0, 0.8, 0),
      };
    } else if (mode === 'INTELLIGENCE') {
      return {
        pos: new THREE.Vector3(0, 0, 18),
        lookAt: new THREE.Vector3(0, 0, 0),
      };
    } else if (mode === 'BUSINESS') {
      return {
        pos: new THREE.Vector3(0, 1.2, 24),
        lookAt: new THREE.Vector3(0, 0, 0),
      };
    } else {
      // MAIN_AGENT / DEFAULT (Exact Image 5 centered framing)
      return {
        pos: new THREE.Vector3(0, 3.2, 21.0),
        lookAt: new THREE.Vector3(0, -0.8, 0),
      };
    }
  }

  applyResponsiveCamera(): void {
    if (this.selectedAgent()) return;
    const base = this.getBaseCameraForMode(this.currentMode);
    const offset = base.pos.clone().sub(base.lookAt);
    offset.multiplyScalar(this.responsiveScaleFactor);
    this.targetCameraPos.copy(base.lookAt).add(offset);
    this.targetCameraLookAt.copy(base.lookAt);
  }

  updateBillboardLabelVisibility(): void {
    const selected = this.selectedAgent();
    const hovered = this.hoveredAgent();

    this.orbitalSprites.forEach((sp) => {
      const agentId = sp.userData['agentId'];
      const isTarget = !!((selected && selected.id === agentId) || (hovered && hovered.id === agentId));
      sp.visible = isTarget;
      if (sp.material instanceof THREE.SpriteMaterial) {
        sp.material.opacity = isTarget ? 1.0 : 0.0;
      }
      if (isTarget) {
        sp.scale.set(3.4, 0.85, 1);
      }
    });

    this.workspaceSprites.forEach((sp) => {
      const agentId = sp.userData['agentId'];
      const isTarget = !!((selected && selected.id === agentId) || (hovered && hovered.id === agentId));
      sp.visible = isTarget;
      if (sp.material instanceof THREE.SpriteMaterial) {
        sp.material.opacity = isTarget ? 1.0 : 0.0;
      }
      if (isTarget) {
        sp.scale.set(3.4, 0.85, 1);
      }
    });
  }

  setMode(mode: SpatialEnvironmentMode): void {
    if (this.currentMode === mode) return;
    this.currentMode = mode;
    this.selectedAgent.set(null);
    if (mode === 'WORKSPACE') {
      this.targetRotation.y = 0;
      this.targetRotation.x = 0;
    }
    const isHome = mode === 'MAIN_AGENT' || mode === 'DEFAULT';

    // Strictly isolate Main Agent orbital agents & beams to /home only
    this.agentMeshMap.forEach((m) => {
      m.group.visible = isHome;
      if (m.beam) m.beam.visible = isHome;
    });

    if (this.networkNodeGroup) {
      this.networkNodeGroup.visible = mode === 'NETWORK';
    }
    if (this.sectorGroup) {
      this.sectorGroup.visible = mode === 'BUSINESS';
    }
    if (this.workspaceGroup) {
      this.workspaceGroup.visible = mode === 'WORKSPACE';
    }
    if (this.automationGroup) {
      this.automationGroup.visible = mode === 'AUTOMATION';
    }
    if (this.mediaGroup) {
      this.mediaGroup.visible = mode === 'MEDIA';
    }
    if (this.centralCoreGroup) {
      this.centralCoreGroup.visible = isHome;
    }
    if (this.swarmArchitectureGroup) {
      this.swarmArchitectureGroup.visible = isHome;
    }

    if (this.camera) {
      this.applyResponsiveCamera();
      this.updateBillboardLabelVisibility();
    }
  }

  setEnergyState(state: 'IDLE' | 'LISTENING' | 'EXECUTING' | 'VERIFIED' | 'ERROR'): void {
    this.energyState = state;
  }

  onResize(width: number, height: number): void {
    if (!this.camera || !this.renderer) return;
    if (width <= 0 || height <= 0) return;
    const aspect = width / height;
    this.camera.aspect = aspect;

    // Responsive scaling: if aspect ratio is narrower or width is smaller,
    // zoom out dynamically so objects maintain identical relative proportions
    // and never look "too big" or clipped on laptops, tablets, or mobile devices
    let factor = 1.0;
    if (aspect < 1.75) {
      factor = Math.max(1.0, 1.75 / Math.max(aspect, 0.55));
    }
    if (width < 1366) {
      const widthFactor = Math.sqrt(1366 / Math.max(width, 480));
      factor = Math.max(factor, widthFactor);
    }
    this.responsiveScaleFactor = Math.min(2.1, factor);

    this.applyResponsiveCamera();
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  updateThemeColors(colors: AbhiThemeColors): void {
    if (!this.scene) return;
    try {
      // 1. Dynamic Background Fog & Clear Color (Harmonized deep space void across all themes)
      const isLightBg = colors.background.toLowerCase().startsWith('#f') || colors.background.toLowerCase() === '#ffffff';
      const effective3dBg = isLightBg ? '#040916' : colors.background;
      if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.set(effective3dBg);
      }
      if (this.renderer) {
        this.renderer.setClearColor(new THREE.Color(effective3dBg), 1);
      }

      // 2. Lights Synchronization
      if (this.pointLight1) this.pointLight1.color.set(colors.accentPrimary);
      if (this.pointLight2) this.pointLight2.color.set(colors.accentSecondary);
      if (this.pointLightCore) this.pointLightCore.color.set(colors.accentPrimary);
      if (this.ambientLight) this.ambientLight.color.set(colors.backgroundSecondary);

      this.themeColorLights.forEach(({ light, isSecondary }) => {
        light.color.set(isSecondary ? colors.accentSecondary : colors.accentPrimary);
      });

      // 3. Central Core HUD Rings, Meshes & Coronas
      if (this.coreCoronaMesh && this.coreCoronaMesh.material instanceof THREE.MeshBasicMaterial) {
        this.coreCoronaMesh.material.color.set(colors.accentPrimary);
      }
      if (this.hudAzimuthTicks && this.hudAzimuthTicks.material instanceof THREE.LineBasicMaterial) {
        this.hudAzimuthTicks.material.color.set(colors.accentPrimary);
      }
      if (this.horizonDisc && this.horizonDisc.material instanceof THREE.LineBasicMaterial) {
        this.horizonDisc.material.color.set(colors.accentPrimary);
      }
      if (this.innerSingularityMesh && this.innerSingularityMesh.material instanceof THREE.MeshBasicMaterial) {
        this.innerSingularityMesh.material.color.set(colors.accentPrimary);
      }
      this.shockwaveMeshes.forEach((s) => {
        if (s.mesh.material instanceof THREE.MeshBasicMaterial) {
          s.mesh.material.color.set(colors.accentPrimary);
        }
      });
      this.voiceRippleRings.forEach((v) => {
        if (v.mesh.material instanceof THREE.MeshBasicMaterial) {
          v.mesh.material.color.set(colors.accentPrimary);
        }
      });

      // 4. Registered Universal Theme Meshes
      this.themeColorMeshes.forEach(({ mesh, isSecondary }) => {
        const targetColor = isSecondary ? colors.accentSecondary : colors.accentPrimary;
        if (mesh.material instanceof THREE.Material && 'color' in mesh.material) {
          (mesh.material as any).color.set(targetColor);
        }
      });

      // 5. Workspace Colony Materials & Lighting
      const activeThemeId = this.themeService.activeTheme()?.id;
      const isLight =
        activeThemeId === 'quantum-white' ||
        colors.background.toLowerCase().startsWith('#f') ||
        colors.background.toLowerCase() === '#ffffff';

      if (this.workspaceHexEdgeMat) {
        this.workspaceHexEdgeMat.color.set(colors.accentPrimary);
      }
      if (this.workspaceTileMat) {
        if (isLight) {
          this.workspaceTileMat.color.set(0xdbeafe);
          this.workspaceTileMat.roughness = 0.22;
          this.workspaceTileMat.metalness = 0.75;
          this.workspaceTileMat.emissive.set(0x000000);
          this.workspaceTileMat.emissiveIntensity = 0.0;
        } else {
          let darkFloorColor = 0x11213b;
          if (activeThemeId === 'midnight-amethyst') {
            darkFloorColor = 0x1d1430;
          } else if (activeThemeId === 'emerald-matrix') {
            darkFloorColor = 0x0d261e;
          }
          this.workspaceTileMat.color.set(darkFloorColor);
          this.workspaceTileMat.roughness = 0.28;
          this.workspaceTileMat.metalness = 0.58;
          this.workspaceTileMat.emissive.set(colors.accentPrimary);
          this.workspaceTileMat.emissiveIntensity = 0.08;
        }
      }
      if (this.workspaceCommandDomeMat) {
        this.workspaceCommandDomeMat.color.set(colors.accentPrimary);
      }
      if (this.workspaceRadarDishMat) {
        this.workspaceRadarDishMat.color.set(colors.accentPrimary);
      }
      if (this.workspaceSpecularSunLight) {
        this.workspaceSpecularSunLight.intensity = isLight ? 2.6 : 3.2;
      }
      if (this.workspaceSunLight) {
        this.workspaceSunLight.intensity = isLight ? 2.2 : 2.4;
      }
      if (this.workspaceFillLight) {
        this.workspaceFillLight.intensity = isLight ? 1.8 : 2.2;
      }
      if (this.workspaceHemiLight) {
        this.workspaceHemiLight.intensity = isLight ? 2.0 : 1.6;
        this.workspaceHemiLight.color.set(colors.accentPrimary);
        this.workspaceHemiLight.groundColor.set(isLight ? 0x94a3b8 : colors.background);
      }
      if (this.workspaceBotChassisMaterials.length > 0) {
        this.workspaceBotChassisMaterials.forEach(({ torsoMat, headMat, agentHex }) => {
          if (isLight) {
            torsoMat.color.set(0x334155);
            torsoMat.emissive.set(agentHex);
            torsoMat.emissiveIntensity = 0.35;
            headMat.color.set(0x1e293b);
            headMat.emissive.set(agentHex);
            headMat.emissiveIntensity = 0.35;
          } else {
            torsoMat.color.set(0x1e293b);
            torsoMat.emissive.set(agentHex);
            torsoMat.emissiveIntensity = 0.25;
            headMat.color.set(0x0f172a);
            headMat.emissive.set(agentHex);
            headMat.emissiveIntensity = 0.25;
          }
        });
      }

      // 6. Dynamic 3,200 Quantum Dot Fibonacci Core Particles Recoloring
      if (this.quantumDotSphere && this.quantumOriginalPositions && this.quantumOriginalColors) {
        const primary = new THREE.Color(colors.accentPrimary);
        const secondary = new THREE.Color(colors.accentSecondary);
        const white = new THREE.Color(0xffffff);
        const origCol = this.quantumOriginalColors;
        const count = origCol.length / 3;
        const origPos = this.quantumOriginalPositions;

        for (let i = 0; i < count; i++) {
          const y = origPos[i * 3 + 1];
          const normY = Math.max(0, Math.min(1, (y + 3.8) / 7.6));
          const c = new THREE.Color();
          if (normY < 0.45) {
            c.copy(secondary).lerp(primary, normY / 0.45);
          } else if (normY < 0.82) {
            c.copy(primary).lerp(white, (normY - 0.45) / 0.37);
          } else {
            c.copy(white).lerp(primary, (normY - 0.82) / 0.18);
          }
          origCol[i * 3] = c.r;
          origCol[i * 3 + 1] = c.g;
          origCol[i * 3 + 2] = c.b;
        }
        const colorAttr = this.quantumDotSphere.geometry.attributes['color'] as THREE.BufferAttribute;
        if (colorAttr) {
          (colorAttr.array as Float32Array).set(origCol);
          colorAttr.needsUpdate = true;
        }
      }
    } catch (err) {
      console.warn('ThreeSceneManagerService updateThemeColors error:', err);
    }
  }

  pause(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resume(): void {
    if (!this.isRunning && this.scene && this.camera && this.renderer) {
      this.isRunning = true;
      this.startAnimationLoop();
    }
  }

  cleanup(): void {
    this.pause();
    if (this.bondChatterTimer) {
      clearInterval(this.bondChatterTimer);
      this.bondChatterTimer = null;
    }
    this.agentMeshMap.clear();
    this.orbitalSprites = [];
    this.workspaceSprites = [];
    this.stationMarkers = [];
    this.orbitalMarkers = [];
    this.rovingCourierBots = [];
    this.nexusAcousticRings = [];
    this.workspaceStationHitMeshes = [];
    this.workspaceBotChassisMaterials = [];
    this.voiceRippleRings = [];
    this.volumetricColumns = [];
    this.podHitMeshes = [];
    this.workspaceBotAvatars = [];
    this.automationDataPackets = [];
    this.mediaSpectrumBars = [];
    this.swarmArchitectureGroup = null;
    this.workspaceGroup = null;
    this.automationGroup = null;
    this.mediaGroup = null;
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
  }
}
