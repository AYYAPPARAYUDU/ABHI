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
  Output,
  EventEmitter,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { SampleAgentService } from '../../services/sample-agent.service';
import { SampleAgent, PodRoom, SampleViewMode } from '../../models/sample-agent.model';
import { SpeechVoiceService } from '../../../../core/services/speech-voice.service';
import { slidePill, landCards } from '../../../../core/motion';

export type WorkspaceViewMode = 'colony' | 'live-agents' | 'agent-works' | 'live-business';

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
  @Output() modeChange = new EventEmitter<WorkspaceViewMode>();
  @ViewChild('sceneCanvas') sceneCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('podPill') podPillRef?: ElementRef<HTMLElement>;

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
    // High-Fidelity Entrance Animation for HUD cards and sliding pill
    setTimeout(() => {
      const initialCards = document.querySelectorAll('.pod-detail-modal, .coffee-break-subcard, .agent-chatter-modal, .kpi-card');
      if (initialCards.length) {
        landCards(initialCards, { y: 22, stagger: 0.06 });
      }
      const selectedBtn = document.querySelector('.pod-ribbon-btn.selected') as HTMLElement;
      if (this.podPillRef?.nativeElement && selectedBtn) {
        slidePill(this.podPillRef.nativeElement, selectedBtn, { vertical: false, borderRadius: 8 });
      }
    }, 120);
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
    const wsMode: WorkspaceViewMode = mode === 'hub-and-spoke' ? 'live-agents' : 'agent-works';
    this.modeChange.emit(wsMode);
    this.cdr.markForCheck();
  }

  selectWorkspaceMode(target: WorkspaceViewMode): void {
    if (target === 'live-agents') {
      this.switchMode('hub-and-spoke');
    } else if (target === 'agent-works') {
      this.switchMode('corporate-floorplan');
    } else {
      this.modeChange.emit(target);
    }
  }

  selectPod(pod: PodRoom | null, event?: MouseEvent): void {
    this.sampleService.selectPod(pod);
    if (this.podPillRef?.nativeElement && event?.currentTarget) {
      slidePill(this.podPillRef.nativeElement, event.currentTarget as HTMLElement, {
        vertical: false,
        borderRadius: 8,
      });
    }
    if (pod) {
      setTimeout(() => {
        const hudCards = document.querySelectorAll('.pod-detail-modal, .coffee-break-subcard, .agent-chatter-modal');
        if (hudCards.length) {
          landCards(hudCards, { y: 22, stagger: 0.08 });
        }
      }, 30);
    }
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

    // 2. 8 Color-Coded Pod Rooms matching Image 1
    const roomColors = [
      '#8b5cf6', // 0: Purple
      '#6366f1', // 1: Indigo
      '#06b6d4', // 2: Cyan
      '#f43f5e', // 3: Crimson
      '#10b981', // 4: Emerald
      '#f59e0b', // 5: Amber
      '#3b82f6', // 6: Blue
      '#eab308'  // 7: Golden yellow
    ];
    const radius = 8.5;

    roomColors.forEach((colorHex, index) => {
      const angle = (index * 2 * Math.PI) / 8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const podGroup = new THREE.Group();
      podGroup.position.set(x, 0, z);

      // Room Floor Slab
      const slabGeo = new THREE.BoxGeometry(3.6, 0.3, 3.6);
      const slabMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        roughness: 0.4,
        metalness: 0.2
      });
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.y = 0.15;
      podGroup.add(slab);

      // Two Isometric Back Walls
      const wallMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex).multiplyScalar(0.7),
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
      const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(colorHex), linewidth: 2 });
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
        color: new THREE.Color(colorHex),
        dashSize: 0.4,
        gapSize: 0.2
      });
      const spokeLine = new THREE.Line(lineGeo, spokeMat);
      spokeLine.computeLineDistances();
      this.hubAndSpokeGroup.add(spokeLine);

      // Animated Walking Avatar between Pod and Central Brain
      const avatar = this.createLowPolyAgent(colorHex);
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
    const slabGeo = new THREE.BoxGeometry(24, 0.4, 20);
    const slabMat = new THREE.MeshStandardMaterial({ color: 0x0a1128, roughness: 0.6 });
    const floor = new THREE.Mesh(slabGeo, slabMat);
    floor.position.y = -0.2;
    this.floorplanGroup.add(floor);

    // Floor Grid pattern
    const grid = new THREE.GridHelper(24, 24, 0x38bdf8, 0x1e293b);
    grid.position.y = 0.02;
    this.floorplanGroup.add(grid);

    // 2. Open Bullpen Cubicles (6 Desks in 2 Rows of 3, centered exactly as in Image 2)
    const cubiclePositions = [
      { x: -2.8, z: -2.6 }, { x: 0.0, z: -2.6 }, { x: 2.8, z: -2.6 },
      { x: -2.8, z: 0.6 },  { x: 0.0, z: 0.6 },  { x: 2.8, z: 0.6 }
    ];

    cubiclePositions.forEach(pos => {
      const desk = new THREE.Group();
      desk.position.set(pos.x, 0, pos.z);

      // Main desk body
      const dGeo = new THREE.BoxGeometry(1.9, 0.7, 1.1);
      const dMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
      const deskMesh = new THREE.Mesh(dGeo, dMat);
      deskMesh.position.y = 0.35;
      desk.add(deskMesh);

      // Privacy divider screen (Blue panel on back edge)
      const pGeo = new THREE.BoxGeometry(1.9, 0.55, 0.06);
      const pMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
      const part = new THREE.Mesh(pGeo, pMat);
      part.position.set(0, 0.95, -0.52);
      desk.add(part);

      // Dual glowing cyan monitors
      const mMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const monL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.04), mMat);
      monL.position.set(-0.45, 0.95, -0.32);
      desk.add(monL);

      const monR = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.38, 0.04), mMat);
      monR.position.set(0.45, 0.95, -0.32);
      desk.add(monR);

      // Ergonomic black office chair
      const chairSeat = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 })
      );
      chairSeat.position.set(0, 0.45, 0.75);
      desk.add(chairSeat);

      const chairBack = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.55, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 })
      );
      chairBack.position.set(0, 0.75, 0.92);
      desk.add(chairBack);

      const chairLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8),
        new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 })
      );
      chairLeg.position.set(0, 0.2, 0.75);
      desk.add(chairLeg);

      this.floorplanGroup.add(desk);
    });

    // 3. Break Lounge Area (Green Turf & Wood platform at front-left, Image 2 match)
    const loungeArea = new THREE.Group();
    loungeArea.position.set(-2.8, 0, 4.2);

    // Warm mahogany frame
    const woodBase = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.65, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 })
    );
    woodBase.position.y = 0.325;
    loungeArea.add(woodBase);

    // Vibrant emerald green turf / felt carpet
    const turfTop = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 0.08, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.9 })
    );
    turfTop.position.y = 0.69;
    loungeArea.add(turfTop);

    // Wooden coffee counter & machine
    const coffeeBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.6, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.5 })
    );
    coffeeBar.position.set(0.8, 0.95, 0);
    loungeArea.add(coffeeBar);

    const espressoMachine = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.3, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 })
    );
    espressoMachine.position.set(0.8, 1.35, 0);
    loungeArea.add(espressoMachine);

    this.floorplanGroup.add(loungeArea);

    // 4. Conference / Side Review Desk (Right side, Image 2 match)
    const confDesk = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.75, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 })
    );
    confDesk.position.set(4.2, 0.375, 1.8);
    this.floorplanGroup.add(confDesk);

    // Outer Perimeter Glass / Railing Box
    const perimeterEdges = new THREE.EdgesGeometry(new THREE.BoxGeometry(24, 2.5, 20));
    const perimLine = new THREE.LineSegments(
      perimeterEdges,
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 })
    );
    perimLine.position.y = 1.25;
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
