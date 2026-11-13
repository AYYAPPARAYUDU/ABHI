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
  computed,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { SampleAgentService } from '../../services/sample-agent.service';
import {
  SampleAgent,
  OfficeRoom,
  OfficeEntity,
  ApprovalRequest,
  SampleLayoutMode,
  AgentTeam
} from '../../models/sample-agent.model';
import { SpeechVoiceService } from '../../../../core/services/speech-voice.service';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { ThemeService } from '../../../../core/services/theme.service';

@Component({
  selector: 'app-sample-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sample-page.component.html',
  styleUrl: './sample-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SamplePageComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('holoCanvas') holoCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly agentService = inject(SampleAgentService);
  readonly speechVoice = inject(SpeechVoiceService, { optional: true });
  readonly operatorState = inject(OperatorStateService, { optional: true });
  readonly themeService = inject(ThemeService, { optional: true });
  private cdr = inject(ChangeDetectorRef);

  // Layout mode signal wrapper
  readonly layoutMode = this.agentService.layoutMode;
  readonly teams = this.agentService.teams;
  readonly agents = this.agentService.agents;
  readonly filteredAgents = this.agentService.filteredAgents;
  readonly rooms = this.agentService.rooms;
  readonly entities = this.agentService.entities;
  readonly sharedBrain = this.agentService.sharedBrain;
  readonly pendingApprovals = this.agentService.pendingApprovals;
  readonly tickerFeed = this.agentService.tickerFeed;

  // Modals & Drawers
  readonly selectedAgent = this.agentService.selectedAgent;
  readonly selectedRoom = this.agentService.selectedRoom;
  readonly selectedEntity = this.agentService.selectedEntity;
  readonly activeApprovalModal = this.agentService.activeApprovalModal;
  readonly showMissionModal = this.agentService.showMissionModal;

  // Filter bindings
  searchQuery = '';
  selectedTeam = 'all';
  selectedRoomFilter = 'all';
  selectedStatusFilter = 'all';

  // Mission dispatch form
  missionPrompt = '';
  missionTargetTeam = 'all';

  // Three.js 3D variables for Workspace 3
  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private animFrameId?: number;
  private brainCoreMesh?: THREE.Mesh;
  private brainParticles?: THREE.Points;
  private agent3dMeshes: { mesh: THREE.Group; agentId: string; baseAngle: number; radius: number }[] = [];
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private is3dInitialized = false;

  // 3D Camera Controls
  cameraPreset = signal<'iso' | 'top' | 'focus'>('iso');

  ngOnInit(): void {
    // Sync initial filters
    this.agentService.searchQuery.set(this.searchQuery);
  }

  ngAfterViewInit(): void {
    if (this.layoutMode() === 'workspace-3') {
      setTimeout(() => this.initThreeScene(), 100);
    }
  }

  ngOnDestroy(): void {
    this.disposeThreeScene();
  }

  onLayoutChange(mode: SampleLayoutMode): void {
    this.agentService.setLayoutMode(mode);
    if (mode === 'workspace-3') {
      setTimeout(() => {
        if (!this.is3dInitialized) {
          this.initThreeScene();
        } else {
          this.handleResize();
        }
      }, 80);
    }
  }

  onSearchChange(): void {
    this.agentService.searchQuery.set(this.searchQuery);
  }

  onTeamFilterChange(): void {
    this.agentService.selectedTeamId.set(this.selectedTeam);
  }

  onRoomFilterChange(): void {
    this.agentService.selectedRoomId.set(this.selectedRoomFilter);
  }

  onStatusFilterChange(): void {
    this.agentService.selectedStatus.set(this.selectedStatusFilter);
  }

  selectAgent(agent: SampleAgent): void {
    this.agentService.selectAgent(agent);
  }

  closeAgentDrawer(): void {
    this.agentService.selectAgent(null);
  }

  selectRoom(room: OfficeRoom): void {
    this.agentService.selectRoom(room);
  }

  closeRoomDrawer(): void {
    this.agentService.selectRoom(null);
  }

  selectEntity(entity: OfficeEntity): void {
    this.agentService.selectEntity(entity);
  }

  closeEntityDrawer(): void {
    this.agentService.selectEntity(null);
  }

  openApproval(approval: ApprovalRequest): void {
    this.agentService.openApprovalModal(approval);
  }

  closeApproval(): void {
    this.agentService.closeApprovalModal();
  }

  approve(id: string): void {
    this.agentService.approveRequest(id);
    if (this.speechVoice) {
      this.speechVoice.speak('Human authorization granted. Task executing.');
    }
  }

  reject(id: string): void {
    this.agentService.rejectRequest(id);
    if (this.speechVoice) {
      this.speechVoice.speak('Action rejected by operator.');
    }
  }

  triggerAgentTask(agentId: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.agentService.triggerAgentTask(agentId);
  }

  openMissionModal(): void {
    this.agentService.showMissionModal.set(true);
  }

  closeMissionModal(): void {
    this.agentService.showMissionModal.set(false);
  }

  dispatchPreset(type: string): void {
    let prompt = '';
    let team = 'all';

    switch (type) {
      case 'github-scan':
        prompt = 'Scan GitHub trending repositories for high-momentum AI frameworks and extract architectures';
        team = 'team-research';
        break;
      case 'cut-video':
        prompt = 'Auto-cut screen walkthrough footage, run Whisper word-level transcription, and render animated captions';
        team = 'team-creative';
        break;
      case 'viral-hook':
        prompt = 'Engineer 5 viral 3-second opening hooks with curiosity gap formulas for Reels and YouTube Shorts';
        team = 'team-scripts';
        break;
      case 'schedule-social':
        prompt = 'Queue 7-tweet breakdown and prepare vertical video release schedule for peak dev traffic';
        team = 'team-social';
        break;
      case 'safety-audit':
        prompt = 'Perform comprehensive PII leak scan, secret check, and verify human-in-the-loop approval barriers';
        team = 'team-safety';
        break;
      default:
        prompt = 'Synchronize all 31 agents across 8 teams and update Shared Brain memory vector index';
        team = 'all';
    }

    this.agentService.dispatchMission(prompt, team);
  }

  submitCustomMission(): void {
    if (!this.missionPrompt.trim()) return;
    this.agentService.dispatchMission(this.missionPrompt, this.missionTargetTeam);
    this.missionPrompt = '';
  }

  getEntitiesForRoom(roomId: string): OfficeEntity[] {
    return this.entities().filter(e => e.roomId === roomId);
  }

  getRoomOccupantCount(roomId: string): number {
    return this.getEntitiesForRoom(roomId).length;
  }

  // -------------------------------------------------------------
  // Workspace 3: Three.js 3D Holo-Matrix Spatial Center
  // -------------------------------------------------------------
  private initThreeScene(): void {
    const canvas = this.holoCanvasRef?.nativeElement;
    if (!canvas || this.is3dInitialized) return;

    const width = canvas.parentElement?.clientWidth || 900;
    const height = canvas.parentElement?.clientHeight || 650;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);
    this.scene.fog = new THREE.FogExp2(0x060913, 0.015);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.setCameraPreset('iso');

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    dirLight.position.set(20, 40, 20);
    this.scene.add(dirLight);

    const purpleLight = new THREE.PointLight(0xa855f7, 2.5, 60);
    purpleLight.position.set(-15, 12, -15);
    this.scene.add(purpleLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 2.5, 60);
    cyanLight.position.set(15, 12, 15);
    this.scene.add(cyanLight);

    // 5. Ground Grid & Cyber Platform
    const gridHelper = new THREE.GridHelper(50, 50, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = -0.05;
    this.scene.add(gridHelper);

    // Cyber Base Ring
    const ringGeo = new THREE.RingGeometry(18, 18.5, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.02;
    this.scene.add(ringMesh);

    // Inner Ring
    const innerRingGeo = new THREE.RingGeometry(6, 6.3, 48);
    const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xec4899, side: THREE.DoubleSide });
    const innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRingMesh.rotation.x = Math.PI / 2;
    innerRingMesh.position.y = 0.03;
    this.scene.add(innerRingMesh);

    // 6. Central Shared Brain 3D Crystal
    const brainGeo = new THREE.IcosahedronGeometry(2.5, 1);
    const brainMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      wireframe: true,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9
    });
    this.brainCoreMesh = new THREE.Mesh(brainGeo, brainMat);
    this.brainCoreMesh.position.set(0, 3.5, 0);
    this.scene.add(this.brainCoreMesh);

    // Brain Inner Solid Orb
    const innerOrbGeo = new THREE.SphereGeometry(1.4, 24, 24);
    const innerOrbMat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 0.75
    });
    const innerOrb = new THREE.Mesh(innerOrbGeo, innerOrbMat);
    this.brainCoreMesh.add(innerOrb);

    // Particle Cloud around Brain
    const particleCount = 450;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      const radius = 2.8 + Math.random() * 2.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = 3.5 + radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.12,
      transparent: true,
      opacity: 0.8
    });
    this.brainParticles = new THREE.Points(particleGeo, particleMat);
    this.scene.add(this.brainParticles);

    // 7. Spawn 31 3D Agent Satellite Nodes in Orbital Rings
    this.agent3dMeshes = [];
    const agentsList = this.agents();
    const teamColors: Record<string, number> = {
      'team-research': 0x38bdf8,
      'team-scripts': 0xa855f7,
      'team-creative': 0xec4899,
      'team-social': 0xf59e0b,
      'team-code': 0x10b981,
      'team-safety': 0xef4444,
      'team-analytics': 0x06b6d4,
      'team-operations': 0x8b5cf6
    };

    agentsList.forEach((agent, idx) => {
      const group = new THREE.Group();
      const colorHex = teamColors[agent.teamId] || 0x38bdf8;

      // Outer ring vs inner ring
      const ringRadius = idx < 16 ? 12 : 18;
      const angle = (idx / 16) * Math.PI * 2 + (idx >= 16 ? 0.3 : 0);

      // Agent Node Orb
      const nodeGeo = new THREE.SphereGeometry(0.65, 16, 16);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: agent.status === 'working' || agent.status === 'parallel' ? 0.9 : 0.3,
        roughness: 0.2
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.y = 1.2;
      group.add(nodeMesh);

      // Glowing Tether to Central Brain
      const tetherPoints = [
        new THREE.Vector3(0, 3.5, 0),
        new THREE.Vector3(0, 1.2, 0)
      ];
      const tetherGeo = new THREE.BufferGeometry().setFromPoints(tetherPoints);
      const tetherMat = new THREE.LineBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.25
      });
      const tetherLine = new THREE.Line(tetherGeo, tetherMat);
      group.add(tetherLine);

      // Floor Marker Disc
      const discGeo = new THREE.RingGeometry(0.8, 1.0, 16);
      const discMat = new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.rotation.x = Math.PI / 2;
      disc.position.y = 0.05;
      group.add(disc);

      group.position.x = Math.cos(angle) * ringRadius;
      group.position.z = Math.sin(angle) * ringRadius;

      this.scene?.add(group);
      this.agent3dMeshes.push({
        mesh: group,
        agentId: agent.id,
        baseAngle: angle,
        radius: ringRadius
      });
    });

    // 8. Event listeners
    window.addEventListener('resize', this.handleResize);
    canvas.addEventListener('click', this.handleCanvasClick);

    this.is3dInitialized = true;
    this.startAnimationLoop();
  }

  setCameraPreset(preset: 'iso' | 'top' | 'focus'): void {
    this.cameraPreset.set(preset);
    if (!this.camera) return;

    if (preset === 'iso') {
      this.camera.position.set(24, 28, 24);
      this.camera.lookAt(0, 2, 0);
    } else if (preset === 'top') {
      this.camera.position.set(0, 38, 0.001);
      this.camera.lookAt(0, 0, 0);
    } else if (preset === 'focus') {
      this.camera.position.set(12, 10, 14);
      this.camera.lookAt(0, 3.5, 0);
    }
  }

  private handleResize = (): void => {
    const canvas = this.holoCanvasRef?.nativeElement;
    if (!canvas || !this.renderer || !this.camera) return;

    const width = canvas.parentElement?.clientWidth || 900;
    const height = canvas.parentElement?.clientHeight || 650;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private handleCanvasClick = (event: MouseEvent): void => {
    const canvas = this.holoCanvasRef?.nativeElement;
    if (!canvas || !this.camera || !this.scene) return;

    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      // Find matching agent
      const hit = intersects[0].object;
      for (const item of this.agent3dMeshes) {
        if (item.mesh.children.includes(hit as any) || item.mesh === hit.parent) {
          const agent = this.agents().find(a => a.id === item.agentId);
          if (agent) {
            this.selectAgent(agent);
            this.cdr.markForCheck();
            return;
          }
        }
      }
    }
  };

  private startAnimationLoop(): void {
    const animate = () => {
      this.animFrameId = requestAnimationFrame(animate);

      // Rotate Brain Core
      if (this.brainCoreMesh) {
        this.brainCoreMesh.rotation.y += 0.008;
        this.brainCoreMesh.rotation.x += 0.004;
      }

      // Rotate Particle Cloud
      if (this.brainParticles) {
        this.brainParticles.rotation.y -= 0.003;
      }

      // Slow orbital orbit of agents
      const time = Date.now() * 0.0004;
      this.agent3dMeshes.forEach((item, idx) => {
        const speed = idx % 2 === 0 ? 0.15 : -0.12;
        const currentAngle = item.baseAngle + time * speed;
        item.mesh.position.x = Math.cos(currentAngle) * item.radius;
        item.mesh.position.z = Math.sin(currentAngle) * item.radius;

        // Subtle vertical floating bob
        item.mesh.position.y = Math.sin(time * 3 + idx) * 0.25;
      });

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    animate();
  }

  private disposeThreeScene(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
    const canvas = this.holoCanvasRef?.nativeElement;
    if (canvas) {
      canvas.removeEventListener('click', this.handleCanvasClick);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
    this.is3dInitialized = false;
  }
}
