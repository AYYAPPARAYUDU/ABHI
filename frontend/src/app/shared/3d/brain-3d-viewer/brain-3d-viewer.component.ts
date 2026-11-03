import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject,
  effect,
  signal,
  Input,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { ThemeService } from '../../../core/services/theme.service';

export interface BrainLobeInfo {
  name: string;
  role: string;
  cognitiveFunction: string;
  activityPercent: number;
}

@Component({
  selector: 'app-brain-3d-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './brain-3d-viewer.component.html',
  styleUrls: ['./brain-3d-viewer.component.css']
})
export class Brain3dViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('brainCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('containerRef', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() height: string = '280px';
  @Input() interactive: boolean = true;
  @Input() showLobeOverlay: boolean = true;

  private readonly themeService = inject(ThemeService);

  readonly activeLobe = signal<BrainLobeInfo | null>(null);
  readonly brainFrequencyHz = signal<number>(38.4);
  readonly synapticLoadPercent = signal<number>(94.8);

  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private brainGroup: THREE.Group | null = null;
  private animFrameId: number | null = null;

  // Materials & Meshes for Dynamic Theme Updates
  private leftCortexMesh: THREE.Mesh | null = null;
  private rightCortexMesh: THREE.Mesh | null = null;
  private cerebellumMesh: THREE.Mesh | null = null;
  private stemMesh: THREE.Mesh | null = null;
  private synapsesPoints: THREE.Points | null = null;
  private tractLines: THREE.Line[] = [];
  private actionPotentials: { mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3; t: number; speed: number }[] = [];
  private themeLights: THREE.PointLight[] = [];

  // Interaction State
  private isDragging = false;
  private prevMouseX = 0;
  private prevMouseY = 0;
  private rotationX = 0.15;
  private rotationY = 0.4;
  private targetRotationX = 0.15;
  private targetRotationY = 0.4;
  private zoom = 5.2;
  private targetZoom = 5.2;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2(-999, -999);
  private interactiveLobeMeshes: { mesh: THREE.Mesh; info: BrainLobeInfo }[] = [];

  constructor() {
    // Reactively update 3D brain shaders, lighting, and materials on theme change
    effect(() => {
      const theme = this.themeService.activeTheme();
      if (theme && this.scene) {
        this.updateThemeColors(theme.colors);
      }
    });
  }

  ngAfterViewInit(): void {
    if (typeof window !== 'undefined') {
      this.initThree();
      this.buildRealisticAnatomicalBrain();
      const theme = this.themeService.activeTheme();
      if (theme) {
        this.updateThemeColors(theme.colors);
      }
      this.animate();
    }
  }

  ngOnDestroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.disposeThree();
  }

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const container = this.containerRef.nativeElement;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 280;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 0.4, this.zoom);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // Dynamic 3-Point Studio Lighting for Cortical Lustre
    const ambientLight = new THREE.AmbientLight(0x0a192f, 2.5);
    this.scene.add(ambientLight);

    const keyLight = new THREE.PointLight(0x00f0ff, 5.0, 15, 1.2);
    keyLight.position.set(3, 4, 4);
    this.scene.add(keyLight);
    this.themeLights.push(keyLight);

    const rimLight = new THREE.PointLight(0x8b5cf6, 4.5, 15, 1.2);
    rimLight.position.set(-3.5, 2, -3);
    this.scene.add(rimLight);
    this.themeLights.push(rimLight);

    const bottomGlow = new THREE.PointLight(0x38bdf8, 3.0, 10, 1.5);
    bottomGlow.position.set(0, -3, 2);
    this.scene.add(bottomGlow);
    this.themeLights.push(bottomGlow);
  }

  /**
   * Builds an anatomically proportioned dual-hemisphere brain with gyri wrinkles,
   * cerebellum, brain stem, 1200+ neural synapses, and flowing tract connectomes.
   */
  private buildRealisticAnatomicalBrain(): void {
    if (!this.scene) return;

    this.brainGroup = new THREE.Group();
    this.interactiveLobeMeshes = [];
    this.actionPotentials = [];
    this.tractLines = [];

    // 1. Bilateral Hemispheres (Left & Right Cortex)
    const hemisphereOffsets = [-0.28, 0.28];
    const cortexMat = new THREE.MeshStandardMaterial({
      color: 0x0c213d,
      roughness: 0.32,
      metalness: 0.62,
      emissive: 0x05162a,
      emissiveIntensity: 0.35,
      wireframe: false,
    });

    const cortexWireMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending
    });

    hemisphereOffsets.forEach((xOffset, idx) => {
      const geo = this.createCortexHemisphereGeometry(idx === 0);
      const mesh = new THREE.Mesh(geo, cortexMat.clone());
      mesh.position.set(xOffset, 0.1, 0);

      const wireMesh = new THREE.Mesh(geo, cortexWireMat.clone());
      wireMesh.position.set(xOffset, 0.1, 0);
      wireMesh.scale.setScalar(1.002);

      this.brainGroup?.add(mesh);
      this.brainGroup?.add(wireMesh);

      if (idx === 0) {
        this.leftCortexMesh = mesh;
      } else {
        this.rightCortexMesh = mesh;
      }
    });

    // 2. Cerebellum (Posterior-Inferior bilateral balance center)
    const cereGeo = new THREE.SphereGeometry(0.55, 24, 16);
    cereGeo.scale(1.2, 0.65, 0.85);
    const cereMat = new THREE.MeshStandardMaterial({
      color: 0x08182b,
      roughness: 0.45,
      metalness: 0.55,
      emissive: 0x040d18,
      emissiveIntensity: 0.25,
    });
    this.cerebellumMesh = new THREE.Mesh(cereGeo, cereMat);
    this.cerebellumMesh.position.set(0, -0.65, -0.65);
    this.brainGroup.add(this.cerebellumMesh);

    // 3. Brain Stem (Medulla Oblongata / Pons)
    const stemGeo = new THREE.CylinderGeometry(0.22, 0.16, 0.9, 16);
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x0a1e35,
      roughness: 0.3,
      metalness: 0.7,
      emissive: 0x061526,
      emissiveIntensity: 0.3,
    });
    this.stemMesh = new THREE.Mesh(stemGeo, stemMat);
    this.stemMesh.position.set(0, -0.95, -0.22);
    this.stemMesh.rotation.x = 0.22;
    this.brainGroup.add(this.stemMesh);

    // 4. Lobe Raycasting Volumes (Frontal, Parietal, Temporal, Occipital)
    this.createLobeHitVolume(
      new THREE.Vector3(0, 0.4, 0.75),
      new THREE.Vector3(1.3, 0.9, 0.9),
      {
        name: 'Frontal Cortex',
        role: 'Executive Architecture',
        cognitiveFunction: 'Autonomous Task DAG Decomposition, Logical Reasoning, & Multi-Agent Consensus',
        activityPercent: 98.4
      }
    );

    this.createLobeHitVolume(
      new THREE.Vector3(0, 0.65, -0.1),
      new THREE.Vector3(1.4, 0.8, 0.9),
      {
        name: 'Parietal Cortex',
        role: 'Spatial Grounding',
        cognitiveFunction: 'Multimodal Sensor Fusion, OCR Coordinate Mapping, & Win32 Target Precision',
        activityPercent: 92.1
      }
    );

    this.createLobeHitVolume(
      new THREE.Vector3(0, -0.15, 0.15),
      new THREE.Vector3(1.65, 0.7, 1.1),
      {
        name: 'Temporal Cortex',
        role: 'Episodic Memory & Language',
        cognitiveFunction: 'Semantic Vector Retrieval (RAG), Speech STT/TTS Phonetics, & Communications Assistant',
        activityPercent: 96.7
      }
    );

    this.createLobeHitVolume(
      new THREE.Vector3(0, 0.15, -0.95),
      new THREE.Vector3(1.2, 0.75, 0.75),
      {
        name: 'Occipital Cortex',
        role: 'Visual Perception',
        cognitiveFunction: 'Real-time Desktop Frame Analysis, Optical Text Recognition, & Generative Media',
        activityPercent: 94.3
      }
    );

    // 5. Synaptic Point Cloud (1,100 Electrical Nodes)
    const synCount = 1100;
    const synGeo = new THREE.BufferGeometry();
    const synPos = new Float32Array(synCount * 3);
    const synColors = new Float32Array(synCount * 3);
    const primaryColor = new THREE.Color(0x00f0ff);
    const secondaryColor = new THREE.Color(0xa855f7);

    for (let i = 0; i < synCount; i++) {
      // Distribute within dual hemisphere volume
      const isLeft = Math.random() > 0.5;
      const xBase = (isLeft ? -0.32 : 0.32) + (Math.random() - 0.5) * 1.1;
      const yBase = 0.1 + (Math.random() - 0.5) * 1.25;
      const zBase = (Math.random() - 0.5) * 1.7;

      synPos[i * 3] = xBase;
      synPos[i * 3 + 1] = yBase;
      synPos[i * 3 + 2] = zBase;

      const mix = Math.random();
      const col = primaryColor.clone().lerp(secondaryColor, mix);
      synColors[i * 3] = col.r;
      synColors[i * 3 + 1] = col.g;
      synColors[i * 3 + 2] = col.b;
    }

    synGeo.setAttribute('position', new THREE.BufferAttribute(synPos, 3));
    synGeo.setAttribute('color', new THREE.BufferAttribute(synColors, 3));

    const synMat = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    this.synapsesPoints = new THREE.Points(synGeo, synMat);
    this.brainGroup.add(this.synapsesPoints);

    // 6. Neural Connectome Tract Streamlines (Axon Bundles with Active Potentials)
    const tractSplines = [
      // Frontal -> Occipital Longitudinal Fasciculus (Left)
      [new THREE.Vector3(-0.4, 0.4, 0.8), new THREE.Vector3(-0.65, 0.5, 0.1), new THREE.Vector3(-0.5, 0.2, -0.8)],
      // Frontal -> Occipital Longitudinal Fasciculus (Right)
      [new THREE.Vector3(0.4, 0.4, 0.8), new THREE.Vector3(0.65, 0.5, 0.1), new THREE.Vector3(0.5, 0.2, -0.8)],
      // Corpus Callosum Cross-Hemispheric Bridges
      [new THREE.Vector3(-0.5, 0.2, 0.3), new THREE.Vector3(0.0, 0.35, 0.3), new THREE.Vector3(0.5, 0.2, 0.3)],
      [new THREE.Vector3(-0.5, 0.25, -0.2), new THREE.Vector3(0.0, 0.4, -0.2), new THREE.Vector3(0.5, 0.25, -0.2)],
      [new THREE.Vector3(-0.4, 0.1, -0.6), new THREE.Vector3(0.0, 0.3, -0.6), new THREE.Vector3(0.4, 0.1, -0.6)],
      // Frontal -> Temporal
      [new THREE.Vector3(-0.35, 0.4, 0.7), new THREE.Vector3(-0.7, -0.1, 0.2), new THREE.Vector3(-0.4, -0.25, 0.4)],
      [new THREE.Vector3(0.35, 0.4, 0.7), new THREE.Vector3(0.7, -0.1, 0.2), new THREE.Vector3(0.4, -0.25, 0.4)],
      // Cortex -> Brainstem (Motor projection)
      [new THREE.Vector3(-0.3, 0.5, 0.0), new THREE.Vector3(-0.15, 0.0, -0.15), new THREE.Vector3(0.0, -0.9, -0.2)],
      [new THREE.Vector3(0.3, 0.5, 0.0), new THREE.Vector3(0.15, 0.0, -0.15), new THREE.Vector3(0.0, -0.9, -0.2)],
    ];

    tractSplines.forEach((pts, sIdx) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const points = curve.getPoints(32);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: sIdx % 2 === 0 ? 0x00f0ff : 0xa855f7,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending
      });
      const line = new THREE.Line(lineGeo, lineMat);
      this.brainGroup?.add(line);
      this.tractLines.push(line);

      // Electrical Action Potential Packet traveling on Tract
      const packetMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 8, 8),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.95
        })
      );
      this.brainGroup?.add(packetMesh);
      this.actionPotentials.push({
        mesh: packetMesh,
        curve,
        t: (sIdx * 0.18) % 1.0,
        speed: 0.006 + Math.random() * 0.005
      });
    });

    this.scene.add(this.brainGroup);
  }

  /**
   * Generates a 3D hemisphere with anatomically realistic fractal gyri and sulci convolutions.
   */
  private createCortexHemisphereGeometry(isLeft: boolean): THREE.BufferGeometry {
    const radius = 1.0;
    const widthSegments = 40;
    const heightSegments = 30;

    const geo = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    const posAttr = geo.attributes['position'] as THREE.BufferAttribute;

    for (let i = 0; i < posAttr.count; i++) {
      let x = posAttr.getX(i);
      let y = posAttr.getY(i);
      let z = posAttr.getZ(i);

      // Cut inner sagittal face flat to leave the longitudinal fissure
      if (isLeft && x > 0.02) x = 0.02;
      if (!isLeft && x < -0.02) x = -0.02;

      // Elongate horizontally and anterior-posterior (real brain ratio ~ 1.0 : 0.8 : 1.3)
      x *= 0.78;
      y *= 0.72;
      z *= 1.08;

      // Frontal lobe lift and Occipital posterior rounding
      if (z > 0.3) {
        y += 0.08 * (z - 0.3); // Frontal anterior slope
      }
      if (z < -0.2 && y < 0) {
        y *= 0.85; // Tuck for cerebellum
      }

      // Harmonic fractal displacement for cortical convolutions (gyri & sulci)
      const u = Math.atan2(z, x);
      const v = Math.asin(Math.max(-1, Math.min(1, y / 0.8)));

      const primaryGyrus = Math.sin(u * 7.0) * Math.cos(v * 6.0) * 0.045;
      const secondaryGyrus = Math.sin(u * 14.0 + v * 5.0) * 0.022;
      const microSulcus = Math.cos(u * 22.0) * Math.sin(v * 16.0) * 0.012;

      const displacement = 1.0 + primaryGyrus + secondaryGyrus + microSulcus;

      posAttr.setXYZ(i, x * displacement, y * displacement, z * displacement);
    }

    geo.computeVertexNormals();
    return geo;
  }

  private createLobeHitVolume(pos: THREE.Vector3, scale: THREE.Vector3, info: BrainLobeInfo): void {
    const hitGeo = new THREE.BoxGeometry(scale.x, scale.y, scale.z);
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.001,
      depthWrite: false
    });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.position.copy(pos);
    hitMesh.userData = { lobeInfo: info };
    this.brainGroup?.add(hitMesh);
    this.interactiveLobeMeshes.push({ mesh: hitMesh, info });
  }

  /**
   * Synchronizes brain lighting, cortical hues, and synaptic pulses to the active theme.
   */
  updateThemeColors(colors: any): void {
    if (!colors) return;
    const primaryHex = colors.accentPrimary || '#00f0ff';
    const secondaryHex = colors.accentSecondary || '#a855f7';
    const bgSecondaryHex = colors.backgroundSecondary || '#0c213d';

    const pCol = new THREE.Color(primaryHex);
    const sCol = new THREE.Color(secondaryHex);

    // Update Lights
    if (this.themeLights[0]) this.themeLights[0].color.copy(pCol);
    if (this.themeLights[1]) this.themeLights[1].color.copy(sCol);
    if (this.themeLights[2]) this.themeLights[2].color.copy(pCol);

    // Update Cortex Materials
    const updateMat = (mesh: THREE.Mesh | null) => {
      if (mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.emissive.copy(pCol).multiplyScalar(0.2);
        mesh.material.color.set(bgSecondaryHex).lerp(pCol, 0.15);
      }
    };
    updateMat(this.leftCortexMesh);
    updateMat(this.rightCortexMesh);
    updateMat(this.cerebellumMesh);
    updateMat(this.stemMesh);

    // Update Tract Lines
    this.tractLines.forEach((l, idx) => {
      if (l.material instanceof THREE.LineBasicMaterial) {
        l.material.color.copy(idx % 2 === 0 ? pCol : sCol);
      }
    });
  }

  // Animation Loop
  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);

    const time = performance.now() * 0.001;

    // Smooth Inertial Orbit Rotation
    this.rotationX += (this.targetRotationX - this.rotationX) * 0.08;
    this.rotationY += (this.targetRotationY - this.rotationY) * 0.08;
    this.zoom += (this.targetZoom - this.zoom) * 0.08;

    if (this.camera) {
      this.camera.position.z = this.zoom;
    }

    if (this.brainGroup) {
      if (!this.isDragging) {
        // Continuous gentle cosmic breathing levitation
        this.targetRotationY += 0.0035;
        this.brainGroup.position.y = Math.sin(time * 1.8) * 0.04;
      }
      this.brainGroup.rotation.x = this.rotationX;
      this.brainGroup.rotation.y = this.rotationY;
    }

    // Dynamic Action Potentials Traveling along Tracts
    this.actionPotentials.forEach((ap) => {
      ap.t += ap.speed;
      if (ap.t > 1.0) ap.t = 0.0;
      const point = ap.curve.getPoint(ap.t);
      ap.mesh.position.copy(point);
      const pulseScale = 0.8 + Math.sin(time * 12 + ap.t * Math.PI) * 0.4;
      ap.mesh.scale.setScalar(pulseScale);
    });

    // Synaptic Point Cloud Micro-Flicker (Action Potentials in Cortical Mantle)
    if (this.synapsesPoints) {
      const synMat = this.synapsesPoints.material as THREE.PointsMaterial;
      synMat.size = 0.052 + Math.sin(time * 8.0) * 0.008;
    }

    // Interactive Raycasting for Lobe Detection
    this.checkLobeHover();

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  private checkLobeHover(): void {
    if (!this.camera || !this.interactive) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.interactiveLobeMeshes.map((m) => m.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const hitInfo = hit.userData['lobeInfo'] as BrainLobeInfo;
      if (hitInfo && this.activeLobe()?.name !== hitInfo.name) {
        this.activeLobe.set(hitInfo);
      }
    }
  }

  // Mouse & Touch Interaction Handlers
  onPointerDown(event: MouseEvent | TouchEvent): void {
    if (!this.interactive) return;
    this.isDragging = true;
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;
    this.prevMouseX = clientX;
    this.prevMouseY = clientY;
  }

  @HostListener('window:pointermove', ['$event'])
  onPointerMove(event: MouseEvent): void {
    const container = this.containerRef?.nativeElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    if (!this.isDragging || !this.interactive) return;
    const deltaX = event.clientX - this.prevMouseX;
    const deltaY = event.clientY - this.prevMouseY;
    this.prevMouseX = event.clientX;
    this.prevMouseY = event.clientY;

    this.targetRotationY += deltaX * 0.008;
    this.targetRotationX = Math.max(-1.0, Math.min(1.0, this.targetRotationX + deltaY * 0.008));
  }

  @HostListener('window:pointerup')
  onPointerUp(): void {
    this.isDragging = false;
  }

  onWheel(event: WheelEvent): void {
    if (!this.interactive) return;
    event.preventDefault();
    this.targetZoom = Math.max(3.2, Math.min(7.5, this.targetZoom + event.deltaY * 0.004));
  }

  selectLobe(lobe: BrainLobeInfo): void {
    this.activeLobe.set(lobe);
  }

  resetView(): void {
    this.targetRotationX = 0.15;
    this.targetRotationY = 0.4;
    this.targetZoom = 5.2;
  }

  private disposeThree(): void {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
    }
    this.scene = null;
    this.camera = null;
    this.brainGroup = null;
  }
}

