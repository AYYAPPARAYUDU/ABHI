// ThreeSceneManagerService — Core 3D Spatial Engine for Voice-First AI Operating System (Phase 9 Stage 3).

import { Injectable, NgZone } from '@angular/core';
import * as THREE from 'three';
import { SpatialEnvironmentMode } from '../../core/models/agent-experience.model';

@Injectable({
  providedIn: 'root',
})
export class ThreeSceneManagerService {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private animationFrameId: number | null = null;

  // 3D Visual Objects
  private particleSystem: THREE.Points | null = null;
  private orbitalCore: THREE.Mesh | null = null;
  private outerRing: THREE.Mesh | null = null;
  private secondaryRing: THREE.Mesh | null = null;
  private gridPlane: THREE.GridHelper | null = null;
  private networkNodeGroup: THREE.Group | null = null;
  private sectorGroup: THREE.Group | null = null;
  private neuralSynapseLines: THREE.LineSegments | null = null;

  // State
  private isRunning = false;
  private isReducedMotion = false;
  private isWebGLAvailable = true;
  private currentMode: SpatialEnvironmentMode = 'DEFAULT';

  constructor(private ngZone: NgZone) {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.isReducedMotion = mediaQuery.matches;
        mediaQuery.addEventListener?.('change', (e) => {
          this.isReducedMotion = e.matches;
        });
      } catch (e) {
        // Fallback
      }
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
  }

  /**
   * Initialize Three.js scene onto a target canvas element.
   */
  init(canvas: HTMLCanvasElement): boolean {
    try {
      this.cleanup();

      // Check WebGL availability
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        this.isWebGLAvailable = false;
        return false;
      }

      const width = canvas.clientWidth || window.innerWidth;
      const height = canvas.clientHeight || window.innerHeight;

      // 1. Scene & Camera
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x030712, 0.022);

      this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
      this.camera.position.set(0, 0, 18);

      // 2. Renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      // 3. Create Layers
      this.createParticleField();
      this.createOrbitalCore();
      this.createNetworkGraphVisuals();
      this.createBusinessSectorVisuals();

      // 4. Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
      this.scene.add(ambientLight);

      const pointLight1 = new THREE.PointLight(0x06b6d4, 1.8, 60);
      pointLight1.position.set(6, 6, 12);
      this.scene.add(pointLight1);

      const pointLight2 = new THREE.PointLight(0x6366f1, 1.2, 50);
      pointLight2.position.set(-6, -4, 10);
      this.scene.add(pointLight2);

      this.isRunning = true;
      this.startAnimationLoop();
      return true;
    } catch (err) {
      console.warn('WebGL initialization failed, falling back to 2D:', err);
      this.isWebGLAvailable = false;
      return false;
    }
  }

  private createParticleField(): void {
    if (!this.scene) return;

    const particleCount = this.isReducedMotion ? 180 : 750;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0x06b6d4); // Cyan
    const color2 = new THREE.Color(0x6366f1); // Indigo
    const color3 = new THREE.Color(0xf59e0b); // Amber

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      positions[idx] = (Math.random() - 0.5) * 45;
      positions[idx + 1] = (Math.random() - 0.5) * 32;
      positions[idx + 2] = (Math.random() - 0.5) * 25;

      const mixedColor = Math.random() > 0.6 ? color1.clone().lerp(color2, Math.random()) : color1.clone().lerp(color3, Math.random() * 0.4);
      colors[idx] = mixedColor.r;
      colors[idx + 1] = mixedColor.g;
      colors[idx + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);

    // Dynamic Neural Synapse Interconnects (Reference 1: Living Network of Connections)
    const synapseLineCount = this.isReducedMotion ? 40 : 120;
    const synapsePoints: THREE.Vector3[] = [];
    for (let i = 0; i < synapseLineCount; i++) {
      const p1 = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 14,
        (Math.random() - 0.5) * 12
      );
      const p2 = new THREE.Vector3(
        p1.x + (Math.random() - 0.5) * 4,
        p1.y + (Math.random() - 0.5) * 4,
        p1.z + (Math.random() - 0.5) * 4
      );
      synapsePoints.push(p1, p2);
    }
    const synapseGeo = new THREE.BufferGeometry().setFromPoints(synapsePoints);
    const synapseMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
    });
    this.neuralSynapseLines = new THREE.LineSegments(synapseGeo, synapseMat);
    this.scene.add(this.neuralSynapseLines);
  }

  private createOrbitalCore(): void {
    if (!this.scene) return;

    // Glowing Inner Core
    const coreGeo = new THREE.IcosahedronGeometry(1.5, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.4,
    });
    this.orbitalCore = new THREE.Mesh(coreGeo, coreMat);
    this.orbitalCore.position.set(0, 0, 0);
    this.scene.add(this.orbitalCore);

    // Primary Torus Ring
    const ringGeo = new THREE.TorusGeometry(3.8, 0.025, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.3,
    });
    this.outerRing = new THREE.Mesh(ringGeo, ringMat);
    this.outerRing.rotation.x = Math.PI / 3.2;
    this.scene.add(this.outerRing);

    // Secondary Torus Ring
    const secRingGeo = new THREE.TorusGeometry(4.5, 0.015, 16, 64);
    const secRingMat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      transparent: true,
      opacity: 0.2,
    });
    this.secondaryRing = new THREE.Mesh(secRingGeo, secRingMat);
    this.secondaryRing.rotation.y = Math.PI / 2.8;
    this.scene.add(this.secondaryRing);

    // Grid Plane
    this.gridPlane = new THREE.GridHelper(50, 25, 0x1e293b, 0x090d16);
    this.gridPlane.position.y = -7.5;
    this.scene.add(this.gridPlane);
  }

  private createNetworkGraphVisuals(): void {
    if (!this.scene) return;

    this.networkNodeGroup = new THREE.Group();
    this.networkNodeGroup.visible = false;

    // Create 8 orbital nodes representing specialized agents around the supervisor
    const agentPositions = [
      { pos: [-4.5, 2.5, 1.5], color: 0x06b6d4 },
      { pos: [-4.0, -2.5, -1.5], color: 0x6366f1 },
      { pos: [4.5, 2.5, -1.0], color: 0x10b981 },
      { pos: [5.0, -1.5, 2.0], color: 0xf59e0b },
      { pos: [2.5, -4.0, -2.0], color: 0x38bdf8 },
      { pos: [-2.0, 4.5, -3.0], color: 0xa855f7 },
      { pos: [0.0, -4.5, 3.0], color: 0xec4899 },
      { pos: [2.0, 4.0, 3.0], color: 0x14b8a6 },
    ];

    const linePoints: THREE.Vector3[] = [];
    const supervisorPos = new THREE.Vector3(0, 0, 0);

    agentPositions.forEach(({ pos, color }) => {
      const geo = new THREE.SphereGeometry(0.35, 16, 16);
      const mat = new THREE.MeshBasicMaterial({ color, wireframe: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos[0], pos[1], pos[2]);
      this.networkNodeGroup?.add(mesh);

      linePoints.push(supervisorPos);
      linePoints.push(new THREE.Vector3(pos[0], pos[1], pos[2]));
    });

    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
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
      { pos: [-8.0, 2.0, -4.0], color: 0x06b6d4 },
      { pos: [-4.0, -1.5, 4.0], color: 0x3b82f6 },
      { pos: [0.0, 4.0, -6.0], color: 0xa855f7 },
      { pos: [4.0, -2.0, 3.0], color: 0x10b981 },
      { pos: [7.0, 3.0, -3.0], color: 0xf59e0b },
      { pos: [2.0, -4.0, 6.0], color: 0xec4899 },
    ];

    sectorPositions.forEach(({ pos, color }) => {
      const geo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
      const mat = new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity: 0.45,
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
      coreMat.color.setHex(0x38bdf8); // Cyan network core
      if (this.camera) this.camera.position.set(0, 0, 19);
    } else if (mode === 'INTELLIGENCE') {
      coreMat.color.setHex(0x6366f1); // Indigo neural core
      if (this.camera) this.camera.position.set(0, 0, 16);
    } else if (mode === 'BUSINESS') {
      coreMat.color.setHex(0x10b981); // Emerald business sector
      if (this.camera) this.camera.position.set(0, 1.5, 21);
    } else if (mode === 'ACTIVE_TASK') {
      coreMat.color.setHex(0x10b981);
    } else if (mode === 'MEDIA') {
      coreMat.color.setHex(0xa855f7);
    } else if (mode === 'SYSTEM') {
      coreMat.color.setHex(0xf59e0b);
    } else {
      coreMat.color.setHex(0x06b6d4); // Cyan default / MAIN_AGENT
      if (this.camera) this.camera.position.set(0, 0, 18);
    }
  }

  onResize(width: number, height: number): void {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private startAnimationLoop(): void {
    this.ngZone.runOutsideAngular(() => {
      let clock = new THREE.Clock();

      const animate = () => {
        if (!this.isRunning) return;

        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();

        if (!this.isReducedMotion) {
          if (this.particleSystem) {
            this.particleSystem.rotation.y = elapsedTime * 0.025;
            this.particleSystem.rotation.x = Math.sin(elapsedTime * 0.015) * 0.05;
          }

          if (this.orbitalCore) {
            this.orbitalCore.rotation.x = elapsedTime * 0.15;
            this.orbitalCore.rotation.y = elapsedTime * 0.2;
            const scale = 1.0 + Math.sin(elapsedTime * 1.5) * 0.04;
            this.orbitalCore.scale.set(scale, scale, scale);
          }

          if (this.outerRing) {
            this.outerRing.rotation.z = elapsedTime * 0.08;
            this.outerRing.rotation.y = Math.cos(elapsedTime * 0.05) * 0.2;
          }

          if (this.neuralSynapseLines) {
            this.neuralSynapseLines.rotation.y = elapsedTime * 0.02;
            this.neuralSynapseLines.rotation.z = Math.sin(elapsedTime * 0.01) * 0.03;
          }

          if (this.secondaryRing) {
            this.secondaryRing.rotation.x = elapsedTime * 0.06;
            this.secondaryRing.rotation.z = Math.sin(elapsedTime * 0.04) * 0.2;
          }

          if (this.networkNodeGroup && this.networkNodeGroup.visible) {
            this.networkNodeGroup.rotation.y = elapsedTime * 0.04;
          }

          if (this.sectorGroup && this.sectorGroup.visible) {
            this.sectorGroup.rotation.y = elapsedTime * 0.02;
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
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.LineSegments) {
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
      this.renderer.forceContextLoss();
      this.renderer = null;
    }

    this.particleSystem = null;
    this.orbitalCore = null;
    this.outerRing = null;
    this.secondaryRing = null;
    this.gridPlane = null;
    this.networkNodeGroup = null;
    this.sectorGroup = null;
    this.camera = null;
  }
}
