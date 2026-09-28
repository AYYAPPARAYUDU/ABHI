import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, effect, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { PerceptionService } from '../../../perception/services/perception.service';
import { AvatarState } from '../../../../core/models/telemetry.model';

@Component({
  selector: 'app-avatar-viewport',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar-viewport.component.html',
  styleUrl: './avatar-viewport.component.css'
})
export class AvatarViewportComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  private readonly stateService = inject(OperatorStateService);
  private readonly perceptionService = inject(PerceptionService);
  private readonly ngZone = inject(NgZone);

  readonly avatarState = this.stateService.avatarState;
  readonly voiceState = this.perceptionService.voice;
  readonly gestureState = this.perceptionService.gesture;
  readonly faceHeadState = this.perceptionService.faceHead;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private particleSystem!: THREE.Points;
  private innerCoreMesh!: THREE.Mesh;
  private orbitalRing1!: THREE.Mesh;
  private orbitalRing2!: THREE.Mesh;
  private pointLight!: THREE.PointLight;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    effect(() => {
      const state = this.avatarState();
      const isVoiceListening = this.voiceState().isListening;
      const gesture = this.gestureState().detectedGesture;
      const isEstop = this.gestureState().authoritativeSafetyState === 'EMERGENCY_STOP_TRIGGERED';

      this.updateAvatarTheme(state, isVoiceListening, gesture, isEstop);
    });
  }

  ngAfterViewInit(): void {
    this.initThreeScene();
    this.ngZone.runOutsideAngular(() => {
      this.startAnimationLoop();
    });
    this.setupResizeObserver();
  }

  private initThreeScene(): void {
    const container = this.containerRef.nativeElement;
    const width = container.clientWidth || 380;
    const height = container.clientHeight || 280;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.z = 5;

    // 2. WebGL Renderer
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(this.renderer.domElement);
    } catch (e) {
      console.warn('WebGL not available in current environment:', e);
      return;
    }

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    this.pointLight = new THREE.PointLight(0x00f0ff, 2.5, 50);
    this.pointLight.position.set(0, 0, 3);
    this.scene.add(this.pointLight);

    // 4. Procedural Holographic Particle Sphere Core
    const particleCount = 1200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const radius = 1.4;

    for (let i = 0; i < particleCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = radius * (0.85 + Math.random() * 0.3);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.045,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    this.particleSystem = new THREE.Points(geometry, particleMaterial);
    this.scene.add(this.particleSystem);

    // 5. Inner Core Mesh (Glowing Icosahedron Orb)
    const coreGeo = new THREE.IcosahedronGeometry(0.7, 2);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    this.innerCoreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.scene.add(this.innerCoreMesh);

    // 6. Concentric Holographic Orbital Rings
    const ringGeo1 = new THREE.TorusGeometry(1.8, 0.02, 16, 100);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.35
    });
    this.orbitalRing1 = new THREE.Mesh(ringGeo1, ringMat1);
    this.orbitalRing1.rotation.x = Math.PI / 3;
    this.scene.add(this.orbitalRing1);

    const ringGeo2 = new THREE.TorusGeometry(2.1, 0.015, 16, 100);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.25
    });
    this.orbitalRing2 = new THREE.Mesh(ringGeo2, ringMat2);
    this.orbitalRing2.rotation.y = Math.PI / 4;
    this.scene.add(this.orbitalRing2);

    this.updateAvatarTheme(this.avatarState(), this.voiceState().isListening, this.gestureState().detectedGesture, false);
  }

  private startAnimationLoop(): void {
    if (!this.renderer) return;
    const clock = new THREE.Clock();

    const animate = () => {
      if (!this.renderer) return;
      this.animationFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const state = this.avatarState();
      const isVoiceListening = this.voiceState().isListening;
      const headPose = this.faceHeadState().headPose;

      // Dynamic rotation and pulsation based on state
      let speedMultiplier = 1.0;
      if (isVoiceListening) speedMultiplier = 2.0;
      if (state === 'THINKING' || state === 'PLANNING') speedMultiplier = 2.2;
      if (state === 'EXECUTING') speedMultiplier = 3.0;
      if (state === 'VERIFYING') speedMultiplier = 1.8;
      if (state === 'RECOVERING') speedMultiplier = 2.5;

      // Subtle Head Pose Orientation Influence (Presentation Only)
      const yawInfluence = (headPose.yaw || 0) * 0.005;
      const pitchInfluence = -(headPose.pitch || 0) * 0.005;

      if (this.particleSystem) {
        this.particleSystem.rotation.y = elapsed * 0.25 * speedMultiplier + yawInfluence;
        this.particleSystem.rotation.x = Math.sin(elapsed * 0.15) * 0.1 + pitchInfluence;
      }

      if (this.innerCoreMesh) {
        this.innerCoreMesh.rotation.y = -elapsed * 0.4 * speedMultiplier + yawInfluence;
        this.innerCoreMesh.rotation.z = Math.cos(elapsed * 0.2) * 0.15;
        const scale = 1.0 + Math.sin(elapsed * 2.5 * speedMultiplier) * 0.08;
        this.innerCoreMesh.scale.set(scale, scale, scale);
      }

      if (this.orbitalRing1) {
        this.orbitalRing1.rotation.z = elapsed * 0.35 * speedMultiplier;
      }
      if (this.orbitalRing2) {
        this.orbitalRing2.rotation.x = -elapsed * 0.25 * speedMultiplier;
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  private updateAvatarTheme(
    state: AvatarState,
    isVoiceListening: boolean,
    gesture: string,
    isEstop: boolean
  ): void {
    if (!this.particleSystem || !this.innerCoreMesh) return;

    let hexColor = 0x00f0ff; // Default cyan

    if (isEstop || state === 'EMERGENCY_STOP' || gesture === 'OPEN_PALM') {
      hexColor = 0xdc2626; // Emergency stop crimson
    } else if (isVoiceListening || state === 'LISTENING') {
      hexColor = 0x00ffa3; // Listening green ripple
    } else if (state === 'WAITING_CONSENT' || gesture === 'THUMBS_UP') {
      hexColor = 0xf59e0b; // Consent amber / confirmation
    } else if (state === 'THINKING' || state === 'PLANNING') {
      hexColor = 0xa855f7; // Neural orbital violet
    } else if (state === 'EXECUTING') {
      hexColor = 0x3b82f6; // Execution blue
    } else if (state === 'VERIFYING') {
      hexColor = 0x06b6d4; // Cyan-teal
    } else if (state === 'RECOVERING') {
      hexColor = 0xa855f7; // Violet recovery
    } else if (state === 'SUCCESS') {
      hexColor = 0x00ff88; // Emerald success
    } else if (state === 'ERROR') {
      hexColor = 0xff2a55; // Red error
    }

    (this.particleSystem.material as THREE.PointsMaterial).color.setHex(hexColor);
    (this.innerCoreMesh.material as THREE.MeshStandardMaterial).color.setHex(hexColor);
    if (this.pointLight) {
      this.pointLight.color.setHex(hexColor);
    }
  }

  getPulseClass(): string {
    const s = this.avatarState();
    if (s === 'SUCCESS') return 'pulse-success';
    if (s === 'ERROR' || s === 'EMERGENCY_STOP') return 'pulse-error';
    if (s === 'RECOVERING' || s === 'WAITING_CONSENT') return 'pulse-warning';
    return 'pulse-active';
  }

  getStateTagClass(): string {
    const s = this.avatarState();
    if (s === 'SUCCESS') return 'tag-success';
    if (s === 'ERROR' || s === 'EMERGENCY_STOP') return 'tag-error';
    if (s === 'RECOVERING' || s === 'WAITING_CONSENT' || s === 'THINKING') return 'tag-warning';
    return 'tag-info';
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;
    const container = this.containerRef?.nativeElement;
    if (!container) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && this.renderer && this.camera) {
          this.camera.aspect = width / height;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(width, height);
        }
      }
    });
    this.resizeObserver.observe(container);
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.particleSystem) {
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as THREE.Material).dispose();
    }
    if (this.innerCoreMesh) {
      this.innerCoreMesh.geometry.dispose();
      (this.innerCoreMesh.material as THREE.Material).dispose();
    }
    if (this.orbitalRing1) {
      this.orbitalRing1.geometry.dispose();
      (this.orbitalRing1.material as THREE.Material).dispose();
    }
    if (this.orbitalRing2) {
      this.orbitalRing2.geometry.dispose();
      (this.orbitalRing2.material as THREE.Material).dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    if (this.scene) {
      this.scene.clear();
    }
  }
}
