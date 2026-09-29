import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { EvaluationService } from '../../services/evaluation.service';
import { ModelLineageNode } from '../../models/evaluation.model';

@Component({
  selector: 'app-model-lineage-3d',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './model-lineage-3d.component.html',
  styleUrls: ['./model-lineage-3d.component.css']
})
export class ModelLineage3dComponent implements AfterViewInit, OnDestroy {
  @ViewChild('lineageCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly evalService = inject(EvaluationService);

  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private animFrameId: number | null = null;
  private nodeMeshes: THREE.Mesh[] = [];
  selectedNode: ModelLineageNode | null = null;

  constructor() {
    effect(() => {
      const nodes = this.evalService.lineageNodes();
      if (nodes && this.scene) {
        this.rebuildGraph(nodes);
      }
    });
  }

  ngAfterViewInit(): void {
    this.initThree();
    const nodes = this.evalService.lineageNodes();
    if (nodes && this.scene) {
      this.rebuildGraph(nodes);
    }
    this.animate();
  }

  ngOnDestroy(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const width = canvas.clientWidth || 700;
    const height = canvas.clientHeight || 400;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 18);

    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    } catch (e) {
      console.warn('WebGL not available in current environment for ModelLineage3d:', e);
      return;
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x818cf8, 1.5);
    dirLight.position.set(10, 15, 10);
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 2, 50);
    pointLight.position.set(-10, -10, 10);
    this.scene.add(pointLight);
  }

  private rebuildGraph(nodes: ModelLineageNode[]): void {
    if (!this.scene) return;

    // Clear previous meshes
    this.nodeMeshes.forEach((m) => this.scene?.remove(m));
    this.nodeMeshes = [];

    // Layout nodes horizontally / vertically
    const rootNode = nodes.find((n) => !n.parent_id);
    const childNodes = nodes.filter((n) => n.parent_id);

    if (rootNode) {
      const rootMesh = this.createNodeMesh(rootNode, -5, 0, 0, 0x10b981);
      this.scene.add(rootMesh);
      this.nodeMeshes.push(rootMesh);
      (rootMesh as any).nodeData = rootNode;
    }

    const ySpacing = 3.2;
    const startY = ((childNodes.length - 1) * ySpacing) / 2.0;

    childNodes.forEach((node, idx) => {
      const y = startY - idx * ySpacing;
      const x = 5.0;
      let color = 0x6366f1;
      if (node.node_type === 'RAG_CONFIG') color = 0x38bdf8;
      if (node.node_type === 'ADAPTER') color = 0xa855f7;
      if (node.node_type === 'PROMPT_OVERRIDE') color = 0xf59e0b;

      const mesh = this.createNodeMesh(node, x, y, 0, color);
      this.scene?.add(mesh);
      this.nodeMeshes.push(mesh);
      (mesh as any).nodeData = node;

      // Draw connecting curve
      this.drawEdge(-5, 0, 0, x, y, 0, color);
    });
  }

  private createNodeMesh(node: ModelLineageNode, x: number, y: number, z: number, color: number): THREE.Mesh {
    const geom = new THREE.SphereGeometry(node.is_current_prod ? 1.2 : 0.85, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3,
      metalness: 0.8,
      emissive: color,
      emissiveIntensity: node.is_current_prod ? 0.4 : 0.2
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    return mesh;
  }

  private drawEdge(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, color: number): void {
    if (!this.scene) return;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x1, y1, z1),
      new THREE.Vector3((x1 + x2) / 2, (y1 + y2) / 2 + 0.8, 0),
      new THREE.Vector3(x2, y2, z2)
    );
    const points = curve.getPoints(30);
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6, linewidth: 2 });
    const line = new THREE.Line(geom, mat);
    this.scene.add(line);
  }

  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);
    const time = Date.now() * 0.001;

    this.nodeMeshes.forEach((mesh, idx) => {
      mesh.rotation.y = time * 0.5 + idx;
      mesh.position.y += Math.sin(time * 2 + idx) * 0.002;
    });

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };

  onCanvasClick(event: MouseEvent): void {
    if (!this.camera) return;
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    const intersects = raycaster.intersectObjects(this.nodeMeshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as any;
      this.selectedNode = mesh.nodeData || null;
    }
  }

  closeInspect(): void {
    this.selectedNode = null;
  }
}
