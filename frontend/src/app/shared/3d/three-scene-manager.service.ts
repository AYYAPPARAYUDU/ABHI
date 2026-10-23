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
  status: 'DORMANT' | 'ORBITING' | 'LOCKED' | 'EXECUTING';
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
      orbitRadius: 8.8,
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
      color: '#38bdf8',
      hexColor: 0x38bdf8,
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
      color: '#34d399',
      hexColor: 0x34d399,
      icon: '⚡',
      angle: (Math.PI * 2 / 8) * 2,
      elevation: 0.55,
      speed: 0.75,
      orbitRadius: 8.2,
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
      color: '#fbbf24',
      hexColor: 0xfbbf24,
      icon: '👁️',
      angle: (Math.PI * 2 / 8) * 3,
      elevation: -0.3,
      speed: 0.88,
      orbitRadius: 10.0,
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
      color: '#f43f5e',
      hexColor: 0xf43f5e,
      icon: '🔮',
      angle: (Math.PI * 2 / 8) * 4,
      elevation: 0.3,
      speed: 0.8,
      orbitRadius: 8.6,
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
      color: '#c084fc',
      hexColor: 0xc084fc,
      icon: '🧠',
      angle: (Math.PI * 2 / 8) * 5,
      elevation: -0.2,
      speed: 0.92,
      orbitRadius: 9.2,
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
      color: '#f59e0b',
      hexColor: 0xf59e0b,
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
      color: '#818cf8',
      hexColor: 0x818cf8,
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

  // Multi-Agent Mesh Mapping
  private agentMeshMap: Map<string, {
    group: THREE.Group;
    orb: THREE.Mesh;
    haloCloud: THREE.Points;
    beam: THREE.Line;
    currentRadius: number;
    currentScale: number;
  }> = new Map();

  private interAgentMeshLines: THREE.LineSegments | null = null;

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
      this.createNetworkGraphVisuals();
      this.createBusinessSectorVisuals();

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

    // 7. INVISIBLE RAYCAST TARGET SPHERE (Enables clicking the central core)
    const hitGeo = new THREE.SphereGeometry(4.2, 16, 16);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
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
   * Concealed inside central singularity at scale 0.001,
   * erupting outward with micro-quantum particle halo clouds,
   * core energy laser tethers, and 3D inter-agent synaptic laser mesh.
   */
  private buildMultiAgents(): void {
    if (!this.scene) return;
    this.agentMeshMap.clear();

    this.agents().forEach((agent) => {
      const group = new THREE.Group();

      // Primary Glowing Node Orb
      const orbGeo = new THREE.SphereGeometry(0.70, 32, 32);
      const orbMat = new THREE.MeshStandardMaterial({
        color: agent.hexColor,
        emissive: agent.hexColor,
        emissiveIntensity: 0.95,
        roughness: 0.15,
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.userData = { agentId: agent.id };
      group.add(orb);

      // Micro Quantum Particle Cloud swirling around each agent (64 particles)
      const cloudCount = 64;
      const cloudGeo = new THREE.BufferGeometry();
      const cloudPos = new Float32Array(cloudCount * 3);
      for (let c = 0; c < cloudCount; c++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const rad = 1.1 + Math.random() * 0.4;
        cloudPos[c * 3] = rad * Math.sin(phi) * Math.cos(theta);
        cloudPos[c * 3 + 1] = rad * Math.sin(phi) * Math.sin(theta);
        cloudPos[c * 3 + 2] = rad * Math.cos(phi);
      }
      cloudGeo.setAttribute('position', new THREE.BufferAttribute(cloudPos, 3));
      const cloudMat = new THREE.PointsMaterial({
        color: agent.hexColor,
        size: 0.08,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });
      const haloCloud = new THREE.Points(cloudGeo, cloudMat);
      group.add(haloCloud);

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
        orb,
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
        }
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
        'Iris unsealed. Deploying 8 autonomous sub-agents. Inter-agent synaptic laser mesh active.'
      );
      this.agents.update((list) =>
        list.map((a) => ({ ...a, status: 'ORBITING' }))
      );
    } else {
      this.playHoloSound('dock');
      this.latestJarvisMessage.set(
        'Sub-agents recalled. Contracting synaptic vectors into central quantum dot singularity.'
      );
      this.agents.update((list) =>
        list.map((a) => ({ ...a, status: 'DORMANT' }))
      );
      this.selectedAgent.set(null);
    }
  }

  triggerCorePulse(): void {
    this.playHoloSound('pulse');
    this.targetRotation.y += Math.PI * 0.4;
    this.latestJarvisMessage.set('Harmonic pulse dispatched through core electromagnetic lattice.');
  }

  focusAgent(agent: AgentNode): void {
    this.selectedAgent.set(agent);
    this.playHoloSound('beep');
    this.latestJarvisMessage.set(
      `Tracking sub-agent [${agent.codename}] ${agent.name}. Directive ready.`
    );
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

  // --- 60 FPS ANIMATION LOOP ---
  private startAnimationLoop(): void {
    this.ngZone.runOutsideAngular(() => {
      const clock = new THREE.Clock();

      const animate = () => {
        if (!this.isRunning) return;

        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

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

        // 7. Multi-Agent Eruption & Inter-Agent Synaptic Trajectory Mesh
        const isDeployed = this.isSwarmDeployed();
        const agentPositions: THREE.Vector3[] = [];

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
          agentPositions.push(new THREE.Vector3(posX, posY, posZ));

          // Orbit micro quantum particle halo around each agent
          if (data.haloCloud) {
            data.haloCloud.rotation.y += 0.01;
            data.haloCloud.rotation.x += 0.008;
          }

          // Update tether laser beam linking agent back to singularity
          if (data.beam && data.beam.geometry) {
            const positions = new Float32Array([0, 0, 0, posX, posY, posZ]);
            data.beam.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            (data.beam.material as THREE.LineBasicMaterial).opacity = isDeployed ? data.currentScale * 0.45 : 0;
          }
        });

        // 8. Dynamically re-link Inter-Agent Synaptic Laser Mesh
        if (this.interAgentMeshLines && agentPositions.length >= 2) {
          const linePos: number[] = [];
          const numAgents = agentPositions.length;

          for (let i = 0; i < numAgents; i++) {
            const next = (i + 1) % numAgents;
            const cross = (i + 2) % numAgents;

            // Perimeter line
            linePos.push(agentPositions[i].x, agentPositions[i].y, agentPositions[i].z);
            linePos.push(agentPositions[next].x, agentPositions[next].y, agentPositions[next].z);

            // Cross-synapse line for polyhedral neural mesh
            linePos.push(agentPositions[i].x, agentPositions[i].y, agentPositions[i].z);
            linePos.push(agentPositions[cross].x, agentPositions[cross].y, agentPositions[cross].z);
          }

          const posArray = new Float32Array(linePos);
          this.interAgentMeshLines.geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
          this.interAgentMeshLines.geometry.attributes['position'].needsUpdate = true;

          const pulseOpacity = (0.2 + Math.sin(time * 3.5) * 0.1) * (isDeployed ? 1 : 0);
          (this.interAgentMeshLines.material as THREE.LineBasicMaterial).opacity = pulseOpacity;
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

    if (this.camera) {
      if (mode === 'NETWORK') {
        this.camera.position.set(0, 0, 22);
      } else if (mode === 'INTELLIGENCE') {
        this.camera.position.set(0, 0, 18);
      } else if (mode === 'BUSINESS') {
        this.camera.position.set(0, 1.2, 24);
      } else {
        this.camera.position.set(0, 1.2, 19.0);
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
    this.agentMeshMap.clear();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
  }
}
