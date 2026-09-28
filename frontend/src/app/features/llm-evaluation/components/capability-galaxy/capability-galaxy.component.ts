import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  OnDestroy,
  NgZone,
  inject,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { EvaluationService } from '../../services/evaluation.service';

interface GalaxyNode {
  name: string;
  key: string;
  color: number;
  orbitRadius: number;
  speed: number;
  angle: number;
  mesh?: THREE.Mesh;
}

@Component({
  selector: 'app-capability-galaxy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './capability-galaxy.component.html',
  styleUrls: ['./capability-galaxy.component.css']
})
export class CapabilityGalaxyComponent implements OnInit, OnDestroy {
  @ViewChild('galaxyCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly evalService = inject(EvaluationService);
  private readonly ngZone = inject(NgZone);

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animFrameId: number | null = null;
  private isDestroyed = false;

  private centralCoreMesh!: THREE.Mesh;
  private galaxyNodes: GalaxyNode[] = [
    { name: 'Reasoning', key: 'reasoning', color: 0x818cf8, orbitRadius: 4.5, speed: 0.008, angle: 0 },
    { name: 'Coding', key: 'coding', color: 0x38bdf8, orbitRadius: 5.5, speed: 0.006, angle: 1.0 },
    { name: 'Knowledge', key: 'knowledge', color: 0x34d399, orbitRadius: 6.5, speed: 0.005, angle: 2.0 },
    { name: 'RAG Grounding', key: 'rag', color: 0x10b981, orbitRadius: 7.5, speed: 0.007, angle: 3.0 },
    { name: 'Safety', key: 'safety', color: 0x22c55e, orbitRadius: 8.5, speed: 0.004, angle: 4.0 },
    { name: 'Multilingual', key: 'multilingual', color: 0xfbbf24, orbitRadius: 9.5, speed: 0.006, angle: 5.0 },
    { name: 'Tool Use', key: 'tool_use', color: 0xf472b6, orbitRadius: 10.5, speed: 0.005, angle: 1.5 },
    { name: 'Groundedness', key: 'groundedness', color: 0xa78bfa, orbitRadius: 11.5, speed: 0.004, angle: 3.5 }
  ];

  constructor() {
    effect(() => {
      const run = this.evalService.selectedRun();
      if (run && this.scene) {
        this.updateNodeScales();
      }
    });
  }

  ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initThreeScene();
      this.animate();
    });
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  private initThreeScene(): void {
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.parentElement?.clientWidth || 600;
    const height = 360;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e17);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 18, 22);
    this.camera.lookAt(0, 0, 0);

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    } catch (e) {
      console.warn('WebGL not available in current environment for CapabilityGalaxy:', e);
      return;
    }

    // Ambient & Point Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 2.5, 50);
    pointLight.position.set(0, 5, 0);
    this.scene.add(pointLight);

    // Central Model Core Sphere
    const coreGeo = new THREE.SphereGeometry(1.6, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      wireframe: false
    });
    this.centralCoreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.scene.add(this.centralCoreMesh);

    // Orbit rings and capability planetary nodes
    this.galaxyNodes.forEach((node) => {
      // Orbit Path Ring
      const ringGeo = new THREE.RingGeometry(node.orbitRadius - 0.03, node.orbitRadius + 0.03, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: node.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.2
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      this.scene.add(ring);

      // Capability Planet Mesh
      const nodeGeo = new THREE.SphereGeometry(0.6, 24, 24);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: node.color,
        emissive: node.color,
        emissiveIntensity: 0.4,
        roughness: 0.3
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      node.mesh = nodeMesh;
      this.scene.add(nodeMesh);
    });

    // Starfield Particle Background
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 400;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 80;
      starPositions[i + 1] = (Math.random() - 0.5) * 80;
      starPositions[i + 2] = (Math.random() - 0.5) * 80;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.3, transparent: true, opacity: 0.6 });
    const stars = new THREE.Points(starsGeo, starsMat);
    this.scene.add(stars);

    this.updateNodeScales();
  }

  private updateNodeScales(): void {
    const run = this.evalService.selectedRun();
    if (!run) return;

    this.galaxyNodes.forEach((node) => {
      if (node.mesh) {
        const score = (run.capabilities as any)[node.key] || 0.5;
        const scale = 0.5 + score * 0.9;
        node.mesh.scale.set(scale, scale, scale);
      }
    });
  }

  private animate = (): void => {
    if (this.isDestroyed) return;

    // Rotate Central Core
    if (this.centralCoreMesh) {
      this.centralCoreMesh.rotation.y += 0.008;
    }

    // Orbit Capability Nodes
    this.galaxyNodes.forEach((node) => {
      node.angle += node.speed;
      const x = Math.cos(node.angle) * node.orbitRadius;
      const z = Math.sin(node.angle) * node.orbitRadius;
      if (node.mesh) {
        node.mesh.position.set(x, 0, z);
        node.mesh.rotation.y += 0.02;
      }
    });

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    this.animFrameId = requestAnimationFrame(this.animate);
  };
}
