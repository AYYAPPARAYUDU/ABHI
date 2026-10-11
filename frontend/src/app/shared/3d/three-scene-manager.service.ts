// ThreeSceneManagerService — Next-Level Quantum AI 3D Core Engine.

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

  // 3D Visual Objects
  private particleSystem: THREE.Points | null = null;
  private orbitalCore: THREE.Mesh | null = null;
  private innerOctahedron: THREE.Mesh | null = null;
  private innerNucleus: THREE.Mesh | null = null;
  private coreAura: THREE.Mesh | null = null;
  private outerRing: THREE.Mesh | null = null;
  private secondaryRing: THREE.Mesh | null = null;
  private equatorialRing: THREE.Mesh | null = null;
  private horizonRing: THREE.Mesh | null = null;
  private shockwaveMeshes: { mesh: THREE.Mesh; phase: number; speed: number }[] = [];
  private ringSatellites: THREE.Mesh[] = [];
  private agentNodes: AgentSatelliteNode[] = [];
  private gridPlane: THREE.GridHelper | null = null;
  private networkNodeGroup: THREE.Group | null = null;
  private sectorGroup: THREE.Group | null = null;
  private neuralSynapseLines: THREE.LineSegments | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private pointLight1: THREE.PointLight | null = null;
  private pointLight2: THREE.PointLight | null = null;
  private particleTexture: THREE.Texture | null = null;

  // Swirling Particle Vortex Coordinates
  private particleCount = 1400;
  private particleAngles: Float32Array | null = null;
  private particleRadii: Float32Array | null = null;
  private particleSpeeds: Float32Array | null = null;
  private particleHeights: Float32Array | null = null;

  // State
  private isRunning = false;
  private isReducedMotion = false;
  private isWebGLAvailable = true;
  private currentMode: SpatialEnvironmentMode = 'DEFAULT';
  private energyState: 'IDLE' | 'LISTENING' | 'EXECUTING' | 'VERIFIED' | 'ERROR' = 'IDLE';

  // Parallax pointer tracking
  private targetCameraX = 0;
  private targetCameraY = 0;

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
        this.targetCameraX = x * 1.8;
        this.targetCameraY = y * 1.2;
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
   * Initialize Three.js scene onto a target canvas element.
   */
  init(canvas: HTMLCanvasElement): boolean {
    try {
      this.pause();
      this.isRunning = false;

      const width = canvas.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 1280);
      const height = canvas.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 800);

      // 1. Scene & Camera
      this.scene = new THREE.Scene();

      this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
      this.camera.position.set(0, 0, 13.0);

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

      // 4. Create Spatial Visual Layers
      this.createParticleField();
      this.createOrbitalCore();
      this.createAgentSatelliteNodes();
      this.createNetworkGraphVisuals();
      this.createBusinessSectorVisuals();

      // 5. Atmospheric Lighting
      this.ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
      this.scene.add(this.ambientLight);

      this.pointLight1 = new THREE.PointLight(0x00f0ff, 6.0, 120);
      this.pointLight1.position.set(6, 6, 12);
      this.scene.add(this.pointLight1);

      this.pointLight2 = new THREE.PointLight(0x3b82f6, 5.0, 100);
      this.pointLight2.position.set(-7, -5, 9);
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
    const cBlue = new THREE.Color(0x3b82f6);
    const cAmethyst = new THREE.Color(0xc084fc);
    const cWhite = new THREE.Color(0xffffff);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Exponential distribution towards core with outer celestial halo
      const r = 2.2 + Math.pow(Math.random(), 1.6) * 26.0;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * (14.0 * (r / 20.0) + 3.0);
      const speed = (0.02 + Math.random() * 0.06) * (15.0 / (r + 4.0));

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
        mixedColor = cCyan.clone().lerp(cWhite, Math.random() * 0.7);
      } else if (rand < 0.75) {
        mixedColor = cCyan.clone().lerp(cBlue, Math.random());
      } else {
        mixedColor = cBlue.clone().lerp(cAmethyst, Math.random());
      }

      colors[idx] = mixedColor.r;
      colors[idx + 1] = mixedColor.g;
      colors[idx + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const materialConfig: THREE.PointsMaterialParameters = {
      size: 0.46,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    };

    if (this.particleTexture) {
      materialConfig.map = this.particleTexture;
    }

    const material = new THREE.PointsMaterial(materialConfig);
    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);

    // Neural Synapse Interconnects in deep background
    const synapseLineCount = this.isReducedMotion ? 60 : 200;
    const synapsePoints: THREE.Vector3[] = [];
    for (let i = 0; i < synapseLineCount; i++) {
      const p1 = new THREE.Vector3(
        (Math.random() - 0.5) * 26,
        (Math.random() - 0.5) * 18,
        (Math.random() - 0.5) * 16
      );
      const p2 = new THREE.Vector3(
        p1.x + (Math.random() - 0.5) * 6.5,
        p1.y + (Math.random() - 0.5) * 6.5,
        p1.z + (Math.random() - 0.5) * 6.5
      );
      synapsePoints.push(p1, p2);
    }
    const synapseGeo = new THREE.BufferGeometry().setFromPoints(synapsePoints);
    const synapseMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
    });
    this.neuralSynapseLines = new THREE.LineSegments(synapseGeo, synapseMat);
    this.scene.add(this.neuralSynapseLines);
  }

  /**
   * 2. Hyper-Dimensional Quantum Core with Dyson Gimbal Rings & Shockwaves
   */
  private createOrbitalCore(): void {
    if (!this.scene) return;

    // A. Singularity Pulsar Nucleus Sphere (High energy glow)
    const nucGeo = new THREE.SphereGeometry(1.25, 32, 32);
    const nucMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.98,
    });
    this.innerNucleus = new THREE.Mesh(nucGeo, nucMat);
    this.innerNucleus.position.set(0, 0, 0);
    this.scene.add(this.innerNucleus);

    // B. Inner Resonant Octahedron Core (Counter-rotating wireframe)
    const octaGeo = new THREE.OctahedronGeometry(1.9, 0);
    const octaMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });
    this.innerOctahedron = new THREE.Mesh(octaGeo, octaMat);
    this.scene.add(this.innerOctahedron);

    // C. Glowing Core Aura (Soft volumetric halo)
    const auraGeo = new THREE.SphereGeometry(2.05, 32, 32);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x0099cc,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    this.coreAura = new THREE.Mesh(auraGeo, auraMat);
    this.scene.add(this.coreAura);

    // D. Outer Geodesic Icosahedron Cyber-Shell
    const coreGeo = new THREE.IcosahedronGeometry(2.8, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.92,
    });
    this.orbitalCore = new THREE.Mesh(coreGeo, coreMat);
    this.orbitalCore.position.set(0, 0, 0);
    this.scene.add(this.orbitalCore);

    // E. Volumetric Expanding Shockwave Rings (Rippling energy waves)
    this.shockwaveMeshes = [];
    for (let i = 0; i < 3; i++) {
      const sGeo = new THREE.RingGeometry(1.7, 1.95, 64);
      const sMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const sMesh = new THREE.Mesh(sGeo, sMat);
      sMesh.rotation.x = Math.PI / 2;
      this.scene.add(sMesh);
      this.shockwaveMeshes.push({
        mesh: sMesh,
        phase: i * (1.0 / 3.0),
        speed: 0.5,
      });
    }

    // F. Primary Dyson Gimbal Ring (Diagonal Orbital)
    const ringGeo = new THREE.TorusGeometry(4.5, 0.08, 16, 120);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
    });
    this.outerRing = new THREE.Mesh(ringGeo, ringMat);
    this.outerRing.rotation.x = Math.PI / 3.2;
    this.scene.add(this.outerRing);

    // G. Secondary Dyson Gimbal Ring (Vertical Orbital)
    const secRingGeo = new THREE.TorusGeometry(5.7, 0.07, 16, 120);
    const secRingMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    this.secondaryRing = new THREE.Mesh(secRingGeo, secRingMat);
    this.secondaryRing.rotation.y = Math.PI / 2.4;
    this.scene.add(this.secondaryRing);

    // H. Equatorial Calibrated Ring
    const eqRingGeo = new THREE.TorusGeometry(3.5, 0.06, 16, 90);
    const eqRingMat = new THREE.MeshBasicMaterial({
      color: 0xffca70,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    this.equatorialRing = new THREE.Mesh(eqRingGeo, eqRingMat);
    this.equatorialRing.rotation.x = Math.PI / 2;
    this.scene.add(this.equatorialRing);

    // I. Horizon Celestial Perimeter Ring
    const horizGeo = new THREE.TorusGeometry(7.2, 0.05, 16, 140);
    const horizMat = new THREE.MeshBasicMaterial({
      color: 0xc084fc,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });
    this.horizonRing = new THREE.Mesh(horizGeo, horizMat);
    this.horizonRing.rotation.x = Math.PI / 2.2;
    this.scene.add(this.horizonRing);

    // J. Atmospheric Grid Plane
    this.gridPlane = new THREE.GridHelper(52, 26, 0x1a2e50, 0x091222);
    this.gridPlane.position.y = -6.2;
    this.scene.add(this.gridPlane);
  }

  /**
   * 3. Specialist Agent 3D Satellite Constellation with Laser Conduits & Sparks
   */
  private createAgentSatelliteNodes(): void {
    if (!this.scene) return;

    this.agentNodes = [];
    const agentConfigs = [
      { name: 'CentralSupervisor', colorHex: 0x00f0ff, radius: 4.8, height: 2.2, speed: 0.35, angle: 0 },
      { name: 'VisionPerception', colorHex: 0xa855f7, radius: 5.3, height: -1.8, speed: 0.28, angle: Math.PI * 0.25 },
      { name: 'CodeSynthesis', colorHex: 0x2563eb, radius: 5.0, height: 1.5, speed: 0.32, angle: Math.PI * 0.5 },
      { name: 'WindowsAutomation', colorHex: 0x10b981, radius: 5.6, height: -2.4, speed: 0.26, angle: Math.PI * 0.75 },
      { name: 'MemoryLanceDB', colorHex: 0xf59e0b, radius: 4.6, height: 2.8, speed: 0.38, angle: Math.PI * 1.0 },
      { name: 'BrowserNavigator', colorHex: 0x06b6d4, radius: 5.4, height: -1.2, speed: 0.29, angle: Math.PI * 1.25 },
      { name: 'MultimodalMedia', colorHex: 0xec4899, radius: 5.1, height: 2.0, speed: 0.33, angle: Math.PI * 1.5 },
      { name: 'DualStateVerifier', colorHex: 0x14b8a6, radius: 4.9, height: -2.6, speed: 0.31, angle: Math.PI * 1.75 },
    ];

    agentConfigs.forEach((cfg) => {
      const group = new THREE.Group();

      // Satellite Core Orb
      const orbGeo = new THREE.SphereGeometry(0.24, 16, 16);
      const orbMat = new THREE.MeshBasicMaterial({ color: cfg.colorHex, blending: THREE.AdditiveBlending });
      const orbMesh = new THREE.Mesh(orbGeo, orbMat);
      group.add(orbMesh);

      // Satellite Orbital Gyro Cage
      const cageGeo = new THREE.IcosahedronGeometry(0.38, 0);
      const cageMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, opacity: 0.75, transparent: true });
      const cageMesh = new THREE.Mesh(cageGeo, cageMat);
      group.add(cageMesh);

      this.scene?.add(group);

      // Laser Conduit Line connecting from origin to satellite
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(cfg.radius, cfg.height, 0)
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
      { pos: [5.0, -1.5, 2.0], color: 0xffca70 },
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
      { pos: [7.5, 1.5, -4.0], color: 0xffca70 },
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
    if (!this.orbitalCore || !this.particleSystem) return;

    const coreMat = this.orbitalCore.material as THREE.MeshBasicMaterial;

    if (this.networkNodeGroup) {
      this.networkNodeGroup.visible = mode === 'NETWORK';
    }
    if (this.sectorGroup) {
      this.sectorGroup.visible = mode === 'BUSINESS';
    }

    if (mode === 'NETWORK') {
      coreMat.color.setHex(0x00f0ff);
      if (this.camera) this.camera.position.set(0, 0, 15);
    } else if (mode === 'INTELLIGENCE') {
      coreMat.color.setHex(0xa855f7);
      if (this.camera) this.camera.position.set(0, 0, 13);
    } else if (mode === 'BUSINESS') {
      coreMat.color.setHex(0x10b981);
      if (this.camera) this.camera.position.set(0, 1.2, 17);
    } else if (mode === 'ACTIVE_TASK') {
      coreMat.color.setHex(0x10b981);
    } else if (mode === 'MEDIA') {
      coreMat.color.setHex(0xa855f7);
    } else if (mode === 'SYSTEM') {
      coreMat.color.setHex(0xffca70);
    } else {
      coreMat.color.setHex(0x00f0ff);
      if (this.camera) this.camera.position.set(0, 0, 13.0);
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
   * Dynamically synchronizes Three.js spatial core and lighting with active theme.
   */
  updateThemeColors(colors: AbhiThemeColors): void {
    if (!this.scene) return;
    try {
      const isLight = colors.background.startsWith('#f') || colors.background.startsWith('#e') || colors.background === '#ffffff';

      if (this.ambientLight) {
        this.ambientLight.intensity = isLight ? 2.9 : 1.6;
        this.ambientLight.color.set(isLight ? 0xffffff : 0xe2e8f0);
      }

      if (this.pointLight1) {
        this.pointLight1.color.set(colors.accentPrimary);
        this.pointLight1.intensity = isLight ? 6.5 : 5.5;
      }

      if (this.pointLight2) {
        this.pointLight2.color.set(colors.accentSecondary);
        this.pointLight2.intensity = isLight ? 5.5 : 4.5;
      }

      if (this.orbitalCore && this.orbitalCore.material instanceof THREE.MeshBasicMaterial) {
        this.orbitalCore.material.color.set(colors.coreGlow);
      }

      if (this.innerOctahedron && this.innerOctahedron.material instanceof THREE.MeshBasicMaterial) {
        this.innerOctahedron.material.color.set(colors.accentPrimary);
      }

      if (this.innerNucleus && this.innerNucleus.material instanceof THREE.MeshBasicMaterial) {
        this.innerNucleus.material.color.set(isLight ? 0x0099cc : 0xffffff);
      }

      if (this.coreAura && this.coreAura.material instanceof THREE.MeshBasicMaterial) {
        this.coreAura.material.color.set(colors.accentSecondary);
      }

      if (this.outerRing && this.outerRing.material instanceof THREE.MeshBasicMaterial) {
        this.outerRing.material.color.set(colors.accentPrimary);
      }

      if (this.secondaryRing && this.secondaryRing.material instanceof THREE.MeshBasicMaterial) {
        this.secondaryRing.material.color.set(colors.accentSecondary);
      }

      if (this.equatorialRing && this.equatorialRing.material instanceof THREE.MeshBasicMaterial) {
        this.equatorialRing.material.color.set(colors.coreGlow);
      }

      if (this.horizonRing && this.horizonRing.material instanceof THREE.MeshBasicMaterial) {
        this.horizonRing.material.color.set(colors.accentSecondary);
      }

      if (this.neuralSynapseLines && this.neuralSynapseLines.material instanceof THREE.LineBasicMaterial) {
        this.neuralSynapseLines.material.color.set(colors.accentPrimary);
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

        // Energy speed multiplier: higher during execution or listening
        let energyMultiplier = 1.0;
        if (this.energyState === 'LISTENING') energyMultiplier = 1.8;
        if (this.energyState === 'EXECUTING') energyMultiplier = 2.6;
        if (this.energyState === 'VERIFIED') energyMultiplier = 1.3;

        if (!this.isReducedMotion) {
          // Camera parallax smoothing
          if (this.camera) {
            this.camera.position.x += (this.targetCameraX - this.camera.position.x) * 0.05;
            this.camera.position.y += (this.targetCameraY - this.camera.position.y) * 0.05;
            this.camera.lookAt(0, 0, 0);
          }

          // Dynamic Celestial Swirl Particle Vortex
          if (this.particleSystem && this.particleAngles && this.particleRadii && this.particleHeights && this.particleSpeeds) {
            const posAttr = this.particleSystem.geometry.getAttribute('position') as THREE.BufferAttribute;
            const positions = posAttr.array as Float32Array;

            for (let i = 0; i < this.particleCount; i++) {
              const idx = i * 3;
              this.particleAngles[i] += this.particleSpeeds[i] * delta * energyMultiplier;
              const angle = this.particleAngles[i];
              const r = this.particleRadii[i];

              positions[idx] = Math.cos(angle) * r;
              positions[idx + 1] = this.particleHeights[i] + Math.sin(angle * 2.5 + elapsedTime * 1.5) * 0.45;
              positions[idx + 2] = Math.sin(angle) * r;
            }
            posAttr.needsUpdate = true;
          }

          // Quantum Core 1: Outer Icosahedron
          if (this.orbitalCore) {
            this.orbitalCore.rotation.x = elapsedTime * (0.3 * energyMultiplier);
            this.orbitalCore.rotation.y = elapsedTime * (0.42 * energyMultiplier);
            const scale = 1.0 + Math.sin(elapsedTime * (2.4 * energyMultiplier)) * 0.08;
            this.orbitalCore.scale.set(scale, scale, scale);
          }

          // Quantum Core 2: Inner Octahedron (Counter-rotating)
          if (this.innerOctahedron) {
            this.innerOctahedron.rotation.x = -elapsedTime * (0.48 * energyMultiplier);
            this.innerOctahedron.rotation.z = elapsedTime * (0.55 * energyMultiplier);
            const octaScale = 1.0 + Math.cos(elapsedTime * (3.0 * energyMultiplier)) * 0.1;
            this.innerOctahedron.scale.set(octaScale, octaScale, octaScale);
          }

          // Quantum Core 3: Singularity Nucleus Pulse
          if (this.innerNucleus) {
            const nucScale = 1.0 + Math.sin(elapsedTime * (3.5 * energyMultiplier)) * 0.12;
            this.innerNucleus.scale.set(nucScale, nucScale, nucScale);
          }

          // Quantum Core 4: Aura Breathing
          if (this.coreAura) {
            const auraScale = 1.0 + Math.sin(elapsedTime * (2.2 * energyMultiplier) + 0.5) * 0.16;
            this.coreAura.scale.set(auraScale, auraScale, auraScale);
          }

          // Dyson Gimbal Rings Rotation
          if (this.outerRing) {
            this.outerRing.rotation.z = elapsedTime * (0.18 * energyMultiplier);
            this.outerRing.rotation.y = Math.cos(elapsedTime * 0.12) * 0.4;
          }

          if (this.secondaryRing) {
            this.secondaryRing.rotation.x = elapsedTime * (0.15 * energyMultiplier);
            this.secondaryRing.rotation.z = Math.sin(elapsedTime * 0.1) * 0.4;
          }

          if (this.equatorialRing) {
            this.equatorialRing.rotation.z = -elapsedTime * (0.24 * energyMultiplier);
          }

          if (this.horizonRing) {
            this.horizonRing.rotation.z = elapsedTime * (0.08 * energyMultiplier);
            this.horizonRing.rotation.y = Math.sin(elapsedTime * 0.06) * 0.25;
          }

          // Expanding Volumetric Shockwave Rings
          this.shockwaveMeshes.forEach((item) => {
            item.phase += delta * (item.speed * energyMultiplier);
            if (item.phase > 1.0) item.phase -= 1.0;

            const currentScale = 1.0 + item.phase * 5.5;
            item.mesh.scale.set(currentScale, currentScale, currentScale);

            const opacity = (1.0 - item.phase) * (this.energyState === 'EXECUTING' ? 0.9 : 0.6);
            if (item.mesh.material instanceof THREE.MeshBasicMaterial) {
              item.mesh.material.opacity = Math.max(0, opacity);
            }
          });

          // 8 Specialist Agent Orbiting Satellites with Laser Conduits & Sparks
          this.agentNodes.forEach((node, idx) => {
            const currentAngle = node.baseAngle + elapsedTime * (node.speed * energyMultiplier);
            const x = Math.cos(currentAngle) * node.radius;
            const z = Math.sin(currentAngle) * node.radius;
            const y = node.height + Math.sin(elapsedTime * 1.8 + idx) * 0.45;

            node.group.position.set(x, y, z);
            node.group.rotation.y = elapsedTime * 1.5;
            node.group.rotation.x = elapsedTime * 1.0;

            // Update Laser Conduit Line Geometry
            const lineAttr = node.conduit.geometry.getAttribute('position') as THREE.BufferAttribute;
            const positions = lineAttr.array as Float32Array;
            positions[0] = 0; positions[1] = 0; positions[2] = 0;
            positions[3] = x; positions[4] = y; positions[5] = z;
            lineAttr.needsUpdate = true;

            // Slide Action Potential Spark along Conduit
            const sparkPhase = (elapsedTime * 0.8 + idx * 0.25) % 1.0;
            node.spark.position.set(x * sparkPhase, y * sparkPhase, z * sparkPhase);
            node.spark.scale.setScalar(0.8 + Math.sin(sparkPhase * Math.PI) * 0.5);
          });

          if (this.neuralSynapseLines) {
            this.neuralSynapseLines.rotation.y = elapsedTime * 0.04;
            this.neuralSynapseLines.rotation.z = Math.sin(elapsedTime * 0.02) * 0.06;
          }

          if (this.networkNodeGroup && this.networkNodeGroup.visible) {
            this.networkNodeGroup.rotation.y = elapsedTime * 0.07;
          }

          if (this.sectorGroup && this.sectorGroup.visible) {
            this.sectorGroup.rotation.y = elapsedTime * 0.05;
          }
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
    if (this.isRunning && this.animationFrameId === null) {
      this.startAnimationLoop();
    }
  }

  cleanup(): void {
    this.pause();
    this.isRunning = false;

    if (this.scene) {
      this.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.LineSegments || obj instanceof THREE.Line) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });
      this.scene.clear();
      this.scene = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    if (this.particleTexture) {
      this.particleTexture.dispose();
      this.particleTexture = null;
    }

    this.particleSystem = null;
    this.orbitalCore = null;
    this.innerOctahedron = null;
    this.innerNucleus = null;
    this.coreAura = null;
    this.outerRing = null;
    this.secondaryRing = null;
    this.equatorialRing = null;
    this.horizonRing = null;
    this.shockwaveMeshes = [];
    this.agentNodes = [];
    this.ringSatellites = [];
    this.gridPlane = null;
    this.networkNodeGroup = null;
    this.sectorGroup = null;
    this.ambientLight = null;
    this.pointLight1 = null;
    this.pointLight2 = null;
    this.camera = null;
  }
}
