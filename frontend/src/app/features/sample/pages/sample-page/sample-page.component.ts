import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  signal,
  Input,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { SampleAgentService } from '../../services/sample-agent.service';
import { SampleAgent, PodRoom, SampleViewMode } from '../../models/sample-agent.model';
import { SpeechVoiceService } from '../../../../core/services/speech-voice.service';

@Component({
  selector: 'app-sample-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sample-page.component.html',
  styleUrl: './sample-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SamplePageComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() initialMode?: SampleViewMode;
  @ViewChild('sceneCanvas') sceneCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly sampleService = inject(SampleAgentService);
  readonly speechVoice = inject(SpeechVoiceService, { optional: true });
  private readonly cdr = inject(ChangeDetectorRef);

  readonly viewMode = this.sampleService.viewMode;
  readonly pods = this.sampleService.pods;
  readonly agents = this.sampleService.agents;
  readonly activePod = this.sampleService.activePod;
  readonly selectedAgent = this.sampleService.selectedAgent;
  readonly brainNotes = this.sampleService.brainNotes;
  readonly calendarJobs = this.sampleService.calendarJobs;
  readonly llmSpecs = this.sampleService.llmSpecs;
  readonly selectedEngine = this.sampleService.selectedEngine;

  readonly activeTab = signal<'OFFICE' | 'TASKS' | 'CALENDAR' | 'BRAIN'>('OFFICE');

  // Three.js State
  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.OrthographicCamera;
  private animFrameId?: number;
  private resizeObserver?: ResizeObserver;
  private clock = new THREE.Clock();

  // Scene object groups
  private hubAndSpokeGroup = new THREE.Group();
  private floorplanGroup = new THREE.Group();
  private walkingAvatars: { mesh: THREE.Group; startPos: THREE.Vector3; endPos: THREE.Vector3; t: number; speed: number }[] = [];
  private brainRings: THREE.Mesh[] = [];
  private hudUpdateTimer?: any;

  ngOnInit(): void {
    if (this.initialMode) {
      this.sampleService.setViewMode(this.initialMode);
    }
    this.hudUpdateTimer = setInterval(() => {
      this.cdr.markForCheck();
    }, 2000);
  }

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined' && this.sceneCanvasRef?.nativeElement) {
      this.initThreeJs(this.sceneCanvasRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    if (this.hudUpdateTimer) {
      clearInterval(this.hudUpdateTimer);
      this.hudUpdateTimer = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.renderer?.dispose();
  }

  setTab(tab: 'OFFICE' | 'TASKS' | 'CALENDAR' | 'BRAIN'): void {
    this.activeTab.set(tab);
    this.cdr.markForCheck();
  }

  switchMode(mode: SampleViewMode): void {
    this.sampleService.setViewMode(mode);
    this.updateSceneVisibility();
    this.cdr.markForCheck();
  }

  selectPod(pod: PodRoom | null): void {
    this.sampleService.selectPod(pod);
    this.cdr.markForCheck();
  }

  private initThreeJs(canvas: HTMLCanvasElement): void {
    const width = canvas.clientWidth || 800;
    const height = canvas.clientHeight || 600;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070b16);

    // Isometric Orthographic Camera
    const aspect = width / height;
    const frustumSize = 22;
    this.camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      1000
    );

    // True Isometric Angle (35.264° pitch, 45° yaw)
    this.camera.position.set(20, 20, 20);
    this.camera.lookAt(0, 0, 0);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(15, 30, 20);
    this.scene.add(dirLight);

    const blueRimLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    blueRimLight.position.set(-20, 10, -20);
    this.scene.add(blueRimLight);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene.add(this.hubAndSpokeGroup);
    this.scene.add(this.floorplanGroup);

    this.buildHubAndSpokeScene();
    this.buildCorporateFloorplanScene();
    this.updateSceneVisibility();

    this.setupResize(canvas);
    this.animate();
  }

  private buildHubAndSpokeScene(): void {
    // 1. Central Brain Core (Glowing Cylinder & Hologram Rings)
    const baseGeo = new THREE.CylinderGeometry(2.4, 2.8, 0.4, 32);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.8 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.2;
    this.hubAndSpokeGroup.add(baseMesh);

    // Glowing Hologram Disc
    const discGeo = new THREE.RingGeometry(0.8, 2.2, 32);
    const discMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.75 });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.42;
    this.hubAndSpokeGroup.add(disc);

    // Inner Spinning Rings
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.TorusGeometry(1.0 + i * 0.4, 0.03, 16, 64);
      const ringMat = new THREE.MeshBasicMaterial({ color: i === 0 ? 0x60a5fa : 0x38bdf8, transparent: true, opacity: 0.85 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.6 + i * 0.2;
      ring.rotation.x = Math.PI / 2;
      this.brainRings.push(ring);
      this.hubAndSpokeGroup.add(ring);
    }

    // 2. 8 Color-Coded Pod Rooms
    const podList = this.pods();
    const radius = 8.5;

    podList.forEach((pod, index) => {
      const angle = (index * 2 * Math.PI) / 8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const podGroup = new THREE.Group();
      podGroup.position.set(x, 0, z);

      // Room Floor Slab
      const slabGeo = new THREE.BoxGeometry(3.6, 0.3, 3.6);
      const slabMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(pod.colorHex),
        roughness: 0.4,
        metalness: 0.2
      });
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.y = 0.15;
      podGroup.add(slab);

      // Two Isometric Back Walls
      const wallMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(pod.colorHex).multiplyScalar(0.7),
        roughness: 0.5
      });
      const wallGeo1 = new THREE.BoxGeometry(3.6, 1.8, 0.2);
      const wall1 = new THREE.Mesh(wallGeo1, wallMat);
      wall1.position.set(0, 1.05, -1.7);
      podGroup.add(wall1);

      const wallGeo2 = new THREE.BoxGeometry(0.2, 1.8, 3.6);
      const wall2 = new THREE.Mesh(wallGeo2, wallMat);
      wall2.position.set(-1.7, 1.05, 0);
      podGroup.add(wall2);

      // Office Desk
      const deskGeo = new THREE.BoxGeometry(1.6, 0.1, 0.8);
      const deskMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
      const desk = new THREE.Mesh(deskGeo, deskMat);
      desk.position.set(0, 0.7, -0.4);
      podGroup.add(desk);

      // Computer Monitor
      const monGeo = new THREE.BoxGeometry(0.7, 0.45, 0.05);
      const monMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 });
      const mon = new THREE.Mesh(monGeo, monMat);
      mon.position.set(0, 1.0, -0.4);
      podGroup.add(mon);

      // Neon Border Outline
      const edges = new THREE.EdgesGeometry(slabGeo);
      const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(pod.colorHex), linewidth: 2 });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      wireframe.position.y = 0.15;
      podGroup.add(wireframe);

      this.hubAndSpokeGroup.add(podGroup);

      // Connecting Glowing Spoke Pathway to Center
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.25, 0),
        new THREE.Vector3(x, 0.25, z)
      ]);
      const spokeMat = new THREE.LineDashedMaterial({
        color: new THREE.Color(pod.colorHex),
        dashSize: 0.4,
        gapSize: 0.2
      });
      const spokeLine = new THREE.Line(lineGeo, spokeMat);
      spokeLine.computeLineDistances();
      this.hubAndSpokeGroup.add(spokeLine);

      // Animated Walking Avatar between Pod and Central Brain
      const avatar = this.createLowPolyAgent(pod.colorHex);
      this.hubAndSpokeGroup.add(avatar);
      this.walkingAvatars.push({
        mesh: avatar,
        startPos: new THREE.Vector3(x * 0.8, 0.3, z * 0.8),
        endPos: new THREE.Vector3(Math.cos(angle) * 2.2, 0.3, Math.sin(angle) * 2.2),
        t: Math.random(),
        speed: 0.15 + Math.random() * 0.15
      });
    });
  }

  private buildCorporateFloorplanScene(): void {
    // 1. Large Ground Slab
    const slabGeo = new THREE.BoxGeometry(22, 0.4, 18);
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const floor = new THREE.Mesh(slabGeo, slabMat);
    floor.position.y = -0.2;
    this.floorplanGroup.add(floor);

    // Floor Grid pattern
    const grid = new THREE.GridHelper(22, 22, 0x475569, 0x334155);
    grid.position.y = 0.02;
    this.floorplanGroup.add(grid);

    // 2. Open Bullpen Cubicles (Left side)
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const desk = new THREE.Group();
        desk.position.set(-7 + col * 2.6, 0, -4 + row * 2.6);

        const dGeo = new THREE.BoxGeometry(1.6, 0.7, 0.9);
        const dMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
        const deskMesh = new THREE.Mesh(dGeo, dMat);
        deskMesh.position.y = 0.35;
        desk.add(deskMesh);

        // Partition screen
        const pGeo = new THREE.BoxGeometry(1.6, 0.4, 0.05);
        const pMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
        const part = new THREE.Mesh(pGeo, pMat);
        part.position.set(0, 0.85, -0.45);
        desk.add(part);

        // Chair
        const chairGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 16);
        const chairMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
        const chair = new THREE.Mesh(chairGeo, chairMat);
        chair.position.set(0, 0.2, 0.6);
        desk.add(chair);

        this.floorplanGroup.add(desk);
      }
    }

    // 3. Executive Suite (Top Right)
    const execGroup = new THREE.Group();
    execGroup.position.set(5.5, 0, -4.5);
    const execDesk = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.75, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3 })
    );
    execDesk.position.y = 0.375;
    execGroup.add(execDesk);
    this.floorplanGroup.add(execGroup);

    // 4. Lounge / Billiard Table Area (Bottom Center)
    const poolTable = new THREE.Group();
    poolTable.position.set(0, 0, 4);

    const felt = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 0.6, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.8 })
    );
    felt.position.y = 0.3;
    poolTable.add(felt);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.65, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.5 })
    );
    frame.position.y = 0.27;
    poolTable.add(frame);
    this.floorplanGroup.add(poolTable);

    // Outer Perimeter Glass / Railing
    const perimeterEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(22, 1.2, 18));
    const perimLine = new THREE.LineSegments(
      perimeterEdges,
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.3 })
    );
    perimLine.position.y = 0.6;
    this.floorplanGroup.add(perimLine);
  }

  private createLowPolyAgent(hexColor: string): THREE.Group {
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.55, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(hexColor) });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.35;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.16, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.72;
    group.add(head);

    return group;
  }

  private updateSceneVisibility(): void {
    const mode = this.viewMode();
    this.hubAndSpokeGroup.visible = mode === 'hub-and-spoke';
    this.floorplanGroup.visible = mode === 'corporate-floorplan';
  }

  private animate(): void {
    this.animFrameId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    // Spin Brain Core Rings
    this.brainRings.forEach((ring, idx) => {
      ring.rotation.z += (idx % 2 === 0 ? 1 : -1) * 0.8 * delta;
    });

    // Animate walking avatars back and forth
    this.walkingAvatars.forEach(av => {
      av.t += av.speed * delta;
      if (av.t > 1) {
        av.t = 0;
        // Swap start & end to reverse path
        const tmp = av.startPos.clone();
        av.startPos.copy(av.endPos);
        av.endPos.copy(tmp);
      }
      av.mesh.position.lerpVectors(av.startPos, av.endPos, av.t);
      av.mesh.lookAt(av.endPos);
    });

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private setupResize(canvas: HTMLCanvasElement): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && this.renderer && this.camera) {
          const aspect = width / height;
          const frustumSize = 22;
          this.camera.left = (-frustumSize * aspect) / 2;
          this.camera.right = (frustumSize * aspect) / 2;
          this.camera.top = frustumSize / 2;
          this.camera.bottom = -frustumSize / 2;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(width, height);
        }
      }
    });
    this.resizeObserver.observe(canvas);
  }
}
