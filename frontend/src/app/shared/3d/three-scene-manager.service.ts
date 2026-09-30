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
  private gridPlane: THREE.GridHelper | null = null;

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
        // Fallback for mock environments
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
      this.scene.fog = new THREE.FogExp2(0x060911, 0.025);

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

      // 3. Ambient Particle Field
      this.createParticleField();

      // 4. Subtle Orbital Core
      this.createOrbitalCore();

      // 5. Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(ambientLight);

      const pointLight = new THREE.PointLight(0x06b6d4, 1.5, 50);
      pointLight.position.set(5, 5, 10);
      this.scene.add(pointLight);

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

    const particleCount = this.isReducedMotion ? 150 : 600;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0x06b6d4); // Cyan
    const color2 = new THREE.Color(0x6366f1); // Indigo
    const color3 = new THREE.Color(0x10b981); // Emerald

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      positions[idx] = (Math.random() - 0.5) * 35;
      positions[idx + 1] = (Math.random() - 0.5) * 25;
      positions[idx + 2] = (Math.random() - 0.5) * 20;

      const mixedColor = Math.random() > 0.5 ? color1.clone().lerp(color2, Math.random()) : color2.clone().lerp(color3, Math.random());
      colors[idx] = mixedColor.r;
      colors[idx + 1] = mixedColor.g;
      colors[idx + 2] = mixedColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  private createOrbitalCore(): void {
    if (!this.scene) return;

    // Glowing Inner Icosahedron
    const coreGeo = new THREE.IcosahedronGeometry(1.4, 1);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    this.orbitalCore = new THREE.Mesh(coreGeo, coreMat);
    this.orbitalCore.position.set(0, 0, 0);
    this.scene.add(this.orbitalCore);

    // Outer Torus Ring
    const ringGeo = new THREE.TorusGeometry(3.5, 0.02, 16, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.25,
    });
    this.outerRing = new THREE.Mesh(ringGeo, ringMat);
    this.outerRing.rotation.x = Math.PI / 3;
    this.scene.add(this.outerRing);

    // Subtle System Grid Plane
    this.gridPlane = new THREE.GridHelper(40, 20, 0x1e293b, 0x0f172a);
    this.gridPlane.position.y = -6;
    this.gridPlane.rotation.x = 0;
    this.scene.add(this.gridPlane);
  }

  setMode(mode: SpatialEnvironmentMode): void {
    this.currentMode = mode;
    if (!this.orbitalCore || !this.particleSystem) return;

    const coreMat = this.orbitalCore.material as THREE.MeshBasicMaterial;
    if (mode === 'ACTIVE_TASK') {
      coreMat.color.setHex(0x10b981); // Emerald pulse
    } else if (mode === 'MEDIA') {
      coreMat.color.setHex(0xa855f7); // Purple nebula
    } else if (mode === 'SYSTEM') {
      coreMat.color.setHex(0xf59e0b); // Amber grid
    } else {
      coreMat.color.setHex(0x06b6d4); // Cyan default
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
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
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
    this.gridPlane = null;
    this.camera = null;
  }
}
