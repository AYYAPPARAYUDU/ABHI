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
import { EvaluationReplayService } from '../../services/evaluation-replay.service';

@Component({
  selector: 'app-evolution-timeline-3d',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './evolution-timeline-3d.component.html',
  styleUrls: ['./evolution-timeline-3d.component.css']
})
export class EvolutionTimeline3dComponent implements OnInit, OnDestroy {
  @ViewChild('timelineCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly evalService = inject(EvaluationService);
  readonly replayService = inject(EvaluationReplayService);
  private readonly ngZone = inject(NgZone);

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animFrameId: number | null = null;
  private isDestroyed = false;

  private milestoneGroup!: THREE.Group;
  private currentBeaconMesh!: THREE.Mesh;

  constructor() {
    effect(() => {
      const currentDay = this.replayService.currentDayIndex();
      if (this.currentBeaconMesh && this.scene) {
        this.updateBeaconPosition(currentDay);
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
    this.camera.position.set(0, 10, 26);
    this.camera.lookAt(0, 0, 0);

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    } catch (e) {
      console.warn('WebGL not available in current environment for EvolutionTimeline3d:', e);
      return;
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    this.milestoneGroup = new THREE.Group();
    this.scene.add(this.milestoneGroup);

    // Build timeline milestones (Days 1 to 21)
    const runs = this.evalService.runs();
    const totalDays = runs.length || 21;
    const spacing = 1.6;
    const startX = -((totalDays - 1) * spacing) / 2;

    for (let day = 1; day <= totalDays; day++) {
      const x = startX + (day - 1) * spacing;
      const score = 0.70 + (day / totalDays) * 0.18;
      const height = score * 6;

      // Milestone Column
      const colGeo = new THREE.CylinderGeometry(0.25, 0.25, height, 16);
      const colMat = new THREE.MeshStandardMaterial({
        color: day <= this.replayService.currentDayIndex() ? 0x38bdf8 : 0x334155,
        emissive: day <= this.replayService.currentDayIndex() ? 0x0284c7 : 0x000000,
        emissiveIntensity: 0.4,
        roughness: 0.3
      });
      const colMesh = new THREE.Mesh(colGeo, colMat);
      colMesh.position.set(x, height / 2 - 3, 0);
      this.milestoneGroup.add(colMesh);

      // Sphere Cap
      const capGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const capMat = new THREE.MeshBasicMaterial({
        color: day === this.replayService.currentDayIndex() ? 0x22c55e : (day <= this.replayService.currentDayIndex() ? 0x38bdf8 : 0x64748b)
      });
      const capMesh = new THREE.Mesh(capGeo, capMat);
      capMesh.position.set(x, height - 3, 0);
      this.milestoneGroup.add(capMesh);
    }

    // Active Day Marker Beacon
    const beaconGeo = new THREE.ConeGeometry(0.5, 1.2, 16);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x16a34a,
      emissiveIntensity: 0.8
    });
    this.currentBeaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    this.currentBeaconMesh.rotation.x = Math.PI; // point downwards
    this.scene.add(this.currentBeaconMesh);

    this.updateBeaconPosition(this.replayService.currentDayIndex());
  }

  private updateBeaconPosition(currentDay: number): void {
    const totalDays = this.evalService.runs().length || 21;
    const spacing = 1.6;
    const startX = -((totalDays - 1) * spacing) / 2;
    const x = startX + (currentDay - 1) * spacing;
    const score = 0.70 + (currentDay / totalDays) * 0.18;
    const height = score * 6;

    if (this.currentBeaconMesh) {
      this.currentBeaconMesh.position.set(x, height - 1.8, 0);
    }
  }

  private animate = (): void => {
    if (this.isDestroyed) return;

    if (this.currentBeaconMesh) {
      this.currentBeaconMesh.rotation.y += 0.04;
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }

    this.animFrameId = requestAnimationFrame(this.animate);
  };
}
