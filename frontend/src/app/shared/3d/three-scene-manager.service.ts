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
import * as THREE from 'three';
import { SpatialEnvironmentMode } from '../../core/models/agent-experience.model';
import { ThemeService, AbhiThemeColors } from '../../core/services/theme.service';

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
  private ngZone = inject(NgZone);

  // Component Signals & State
  readonly isSwarmDeployed = signal<boolean>(false);
  readonly soundEnabled = signal<boolean>(true);
  readonly selectedAgent = signal<AgentNode | null>(null);
  readonly latestJarvisMessage = signal<string | null>(
    'Systems online, Commander. The Quantum Dot Sphere is stable. Click the core sphere to erupt autonomous sub-agents with inter-linked synaptic laser arrays.'
  );

  // 8 Advanced Autonomous Sub-Agents (Concealed in Nucleus until Unpacked)
  readonly agents = signal<AgentNode[]>([
    {
      id: 'agent-sentinel',
      name: 'SENTINEL-X',
      codename: 'MARK-I',
      role: 'Harmonic Shield & Kinetic Deflection',
      status: 'DORMANT',
      color: '#00f0ff',
      hexColor: 0x00f0ff,
      icon: '🛡️',
      angle: 0,
      elevation: 0.35,
      speed: 0.85,
      orbitRadius: 9.2,
      description: 'Generates quantum harmonic electromagnetic deflector arrays to neutralize kinetic and energy strikes.',
      subsystem: 'DEFENSE MATRIX',
      load: 'STABLE // 100%',
      synapticRate: '12.4 TB/s',
      neuralEfficiency: '99.8%',
    },
    {
      id: 'agent-synthex',
      name: 'SYNTHEX',
      codename: 'MARK-II',
      role: 'Sub-Orbital Telemetry & Web Uplink',
      status: 'DORMANT',
      color: '#10b981',
      hexColor: 0x10b981,
      icon: '🌐',
      angle: (Math.PI * 2 / 8) * 1,
      elevation: -0.45,
      speed: 0.95,
      orbitRadius: 9.6,
      description: 'Intercepts orbital satellite constellations and synthesizes real-time tactical planetary relays & browser automation.',
      subsystem: 'TELEMETRY NEXUS',
      load: 'THROUGHPUT 48 TB/s',
      synapticRate: '34.8 TB/s',
      neuralEfficiency: '99.2%',
    },
    {
      id: 'agent-archon',
      name: 'ARCHON',
      codename: 'MARK-III',
      role: 'Microcode & Avionics Re-Assembler',
      status: 'DORMANT',
      color: '#f59e0b',
      hexColor: 0xf59e0b,
      icon: '⚡',
      angle: (Math.PI * 2 / 8) * 2,
      elevation: 0.55,
      speed: 0.75,
      orbitRadius: 8.8,
      description: 'Executes zero-latency firmware compilation, autonomous AST healing, and nanotech reassembly.',
      subsystem: 'AVIONICS FORGE',
      load: 'FREQ 6.2 GHz',
      synapticRate: '18.1 TB/s',
      neuralEfficiency: '99.9%',
    },
    {
      id: 'agent-aura',
      name: 'AURA-VISION',
      codename: 'MARK-IV',
      role: 'Multispectral LiDAR & Recon',
      status: 'DORMANT',
      color: '#a855f7',
      hexColor: 0xa855f7,
      icon: '👁️',
      angle: (Math.PI * 2 / 8) * 3,
      elevation: -0.3,
      speed: 0.88,
      orbitRadius: 10.2,
      description: 'Produces millimeter-precision 3D topological point clouds, thermal thermography, and hyper-spectral screen OCR scans.',
      subsystem: 'OPTIC SENSORS',
      load: 'LIDAR LOCKED',
      synapticRate: '22.0 TB/s',
      neuralEfficiency: '98.7%',
    },
    {
      id: 'agent-chronos',
      name: 'CHRONOS',
      codename: 'MARK-V',
      role: 'Tactical Trajectory Forecaster',
      status: 'DORMANT',
      color: '#ef4444',
      hexColor: 0xef4444,
      icon: '🔮',
      angle: (Math.PI * 2 / 8) * 4,
      elevation: 0.3,
      speed: 0.8,
      orbitRadius: 9.0,
      description: 'Predicts target maneuvers, war-game outcome contingencies, and computes optimal Task DAG corridors.',
      subsystem: 'TACTICAL MATRIX',
      load: 'ACCURACY 99.8%',
      synapticRate: '27.5 TB/s',
      neuralEfficiency: '99.5%',
    },
    {
      id: 'agent-synapse',
      name: 'SYNAPSE-AI',
      codename: 'MARK-VI',
      role: 'Deep Cognitive Neural Orchestrator',
      status: 'DORMANT',
      color: '#ec4899',
      hexColor: 0xec4899,
      icon: '🧠',
      angle: (Math.PI * 2 / 8) * 5,
      elevation: -0.2,
      speed: 0.92,
      orbitRadius: 9.4,
      description: 'Distributes reasoning computations across sub-agents and orchestrates real-time synthetic heuristics with zero cloud.',
      subsystem: 'COGNITIVE CLOUD',
      load: 'INFERENCE 1.2 ms',
      synapticRate: '41.0 TB/s',
      neuralEfficiency: '100%',
    },
    {
      id: 'agent-aegis',
      name: 'AEGIS-SENTRY',
      codename: 'MARK-VII',
      role: 'Dual-State Physical Verifier',
      status: 'DORMANT',
      color: '#84cc16',
      hexColor: 0x84cc16,
      icon: '⚖️',
      angle: (Math.PI * 2 / 8) * 6,
      elevation: 0.4,
      speed: 0.82,
      orbitRadius: 10.4,
      description: 'Validates real system state transitions on physical disk, window handles, and SQLite WAL before marking tasks completed.',
      subsystem: 'VERIFICATION AUDIT',
      load: 'PASS 100%',
      synapticRate: '15.6 TB/s',
      neuralEfficiency: '100%',
    },
    {
      id: 'agent-nexus',
      name: 'NEXUS-STARK',
      codename: 'MARK-VIII',
      role: 'Neural Voice Synthesis & Comms',
      status: 'DORMANT',
      color: '#3b82f6',
      hexColor: 0x3b82f6,
      icon: '🎙️',
      angle: (Math.PI * 2 / 8) * 7,
      elevation: -0.4,
      speed: 0.9,
      orbitRadius: 9.0,
      description: 'Streams authentic Paul Bettany British neural speech and processes real-time audio spectral harmonics.',
      subsystem: 'AUDIO RESONANCE',
      load: 'LATENCY 14 ms',
      synapticRate: '28.2 TB/s',
      neuralEfficiency: '99.7%',
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

  // Multi-Agent Mesh Mapping (Quantum Dot Balls + Nuclei + Micro-Rings)
  private agentMeshMap: Map<string, {
    group: THREE.Group;
    orb: THREE.Mesh; // Raycast hit sphere
    dotBall: THREE.Points; // Colored Fibonacci Quantum Dot Ball
    innerNucleus: THREE.Mesh; // Crystalline emissive polyhedral nucleus
    microRing: THREE.Mesh; // Orbiting micro-torus ring
    haloCloud: THREE.Points; // Surrounding particle aura
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
  private floatingConsoles: { mesh: THREE.Mesh; baseY: number; phase: number }[] = [];
  private groundRadarMesh: THREE.LineSegments | null = null;
  private agentBots: { group: THREE.Group; baseY: number; phase: number }[] = [];

  // Smooth Cinematic Camera Transitions (Elevated Isometric Colony View)
  private targetCameraPos = new THREE.Vector3(0, 11.5, 23.0);
  private currentCameraPos = new THREE.Vector3(0, 11.5, 23.0);
  private targetCameraLookAt = new THREE.Vector3(0, -2.5, 0);
  private currentCameraLookAt = new THREE.Vector3(0, -2.5, 0);

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
  private workspaceBotAvatars: { group: THREE.Group; phase: number; toolMesh?: THREE.Mesh; headMesh?: THREE.Mesh }[] = [];
  private automationDataPackets: { mesh: THREE.Mesh; t: number; speed: number; curve: THREE.CatmullRomCurve3 }[] = [];
  private mediaSpectrumBars: THREE.Mesh[] = [];

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
      this.camera.position.set(0, 1.2, 19.0);

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
    const hitGeo = new THREE.SphereGeometry(4.2, 16, 16);
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
      this.scene.add(sMesh);
      this.shockwaveMeshes.push({
        mesh: sMesh,
        phase: i * (1.0 / 3.0),
        speed: 0.45,
      });
    }
  }

  /**
   * Deep Cosmic Ambient Micro-Starfield (1,200 fine twinkling pinpoint stars).
   */
  private buildAmbientStarfield(): void {
    if (!this.scene) return;

    const count = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const cWhite = new THREE.Color(0xffffff);
    const cCyan = new THREE.Color(0x00f0ff);
    const cViolet = new THREE.Color(0xa855f7);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const r = 7.0 + Math.random() * 29.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[idx] = r * Math.sin(phi) * Math.cos(theta);
      positions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[idx + 2] = r * Math.cos(phi) - 4.0;

      const rand = Math.random();
      let starColor = cWhite.clone();
      if (rand < 0.25) {
        starColor.lerp(cCyan, 0.6);
      } else if (rand < 0.45) {
        starColor.lerp(cViolet, 0.5);
      }

      colors[idx] = starColor.r;
      colors[idx + 1] = starColor.g;
      colors[idx + 2] = starColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.11,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.ambientStarSystem = new THREE.Points(geometry, material);
    this.scene.add(this.ambientStarSystem);
  }

  /**
   * Advanced Multi-Agents construction:
   * Multi-colored Quantum Dot Balls with inner crystalline nuclei,
   * orbiting micro-torus rings, and enlarged raycast hit spheres.
   */
  private buildMultiAgents(): void {
    if (!this.scene) return;
    this.agentMeshMap.clear();

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

      // 4. Micro Quantum Particle Cloud swirling around each agent (64 particles)
      const cloudCount = 64;
      const cloudGeo = new THREE.BufferGeometry();
      const cloudPos = new Float32Array(cloudCount * 3);
      for (let cIdx = 0; cIdx < cloudCount; cIdx++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const rad = 1.15 + Math.random() * 0.45;
        cloudPos[cIdx * 3] = rad * Math.sin(phi) * Math.cos(theta);
        cloudPos[cIdx * 3 + 1] = rad * Math.sin(phi) * Math.sin(theta);
        cloudPos[cIdx * 3 + 2] = rad * Math.cos(phi);
      }
      cloudGeo.setAttribute('position', new THREE.BufferAttribute(cloudPos, 3));
      const cloudMat = new THREE.PointsMaterial({
        color: agent.hexColor,
        size: 0.07,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });
      const haloCloud = new THREE.Points(cloudGeo, cloudMat);
      group.add(haloCloud);

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

      // 6. Floating 3D Nameplate Sprite over Orbiting Agent
      const nameplate = this.createAgentBillboardSprite(agent);
      nameplate.position.set(0, 1.45, 0);
      group.add(nameplate);

      // Energy Laser Tether Beam linking Agent to Central Singularity
      const beamGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      const beamMat = new THREE.LineBasicMaterial({
        color: agent.hexColor,
        transparent: true,
        opacity: 0.0,
      });
      const beam = new THREE.Line(beamGeo, beamMat);
      this.scene?.add(beam);

      // Concealed inside core at startup
      group.scale.set(0.001, 0.001, 0.001);
      group.position.set(0, 0, 0);

      this.scene?.add(group);
      this.agentMeshMap.set(agent.id, {
        group,
        orb: hitSphere,
        dotBall,
        innerNucleus,
        microRing,
        haloCloud,
        beam,
        currentRadius: 0,
        currentScale: 0.001,
      });
    });

    // Inter-Agent Synaptic Network Mesh (Perimeter + Cross Connections)
    const agentCount = this.agents().length;
    const meshLineCount = agentCount * 2;
    const meshPositions = new Float32Array(meshLineCount * 2 * 3);
    const meshGeo = new THREE.BufferGeometry();
    meshGeo.setAttribute('position', new THREE.BufferAttribute(meshPositions, 3));

    const meshMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
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
    this.floatingConsoles = [];

    // 1. Central Multi-Tier Hexagonal Citadel Dais
    const baseGeo = new THREE.CylinderGeometry(13.5, 14.5, 0.4, 6);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x050c18,
      roughness: 0.35,
      metalness: 0.85,
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
        color: 0x07152c,
        roughness: 0.3,
        metalness: 0.85,
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

      // Floating 3D Nameplate Sprite over each Docking Pod
      const podNameplate = this.createAgentBillboardSprite(agent);
      podNameplate.position.set(0, 2.6, 0);
      podGroup.add(podNameplate);

      // 3 Sleek Architectural Pylons around pod
      for (let p = 0; p < 3; p++) {
        const pAngle = (p / 3) * Math.PI * 2;
        const pGeo = new THREE.BoxGeometry(0.08, 1.2, 0.08);
        const pMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
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
   * 3D Cybernetic Colony & Multi-Agent Living Base (Image 1 Style):
   * Hexagonal island archipelago with 19 interlocking hex foundations,
   * 8 dedicated specialist bot workstations, and 8 animated physical bot avatars.
   */
  private createWorkspaceBaseEnvironment(): void {
    if (!this.scene) return;
    this.workspaceGroup = new THREE.Group();
    this.workspaceGroup.visible = false;
    this.workspaceBotAvatars = [];

    const hexCoords = [
      { q: 0, r: 0 },
      { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
      { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
      { q: 2, r: 0 }, { q: 2, r: -1 }, { q: 2, r: -2 },
      { q: 1, r: -2 }, { q: 0, r: -2 }, { q: -1, r: -1 },
      { q: -2, r: 0 }, { q: -2, r: 1 }, { q: -2, r: 2 },
      { q: -1, r: 2 }, { q: 0, r: 2 }, { q: 1, r: 1 }
    ];

    const hexRadius = 3.6;
    const hexHeight = 0.5;
    const hexTileGeo = new THREE.CylinderGeometry(hexRadius * 0.96, hexRadius, hexHeight, 6);
    const hexTileMat = new THREE.MeshStandardMaterial({
      color: 0x07152b,
      roughness: 0.35,
      metalness: 0.85,
    });
    const hexEdgeMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });

    hexCoords.forEach((coord) => {
      const x = hexRadius * Math.sqrt(3) * (coord.q + coord.r / 2);
      const z = hexRadius * (3 / 2) * coord.r;
      const y = -4.8 + Math.sin(coord.q * 1.5 + coord.r) * 0.15;

      const tileMesh = new THREE.Mesh(hexTileGeo, hexTileMat);
      tileMesh.position.set(x, y, z);
      this.workspaceGroup?.add(tileMesh);

      const edgeMesh = new THREE.LineSegments(new THREE.EdgesGeometry(hexTileGeo), hexEdgeMat);
      edgeMesh.position.set(x, y, z);
      this.workspaceGroup?.add(edgeMesh);
    });

    const hubBaseGeo = new THREE.CylinderGeometry(2.4, 2.7, 0.6, 6);
    const hubBase = new THREE.Mesh(hubBaseGeo, new THREE.MeshStandardMaterial({
      color: 0x0c274d,
      roughness: 0.25,
      metalness: 0.9,
    }));
    hubBase.position.set(0, -4.2, 0);
    this.workspaceGroup.add(hubBase);

    const tableGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.25, 32);
    const tableMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.set(0, -3.7, 0);
    this.workspaceGroup.add(table);

    const globeGeo = new THREE.SphereGeometry(0.85, 24, 24);
    const globeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    globe.position.set(0, -2.5, 0);
    this.workspaceGroup.add(globe);

    const agentList = this.agents();
    const stationPositions = [
      { x: 0, z: -8.0 },
      { x: 7.2, z: -4.5 },
      { x: 9.0, z: 2.2 },
      { x: 4.5, z: 8.5 },
      { x: -4.5, z: 8.5 },
      { x: -9.0, z: 2.2 },
      { x: -7.2, z: -4.5 },
      { x: 0, z: 8.8 }
    ];

    agentList.forEach((agent, i) => {
      const pos = stationPositions[i % stationPositions.length];
      const stationGroup = new THREE.Group();
      stationGroup.position.set(pos.x, -4.2, pos.z);
      stationGroup.userData = { agentId: agent.id, agent };

      const padGeo = new THREE.CylinderGeometry(1.8, 2.0, 0.35, 6);
      const padMat = new THREE.MeshStandardMaterial({
        color: 0x091c36,
        roughness: 0.3,
        metalness: 0.85,
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      stationGroup.add(pad);

      const padBorder = new THREE.LineSegments(
        new THREE.EdgesGeometry(padGeo),
        new THREE.LineBasicMaterial({
          color: agent.hexColor,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
        })
      );
      stationGroup.add(padBorder);

      const domeGeo = new THREE.SphereGeometry(0.8, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const domeMat = new THREE.MeshStandardMaterial({
        color: 0x0e2b52,
        roughness: 0.2,
        metalness: 0.9,
      });
      const dome = new THREE.Mesh(domeGeo, domeMat);
      dome.position.set(0.6, 0.18, -0.6);
      stationGroup.add(dome);

      const torusGeo = new THREE.TorusGeometry(0.82, 0.035, 12, 32);
      const torusMat = new THREE.MeshBasicMaterial({
        color: agent.hexColor,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      });
      const torus = new THREE.Mesh(torusGeo, torusMat);
      torus.rotation.x = Math.PI * 0.5;
      torus.position.set(0.6, 0.45, -0.6);
      stationGroup.add(torus);

      const botGroup = new THREE.Group();
      botGroup.position.set(-0.4, 0.5, 0.4);

      const torsoGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.55, 12);
      const torsoMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.8,
        roughness: 0.3,
      });
      const torso = new THREE.Mesh(torsoGeo, torsoMat);
      botGroup.add(torso);

      const headGeo = new THREE.SphereGeometry(0.18, 16, 16);
      const headMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.9,
        roughness: 0.2,
      });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 0.42;
      botGroup.add(head);

      const visorGeo = new THREE.BoxGeometry(0.22, 0.08, 0.12);
      const visorMat = new THREE.MeshBasicMaterial({
        color: agent.hexColor,
        blending: THREE.AdditiveBlending,
      });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 0.42, 0.12);
      botGroup.add(visor);

      const armGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8);
      const armMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.rotation.z = Math.PI * 0.35;
      arm.position.set(0.25, 0.15, 0.15);
      botGroup.add(arm);

      const thrusterGeo = new THREE.RingGeometry(0.1, 0.28, 16);
      const thrusterMat = new THREE.MeshBasicMaterial({
        color: agent.hexColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
      });
      const thruster = new THREE.Mesh(thrusterGeo, thrusterMat);
      thruster.rotation.x = Math.PI * 0.5;
      thruster.position.y = -0.32;
      botGroup.add(thruster);

      stationGroup.add(botGroup);
      this.workspaceBotAvatars.push({
        group: botGroup,
        phase: i * 0.85,
        toolMesh: arm,
        headMesh: head,
      });

      const sprite = this.createAgentBillboardSprite(agent);
      sprite.position.set(0, 2.2, 0);
      stationGroup.add(sprite);

      const hitGeo = new THREE.CylinderGeometry(2.2, 2.2, 4.5, 16);
      const hitMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.001,
        depthWrite: false,
      });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.y = 2.0;
      hitMesh.userData = { agentId: agent.id, agent };
      stationGroup.add(hitMesh);
      this.podHitMeshes.push(hitMesh);

      this.workspaceGroup?.add(stationGroup);
    });

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

    // RAYCAST CLICK HANDLER (Direct clicks on the Central Core or Orbiting Agents)
    canvas.addEventListener('click', (e) => {
      if (!this.camera || !this.raycaster) return;

      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      // Check click on Central Core Hit Sphere
      if (this.coreHitSphere) {
        const coreHits = this.raycaster.intersectObject(this.coreHitSphere, false);
        if (coreHits.length > 0) {
          this.ngZone.run(() => this.toggleCoreDeployment());
          return;
        }
      }

      // Check click on Orbiting Agents
      const agentOrbs = Array.from(this.agentMeshMap.values()).map((m) => m.orb);
      const agentHits = this.raycaster.intersectObjects(agentOrbs, true);
      if (agentHits.length > 0) {
        let obj = agentHits[0].object;
        while (obj.parent && !obj.userData?.['agentId']) {
          obj = obj.parent as THREE.Object3D;
        }
        const agentId = obj.userData?.['agentId'];
        const found = this.agents().find((a) => a.id === agentId);
        if (found) {
          this.ngZone.run(() => this.focusAgent(found));
          return;
        }
      }

      // Check click on 3D Volumetric Pods & Workspaces (Stations)
      if (this.podHitMeshes.length > 0) {
        const podHits = this.raycaster.intersectObjects(this.podHitMeshes, true);
        if (podHits.length > 0) {
          let hitObj: THREE.Object3D | null = podHits[0].object;
          while (hitObj && !hitObj.userData?.['agent'] && hitObj.parent) {
            hitObj = hitObj.parent;
          }
          const agent = hitObj?.userData?.['agent'];
          if (agent) {
            this.ngZone.run(() => this.focusAgent(agent));
            return;
          }
        }
      }
    });

    // POINTER HOVER FEEDBACK (Cursor changes to pointer over tactile 3D nodes & pods)
    canvas.addEventListener('pointermove', (e) => {
      if (!this.camera || !this.raycaster) return;
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);

      const agentOrbs = Array.from(this.agentMeshMap.values()).map((m) => m.orb);
      const testObjects = [
        ...agentOrbs,
        ...this.podHitMeshes,
        ...(this.coreHitSphere ? [this.coreHitSphere] : []),
      ];
      const hits = this.raycaster.intersectObjects(testObjects, true);
      canvas.style.cursor = hits.length > 0 ? 'pointer' : 'default';
    });
  }

  // --- ACTIONS: IRIS CORE UNPACKING & RECALL ---

  toggleCoreDeployment(): void {
    this.isSwarmDeployed.update((v) => !v);
    const deployed = this.isSwarmDeployed();

    if (deployed) {
      this.playHoloSound('deploy');
      this.latestJarvisMessage.set(
        'Iris unsealed. Deploying 8 autonomous sub-agents. Inter-agent synaptic laser mesh active.'
      );
      this.agents.update((list) =>
        list.map((a) => ({ ...a, status: 'ORBITING' }))
      );
      this.startMultiAgentBondLoop();
    } else {
      this.playHoloSound('dock');
      this.latestJarvisMessage.set(
        'Sub-agents recalled. Contracting synaptic vectors into central quantum dot singularity.'
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
    this.latestJarvisMessage.set('Harmonic pulse dispatched through core electromagnetic lattice.');
  }

  focusAgent(agent: AgentNode): void {
    if (!this.isSwarmDeployed()) {
      this.toggleCoreDeployment();
    }
    this.selectedAgent.set(agent);
    this.playHoloSound('beep');
    this.latestJarvisMessage.set(
      `Entering 3D Workspace for [${agent.codename}] ${agent.name}. Volumetric Chamber engaged.`
    );
    const agentList = this.agents();
    const index = agentList.findIndex((a) => a.id === agent.id);
    const angle = (index >= 0 ? index / agentList.length : 0) * Math.PI * 2;
    const posX = Math.cos(angle) * 9.8;
    const posZ = Math.sin(angle) * 9.8;
    const posY = -5.0;

    // Reveal focused agent console and hide others for clean spacious view
    this.floatingConsoles.forEach((fc) => {
      const match = fc.mesh.userData['agentId'] === agent.id;
      fc.mesh.visible = match;
      if (fc.mesh.material instanceof THREE.MeshBasicMaterial) {
        fc.mesh.material.opacity = match ? 0.95 : 0.0;
      }
    });

    // Glide camera directly in front of the pod looking into the console and quantum ball
    this.targetCameraPos.set(posX * 0.68, posY + 2.4, posZ * 0.68 + 4.2);
    this.targetCameraLookAt.set(posX, posY + 1.2, posZ);
  }

  resetCameraFocus(): void {
    this.selectedAgent.set(null);
    this.floatingConsoles.forEach((fc) => {
      fc.mesh.visible = false;
      if (fc.mesh.material instanceof THREE.MeshBasicMaterial) {
        fc.mesh.material.opacity = 0.0;
      }
    });
    this.targetCameraPos.set(0, 11.5, 23.0);
    this.targetCameraLookAt.set(0, -2.5, 0);
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

    this.latestJarvisMessage.set(`[VISION -> ${agent.name}]: Synaptic ping ACK verified. Bond at ${newBond}%.`);
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

    this.latestJarvisMessage.set(`[${agent.name} EVOLVED]: ${evolvedMsg}`);
  }

  private bondChatterTimer: any = null;
  private bondAgentIndex = 0;

  startMultiAgentBondLoop(): void {
    if (this.bondChatterTimer) return;

    const chatterPresets: Record<string, string[]> = {
      'agent-sentinel': [
        'Perimeter locked. Deflector field harmonic resonance stable at 1.42 THz.',
        'Shield matrix harmonic frequency adjusted to deflect kinetic interference.',
        'Zero anomalous intrusions detected across active system boundaries.'
      ],
      'agent-synthex': [
        'Web telemetry nexus active. Ingesting sandboxed Chromium state.',
        'DOM grounding pipeline synchronized across Playwright browser worker.',
        'Network telemetry stream latency at 1.2ms. Zero jitter observed.'
      ],
      'agent-archon': [
        'AST verification complete. 0 syntax anomalies across codebase.',
        'Self-healing code compilation engine standing by in avionics forge.',
        'Polyglot synthesis compiler pre-warmed for rapid execution.'
      ],
      'agent-aura': [
        'Multispectral visual parser locked at 60 FPS. Foreground window identified.',
        'Screen perception LiDAR scan verified zero UI bounding box drift.',
        'Visual OCR buffer updated with active desktop pixel grid.'
      ],
      'agent-chronos': [
        'Task DAG corridor prediction 99.8% optimal. Wavefront ready.',
        'Kahn topological levels computed with zero cycles.',
        'Priority task min-heap balanced. Fast-path dispatch primed.'
      ],
      'agent-synapse': [
        'Neural inference throughput steady at 38 tokens/sec on local RTX core.',
        'Token context window memory cache active at 40K tokens.',
        'Cognitive reasoning attention heads aligned with operator intention.'
      ],
      'agent-aegis': [
        'Dual-state physical verifier confirmed SQLite WAL commit.',
        'Physical verification confirmed on filesystem handles.',
        'Integrity audit passed: 100% deterministic state transitions.'
      ],
      'agent-nexus': [
        'Speech resonance audio matrix calibrated. Awaiting operator voice.',
        'Voice synthesis pitch and rate modulated for natural human warmth.',
        'Audio spectrum harmonic analyzer listening on local microphone channel.'
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

      this.latestJarvisMessage.set(`[${targetAgent.name} -> VISION]: "${chatter}"`);
    }, 2800);
  }

  // --- 60 FPS ANIMATION LOOP ---
  private startAnimationLoop(): void {
    this.ngZone.runOutsideAngular(() => {
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

        // 2. Pure Fibonacci Quantum Dot Sphere (Pristine Spherical Shape, Zero Distorting Waves)
        if (this.quantumDotSphere && this.quantumOriginalPositions) {
          const posAttr = this.quantumDotSphere.geometry.attributes['position'] as THREE.BufferAttribute;
          const positions = posAttr.array as Float32Array;
          const orig = this.quantumOriginalPositions;
          // Maintain pristine, smooth spherical Fibonacci lattice
          if (positions[0] !== orig[0] || positions[1] !== orig[1]) {
            positions.set(orig);
            posAttr.needsUpdate = true;
          }
          this.quantumDotSphere.rotation.y = time * 0.02;
          this.quantumDotSphere.rotation.x = Math.sin(time * 0.15) * 0.03;
        }

        // 3. Inner Arc Singularity Breathing Pulse & Corona Expansion
        if (this.innerSingularityMesh) {
          const pulse = 1 + Math.sin(time * 1.2) * 0.04;
          this.innerSingularityMesh.scale.set(pulse, pulse, pulse);
        }
        if (this.coreCoronaMesh) {
          const coronaPulse = 1 + Math.sin(time * 1.0 + 1) * 0.05;
          this.coreCoronaMesh.scale.set(coronaPulse, coronaPulse, coronaPulse);
          this.coreCoronaMesh.rotation.y = -time * 0.015;
        }

        // 4. Concentric Arcs & Radar Sweep (Calm speeds)
        if (this.hudSegmentedRing1) {
          this.hudSegmentedRing1.rotation.z = time * 0.08;
        }
        if (this.hudAzimuthTicks) {
          this.hudAzimuthTicks.rotation.z = -time * 0.03;
        }
        if (this.hudRadarSweeper) {
          this.hudRadarSweeper.rotation.z = -time * 0.35;
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

          const targetRadius = isDeployed ? agent.orbitRadius : 0;
          const targetScale = isDeployed ? 1 : 0.001;

          // Smooth kinematic interpolation
          data.currentRadius += (targetRadius - data.currentRadius) * 0.08;
          data.currentScale += (targetScale - data.currentScale) * 0.08;

          data.group.scale.set(data.currentScale, data.currentScale, data.currentScale);

          // Calm and Majestic Trajectory Coordinates
          const currentAngle = agent.angle + time * (agent.speed * 0.10);
          const posX = Math.cos(currentAngle) * data.currentRadius;
          const posZ = Math.sin(currentAngle) * data.currentRadius;
          const posY = Math.sin(time * 0.6 + index) * 0.6 + agent.elevation;

          data.group.position.set(posX, posY, posZ);
          this.cachedAgentVectors[index].set(posX, posY, posZ);

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

          // In-place buffer mutation: zero GC overhead
          if (data.beam && data.beam.geometry) {
            const attr = data.beam.geometry.attributes['position'] as THREE.BufferAttribute;
            if (attr) {
              const arr = attr.array as Float32Array;
              arr[3] = posX;
              arr[4] = posY;
              arr[5] = posZ;
              attr.needsUpdate = true;
            }
            (data.beam.material as THREE.LineBasicMaterial).opacity = isDeployed ? data.currentScale * 0.45 : 0;
          }
        });

        // 8. Dynamically re-link Inter-Agent Synaptic Laser Mesh (Zero allocation in-place buffer mutation)
        if (this.interAgentMeshLines && agentCount >= 2) {
          const attr = this.interAgentMeshLines.geometry.attributes['position'] as THREE.BufferAttribute;
          if (attr) {
            const arr = attr.array as Float32Array;
            let ptr = 0;
            for (let i = 0; i < agentCount; i++) {
              const next = (i + 1) % agentCount;
              const cross = (i + 2) % agentCount;

              // Perimeter line
              arr[ptr++] = this.cachedAgentVectors[i].x;
              arr[ptr++] = this.cachedAgentVectors[i].y;
              arr[ptr++] = this.cachedAgentVectors[i].z;
              arr[ptr++] = this.cachedAgentVectors[next].x;
              arr[ptr++] = this.cachedAgentVectors[next].y;
              arr[ptr++] = this.cachedAgentVectors[next].z;

              // Cross-synapse line for polyhedral neural mesh
              arr[ptr++] = this.cachedAgentVectors[i].x;
              arr[ptr++] = this.cachedAgentVectors[i].y;
              arr[ptr++] = this.cachedAgentVectors[i].z;
              arr[ptr++] = this.cachedAgentVectors[cross].x;
              arr[ptr++] = this.cachedAgentVectors[cross].y;
              arr[ptr++] = this.cachedAgentVectors[cross].z;
            }
            attr.needsUpdate = true;
          }

          const pulseOpacity = (0.2 + Math.sin(time * 3.5) * 0.1) * (isDeployed ? 1 : 0);
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

        // 10. Workspace Autonomous Bot Avatars Physical Animation (Image 1 bots doing physical work!)
        if (this.workspaceBotAvatars.length > 0 && this.workspaceGroup?.visible) {
          this.workspaceBotAvatars.forEach((bot) => {
            bot.group.position.y = 0.5 + Math.sin(time * 2.0 + bot.phase) * 0.08;
            if (bot.headMesh) {
              bot.headMesh.rotation.y = Math.sin(time * 1.2 + bot.phase) * 0.4;
            }
            if (bot.toolMesh) {
              bot.toolMesh.rotation.z = Math.PI * 0.35 + Math.sin(time * 3.5 + bot.phase) * 0.25;
            }
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

  setMode(mode: SpatialEnvironmentMode): void {
    this.currentMode = mode;
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
      this.centralCoreGroup.visible = mode === 'MAIN_AGENT' || mode === 'DEFAULT';
    }
    if (this.swarmArchitectureGroup) {
      this.swarmArchitectureGroup.visible = mode === 'MAIN_AGENT' || mode === 'DEFAULT';
    }

    if (this.camera) {
      if (mode === 'WORKSPACE') {
        // High isometric colony view matching Image 1
        this.targetCameraPos.set(0, 16.5, 23.5);
        this.targetCameraLookAt.set(0, -1.5, 0);
      } else if (mode === 'AUTOMATION') {
        this.targetCameraPos.set(0, 7.5, 19.0);
        this.targetCameraLookAt.set(0, 1.2, 0);
      } else if (mode === 'MEDIA') {
        this.targetCameraPos.set(0, 3.5, 16.5);
        this.targetCameraLookAt.set(0, 0.8, 0);
      } else if (mode === 'INTELLIGENCE') {
        this.targetCameraPos.set(0, 0, 18);
        this.targetCameraLookAt.set(0, 0, 0);
      } else if (mode === 'BUSINESS') {
        this.targetCameraPos.set(0, 1.2, 24);
        this.targetCameraLookAt.set(0, 0, 0);
      } else {
        // MAIN_AGENT / DEFAULT
        this.targetCameraPos.set(0, 11.5, 23.0);
        this.targetCameraLookAt.set(0, -2.5, 0);
      }
    }
  }

  setEnergyState(state: 'IDLE' | 'LISTENING' | 'EXECUTING' | 'VERIFIED' | 'ERROR'): void {
    this.energyState = state;
  }

  onResize(width: number, height: number): void {
    if (!this.camera || !this.renderer) return;
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  updateThemeColors(colors: AbhiThemeColors): void {
    if (!this.scene) return;
    try {
      if (this.pointLight1) this.pointLight1.color.set(colors.accentPrimary);
      if (this.pointLight2) this.pointLight2.color.set(colors.accentSecondary);
      if (this.pointLightCore) this.pointLightCore.color.set(colors.accentPrimary);

      if (this.coreCoronaMesh && this.coreCoronaMesh.material instanceof THREE.MeshBasicMaterial) {
        this.coreCoronaMesh.material.color.set(colors.accentPrimary);
      }
      if (this.hudAzimuthTicks && this.hudAzimuthTicks.material instanceof THREE.LineBasicMaterial) {
        this.hudAzimuthTicks.material.color.set(colors.accentPrimary);
      }
      if (this.horizonDisc && this.horizonDisc.material instanceof THREE.LineBasicMaterial) {
        this.horizonDisc.material.color.set(colors.accentPrimary);
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
