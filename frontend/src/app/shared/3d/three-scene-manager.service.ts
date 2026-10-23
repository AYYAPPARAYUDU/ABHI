// ThreeSceneManagerService — Cinematic Holographic Arc Reactor & Cybernetic HUD 3D Core.
// Inspired by Iron Man Arc Reactor / Advanced Military Cyberpunk HUD Telemetry.
// Pure concentric mechanical dials, 3D volumetric nested core, tactical azimuth ticks, radar sweep & laser optics.

import { Injectable, NgZone, inject } from '@angular/core';
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
  private innerPolyGroup: THREE.Group | null = null;
  private coreIcosahedron: THREE.Mesh | null = null;
  private coreOctahedron: THREE.Mesh | null = null;
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

  // Dual Particle Architecture (Micro-Starfield + Accretion Vortex)
  private ambientStarSystem: THREE.Points | null = null;
  private ambientStarCount = 1200;
  private particleSystem: THREE.Points | null = null;
  private particleCount = 700;
  private particleAngles: Float32Array | null = null;
  private particleRadii: Float32Array | null = null;
  private particleSpeeds: Float32Array | null = null;
  private particleHeights: Float32Array | null = null;
  private particleTexture: THREE.Texture | null = null;

  // Expanding Shockwaves, Satellites & Holographic Ground Horizon
  private shockwaveMeshes: { mesh: THREE.Mesh; phase: number; speed: number }[] = [];
  private agentNodes: AgentSatelliteNode[] = [];
  private horizonDisc: THREE.LineSegments | null = null;
  private networkNodeGroup: THREE.Group | null = null;
  private sectorGroup: THREE.Group | null = null;
  private neuralSynapseLines: THREE.LineSegments | null = null;

  // Lighting
  private ambientLight: THREE.AmbientLight | null = null;
  private pointLight1: THREE.PointLight | null = null;
  private pointLight2: THREE.PointLight | null = null;
  private pointLightCore: THREE.PointLight | null = null;

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
        this.targetCameraX = x * 1.4;
        this.targetCameraY = y * 0.9;
      });

      window.addEventListener('resize', () => {
        if (this.camera && this.renderer) {
          const w = window.innerWidth;
          const h = window.innerHeight;
          this.onResize(w, h);
        }
      });
    }
  }

  /**
   * Helper to generate a crisp high-tech diamond star bloom particle texture.
   * Eliminates blurry fuzzy circular discs in favor of pinpoint brilliance.
   */
  private createParticleTexture(): THREE.Texture | null {
    if (typeof document === 'undefined') return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const cx = 64;
      const cy = 64;

      // Soft circular outer bloom
      const radialGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 54);
      radialGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
      radialGlow.addColorStop(0.18, 'rgba(0, 240, 255, 0.9)');
      radialGlow.addColorStop(0.45, 'rgba(59, 130, 246, 0.35)');
      radialGlow.addColorStop(1, 'rgba(3, 7, 18, 0)');

      ctx.fillStyle = radialGlow;
      ctx.beginPath();
      ctx.arc(cx, cy, 54, 0, Math.PI * 2);
      ctx.fill();

      // Sharp 4-Point Diamond Diffraction Spike (Horizontal)
      const hGrad = ctx.createLinearGradient(0, cy, 128, cy);
      hGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
      hGrad.addColorStop(0.42, 'rgba(0, 240, 255, 0.4)');
      hGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
      hGrad.addColorStop(0.58, 'rgba(0, 240, 255, 0.4)');
      hGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = hGrad;
      ctx.fillRect(10, cy - 1.5, 108, 3);

      // Sharp 4-Point Diamond Diffraction Spike (Vertical)
      const vGrad = ctx.createLinearGradient(cx, 0, cx, 128);
      vGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
      vGrad.addColorStop(0.42, 'rgba(0, 240, 255, 0.4)');
      vGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
      vGrad.addColorStop(0.58, 'rgba(0, 240, 255, 0.4)');
      vGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = vGrad;
      ctx.fillRect(cx - 1.5, 10, 3, 108);

      // Intense White Center Pinpoint Spark
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();

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

      // 1. Scene & Camera (Holographic perspective with deep spatial fog)
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x030712, 0.022);

      this.camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 1000);
      this.camera.position.set(0, 0, 12.0);

      // 2. High-Performance WebGL Renderer (Pure transparent canvas)
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
      this.renderer.setClearColor(0x000000, 0);

      // 3. Create Particle Texture
      this.particleTexture = this.createParticleTexture();

      // 4. Create Cybernetic Visual Architecture
      this.createAmbientStarfield();
      this.createParticleField();
      this.createArcReactorCore();
      this.createAgentSatelliteNodes();
      this.createHolographicHorizonDisc();
      this.createNetworkGraphVisuals();
      this.createBusinessSectorVisuals();

      // 5. Cinematic Cybernetic Lighting
      this.ambientLight = new THREE.AmbientLight(0x0f172a, 1.4);
      this.scene.add(this.ambientLight);

      this.pointLight1 = new THREE.PointLight(0x00f0ff, 7.5, 140, 1.5);
      this.pointLight1.position.set(5, 5, 10);
      this.scene.add(this.pointLight1);

      this.pointLight2 = new THREE.PointLight(0xa855f7, 5.5, 120, 1.5);
      this.pointLight2.position.set(-5, -4, 8);
      this.scene.add(this.pointLight2);

      this.pointLightCore = new THREE.PointLight(0x00f0ff, 9.0, 35, 2.0);
      this.pointLightCore.position.set(0, 0, 1);
      this.scene.add(this.pointLightCore);

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
   * Deep Cosmic Ambient Micro-Starfield (1,200 fine twinkling pinpoint stars).
   * Spans deep 3D space with zero clutter, giving infinite cosmic depth.
   */
  private createAmbientStarfield(): void {
    if (!this.scene) return;

    const count = this.isReducedMotion ? 400 : this.ambientStarCount;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const cWhite = new THREE.Color(0xffffff);
    const cCyan = new THREE.Color(0x00f0ff);
    const cViolet = new THREE.Color(0xa855f7);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Spherical shell distribution from r = 7 to r = 36
      const r = 7.0 + Math.random() * 29.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[idx] = r * Math.sin(phi) * Math.cos(theta);
      positions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[idx + 2] = r * Math.cos(phi) - 4.0; // Pushed slightly back

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

    const materialConfig: THREE.PointsMaterialParameters = {
      size: 0.11, // Fine, crisp diamond point size
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    };

    if (this.particleTexture) {
      materialConfig.map = this.particleTexture;
    }

    this.ambientStarSystem = new THREE.Points(geometry, new THREE.PointsMaterial(materialConfig));
    this.scene.add(this.ambientStarSystem);
  }

  /**
   * Accretion Spiral Energy Vortex (700 orbital sparks swirling around Arc Reactor).
   */
  private createParticleField(): void {
    if (!this.scene) return;

    const count = this.isReducedMotion ? 250 : this.particleCount;
    this.particleCount = count;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    this.particleAngles = new Float32Array(count);
    this.particleRadii = new Float32Array(count);
    this.particleSpeeds = new Float32Array(count);
    this.particleHeights = new Float32Array(count);

    const cCyan = new THREE.Color(0x00f0ff);
    const cAmber = new THREE.Color(0xffb703);
    const cViolet = new THREE.Color(0xa855f7);
    const cWhite = new THREE.Color(0xffffff);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      // Keplerian accretion distribution from r = 2.0 to r = 9.0
      const r = 2.0 + Math.pow(Math.random(), 1.4) * 7.0;
      const angle = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * (1.8 * (r / 6.0) + 0.6);
      // Keplerian orbital velocity (faster closer to core)
      const speed = (0.02 + Math.random() * 0.04) * (6.5 / (r + 1.5));

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
        mixedColor.lerp(cWhite, 0.75);
      } else if (rand < 0.70) {
        mixedColor.lerp(cAmber, 0.85);
      } else {
        mixedColor.lerp(cViolet, 0.7);
      }

      colors[idx] = mixedColor.r;
      colors[idx + 1] = mixedColor.g;
      colors[idx + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const materialConfig: THREE.PointsMaterialParameters = {
      size: 0.18, // Crisp, sparkling energy size
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    };

    if (this.particleTexture) {
      materialConfig.map = this.particleTexture;
    }

    this.particleSystem = new THREE.Points(geometry, new THREE.PointsMaterial(materialConfig));
    this.scene.add(this.particleSystem);

    // Neural Synapse Background Interconnect Lines
    const synapseLineCount = this.isReducedMotion ? 40 : 110;
    const synapsePoints: THREE.Vector3[] = [];
    for (let i = 0; i < synapseLineCount; i++) {
      const p1 = new THREE.Vector3(
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 12
      );
      const p2 = new THREE.Vector3(
        p1.x + (Math.random() - 0.5) * 4.5,
        p1.y + (Math.random() - 0.5) * 4.5,
        p1.z + (Math.random() - 0.5) * 4.5
      );
      synapsePoints.push(p1, p2);
    }
    const synapseGeo = new THREE.BufferGeometry().setFromPoints(synapsePoints);
    const synapseMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
    });
    this.neuralSynapseLines = new THREE.LineSegments(synapseGeo, synapseMat);
    this.scene.add(this.neuralSynapseLines);
  }

  /**
   * Curved Holographic Tactical Horizon Disc.
   * Completely replaces the ugly flat grid plane with an elegant circular range radar floor.
   * Fades seamlessly into exponential fog with zero harsh horizontal lines!
   */
  private createHolographicHorizonDisc(): void {
    if (!this.scene) return;

    const linePoints: THREE.Vector3[] = [];

    // Concentric Range Circles on floor (y = -6.5)
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

    // Radial Azimuth Spokes every 30 degrees
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
   * Holographic Arc Reactor & Cybernetic HUD Dial Core.
   * Features a 3D Volumetric Nested Polyhedron Core + Counter-Rotating Concentric Dials.
   */
  private createArcReactorCore(): void {
    if (!this.scene) return;

    this.hudDialGroup = new THREE.Group();
    // Slight forward angle tilt for high-end cinematic 3D perspective
    this.hudDialGroup.rotation.x = 0.20;
    this.hudDialGroup.position.set(0, 0, 0);

    // =========================================================================
    // A. 3D Volumetric Nested Gyroscopic Polyhedron Core (Zero Flat Discs!)
    // =========================================================================
    this.innerPolyGroup = new THREE.Group();

    // 1. Outer Glowing Wireframe Icosahedron (Cyan)
    const icoGeo = new THREE.IcosahedronGeometry(0.68, 0);
    const icoMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    this.coreIcosahedron = new THREE.Mesh(icoGeo, icoMat);
    this.innerPolyGroup.add(this.coreIcosahedron);

    // 2. Inner Counter-Rotating Wireframe Octahedron (Gold/Amber)
    const octGeo = new THREE.OctahedronGeometry(0.44, 0);
    const octMat = new THREE.MeshBasicMaterial({
      color: 0xffb703,
      wireframe: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    this.coreOctahedron = new THREE.Mesh(octGeo, octMat);
    this.innerPolyGroup.add(this.coreOctahedron);

    // 3. Central Quantum Singularity Pulsar (High-Intensity Spark Core)
    const pulsarGeo = new THREE.SphereGeometry(0.20, 16, 16);
    const pulsarMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      blending: THREE.AdditiveBlending,
    });
    this.hudIrisCore = new THREE.Mesh(pulsarGeo, pulsarMat);
    this.innerPolyGroup.add(this.hudIrisCore);

    this.hudDialGroup.add(this.innerPolyGroup);

    // =========================================================================
    // B. Multi-Layer Concentric Etched Holographic Rings & Segmented Arcs
    // =========================================================================

    // B1. Inner Fine Laser Ring (Radius 0.95)
    const innerRingGeo = new THREE.RingGeometry(0.92, 0.96, 64);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.hudCenterIris = new THREE.Mesh(innerRingGeo, innerRingMat);
    this.hudCenterIris.position.z = 0.02;
    this.hudDialGroup.add(this.hudCenterIris);

    // B2. Tactical Reticle Crosshairs with Degree Ticks
    const chPoints: THREE.Vector3[] = [];
    chPoints.push(new THREE.Vector3(-4.8, 0, 0.03), new THREE.Vector3(-0.95, 0, 0.03));
    chPoints.push(new THREE.Vector3(0.95, 0, 0.03), new THREE.Vector3(4.8, 0, 0.03));
    chPoints.push(new THREE.Vector3(0, -4.8, 0.03), new THREE.Vector3(0, -0.95, 0.03));
    chPoints.push(new THREE.Vector3(0, 0.95, 0.03), new THREE.Vector3(0, 4.8, 0.03));

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
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    this.hudCrosshairLines = new THREE.LineSegments(chGeo, chMat);
    this.hudDialGroup.add(this.hudCrosshairLines);

    // C. Segmented Dial Ring 1: Inner Mechanical Gear Arcs (Radius 1.28 to 1.52)
    this.hudSegmentedRing1 = new THREE.Group();
    const seg1Mat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const numArcs1 = 3;
    const arcLen1 = (Math.PI * 2 * 0.25);
    for (let i = 0; i < numArcs1; i++) {
      const startAngle = i * ((Math.PI * 2) / numArcs1);
      const arcGeo = new THREE.RingGeometry(1.28, 1.50, 48, 1, startAngle, arcLen1);
      const arcMesh = new THREE.Mesh(arcGeo, seg1Mat);
      arcMesh.position.z = 0.04;
      this.hudSegmentedRing1.add(arcMesh);
    }
    this.hudDialGroup.add(this.hudSegmentedRing1);

    // D. Segmented Dial Ring 2: Counter-Rotating Amber/Gold Gear Arcs (Radius 2.05 to 2.32)
    this.hudSegmentedRing2 = new THREE.Group();
    const seg2Mat = new THREE.MeshBasicMaterial({
      color: 0xffb703,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const numArcs2 = 4;
    const arcLen2 = (Math.PI * 2 * 0.17);
    for (let i = 0; i < numArcs2; i++) {
      const startAngle = i * ((Math.PI * 2) / numArcs2) + 0.12;
      const arcGeo = new THREE.RingGeometry(2.05, 2.30, 48, 1, startAngle, arcLen2);
      const arcMesh = new THREE.Mesh(arcGeo, seg2Mat);
      arcMesh.position.z = 0.06;
      this.hudSegmentedRing2.add(arcMesh);
    }
    this.hudDialGroup.add(this.hudSegmentedRing2);

    // E. 360° Azimuth Compass Radial Tick Marks (Radius 2.65 to 2.95)
    const tickPoints: THREE.Vector3[] = [];
    const totalTicks = 72;
    for (let i = 0; i < totalTicks; i++) {
      const angle = (i / totalTicks) * Math.PI * 2;
      const isMajor = i % 6 === 0;
      const rInner = 2.65;
      const rOuter = isMajor ? 2.98 : 2.82;
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
    this.hudDialGroup.add(this.hudAzimuthTicks);

    // F. Segmented Dial Ring 3: Outer Precision Arcs (Radius 3.25 to 3.52)
    this.hudSegmentedRing3 = new THREE.Group();
    const seg3Mat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const numArcs3 = 6;
    const arcLen3 = (Math.PI * 2 * 0.11);
    for (let i = 0; i < numArcs3; i++) {
      const startAngle = i * ((Math.PI * 2) / numArcs3);
      const arcGeo = new THREE.RingGeometry(3.25, 3.48, 48, 1, startAngle, arcLen3);
      const arcMesh = new THREE.Mesh(arcGeo, seg3Mat);
      arcMesh.position.z = 0.08;
      this.hudSegmentedRing3.add(arcMesh);
    }
    this.hudDialGroup.add(this.hudSegmentedRing3);

    // G. Outer Telemetry Boundary Ring (Radius 4.25 to 4.38)
    const outerGeo = new THREE.RingGeometry(4.25, 4.38, 96);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.hudOuterRing = new THREE.Mesh(outerGeo, outerMat);
    this.hudOuterRing.position.z = 0.05;
    this.hudDialGroup.add(this.hudOuterRing);

    // H. Tactical Corner Reticle Brackets (Radius 4.8)
    this.hudBracketGroup = new THREE.Group();
    const bracketMat = new THREE.LineBasicMaterial({
      color: 0xffb703,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const bracketAngles = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
    bracketAngles.forEach((bAngle) => {
      const bx = Math.cos(bAngle) * 4.8;
      const by = Math.sin(bAngle) * 4.8;
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
      new THREE.Vector3(4.4, 0, 0.12),
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
    this.orbitalCore = this.hudDialGroup;

    // J. Expanding Shockwave Energy Rings
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
   * 8 Orbiting Specialist Satellites with Fine Laser Conduits.
   */
  private createAgentSatelliteNodes(): void {
    if (!this.scene) return;

    const agentConfigs = [
      { name: 'Supervisor', angle: 0, speed: 0.28, radius: 5.4, height: 1.1, colorHex: 0x00f0ff },
      { name: 'Vision', angle: Math.PI / 4, speed: 0.22, radius: 6.0, height: -1.3, colorHex: 0x3b82f6 },
      { name: 'Desktop', angle: Math.PI / 2, speed: 0.26, radius: 5.2, height: 1.9, colorHex: 0x10b981 },
      { name: 'Browser', angle: (3 * Math.PI) / 4, speed: 0.24, radius: 6.4, height: -0.7, colorHex: 0xffb703 },
      { name: 'Coder', angle: Math.PI, speed: 0.30, radius: 5.6, height: 1.5, colorHex: 0xa855f7 },
      { name: 'Terminal', angle: (5 * Math.PI) / 4, speed: 0.25, radius: 6.2, height: -1.7, colorHex: 0xec4899 },
      { name: 'Memory', angle: (6 * Math.PI) / 4, speed: 0.27, radius: 5.3, height: 0.4, colorHex: 0x14b8a6 },
      { name: 'Safety', angle: (7 * Math.PI) / 4, speed: 0.23, radius: 6.6, height: -1.0, colorHex: 0xff5b71 },
    ];

    this.agentNodes = [];

    agentConfigs.forEach((cfg) => {
      const group = new THREE.Group();

      // Mini Orbiting Satellite Orb
      const orbGeo = new THREE.SphereGeometry(0.22, 16, 16);
      const orbMat = new THREE.MeshBasicMaterial({ color: cfg.colorHex, blending: THREE.AdditiveBlending });
      const orbMesh = new THREE.Mesh(orbGeo, orbMat);
      group.add(orbMesh);

      // Surrounding Octahedron Tactical Wireframe Cage
      const cageGeo = new THREE.OctahedronGeometry(0.38, 0);
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
        opacity: 0.40,
        blending: THREE.AdditiveBlending,
      });
      const conduit = new THREE.Line(lineGeo, lineMat);
      this.scene?.add(conduit);

      // Action Potential Spark Mesh
      const sparkGeo = new THREE.SphereGeometry(0.10, 12, 12);
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
      { pos: [5.0, -1.5, 2.0], color: 0xffb703 },
      { pos: [2.5, -4.0, -2.0], color: 0x00f0ff },
      { pos: [-2.0, 4.5, -3.0], color: 0xa855f7 },
      { pos: [0.0, -4.5, 3.0], color: 0xec4899 },
      { pos: [2.0, 4.0, 3.0], color: 0x14b8a6 },
    ];

    const linePoints: THREE.Vector3[] = [];
    const supervisorPos = new THREE.Vector3(0, 0, 0);

    agentPositions.forEach(({ pos, color }) => {
      const geo = new THREE.SphereGeometry(0.38, 16, 16);
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
      opacity: 0.45,
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
      { pos: [7.5, 1.5, -4.0], color: 0xffb703 },
    ];

    sectorPositions.forEach(({ pos, color }) => {
      const geo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
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
        this.ambientLight.intensity = isLight ? 2.5 : 1.4;
        this.ambientLight.color.set(isLight ? 0xffffff : 0x0f172a);
      }

      if (this.pointLight1) {
        this.pointLight1.color.set(colors.accentPrimary);
      }

      if (this.pointLight2) {
        this.pointLight2.color.set(colors.accentSecondary);
      }

      if (this.pointLightCore) {
        this.pointLightCore.color.set(colors.accentPrimary);
      }

      if (this.coreIcosahedron && this.coreIcosahedron.material instanceof THREE.MeshBasicMaterial) {
        this.coreIcosahedron.material.color.set(colors.accentPrimary);
      }

      if (this.coreOctahedron && this.coreOctahedron.material instanceof THREE.MeshBasicMaterial) {
        this.coreOctahedron.material.color.set(colors.accentSecondary);
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

      if (this.horizonDisc && this.horizonDisc.material instanceof THREE.LineBasicMaterial) {
        this.horizonDisc.material.color.set(colors.accentPrimary);
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
        if (this.energyState === 'LISTENING') energyMultiplier = 1.6;
        if (this.energyState === 'EXECUTING') energyMultiplier = 2.4;
        if (this.energyState === 'VERIFIED') energyMultiplier = 1.25;

        if (!this.isReducedMotion) {
          // Camera parallax smoothing with cubic damping
          if (this.camera) {
            this.currentCameraX += (this.targetCameraX - this.currentCameraX) * 0.05;
            this.currentCameraY += (this.targetCameraY - this.currentCameraY) * 0.05;
            this.camera.position.x = this.currentCameraX;
            this.camera.position.y = this.currentCameraY;
            this.camera.lookAt(0, 0, 0);
          }

          // 1. Nested 3D Gyroscopic Polyhedron Core Animation
          if (this.coreIcosahedron) {
            this.coreIcosahedron.rotation.y = elapsedTime * (0.55 * energyMultiplier);
            this.coreIcosahedron.rotation.z = elapsedTime * (0.35 * energyMultiplier);
            const icoPulse = 1.0 + Math.sin(elapsedTime * 2.5 * energyMultiplier) * 0.06;
            this.coreIcosahedron.scale.set(icoPulse, icoPulse, icoPulse);
          }

          if (this.coreOctahedron) {
            // Counter-rotation on X & Y
            this.coreOctahedron.rotation.x = -elapsedTime * (0.75 * energyMultiplier);
            this.coreOctahedron.rotation.y = -elapsedTime * (0.45 * energyMultiplier);
            const octPulse = 1.0 + Math.cos(elapsedTime * 3.0 * energyMultiplier) * 0.08;
            this.coreOctahedron.scale.set(octPulse, octPulse, octPulse);
          }

          if (this.hudIrisCore) {
            const pulsarScale = 1.0 + Math.sin(elapsedTime * 4.5 * energyMultiplier) * 0.18;
            this.hudIrisCore.scale.set(pulsarScale, pulsarScale, pulsarScale);
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

          // 3. Azimuth Compass Ticks & Tactical Gyro Drift
          if (this.hudAzimuthTicks) {
            this.hudAzimuthTicks.rotation.z = -elapsedTime * (0.12 * energyMultiplier);
          }

          if (this.hudDialGroup) {
            // Tactical gyroscopic pitch & yaw drift
            this.hudDialGroup.rotation.y = Math.sin(elapsedTime * 0.35) * 0.10;
            this.hudDialGroup.rotation.x = 0.20 + Math.cos(elapsedTime * 0.25) * 0.06;
          }

          // 4. Rotating 360° Radar Scanner Beam
          if (this.hudRadarSweeper) {
            this.hudRadarSweeper.rotation.z = -elapsedTime * (1.2 * energyMultiplier);
          }

          // 5. Ambient Micro-Starfield Subtle Rotation & Twinkle
          if (this.ambientStarSystem) {
            this.ambientStarSystem.rotation.y = elapsedTime * 0.015;
            this.ambientStarSystem.rotation.x = Math.sin(elapsedTime * 0.01) * 0.02;
          }

          // 6. Dynamic Accretion Vortex Particles
          if (this.particleSystem && this.particleAngles && this.particleRadii && this.particleHeights && this.particleSpeeds) {
            const posAttr = this.particleSystem.geometry.getAttribute('position') as THREE.BufferAttribute;
            const positions = posAttr.array as Float32Array;

            for (let i = 0; i < this.particleCount; i++) {
              const idx = i * 3;
              this.particleAngles[i] += this.particleSpeeds[i] * delta * energyMultiplier;
              const angle = this.particleAngles[i];
              const r = this.particleRadii[i];

              positions[idx] = Math.cos(angle) * r;
              positions[idx + 1] = this.particleHeights[i] + Math.sin(angle * 2.2 + elapsedTime * 1.5) * 0.25;
              positions[idx + 2] = Math.sin(angle) * r;
            }
            posAttr.needsUpdate = true;
          }

          // 7. Expanding Shockwave Ripple Waves
          this.shockwaveMeshes.forEach((item) => {
            item.phase = (item.phase + delta * item.speed * energyMultiplier) % 1.0;
            const radius = 1.5 + item.phase * 9.5;
            item.mesh.scale.set(radius, radius, radius);
            const mat = item.mesh.material as THREE.MeshBasicMaterial;
            mat.opacity = Math.max(0, (1.0 - item.phase) * 0.55);
          });

          // 8. Specialist Agent Satellite Nodes Orbiting in 3D
          this.agentNodes.forEach((node, i) => {
            const currentAngle = node.baseAngle + elapsedTime * (node.speed * energyMultiplier);
            const x = Math.cos(currentAngle) * node.radius;
            const z = Math.sin(currentAngle) * node.radius;
            const y = node.height + Math.sin(elapsedTime * 1.6 + i) * 0.35;

            node.group.position.set(x, y, z);
            node.group.rotation.y = elapsedTime * 0.7;
            node.group.rotation.x = elapsedTime * 0.4;

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
      this.scene.clear();
      this.scene = null;
    }
    this.camera = null;
    this.particleTexture = null;
    this.hudDialGroup = null;
    this.innerPolyGroup = null;
    this.coreIcosahedron = null;
    this.coreOctahedron = null;
    this.hudCenterIris = null;
    this.hudIrisCore = null;
    this.hudCrosshairLines = null;
    this.hudSegmentedRing1 = null;
    this.hudSegmentedRing2 = null;
    this.hudSegmentedRing3 = null;
    this.hudAzimuthTicks = null;
    this.hudRadarSweeper = null;
    this.hudOuterRing = null;
    this.hudBracketGroup = null;
    this.ambientStarSystem = null;
    this.particleSystem = null;
    this.shockwaveMeshes = [];
    this.agentNodes = [];
    this.horizonDisc = null;
    this.networkNodeGroup = null;
    this.sectorGroup = null;
    this.neuralSynapseLines = null;
  }
}
