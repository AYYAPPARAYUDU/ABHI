import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnInit,
  signal,
  inject,
  NgZone,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { AgentApiService } from '../../../../core/api/agent-api.service';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { SpeechVoiceService } from '../../../../core/services/speech-voice.service';

export type ScanStage = 'STANDBY' | 'INITIALIZING_CAMERA' | 'PASS_1_FRONTAL' | 'PASS_2_VERIFICATION' | 'AUTHENTICATED' | 'FAILED';

@Component({
  selector: 'app-biometric-face-scanner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './biometric-face-scanner.component.html',
  styleUrl: './biometric-face-scanner.component.css'
})
export class BiometricFaceScannerComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() isModal: boolean = false;
  @Output() closeRequested = new EventEmitter<void>();

  @ViewChild('videoElem') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('threeCanvasContainer') threeCanvasRef!: ElementRef<HTMLDivElement>;

  private readonly agentApi = inject(AgentApiService);
  readonly operatorState = inject(OperatorStateService);
  private readonly speechVoice = inject(SpeechVoiceService);
  private readonly ngZone = inject(NgZone);

  // Scanner UI States
  readonly scanStage = signal<ScanStage>('STANDBY');
  readonly statusMessage = signal<string>('Optical Biometric Scanner Ready. Stand by for directive.');
  readonly cameraActive = signal<boolean>(false);
  readonly pass1Confidence = signal<number>(0);
  readonly pass2MatchScore = signal<number>(0);
  readonly operatorName = signal<string>('Ayyappa Rayudu Ravuvari');
  readonly headPoseAngles = signal<{ yaw: number; pitch: number; roll: number }>({ yaw: 0, pitch: 0, roll: 0 });

  // Camera stream
  private mediaStream: MediaStream | null = null;

  // Three.js 3D Facial Hologram
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private faceMeshGroup!: THREE.Group;
  private landmarkPoints!: THREE.Points;
  private wireframeLines!: THREE.LineSegments;
  private orbitalRing!: THREE.Mesh;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  ngOnInit(): void {
    // Initial verification status sync
    const current = this.operatorState.biometricStatus();
    if (current.verified) {
      this.operatorName.set(current.operatorName);
      this.pass1Confidence.set(Math.round(current.confidence <= 1 ? current.confidence * 100 : current.confidence));
      this.pass2MatchScore.set(Math.round(current.matchScore <= 1 ? current.matchScore * 100 : current.matchScore));
    }
  }

  ngAfterViewInit(): void {
    this.initThreeFaceScene();
    this.startCameraStream();
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    this.stopCameraStream();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  // --- Real Optical Camera Stream ---

  async startCameraStream(): Promise<void> {
    this.scanStage.set('INITIALIZING_CAMERA');
    this.statusMessage.set('Connecting to hardware optical sensor...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      this.mediaStream = stream;
      this.cameraActive.set(true);

      if (this.videoRef?.nativeElement) {
        this.videoRef.nativeElement.srcObject = stream;
        await this.videoRef.nativeElement.play();
      }

      this.scanStage.set('STANDBY');
      this.statusMessage.set('Optical sensor live. Position face within biometric HUD reticle.');
    } catch (err: any) {
      console.warn('Optical webcam access error:', err);
      this.cameraActive.set(false);
      this.scanStage.set('STANDBY');
      this.statusMessage.set('Camera stream active via backend hardware driver.');
    }
  }

  stopCameraStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.cameraActive.set(false);
  }

  captureCurrentFrameBase64(): string | null {
    const video = this.videoRef?.nativeElement;
    if (!video || !video.videoWidth || !video.videoHeight) {
      return null;
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.90);
    } catch (err) {
      console.warn('Failed to capture frame from video canvas:', err);
      return null;
    }
  }

  // --- Real Dual-Pass Neural Authentication Execution ---

  async runDualPassScan(): Promise<void> {
    if (this.scanStage() === 'PASS_1_FRONTAL' || this.scanStage() === 'PASS_2_VERIFICATION') {
      return;
    }

    try {
      // Stage 1: Frontal Scan & Feature Extraction
      this.scanStage.set('PASS_1_FRONTAL');
      this.statusMessage.set('Stage 1/2: Frontal alignment... Capturing live optical frame.');

      await new Promise((r) => setTimeout(r, 600));

      const frame1 = this.captureCurrentFrameBase64();
      let pass1: any = null;

      if (frame1) {
        pass1 = await this.agentApi.verifyBiometricFrame(frame1, this.operatorName());
      } else {
        pass1 = await this.agentApi.getBiometricPresence(0);
      }

      if (!pass1 || !pass1.face_detected) {
        this.scanStage.set('FAILED');
        this.statusMessage.set(pass1?.message || 'Face alignment failed. Please look directly into the camera.');
        return;
      }

      const confPct = Math.round(pass1.confidence <= 1.0 ? pass1.confidence * 100 : pass1.confidence);
      this.pass1Confidence.set(confPct);

      if (pass1.head_pose) {
        this.headPoseAngles.set(pass1.head_pose);
        this.rotate3DFace(pass1.head_pose.yaw, pass1.head_pose.pitch, pass1.head_pose.roll);
      }

      // Stage 2: Verification & Cosine Match
      this.scanStage.set('PASS_2_VERIFICATION');
      this.statusMessage.set('Stage 2/2: Verifying 128-D biometric signature & 3D pose...');

      await new Promise((r) => setTimeout(r, 700));

      const frame2 = this.captureCurrentFrameBase64() || frame1;
      let pass2: any = null;

      if (frame2) {
        pass2 = await this.agentApi.verifyBiometricFrame(frame2, this.operatorName());
      } else {
        pass2 = await this.agentApi.getBiometricPresence(0);
      }

      const isVerified = pass2?.is_verified ?? false;
      const rawMatch = pass2?.match_score ?? 0;
      const matchPct = Math.round(rawMatch <= 1.0 ? rawMatch * 100 : rawMatch);
      const verifiedName = pass2?.operator_name || this.operatorName();

      this.pass2MatchScore.set(matchPct);
      this.operatorName.set(verifiedName);

      if (pass2?.head_pose) {
        this.headPoseAngles.set(pass2.head_pose);
        this.rotate3DFace(pass2.head_pose.yaw, pass2.head_pose.pitch, pass2.head_pose.roll);
      }

      if (isVerified) {
        this.scanStage.set('AUTHENTICATED');
        this.statusMessage.set(`Authentication Confirmed: ${verifiedName} (Match: ${matchPct}%)`);

        // Update global operator state
        this.operatorState.biometricStatus.set({
          verified: true,
          scanning: false,
          confidence: pass1.confidence,
          matchScore: rawMatch,
          operatorName: verifiedName,
          message: `Operator ${verifiedName} authenticated at workstation.`,
          timestamp: Date.now()
        });

        // Unlock workspace Gatekeeper
        this.operatorState.unlockWorkspace('BIOMETRIC');

        this.speechVoice.speak(`Biometric authentication confirmed, Sir. Welcome.`);
      } else {
        this.scanStage.set('FAILED');
        this.statusMessage.set(`Face detected (${confPct}% confidence), but signature did not match ${this.operatorName()} (${matchPct}%). Please re-align or re-enroll.`);
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      this.scanStage.set('FAILED');
      this.statusMessage.set(`Biometric scan error: ${err?.message || 'Check camera connection'}`);
    }
  }

  async reEnrollOperator(): Promise<void> {
    this.statusMessage.set('Capturing fresh enrollment embedding into SQLite WAL...');
    try {
      const frame = this.captureCurrentFrameBase64();
      let res: any;
      if (frame) {
        res = await this.agentApi.enrollBiometricFrame(frame, this.operatorName());
      } else {
        res = await this.agentApi.enrollBiometrics(this.operatorName(), 0);
      }
      this.statusMessage.set(res?.message || 'Biometrics enrolled successfully.');
      await this.runDualPassScan();
    } catch (err: any) {
      this.statusMessage.set(`Enrollment error: ${err?.message}`);
    }
  }

  // --- Three.js 3D Facial Hologram Construction ---

  private initThreeFaceScene(): void {
    const container = this.threeCanvasRef.nativeElement;
    const width = container.clientWidth || 360;
    const height = container.clientHeight || 280;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 4.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.faceMeshGroup = new THREE.Group();
    this.scene.add(this.faceMeshGroup);

    // 1. Construct 3D Facial Landmark Wireframe & Point Cloud
    this.build3DFaceGeometry();

    // 2. Add Rotating Holographic Telemetry Rings
    const ringGeo = new THREE.RingGeometry(1.65, 1.68, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35
    });
    this.orbitalRing = new THREE.Mesh(ringGeo, ringMat);
    this.orbitalRing.rotation.x = Math.PI / 2.3;
    this.faceMeshGroup.add(this.orbitalRing);

    // 3. Ambient & Point Lighting
    const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambLight);

    const cyanPointLight = new THREE.PointLight(0x00f0ff, 2.5, 10);
    cyanPointLight.position.set(2, 3, 4);
    this.scene.add(cyanPointLight);

    // Start render loop
    this.ngZone.runOutsideAngular(() => {
      this.animateLoop();
    });
  }

  private build3DFaceGeometry(): void {
    // Anatomical 3D landmark points representing human face topology
    const facePoints: [number, number, number][] = [
      // Forehead & Crown
      [0, 1.4, 0.1], [-0.5, 1.3, 0.0], [0.5, 1.3, 0.0], [-0.9, 1.0, -0.3], [0.9, 1.0, -0.3],
      // Eyebrows
      [-0.6, 0.65, 0.45], [-0.3, 0.72, 0.55], [-0.05, 0.68, 0.58],
      [0.05, 0.68, 0.58], [0.3, 0.72, 0.55], [0.6, 0.65, 0.45],
      // Left Eye Orbit
      [-0.55, 0.45, 0.4], [-0.35, 0.52, 0.48], [-0.15, 0.45, 0.48], [-0.35, 0.38, 0.44],
      // Right Eye Orbit
      [0.15, 0.45, 0.48], [0.35, 0.52, 0.48], [0.55, 0.45, 0.4], [0.35, 0.38, 0.44],
      // Nose Ridge & Tip
      [0, 0.5, 0.6], [0, 0.25, 0.75], [0, 0.0, 0.95], [-0.15, -0.08, 0.8], [0.15, -0.08, 0.8],
      // Cheeks
      [-0.85, 0.1, 0.2], [-0.65, -0.15, 0.45], [0.65, -0.15, 0.45], [0.85, 0.1, 0.2],
      // Mouth & Lips
      [-0.35, -0.35, 0.65], [-0.15, -0.3, 0.78], [0, -0.28, 0.82], [0.15, -0.3, 0.78], [0.35, -0.35, 0.65],
      [-0.2, -0.45, 0.72], [0, -0.48, 0.75], [0.2, -0.45, 0.72],
      // Jawline & Chin
      [-0.95, -0.2, -0.2], [-0.75, -0.65, 0.15], [-0.45, -1.0, 0.5],
      [0, -1.15, 0.65],
      [0.45, -1.0, 0.5], [0.75, -0.65, 0.15], [0.95, -0.2, -0.2]
    ];

    const vertices: number[] = [];
    facePoints.forEach(([x, y, z]) => vertices.push(x, y, z));

    // Particle Cloud (Landmark nodes)
    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

    const pointsMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.08,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    this.landmarkPoints = new THREE.Points(pointsGeo, pointsMat);
    this.faceMeshGroup.add(this.landmarkPoints);

    // Anatomical Wireframe Connections
    const lineIndices: number[] = [
      // Eyebrows
      5, 6, 6, 7, 8, 9, 9, 10,
      // Left eye
      11, 12, 12, 13, 13, 14, 14, 11,
      // Right eye
      15, 16, 16, 17, 17, 18, 18, 15,
      // Nose
      7, 19, 8, 19, 19, 20, 20, 21, 21, 22, 21, 23, 22, 23,
      // Upper lips
      28, 29, 29, 30, 30, 31, 31, 32,
      // Lower lips
      28, 33, 33, 34, 34, 35, 35, 32, 29, 33, 30, 34, 31, 35,
      // Jaw
      36, 37, 37, 38, 38, 39, 39, 40, 40, 41, 41, 42,
      // Cheeks to jaw
      24, 36, 25, 37, 26, 41, 27, 42,
      // Brow to forehead
      1, 5, 0, 7, 0, 8, 2, 10
    ];

    const lineGeo = new THREE.BufferGeometry();
    const linePositions: number[] = [];
    for (let i = 0; i < lineIndices.length; i += 2) {
      const idxA = lineIndices[i];
      const idxB = lineIndices[i + 1];
      const ptA = facePoints[idxA];
      const ptB = facePoints[idxB];
      linePositions.push(ptA[0], ptA[1], ptA[2], ptB[0], ptB[1], ptB[2]);
    }
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));

    const lineMat = new THREE.LineBasicMaterial({
      color: 0x38d9ff,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    this.wireframeLines = new THREE.LineSegments(lineGeo, lineMat);
    this.faceMeshGroup.add(this.wireframeLines);
  }

  private animateLoop(): void {
    const render = () => {
      this.animationFrameId = requestAnimationFrame(render);

      // Subtle breathing rotation
      if (this.orbitalRing) {
        this.orbitalRing.rotation.z += 0.008;
      }

      // Gentle idle sway if standing by
      if (this.scanStage() === 'STANDBY' || this.scanStage() === 'AUTHENTICATED') {
        const time = Date.now() * 0.001;
        this.faceMeshGroup.rotation.y += Math.sin(time) * 0.0015;
      }

      this.renderer.render(this.scene, this.camera);
    };
    render();
  }

  private rotate3DFace(yaw: number, pitch: number, roll: number): void {
    // Convert Euler angles in degrees to radians
    const yawRad = THREE.MathUtils.degToRad(-yaw);
    const pitchRad = THREE.MathUtils.degToRad(-pitch);
    const rollRad = THREE.MathUtils.degToRad(roll);

    this.faceMeshGroup.rotation.y = yawRad;
    this.faceMeshGroup.rotation.x = pitchRad;
    this.faceMeshGroup.rotation.z = rollRad;
  }

  private setupResizeObserver(): void {
    const container = this.threeCanvasRef.nativeElement;
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

  onDismiss(): void {
    this.stopCameraStream();
    this.closeRequested.emit();
  }
}

