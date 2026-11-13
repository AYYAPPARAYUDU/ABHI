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
  ChangeDetectorRef,
  HostListener
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
  PipelineItem,
  SharedBrainMemory,
  ClaudeEventLog
} from '../../models/sample-agent.model';
import { SpeechVoiceService } from '../../../../core/services/speech-voice.service';
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
  @ViewChild('walkableCanvas') walkableCanvasRef?: ElementRef<HTMLCanvasElement>;

  readonly agentService = inject(SampleAgentService);
  readonly speechVoice = inject(SpeechVoiceService, { optional: true });
  readonly themeService = inject(ThemeService, { optional: true });
  private cdr = inject(ChangeDetectorRef);

  // Layout mode & Core Signals
  readonly layoutMode = this.agentService.layoutMode;
  readonly teams = this.agentService.teams;
  readonly agents = this.agentService.agents;
  readonly filteredAgents = this.agentService.filteredAgents;
  readonly rooms = this.agentService.rooms;
  readonly entities = this.agentService.entities;
  readonly sharedBrain = this.agentService.sharedBrain;
  readonly pendingApprovals = this.agentService.pendingApprovals;
  readonly tickerFeed = this.agentService.tickerFeed;
  readonly pipelineItems = this.agentService.pipelineItems;
  readonly claudeEvents = this.agentService.claudeEvents;
  readonly activeBrainCategory = this.agentService.activeBrainCategory;
  readonly playerPos = this.agentService.playerPos;
  readonly replayCurrentStep = this.agentService.replayCurrentStep;
  readonly isReplayPlaying = this.agentService.isReplayPlaying;

  // Selected State
  readonly selectedAgent = this.agentService.selectedAgent;
  readonly selectedRoom = this.agentService.selectedRoom;
  readonly selectedEntity = this.agentService.selectedEntity;
  readonly activeApprovalModal = this.agentService.activeApprovalModal;
  readonly showMissionModal = this.agentService.showMissionModal;

  // Search & Filter Bindings
  searchQuery = '';
  selectedTeam = 'all';
  selectedRoomFilter = 'all';
  selectedStatusFilter = 'all';

  // Voice Command Input
  voiceCommandInput = '';

  // Proximity interaction target for Workspace 2
  nearbyTarget = signal<{ name: string; type: 'agent' | 'room' | 'object'; id: string; prompt: string } | null>(null);

  // 2D Walkable Canvas Animation Frame & State
  private walkableFrameId?: number;
  private keysPressed: Record<string, boolean> = {};
  private targetPlayerWalk: { x: number; y: number } | null = null;

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

  cameraPreset = signal<'iso' | 'top' | 'focus'>('iso');

  ngOnInit(): void {
    this.agentService.searchQuery.set(this.searchQuery);
  }

  ngAfterViewInit(): void {
    if (this.layoutMode() === 'workspace-2') {
      setTimeout(() => this.initWalkableCanvas(), 60);
    } else if (this.layoutMode() === 'workspace-3') {
      setTimeout(() => this.initThreeScene(), 60);
    }
  }

  ngOnDestroy(): void {
    this.disposeThreeScene();
    this.disposeWalkableCanvas();
  }

  onLayoutChange(mode: SampleLayoutMode): void {
    this.agentService.setLayoutMode(mode);
    if (mode === 'workspace-2') {
      setTimeout(() => this.initWalkableCanvas(), 60);
    } else if (mode === 'workspace-3') {
      setTimeout(() => {
        if (!this.is3dInitialized) {
          this.initThreeScene();
        } else {
          this.handleResize();
        }
      }, 60);
    }
  }

  // -------------------------------------------------------------
  // Keyboard Navigation for Workspace 2 (WASD / Arrows)
  // -------------------------------------------------------------
  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if (this.layoutMode() !== 'workspace-2') return;

    // Ignore if typing in input or textarea
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;

    this.keysPressed[event.key.toLowerCase()] = true;

    if (event.key.toLowerCase() === 'e' || event.key === ' ') {
      this.triggerProximityAction();
    }
  }

  @HostListener('window:keyup', ['$event'])
  handleKeyUp(event: KeyboardEvent): void {
    if (this.layoutMode() !== 'workspace-2') return;
    this.keysPressed[event.key.toLowerCase()] = false;
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

  setBrainCategory(cat: 'Brand rules' | 'Lessons' | 'Ideas' | 'Logs'): void {
    this.agentService.activeBrainCategory.set(cat);
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
      this.speechVoice.speak('Human authorization granted. Output reel publishing.');
    }
  }

  reject(id: string): void {
    this.agentService.rejectRequest(id);
    if (this.speechVoice) {
      this.speechVoice.speak('Publication rejected by operator.');
    }
  }

  triggerAgentTask(agentId: string, event?: Event): void {
    if (event) event.stopPropagation();
    this.agentService.triggerAgentTask(agentId);
  }

  dispatchVoiceCommand(text?: string): void {
    const cmd = text || this.voiceCommandInput;
    if (!cmd.trim()) return;
    this.agentService.dispatchVoiceMission(cmd);
    this.voiceCommandInput = '';
  }

  // Workspace 3 Replay controls
  stepReplay(stepNumber: number): void {
    this.agentService.replayCurrentStep.set(stepNumber);
  }

  toggleReplayPlay(): void {
    this.agentService.isReplayPlaying.update(p => !p);
  }

  // -------------------------------------------------------------
  // WORKSPACE 2: RETRO WALKABLE CANVAS ENGINE
  // -------------------------------------------------------------
  private initWalkableCanvas(): void {
    const canvas = this.walkableCanvasRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle canvas click to walk
    canvas.onclick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const targetX = (e.clientX - rect.left) * scaleX;
      const targetY = (e.clientY - rect.top) * scaleY;
      this.targetPlayerWalk = { x: targetX, y: targetY };
    };

    const render = () => {
      this.walkableFrameId = requestAnimationFrame(render);
      this.updatePlayerMovement();
      this.drawWalkableOffice(ctx, canvas.width, canvas.height);
    };

    render();
  }

  private updatePlayerMovement(): void {
    let dx = 0;
    let dy = 0;
    let dir: 'up' | 'down' | 'left' | 'right' = this.playerPos().dir;
    const speed = 4;

    // Keyboard movement
    if (this.keysPressed['w'] || this.keysPressed['arrowup']) {
      dy -= speed;
      dir = 'up';
    }
    if (this.keysPressed['s'] || this.keysPressed['arrowdown']) {
      dy += speed;
      dir = 'down';
    }
    if (this.keysPressed['a'] || this.keysPressed['arrowleft']) {
      dx -= speed;
      dir = 'left';
    }
    if (this.keysPressed['d'] || this.keysPressed['arrowright']) {
      dx += speed;
      dir = 'right';
    }

    // Click-to-walk movement
    if (this.targetPlayerWalk && dx === 0 && dy === 0) {
      const current = this.playerPos();
      const diffX = this.targetPlayerWalk.x - current.x;
      const diffY = this.targetPlayerWalk.y - current.y;
      const dist = Math.sqrt(diffX * diffX + diffY * diffY);

      if (dist > 5) {
        dx = (diffX / dist) * speed;
        dy = (diffY / dist) * speed;
        if (Math.abs(diffX) > Math.abs(diffY)) {
          dir = diffX > 0 ? 'right' : 'left';
        } else {
          dir = diffY > 0 ? 'down' : 'up';
        }
      } else {
        this.targetPlayerWalk = null;
      }
    }

    if (dx !== 0 || dy !== 0) {
      this.agentService.updatePlayerMovement(dx, dy, dir);
    }

    // Check proximity to nearby agents / rooms
    this.checkProximity();
  }

  private checkProximity(): void {
    const p = this.playerPos();
    let foundTarget = false;

    // Check agents
    for (const a of this.agents()) {
      const dist = Math.sqrt(Math.pow(p.x - a.x, 2) + Math.pow(p.y - a.y, 2));
      if (dist < 45) {
        this.nearbyTarget.set({
          name: a.name,
          type: 'agent',
          id: a.id,
          prompt: `[E] Talk to ${a.name} (${a.codename})`
        });
        foundTarget = true;
        break;
      }
    }

    // Check broken restroom
    if (!foundTarget) {
      const distRestroom = Math.sqrt(Math.pow(p.x - 830, 2) + Math.pow(p.y - 730, 2));
      if (distRestroom < 60) {
        this.nearbyTarget.set({
          name: 'Out of Order Restroom',
          type: 'object',
          id: 'room-restroom',
          prompt: '[E] Inspect Broken Restroom Stall'
        });
        foundTarget = true;
      }
    }

    // Check arcade cabinet in game room
    if (!foundTarget) {
      const distArcade = Math.sqrt(Math.pow(p.x - 560, 2) + Math.pow(p.y - 680, 2));
      if (distArcade < 50) {
        this.nearbyTarget.set({
          name: 'Retro Arcade Machine',
          type: 'object',
          id: 'arcade',
          prompt: '[E] Play Space Invaders'
        });
        foundTarget = true;
      }
    }

    if (!foundTarget) {
      this.nearbyTarget.set(null);
    }
  }

  private triggerProximityAction(): void {
    const target = this.nearbyTarget();
    if (!target) return;

    if (target.type === 'agent') {
      const agent = this.agents().find(a => a.id === target.id);
      if (agent) {
        this.selectAgent(agent);
        if (this.speechVoice) {
          this.speechVoice.speak(`${agent.name} here. At your service Mamu!`);
        }
      }
    } else if (target.id === 'room-restroom') {
      const room = this.rooms().find(r => r.id === 'room-restroom');
      if (room) this.selectRoom(room);
    } else if (target.id === 'arcade') {
      this.agentService.addTicker('Player got high score on retro arcade machine: 48,200 pts!', 'GAME_ROOM');
    }
  }

  private drawWalkableOffice(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // 1. Base Blueprint Floor
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, width, height);

    // Floor Tile Grid (30px grid)
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 2. Draw 10 Rooms with Walls, Rugs, and Interior
    for (const r of this.rooms()) {
      const b = r.bounds;

      // Room Floor Area
      ctx.fillStyle = r.isOutOfOrder ? 'rgba(239, 68, 68, 0.08)' : 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(b.x, b.y, b.w, b.h);

      // Inner Carpet / Sector
      ctx.fillStyle = r.themeColor + '12';
      ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);

      // Room Walls (Neon accent border)
      ctx.strokeStyle = r.themeColor;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      // Door opening (gap in wall)
      ctx.fillStyle = '#080d1a';
      ctx.fillRect(b.x + b.w / 2 - 20, b.y + b.h - 3, 40, 6);

      // Room Header Badge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, 24);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`${r.icon} ${r.name.toUpperCase()}`, b.x + 12, b.y + 22);

      // Special Room Decor
      if (r.id === 'room-gameroom') {
        // Arcade cabinet
        ctx.fillStyle = '#7c3aed';
        ctx.fillRect(b.x + 20, b.y + 40, 36, 45);
        ctx.fillStyle = '#c084fc';
        ctx.fillText('🕹️', b.x + 26, b.y + 68);

        // Ping pong table
        ctx.fillStyle = '#059669';
        ctx.fillRect(b.x + 90, b.y + 70, 70, 40);
        ctx.strokeStyle = '#ffffff';
        ctx.strokeRect(b.x + 90, b.y + 70, 70, 40);
        ctx.beginPath();
        ctx.moveTo(b.x + 125, b.y + 70);
        ctx.lineTo(b.x + 125, b.y + 110);
        ctx.stroke();
      }

      if (r.id === 'room-coffee') {
        // Bar counter
        ctx.fillStyle = '#78350f';
        ctx.fillRect(b.x + 20, b.y + 45, b.w - 40, 22);
        ctx.fillStyle = '#fde68a';
        ctx.font = '10px monospace';
        ctx.fillText('☕ ESPRESSO BAR', b.x + 30, b.y + 60);
      }

      if (r.id === 'room-restroom') {
        // Diagonal caution tape across room
        ctx.save();
        ctx.translate(b.x + 10, b.y + 60);
        ctx.rotate(-0.1);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(0, 0, b.w - 20, 18);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('⚠️ CAUTION: OUT OF ORDER', 10, 13);
        ctx.restore();

        // Water puddle
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.beginPath();
        ctx.ellipse(b.x + 110, b.y + 160, 40, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('💧 PUDDLE', b.x + 85, b.y + 164);
      }

      // Work Desks in rooms
      if (r.id === 'room-dev' || r.id === 'room-research' || r.id === 'room-creative') {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(b.x + 25, b.y + 70, 60, 25);
        ctx.fillRect(b.x + 115, b.y + 70, 60, 25);
        // glowing monitors
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(b.x + 40, b.y + 68, 30, 4);
        ctx.fillRect(b.x + 130, b.y + 68, 30, 4);
      }
    }

    // 3. Draw 40 Office Entities (Workers, Avatars, Bots)
    const entities = this.entities();
    for (const ent of entities) {
      // Body circle
      ctx.fillStyle = ent.color || '#38bdf8';
      ctx.beginPath();
      ctx.arc(ent.x, ent.y, 10, 0, Math.PI * 2);
      ctx.fill();

      // Head emoji
      ctx.font = '14px sans-serif';
      ctx.fillText(ent.avatar, ent.x - 7, ent.y - 12);

      // Name label
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(ent.x - 25, ent.y + 12, 50, 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ent.name.slice(0, 8), ent.x, ent.y + 22);
      ctx.textAlign = 'left';

      // Speech bubble if any
      if (ent.speechBubble) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        const textWidth = ctx.measureText(ent.speechBubble).width + 12;
        ctx.fillRect(ent.x - textWidth / 2, ent.y - 38, textWidth, 18);
        ctx.strokeRect(ent.x - textWidth / 2, ent.y - 38, textWidth, 18);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '9px monospace';
        ctx.fillText(ent.speechBubble, ent.x - textWidth / 2 + 6, ent.y - 25);
      }
    }

    // 4. Draw The Player Avatar (The Operator / CEO)
    const p = this.playerPos();

    // Player aura ring
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
    ctx.stroke();

    // Player Body
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 11, 0, Math.PI * 2);
    ctx.fill();

    // Player Avatar Face
    ctx.font = '18px sans-serif';
    ctx.fillText('🧑‍💼', p.x - 9, p.y - 14);

    // Operator Flag
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('YOU (OPERATOR)', p.x, p.y + 24);
    ctx.textAlign = 'left';

    // 5. Proximity Callout Badge
    const target = this.nearbyTarget();
    if (target) {
      ctx.fillStyle = '#10b981';
      ctx.fillRect(p.x - 90, p.y - 50, 180, 24);
      ctx.fillStyle = '#020617';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(target.prompt, p.x, p.y - 34);
      ctx.textAlign = 'left';
    }

    // 6. Minimap in Top Right Corner
    const mmW = 140;
    const mmH = 130;
    const mmX = width - mmW - 15;
    const mmY = 15;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(mmX, mmY, mmW, mmH);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.strokeRect(mmX, mmY, mmW, mmH);

    // Mini rooms
    for (const r of this.rooms()) {
      ctx.fillStyle = r.themeColor + '44';
      ctx.fillRect(
        mmX + (r.bounds.x / width) * mmW,
        mmY + (r.bounds.y / height) * mmH,
        (r.bounds.w / width) * mmW,
        (r.bounds.h / height) * mmH
      );
    }

    // Mini player dot
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(mmX + (p.x / width) * mmW, mmY + (p.y / height) * mmH, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private disposeWalkableCanvas(): void {
    if (this.walkableFrameId) {
      cancelAnimationFrame(this.walkableFrameId);
    }
  }

  // -------------------------------------------------------------
  // WORKSPACE 3: 3D THREE.JS WEBGL SPATIAL STUDIO
  // -------------------------------------------------------------
  private initThreeScene(): void {
    const canvas = this.holoCanvasRef?.nativeElement;
    if (!canvas || this.is3dInitialized) return;

    const width = canvas.parentElement?.clientWidth || 600;
    const height = canvas.parentElement?.clientHeight || 650;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);
    this.scene.fog = new THREE.FogExp2(0x060913, 0.015);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.setCameraPreset('iso');

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    dirLight.position.set(20, 40, 20);
    this.scene.add(dirLight);

    const purpleLight = new THREE.PointLight(0xa855f7, 2.5, 60);
    purpleLight.position.set(-15, 12, -15);
    this.scene.add(purpleLight);

    const gridHelper = new THREE.GridHelper(50, 50, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = -0.05;
    this.scene.add(gridHelper);

    // Central Shared Brain 3D Crystal
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

    // Inner glowing sphere
    const innerOrbGeo = new THREE.SphereGeometry(1.4, 24, 24);
    const innerOrbMat = new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.75 });
    const innerOrb = new THREE.Mesh(innerOrbGeo, innerOrbMat);
    this.brainCoreMesh.add(innerOrb);

    // Particle Cloud
    const particleCount = 400;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      const radius = 2.8 + Math.random() * 2.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = 3.5 + radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.12, transparent: true, opacity: 0.8 });
    this.brainParticles = new THREE.Points(particleGeo, particleMat);
    this.scene.add(this.brainParticles);

    // Spawn 31 3D Agent Satellite Nodes
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
      const ringRadius = idx < 16 ? 12 : 18;
      const angle = (idx / 16) * Math.PI * 2 + (idx >= 16 ? 0.3 : 0);

      const nodeGeo = new THREE.SphereGeometry(0.65, 16, 16);
      const nodeMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: agent.status === 'working' || agent.status === 'parallel' ? 0.9 : 0.3
      });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.y = 1.2;
      group.add(nodeMesh);

      // Tether line
      const tetherGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 3.5, 0),
        new THREE.Vector3(0, 1.2, 0)
      ]);
      const tetherMat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.25 });
      const tetherLine = new THREE.Line(tetherGeo, tetherMat);
      group.add(tetherLine);

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
    const width = canvas.parentElement?.clientWidth || 600;
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

      if (this.brainCoreMesh) {
        this.brainCoreMesh.rotation.y += 0.008;
        this.brainCoreMesh.rotation.x += 0.004;
      }
      if (this.brainParticles) {
        this.brainParticles.rotation.y -= 0.003;
      }

      const time = Date.now() * 0.0004;
      this.agent3dMeshes.forEach((item, idx) => {
        const speed = idx % 2 === 0 ? 0.15 : -0.12;
        const currentAngle = item.baseAngle + time * speed;
        item.mesh.position.x = Math.cos(currentAngle) * item.radius;
        item.mesh.position.z = Math.sin(currentAngle) * item.radius;
        item.mesh.position.y = Math.sin(time * 3 + idx) * 0.25;
      });

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    animate();
  }

  private disposeThreeScene(): void {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.handleResize);
    if (this.renderer) this.renderer.dispose();
    this.is3dInitialized = false;
  }
}
