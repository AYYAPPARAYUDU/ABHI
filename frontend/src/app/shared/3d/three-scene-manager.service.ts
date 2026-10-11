// ThreeSceneManagerService — Cybernetic Holographic Arc Reactor & HUD Compass 3D Core.
// Inspired by Iron Man Arc Reactor / Advanced Military Cyberpunk HUD Dial Telemetry.
// Zero sphere/globe models — Pure concentric mechanical dials, tactical azimuth ticks, radar sweep & laser optics.

import { Injectable, NgZone, inject, effect } from '@angular/core';
import * as THREE from 'three';
import { SpatialEnvironmentMode } from '../../core/models/agent-experience.model';
import { ThemeService, AbhiThemeColors } from '../../core/services/theme.service';

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
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private animationFrameId: number | null = null;

  // 3D Visual Objects: Arc Reactor & Cybernetic HUD Dial
  private hudDialGroup: THREE.Group | null = null;
  private hudCenterIris: THREE.Mesh | null = null;
  private hudIrisCore: THREE.Mesh | null = null;
  private hudCrosshairLines: THREE.LineSegments | null = null;
  private hudSegmentedRing1: THREE.Group | null = null;
  private hudSegmentedRing2: THREE.Group | null = null;
  private hudSegmentedRing3: THREE.Group | null = null;
  private hudAzimuthTicks: THREE.LineSegments | null = null;
  private hudRadarSweeper: THREE.Line | null = null;
  private hudOuterRing: THREE.Mesh | null = null;
  private hudBracketGroup: THREE.Group | null = null;

  // Backward-compatible handles for public references & theme updates
  orbitalCore: THREE.Mesh | THREE.Group | null = null;
  private innerNucleus: THREE.Mesh | null = null;
  private innerOctahedron: THREE.Mesh | null = null;
  private coreAura: THREE.Mesh | null = null;
  private outerRing: THREE.Mesh | null = null;
  private secondaryRing: THREE.Mesh | null = null;
  private equatorialRing: THREE.Mesh | null = null;
  private horizonRing: THREE.Mesh | null = null;

  // Swirling Particle Accretion Vortex
  private particleSystem: THREE.Points | null = null;
  private particleCount = 1400;
  private particleAngles: Float32Array | null = null;
  private particleRadii: Float32Array | null = null;
  private particleSpeeds: Float32Array | null = null;
  private particleHeights: Float32Array | null = null;
  private particleTexture: THREE.Texture | null = null;

  // Expanding Shockwaves & Satellites
  private shockwaveMeshes: { mesh: THREE.Mesh; phase: number; speed: number }[] = [];
  private agentNodes: AgentSatelliteNode[] = [];
  private gridPlane: THREE.GridHelper | null = null;
  private networkNodeGroup: THREE.Group | null = null;
  private sectorGroup: THREE.Group | null = null;
  private neuralSynapseLines: THREE.LineSegments | null = null;

  // Lighting
  private ambientLight: THREE.AmbientLight | null = null;
  private pointLight1: THREE.PointLight | null = null;
  private pointLight2: THREE.PointLight | null = null;

  // State
  private isRunning = false;
  private isReducedMotion = false;
  private isWebGLAvailable = true;
  private currentMode: SpatialEnvironmentMode = 'DEFAULT';
  private energyState: 'IDLE' | 'LISTENING' | 'EXECUTING' | 'VERIFIED' | 'ERROR' = 'IDLE';

  // Parallax pointer tracking
  private targetCameraX = 0;
  private targetCameraY = 0;
  private currentCameraX = 0;
  private currentCameraY = 0;

  constructor(private ngZone: NgZone) {
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

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = -(e.clientY / window.innerHeight) * 2 + 1;
        this.targetCameraX = x * 1.6;
        this.targetCameraY = y * 1.0;
      });

      window.addEventListener('resize', () => {
        if (this.camera && this.renderer) {
          const w = window.innerWidth;
          const h = window.innerHeight;
          this.onResize(w, h);
        }
      });
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pause();
        } else if (this.isRunning) {
          this.resume();
        }
      });
    }

    // Reactively update 3D spatial palette when theme changes
    effect(() => {
      const theme = this.themeService.activeTheme();
      if (theme && this.scene) {
        this.updateThemeColors(theme.colors);
      }
    });
  }

  /**
   * Helper to generate a soft glowing circular particle texture.
   */
  private createParticleTexture(): THREE.Texture | null {
    if (typeof document === 'undefined') return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gradient.addColorStop(0.25, 'rgba(56, 217, 255, 0.95)');
      gradient.addColorStop(0.6, 'rgba(57, 123, 255, 0.5)');
      gradient.addColorStop(1, 'rgba(5, 8, 17, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    } catch {
      return null;
    }
  }

  /**
   * Initialize Three.js scene onto target canvas element.
   */
  init(canvas: HTMLCanvasElement): boolean {
    try {
      this.pause();
      this.isRunning = false;

      const width = canvas.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1280);
      const height = canvas.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 800);

      // 1. Scene & Camera (Positioned for crisp holographic HUD perspective)
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1000);
      this.camera.position.set(0, 0, 12.0);

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

      // 3. Create Particle Texture
      this.particleTexture = this.createParticleTexture();

      // 4. Create Cybernetic Arc Reactor & HUD Elements
      this.createParticleField();
      this.createArcReactorCore();
      this.createAgentSatelliteNodes();
      this.createNetworkGraphVisuals();
      this.createBusinessSectorVisuals();

      // 5. Atmospheric Lighting
      this.ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
      this.scene.add(this.ambientLight);

      this.pointLight1 = new THREE.PointLight(0x00f0ff, 6.5, 140);
      this.pointLight1.position.set(4, 4, 10);
      this.scene.add(this.pointLight1);

      this.pointLight2 = new THREE.PointLight(0xffaa00, 5.0, 120);
      this.pointLight2.position.set(-5, -4, 8);
      this.scene.add(this.pointLight2);

      // Apply initial theme colors immediately
      const currentTheme = this.themeService.activeTheme();
      if (currentTheme) {
        this.updateThemeColors(currentTheme.colors);
      }

      this.isRunning = true;
      this.isWebGLAvailable = true;
      this.startAnimationLoop();
      return true;
    } catch (err) {
      console.error('ThreeSceneManagerService WebGL initialization failed:', err);
      this.isWebGLAvailable = false;
      return false;
    }
  }

  /**
   * 1. Dynamic Accretion Vortex Particle Nebula
   */
  private createParticleField(): void {
    if (!this.scene) return;

    const count = this.isReducedMotion ? 400 : 1400;
    this.particleCount = count;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    this.particleAngles = new Float32Array(count);
    this.particleRadii = new Float32Array(count);
    this.particleSpeeds = new Float32Array(count);
    this.particleHeights = new Float32Array(count);

    const cCyan = new THREE.Color(0x00f0ff);
    const cAmber = new THREE.Color(0xffaa00);
    const cBlue = new THREE.Color(0x3b82f6);
    const cWhite = new THREE.Color(0xffffff);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const r = 2.4 + Math.pow(Math.random(), 1.7) * 24.0;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * (10.0 * (r / 20.0) + 2.5);
      const speed = (0.015 + Math.random() * 0.05) * (14.0 / (r + 4.0));

      this.particleRadii[i] = r;
      this.particleAngles[i] = angle;
      this.particleHeights[i] = height;
      this.particleSpeeds[i] = speed;

      positions[idx] = Math.cos(angle) * r;
      positions[idx + 1] = height;
      positions[idx + 2] = Math.sin(angle) * r;

      const rand = Math.random();
      let mixedColor = cCyan.clone();
      if (rand < 0.35) {
        mixedColor = cCyan.clone().lerp(cWhite, Math.random() * 0.8);
      } else if (rand < 0.70) {
        mixedColor = cCyan.clone().lerp(cAmber, Math.random() * 0.9);
      } else {
        mixedColor = cBlue.clone().lerp(cCyan, Math.random());
      }

      colors[idx] = mixedColor.r;
      colors[idx + 1] = mixedColor.g;
      colors[idx + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const materialConfig: THREE.PointsMaterialParameters = {
      size: 0.44,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    };

    if (this.particleTexture) {
      materialConfig.map = this.particleTexture;
    }

    const material = new THREE.PointsMaterial(materialConfig);
    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);

    // Neural Synapse Background Interconnect Lines
    const synapseLineCount = this.isReducedMotion ? 50 : 160;
    const synapsePoints: THREE.Vector3[] = [];
    for (let i = 0; i < synapseLineCount; i++) {
      const p1 = new THREE.Vector3(
        (Math.random() - 0.5) * 24,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 14
      );
      const p2 = new THREE.Vector3(
        p1.x + (Math.random() - 0.5) * 5.5,
        p1.y + (Math.random() - 0.5) * 5.5,
        p1.z + (Math.random() - 0.5) * 5.5
      );
      synapsePoints.push(p1, p2);
    }
    const synapseGeo = new THREE.BufferGeometry().setFromPoints(synapsePoints);
    const synapseMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    });
    this.neuralSynapseLines = new THREE.LineSegments(synapseGeo, synapseMat);
    this.scene.add(this.neuralSynapseLines);
  }

  /**
   * 2. Holographic Arc Reactor & Cybernetic HUD Dial Core (Zero Spheres/Globes!)
   * Matches Reference Images 1 & 2: Concentric mechanical calibration dials, azimuth ticks,
   * tactical reticle crosshairs & 360° radar sweep beam.
   */
  private createArcReactorCore(): void {
    if (!this.scene) return;

    this.hudDialGroup = new THREE.Group();
    // Slight forward angle tilt for high-end cinematic 3D perspective
    this.hudDialGroup.rotation.x = 0.22;
    this.hudDialGroup.position.set(0, 0, 0);

    // A. Center Quantum Iris Plasma Lens (Planar Glowing Disc)
    const irisGeo = new THREE.RingGeometry(0.08, 0.72, 64);
    const irisMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.hudCenterIris = new THREE.Mesh(irisGeo, irisMat);
    this.hudDialGroup.add(this.hudCenterIris);

    // Center Singularity White Hot Dot
    const dotGeo = new THREE.CircleGeometry(0.18, 32);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });
    this.hudIrisCore = new THREE.Mesh(dotGeo, dotMat);
    this.hudIrisCore.position.z = 0.02;
    this.hudDialGroup.add(this.hudIrisCore);

    // B. Tactical Reticle Crosshairs with Ticks
    const chPoints: THREE.Vector3[] = [];
    // Horizontal crosshair with gap at center
    chPoints.push(new THREE.Vector3(-4.8, 0, 0.03), new THREE.Vector3(-0.9, 0, 0.03));
    chPoints.push(new THREE.Vector3(0.9, 0, 0.03), new THREE.Vector3(4.8, 0, 0.03));
    // Vertical crosshair with gap at center
    chPoints.push(new THREE.Vector3(0, -4.8, 0.03), new THREE.Vector3(0, -0.9, 0.03));
    chPoints.push(new THREE.Vector3(0, 0.9, 0.03), new THREE.Vector3(0, 4.8, 0.03));

    // Cardinal tick markers along crosshairs
    const tickOffsets = [1.5, 2.2, 3.0, 3.8, 4.4];
    tickOffsets.forEach((off) => {
      chPoints.push(new THREE.Vector3(off, -0.15, 0.03), new THREE.Vector3(off, 0.15, 0.03));
      chPoints.push(new THREE.Vector3(-off, -0.15, 0.03), new THREE.Vector3(-off, 0.15, 0.03));
      chPoints.push(new THREE.Vector3(-0.15, off, 0.03), new THREE.Vector3(0.15, off, 0.03));
      chPoints.push(new THREE.Vector3(-0.15, -off, 0.03), new THREE.Vector3(0.15, -off, 0.03));
    });

    const chGeo = new THREE.BufferGeometry().setFromPoints(chPoints);
    const chMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    this.hudCrosshairLines = new THREE.LineSegments(chGeo, chMat);
    this.hudDialGroup.add(this.hudCrosshairLines);

    // C. Segmented Dial Ring 1: Inner Mechanical Gear Arcs (Radius 1.35 to 1.65)
    this.hudSegmentedRing1 = new THREE.Group();
    const seg1Mat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const numArcs1 = 3;
    const arcLen1 = (Math.PI * 2 * 0.26);
    for (let i = 0; i < numArcs1; i++) {
      const startAngle = i * ((Math.PI * 2) / numArcs1);
      const arcGeo = new THREE.RingGeometry(1.35, 1.58, 48, 1, startAngle, arcLen1);
      const arcMesh = new THREE.Mesh(arcGeo, seg1Mat);
      arcMesh.position.z = 0.04;
      this.hudSegmentedRing1.add(arcMesh);
    }
    this.hudDialGroup.add(this.hudSegmentedRing1);

    // D. Segmented Dial Ring 2: Counter-Rotating Amber/Gold Gear Arcs (Radius 2.15 to 2.45)
    this.hudSegmentedRing2 = new THREE.Group();
    const seg2Mat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const numArcs2 = 4;
    const arcLen2 = (Math.PI * 2 * 0.18);
    for (let i = 0; i < numArcs2; i++) {
      const startAngle = i * ((Math.PI * 2) / numArcs2) + 0.15;
      const arcGeo = new THREE.RingGeometry(2.15, 2.42, 48, 1, startAngle, arcLen2);
      const arcMesh = new THREE.Mesh(arcGeo, seg2Mat);
      arcMesh.position.z = 0.06;
      this.hudSegmentedRing2.add(arcMesh);
    }
    this.hudDialGroup.add(this.hudSegmentedRing2);

    // E. 360° Azimuth Compass Radial Tick Marks (Radius 2.75 to 3.05)
    const tickPoints: THREE.Vector3[] = [];
    const totalTicks = 72;
    for (let i = 0; i < totalTicks; i++) {
      const angle = (i / totalTicks) * Math.PI * 2;
      const isMajor = i % 6 === 0;
      const rInner = 2.75;
      const rOuter = isMajor ? 3.08 : 2.92;
      tickPoints.push(
        new THREE.Vector3(Math.cos(angle) * rInner, Math.sin(angle) * rInner, 0.05),
        new THREE.Vector3(Math.cos(angle) * rOuter, Math.sin(angle) * rOuter, 0.05)
      );
    }
    const ticksGeo = new THREE.BufferGeometry().setFromPoints(tickPoints);
    const ticksMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    this.hudAzimuthTicks = new THREE.LineSegments(ticksGeo, ticksMat);
    this.hudDialGroup.add(this.hudAzimuthTicks);

    // F. Segmented Dial Ring 3: Outer Precision Calibrated Arcs (Radius 3.35 to 3.65)
    this.hudSegmentedRing3 = new THREE.Group();
    const seg3Mat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const numArcs3 = 6;
    const arcLen3 = (Math.PI * 2 * 0.12);
    for (let i = 0; i < numArcs3; i++) {
      const startAngle = i * ((Math.PI * 2) / numArcs3);
      const arcGeo = new THREE.RingGeometry(3.35, 3.62, 48, 1, startAngle, arcLen3);
      const arcMesh = new THREE.Mesh(arcGeo, seg3Mat);
      arcMesh.position.z = 0.08;
      this.hudSegmentedRing3.add(arcMesh);
    }
    this.hudDialGroup.add(this.hudSegmentedRing3);

    // G. Outer Continuous Telemetry Boundary Ring (Radius 4.35 to 4.50)
    const outerGeo = new THREE.RingGeometry(4.35, 4.48, 96);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.hudOuterRing = new THREE.Mesh(outerGeo, outerMat);
    this.hudOuterRing.position.z = 0.05;
    this.hudDialGroup.add(this.hudOuterRing);

    // H. Tactical Corner Alignment Brackets (At Radius 4.9)
    this.hudBracketGroup = new THREE.Group();
    const bracketMat = new THREE.LineBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const bracketAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
    bracketAngles.forEach((bAngle) => {
      const bx = Math.cos(bAngle) * 4.9;
      const by = Math.sin(bAngle) * 4.9;
      const bPoints = [
        new THREE.Vector3(bx - 0.35, by, 0.1),
        new THREE.Vector3(bx, by, 0.1),
        new THREE.Vector3(bx, by, 0.1),
        new THREE.Vector3(bx, by - 0.35, 0.1),
      ];
      const bGeo = new THREE.BufferGeometry().setFromPoints(bPoints);
      const bMesh = new THREE.LineSegments(bGeo, bracketMat);
      this.hudBracketGroup?.add(bMesh);
    });
    this.hudDialGroup.add(this.hudBracketGroup);

    // I. Rotating 360° Radar Scanner Beam
    const radarPoints = [
      new THREE.Vector3(0, 0, 0.12),
      new THREE.Vector3(4.5, 0, 0.12),
    ];
    const radarGeo = new THREE.BufferGeometry().setFromPoints(radarPoints);
    const radarMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    this.hudRadarSweeper = new THREE.Line(radarGeo, radarMat);
    this.hudDialGroup.add(this.hudRadarSweeper);

    // Add Main Arc Reactor Dial Group to Scene
    this.scene.add(this.hudDialGroup);

    // Assign to orbitalCore for compatibility with external references
    this.orbitalCore = this.hudDialGroup;

    // J. Expanding Shockwave Energy Rings
    this.shockwaveMeshes = [];
    for (let i = 0; i < 3; i++) {
      const sGeo = new THREE.RingGeometry(1.6, 1.85, 64);
      const sMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.65,
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

    // K. Atmospheric Ground Grid Plane
    this.gridPlane = new THREE.GridHelper(52, 26, 0x1a2e50, 0x091222);
    this.gridPlane.position.y = -5.8;
    this.scene.add(this.gridPlane);
  }

  /**
   * 3. Specialist Agent 3D Satellite Nodes Orbiting the Arc Reactor Core
   */
  private createAgentSatelliteNodes(): void {
    if (!this.scene) return;

    const agentConfigs = [
      { name: 'Supervisor', angle: 0, speed: 0.28, radius: 5.6, height: 1.2, colorHex: 0x00f0ff },
      { name: 'Vision', angle: Math.PI / 4, speed: 0.22, radius: 6.2, height: -1.4, colorHex: 0x3b82f6 },
      { name: 'Desktop', angle: Math.PI / 2, speed: 0.26, radius: 5.4, height: 2.1, colorHex: 0x10b981 },
      { name: 'Browser', angle: (3 * Math.PI) / 4, speed: 0.24, radius: 6.6, height: -0.8, colorHex: 0xffaa00 },
      { name: 'Coder', angle: Math.PI, speed: 0.30, radius: 5.8, height: 1.6, colorHex: 0xa855f7 },
      { name: 'Terminal', angle: (5 * Math.PI) / 4, speed: 0.25, radius: 6.4, height: -1.9, colorHex: 0xec4899 },
      { name: 'Memory', angle: (6 * Math.PI) / 4, speed: 0.27, radius: 5.5, height: 0.5, colorHex: 0x14b8a6 },
      { name: 'Safety', angle: (7 * Math.PI) / 4, speed: 0.23, radius: 6.8, height: -1.1, colorHex: 0xff5b71 },
    ];

    this.agentNodes = [];

    agentConfigs.forEach((cfg) => {
      const group = new THREE.Group();

      // Mini Orbiting Satellite Orb
      const orbGeo = new THREE.SphereGeometry(0.24, 16, 16);
      const orbMat = new THREE.MeshBasicMaterial({ color: cfg.colorHex, blending: THREE.AdditiveBlending });
      const orbMesh = new THREE.Mesh(orbGeo, orbMat);
      group.add(orbMesh);

      // Surrounding Octahedron Tactical Wireframe Cage
      const cageGeo = new THREE.OctahedronGeometry(0.42, 0);
      const cageMat = new THREE.MeshBasicMaterial({ color: cfg.colorHex, wireframe: true, transparent: true, opacity: 0.75 });
      const cageMesh = new THREE.Mesh(cageGeo, cageMat);
      group.add(cageMesh);

      this.scene?.add(group);

      // Laser Conduit Line connecting to core origin
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(cfg.radius, cfg.height, 0),
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: cfg.colorHex,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
      });
      const conduit = new THREE.Line(lineGeo, lineMat);
      this.scene?.add(conduit);

      // Traveling Action Potential Spark Mesh
      const sparkGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff, blending: THREE.AdditiveBlending });
      const spark = new THREE.Mesh(sparkGeo, sparkMat);
      this.scene?.add(spark);

      this.agentNodes.push({
        group,
        conduit,
        spark,
        baseAngle: cfg.angle,
        speed: cfg.speed,
        radius: cfg.radius,
        height: cfg.height,
        colorHex: cfg.colorHex,
        name: cfg.name,
      });
    });
  }

  private createNetworkGraphVisuals(): void {
    if (!this.scene) return;

    this.networkNodeGroup = new THREE.Group();
    this.networkNodeGroup.visible = false;

    const agentPositions = [
      { pos: [-4.5, 2.5, 1.5], color: 0x00f0ff },
      { pos: [-4.0, -2.5, -1.5], color: 0x3b82f6 },
      { pos: [4.5, 2.5, -1.0], color: 0x10b981 },
      { pos: [5.0, -1.5, 2.0], color: 0xffaa00 },
      { pos: [2.5, -4.0, -2.0], color: 0x00f0ff },
      { pos: [-2.0, 4.5, -3.0], color: 0xa855f7 },
      { pos: [0.0, -4.5, 3.0], color: 0xec4899 },
      { pos: [2.0, 4.0, 3.0], color: 0x14b8a6 },
    ];

    const linePoints: THREE.Vector3[] = [];
    const supervisorPos = new THREE.Vector3(0, 0, 0);

    agentPositions.forEach(({ pos, color }) => {
      const geo = new THREE.SphereGeometry(0.4, 16, 16);
      const mat = new THREE.MeshBasicMaterial({ color, wireframe: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      this.networkNodeGroup?.add(mesh);

      linePoints.push(supervisorPos);
      linePoints.push(new THREE.Vector3(pos[0], pos[1], pos[2]));
    });

    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    this.networkNodeGroup.add(lines);

    this.scene.add(this.networkNodeGroup);
  }

  private createBusinessSectorVisuals(): void {
    if (!this.scene) return;

    this.sectorGroup = new THREE.Group();
    this.sectorGroup.visible = false;

    const sectorPositions = [
      { pos: [-8.0, 2.0, -4.0], color: 0x00f0ff },
      { pos: [-4.0, -1.5, 4.0], color: 0x3b82f6 },
      { pos: [0.0, 4.0, -6.0], color: 0xa855f7 },
      { pos: [4.0, -2.5, 3.0], color: 0x10b981 },
      { pos: [7.5, 1.5, -4.0], color: 0xffaa00 },
    ];

    sectorPositions.forEach(({ pos, color }) => {
      const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
      const mat = new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.65,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      this.sectorGroup?.add(mesh);
    });

    this.scene.add(this.sectorGroup);
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
        this.camera.position.set(0, 0, 15);
      } else if (mode === 'INTELLIGENCE') {
        this.camera.position.set(0, 0, 13);
      } else if (mode === 'BUSINESS') {
        this.camera.position.set(0, 1.2, 17);
      } else {
        this.camera.position.set(0, 0, 12.0);
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

  /**
   * Synchronize colors of Arc Reactor & HUD Dial with the active theme.
   */
  updateThemeColors(colors: AbhiThemeColors): void {
    if (!this.scene) return;
    try {
      const isLight = colors.background.startsWith('#f') || colors.background.startsWith('#e') || colors.background === '#ffffff';

      if (this.ambientLight) {
        this.ambientLight.intensity = isLight ? 2.8 : 1.8;
        this.ambientLight.color.set(isLight ? 0xffffff : 0xe2e8f0);
      }

      if (this.pointLight1) {
        this.pointLight1.color.set(colors.accentPrimary);
      }

      if (this.pointLight2) {
        this.pointLight2.color.set(colors.accentSecondary);
      }

      if (this.hudCenterIris && this.hudCenterIris.material instanceof THREE.MeshBasicMaterial) {
        this.hudCenterIris.material.color.set(colors.accentPrimary);
      }

      if (this.hudCrosshairLines && this.hudCrosshairLines.material instanceof THREE.LineBasicMaterial) {
        this.hudCrosshairLines.material.color.set(colors.accentPrimary);
      }

      if (this.hudAzimuthTicks && this.hudAzimuthTicks.material instanceof THREE.LineBasicMaterial) {
        this.hudAzimuthTicks.material.color.set(colors.accentPrimary);
      }

      if (this.hudOuterRing && this.hudOuterRing.material instanceof THREE.MeshBasicMaterial) {
        this.hudOuterRing.material.color.set(colors.coreGlow);
      }

      this.shockwaveMeshes.forEach(({ mesh }) => {
        if (mesh.material instanceof THREE.MeshBasicMaterial) {
          mesh.material.color.set(colors.accentPrimary);
        }
      });

      if (this.gridPlane) {
        const gridColor1 = isLight ? 0x94a3b8 : 0x1a2e50;
        const gridColor2 = isLight ? 0xcfd8dc : 0x091222;
        if (Array.isArray(this.gridPlane.material)) {
          this.gridPlane.material[0].color.setHex(gridColor1);
          this.gridPlane.material[1].color.setHex(gridColor2);
        } else if (this.gridPlane.material instanceof THREE.LineBasicMaterial) {
          this.gridPlane.material.color.setHex(gridColor1);
        }
      }
    } catch (err) {
      console.warn('ThreeSceneManagerService updateThemeColors error:', err);
    }
  }

  private startAnimationLoop(): void {
    this.ngZone.runOutsideAngular(() => {
      const clock = new THREE.Clock();

      const animate = () => {
        if (!this.isRunning) return;

        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        // Energy speed multiplier
        let energyMultiplier = 1.0;
        if (this.energyState === 'LISTENING') energyMultiplier = 1.7;
        if (this.energyState === 'EXECUTING') energyMultiplier = 2.5;
        if (this.energyState === 'VERIFIED') energyMultiplier = 1.3;

        if (!this.isReducedMotion) {
          // Camera parallax smoothing
          if (this.camera) {
            this.currentCameraX += (this.targetCameraX - this.currentCameraX) * 0.05;
            this.currentCameraY += (this.targetCameraY - this.currentCameraY) * 0.05;
            this.camera.position.x = this.currentCameraX;
            this.camera.position.y = this.currentCameraY;
            this.camera.lookAt(0, 0, 0);
          }

          // 1. Arc Reactor Iris & Core Pulse
          if (this.hudCenterIris) {
            const irisScale = 1.0 + Math.sin(elapsedTime * (3.0 * energyMultiplier)) * 0.08;
            this.hudCenterIris.scale.set(irisScale, irisScale, 1.0);
          }

          if (this.hudIrisCore) {
            const coreScale = 1.0 + Math.cos(elapsedTime * (4.2 * energyMultiplier)) * 0.15;
            this.hudIrisCore.scale.set(coreScale, coreScale, 1.0);
          }

          // 2. Concentric Mechanical Gear Arcs Rotation
          if (this.hudSegmentedRing1) {
            this.hudSegmentedRing1.rotation.z = elapsedTime * (0.35 * energyMultiplier);
          }

          if (this.hudSegmentedRing2) {
            // Counter-rotating gear arc
            this.hudSegmentedRing2.rotation.z = -elapsedTime * (0.48 * energyMultiplier);
          }

          if (this.hudSegmentedRing3) {
            this.hudSegmentedRing3.rotation.z = elapsedTime * (0.22 * energyMultiplier);
          }

          // 3. Azimuth Compass Ticks & Subtle 3D Gyro Wobble
          if (this.hudAzimuthTicks) {
            this.hudAzimuthTicks.rotation.z = -elapsedTime * (0.12 * energyMultiplier);
          }

          if (this.hudDialGroup) {
            // Subtle tactical gyroscopic pitch & yaw drift
            this.hudDialGroup.rotation.y = Math.sin(elapsedTime * 0.4) * 0.12;
            this.hudDialGroup.rotation.x = 0.22 + Math.cos(elapsedTime * 0.3) * 0.08;
          }

          // 4. Rotating 360° Radar Scanner Beam
          if (this.hudRadarSweeper) {
            this.hudRadarSweeper.rotation.z = -elapsedTime * (1.2 * energyMultiplier);
          }

          // 5. Dynamic Accretion Vortex Particles
          if (this.particleSystem && this.particleAngles && this.particleRadii && this.particleHeights && this.particleSpeeds) {
            const posAttr = this.particleSystem.geometry.getAttribute('position') as THREE.BufferAttribute;
            const positions = posAttr.array as Float32Array;

            for (let i = 0; i < this.particleCount; i++) {
              const idx = i * 3;
              this.particleAngles[i] += this.particleSpeeds[i] * delta * energyMultiplier;
              const angle = this.particleAngles[i];
              const r = this.particleRadii[i];

              positions[idx] = Math.cos(angle) * r;
              positions[idx + 1] = this.particleHeights[i] + Math.sin(angle * 2.2 + elapsedTime * 1.5) * 0.35;
              positions[idx + 2] = Math.sin(angle) * r;
            }
            posAttr.needsUpdate = true;
          }

          // 6. Expanding Shockwave Ripple Waves
          this.shockwaveMeshes.forEach((item) => {
            item.phase = (item.phase + delta * item.speed * energyMultiplier) % 1.0;
            const radius = 1.6 + item.phase * 9.5;
            item.mesh.scale.set(radius, radius, radius);
            const mat = item.mesh.material as THREE.MeshBasicMaterial;
            mat.opacity = Math.max(0, (1.0 - item.phase) * 0.65);
          });

          // 7. Specialist Agent Satellite Nodes Orbiting in 3D
          this.agentNodes.forEach((node, i) => {
            const currentAngle = node.baseAngle + elapsedTime * (node.speed * energyMultiplier);
            const x = Math.cos(currentAngle) * node.radius;
            const z = Math.sin(currentAngle) * node.radius;
            const y = node.height + Math.sin(elapsedTime * 1.6 + i) * 0.4;

            node.group.position.set(x, y, z);
            node.group.rotation.y = elapsedTime * 0.8;
            node.group.rotation.x = elapsedTime * 0.5;

            // Update Laser Conduit Line Points
            const lineAttr = node.conduit.geometry.getAttribute('position') as THREE.BufferAttribute;
            lineAttr.setXYZ(1, x, y, z);
            lineAttr.needsUpdate = true;

            // Traveling Action Potential Spark Position
            const sparkPhase = (elapsedTime * (0.8 + i * 0.1) * energyMultiplier) % 1.0;
            node.spark.position.set(x * sparkPhase, y * sparkPhase, z * sparkPhase);
          });
        }

        if (this.renderer && this.scene && this.camera) {
          this.renderer.render(this.scene, this.camera);
        }

        this.animationFrameId = requestAnimationFrame(animate);
      };

      this.animationFrameId = requestAnimationFrame(animate);
    });
  }

  pause(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resume(): void {
    if (!this.animationFrameId && this.isRunning) {
      this.startAnimationLoop();
    }
  }

  cleanup(): void {
    this.pause();
    this.isRunning = false;

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      this.scene.clear();
      this.scene = null;
    }

    if (this.particleTexture) {
      this.particleTexture.dispose();
      this.particleTexture = null;
    }

    this.agentNodes = [];
    this.shockwaveMeshes = [];
    this.hudDialGroup = null;
    this.orbitalCore = null;
  }
}
