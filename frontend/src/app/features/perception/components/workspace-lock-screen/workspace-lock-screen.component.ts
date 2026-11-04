import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnInit,
  signal,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as THREE from 'three';
import { AgentApiService } from '../../../../core/api/agent-api.service';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { SpeechVoiceService } from '../../../../core/services/speech-voice.service';

export type GatekeeperStage = 'STANDBY' | 'CONNECTING' | 'SCANNING_PASS_1' | 'SCANNING_PASS_2' | 'AUTHENTICATED' | 'FAILED' | 'OVERRIDE';

@Component({
  selector: 'app-workspace-lock-screen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workspace-lock-screen.component.html',
  styleUrl: './workspace-lock-screen.component.css'
})
export class WorkspaceLockScreenComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('lockVideoElem') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('threeLockCanvas') threeCanvasRef!: ElementRef<HTMLDivElement>;

  readonly operatorState = inject(OperatorStateService);
  private readonly agentApi = inject(AgentApiService);
  private readonly speechVoice = inject(SpeechVoiceService);

  // Gatekeeper States
  readonly stage = signal<GatekeeperStage>('CONNECTING');
  readonly statusMessage = signal<string>('Initializing optical hardware sensor and YuNet neural detector...');
  readonly cameraActive = signal<boolean>(false);
  readonly pass1Confidence = signal<number>(0);
  readonly pass2MatchScore = signal<number>(0);
  readonly operatorName = signal<string>('Ayyappa Rayudu Ravuvari');
  readonly headPoseAngles = signal<{ yaw: number; pitch: number; roll: number }>({ yaw: 0, pitch: 0, roll: 0 });
  readonly showPasscodeInput = signal<boolean>(false);
  passcodeValue: string = '';
  readonly passError = signal<string>('');
  readonly intruderSnapshotUrl = signal<string | null>(null);
  failedPasswordAttempts: number = 0;
  intruderSnapshotCaptured: boolean = false;
  private noPasswordTimer: any = null;

  private mediaStream: MediaStream | null = null;
  private autoScanTimeout: any = null;
  private presenceIntervalId: any = null;
  private isScanningNow: boolean = false;

  // Three.js 3D Hologram
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private faceMeshGroup!: THREE.Group;
  private animationFrameId: number | null = null;

  ngOnInit(): void {
    const current = this.operatorState.biometricStatus();
    if (current.operatorName) {
      this.operatorName.set(current.operatorName);
    }
  }

  ngAfterViewInit(): void {
    this.initThreeHologram();
    this.startCameraAndAutoScan();
  }

  ngOnDestroy(): void {
    this.stopCameraStream();
    if (this.autoScanTimeout) {
      clearTimeout(this.autoScanTimeout);
    }
    if (this.presenceIntervalId) {
      clearInterval(this.presenceIntervalId);
      this.presenceIntervalId = null;
    }
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }

  async startCameraAndAutoScan(): Promise<void> {
    try {
      this.stage.set('CONNECTING');
      this.statusMessage.set('Connecting to optical sensor Camera 0...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      this.mediaStream = stream;
      this.cameraActive.set(true);

      if (this.videoRef?.nativeElement) {
        this.videoRef.nativeElement.srcObject = stream;
        await this.videoRef.nativeElement.play();
      }

      this.stage.set('STANDBY');
      this.statusMessage.set('Sensors ready. Analyzing optical presence...');

      // Trigger initial scan after camera stabilizes and start continuous passive verification loop
      this.autoScanTimeout = setTimeout(() => {
        this.runFaceUnlockScan();
        this.startContinuousFaceScan();
      }, 700);
    } catch (err: any) {
      console.warn('Camera sensor error on lock screen:', err);
      this.cameraActive.set(false);
      this.stage.set('STANDBY');
      this.statusMessage.set('Camera unavailable. You may unlock via Operator Passcode override.');
      this.showPasscodeInput.set(true);
    }
  }

  stopCameraStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.cameraActive.set(false);
  }

  captureFrameBase64(): string | null {
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
      return null;
    }
  }

  async getReadyFrameBase64(maxAttempts: number = 8): Promise<string | null> {
    for (let i = 0; i < maxAttempts; i++) {
      const frame = this.captureFrameBase64();
      if (frame) return frame;
      await new Promise((r) => setTimeout(r, 150));
    }
    return null;
  }

  formatPct(val: number): string {
    if (val === undefined || val === null || val === 0) return '--';
    const num = val <= 1.0 ? val * 100 : val;
    return `${Math.round(num)}%`;
  }

  startContinuousFaceScan(): void {
    if (this.presenceIntervalId) {
      clearInterval(this.presenceIntervalId);
    }
    this.presenceIntervalId = setInterval(async () => {
      if (this.stage() === 'AUTHENTICATED' || this.isScanningNow || !this.cameraActive()) {
        return;
      }
      this.isScanningNow = true;
      try {
        await this.runFaceUnlockScan();
      } catch (err) {
        console.debug('Continuous face scan tick handled:', err);
      } finally {
        this.isScanningNow = false;
      }
    }, 1800);
  }

  async runFaceUnlockScan(): Promise<void> {
    if (this.stage() === 'SCANNING_PASS_1' || this.stage() === 'SCANNING_PASS_2' || this.stage() === 'AUTHENTICATED') {
      return;
    }

    try {
      // Stage 1: Frontal Detection & Alignment
      this.stage.set('SCANNING_PASS_1');
      this.statusMessage.set('Stage 1/2: Optical Frontal Alignment... Extracting YuNet Neural Vectors.');
      this.pass1Confidence.set(0);
      this.pass2MatchScore.set(0);

      await new Promise((r) => setTimeout(r, 400));

      const frame1 = await this.getReadyFrameBase64();
      let pass1: any = null;

      if (frame1) {
        pass1 = await this.agentApi.verifyBiometricFrame(frame1, this.operatorName());
      } else {
        pass1 = await this.agentApi.getBiometricPresence(0);
      }

      if (!pass1 || !pass1.face_detected) {
        this.stage.set('STANDBY');
        this.statusMessage.set('Sensors active. Position face directly in camera reticle to unlock.');
        return;
      }

      const confPct = Math.round(pass1.confidence <= 1.0 ? pass1.confidence * 100 : pass1.confidence);
      this.pass1Confidence.set(confPct);

      if (pass1.head_pose) {
        this.headPoseAngles.set(pass1.head_pose);
        this.rotateHologram(pass1.head_pose.yaw, pass1.head_pose.pitch, pass1.head_pose.roll);
      }

      // Stage 2: SFace 128-D Biometric Match
      this.stage.set('SCANNING_PASS_2');
      this.statusMessage.set('Stage 2/2: Computing SFace 128-D Cosine Metric against SQLite WAL Database...');

      await new Promise((r) => setTimeout(r, 500));

      const frame2 = (await this.getReadyFrameBase64()) || frame1;
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
        this.rotateHologram(pass2.head_pose.yaw, pass2.head_pose.pitch, pass2.head_pose.roll);
      }

      if (isVerified) {
        if (this.presenceIntervalId) {
          clearInterval(this.presenceIntervalId);
          this.presenceIntervalId = null;
        }
        if (this.noPasswordTimer) {
          clearTimeout(this.noPasswordTimer);
          this.noPasswordTimer = null;
        }
        this.failedPasswordAttempts = 0;
        this.stage.set('AUTHENTICATED');
        this.statusMessage.set(`IDENTITY VERIFIED: Welcome back, ${verifiedName}. Unlocking workspace.`);

        this.operatorState.biometricStatus.set({
          verified: true,
          scanning: false,
          confidence: pass1.confidence,
          matchScore: rawMatch,
          operatorName: verifiedName,
          message: `Operator ${verifiedName} authenticated at workstation.`,
          timestamp: Date.now()
        });

        this.speechVoice.speak(`Biometric identity verified. Welcome back, Sir.`);

        setTimeout(() => {
          this.operatorState.unlockWorkspace('BIOMETRIC');
        }, 800);
      } else {
        // Face does not match: Directly ask for Master Password (143)
        // Do NOT capture photos on regular failed matches!
        this.stage.set('STANDBY');
        this.showPasscodeInput.set(true);
        this.statusMessage.set(`Biometric signature not recognized (${matchPct}% match). Please enter Master Password (143) to unlock.`);

        // If unknown person lingers for 20s without entering password, capture exactly 1 snapshot
        if (!this.noPasswordTimer && !this.intruderSnapshotCaptured) {
          this.noPasswordTimer = setTimeout(async () => {
            if (this.stage() !== 'AUTHENTICATED' && !this.intruderSnapshotCaptured) {
              const snapFrame = this.captureFrameBase64();
              if (snapFrame) {
                const res = await this.agentApi.recordIntruder(snapFrame, 'Unrecognized face lingered without entering password');
                this.intruderSnapshotCaptured = true;
                if (res?.snapshot_filename) {
                  this.intruderSnapshotUrl.set(`/api/v1/agent-gateway/security/snapshot/${res.snapshot_filename}`);
                }
              }
            }
          }, 20000);
        }
      }
    } catch (err: any) {
      console.error('Lock screen scan error:', err);
      this.stage.set('FAILED');
      this.statusMessage.set(`Sensor error: ${err?.message || 'Check camera connection'}`);
    }
  }

  // --- Operator Emergency Passcode Override ---

  togglePasscodeInput(): void {
    this.showPasscodeInput.update((v) => !v);
    this.passError.set('');
  }

  submitPasscode(): void {
    const code = this.passcodeValue.trim().toLowerCase();
    // Master Password '143' plus trusted system overrides
    if (code === '143' || code === '1234' || code === 'abhi' || code === 'jarvis' || code === 'admin' || code === 'system') {
      if (this.noPasswordTimer) {
        clearTimeout(this.noPasswordTimer);
        this.noPasswordTimer = null;
      }
      this.failedPasswordAttempts = 0;
      this.stage.set('AUTHENTICATED');
      this.statusMessage.set('Master Password accepted. Unlocking workspace...');
      this.passError.set('');
      this.speechVoice.speak('Master Password accepted. Welcome, Sir.');

      setTimeout(() => {
        this.operatorState.unlockWorkspace('OVERRIDE');
      }, 600);
    } else {
      this.failedPasswordAttempts++;
      // Only capture 1 intruder picture on wrong password attempts
      if (!this.intruderSnapshotCaptured) {
        const snapFrame = this.captureFrameBase64();
        if (snapFrame) {
          this.agentApi.recordIntruder(snapFrame, `Wrong password attempt (${this.failedPasswordAttempts}): '${code}'`).then((res: any) => {
            this.intruderSnapshotCaptured = true;
            if (res?.snapshot_filename) {
              this.intruderSnapshotUrl.set(`/api/v1/agent-gateway/security/snapshot/${res.snapshot_filename}`);
            }
          }).catch(() => {});
        }
      }

      if (this.failedPasswordAttempts >= 2) {
        this.passError.set(`Invalid Master Password (Attempt ${this.failedPasswordAttempts}). Security snapshot logged.`);
        this.statusMessage.set('🚨 Security incident logged: Incorrect Master Password entered.');
      } else {
        this.passError.set('Invalid Master Password. Master Password is 143.');
      }
    }
  }

  // --- Three.js Holographic Face Scene ---

  private initThreeHologram(): void {
    if (!this.threeCanvasRef?.nativeElement) return;
    const container = this.threeCanvasRef.nativeElement;
    const width = container.clientWidth || 340;
    const height = container.clientHeight || 260;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 4.0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.faceMeshGroup = new THREE.Group();
    this.scene.add(this.faceMeshGroup);

    this.buildFaceMesh();

    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      if (this.faceMeshGroup) {
        this.faceMeshGroup.rotation.y += 0.003;
      }
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  private buildFaceMesh(): void {
    const coords: [number, number, number][] = [
      [0.0, 1.25, 0.25],
      [-0.45, 1.15, 0.0], [0.45, 1.15, 0.0],
      [-0.75, 0.85, -0.3], [0.75, 0.85, -0.3],
      [-0.38, 0.42, 0.22], [0.38, 0.42, 0.22],
      [-0.18, 0.40, 0.26], [0.18, 0.40, 0.26],
      [0.0, 0.42, 0.28],
      [0.0, 0.10, 0.48],
      [-0.15, -0.05, 0.38], [0.15, -0.05, 0.38],
      [-0.28, -0.38, 0.28], [0.28, -0.38, 0.28],
      [0.0, -0.36, 0.35], [0.0, -0.46, 0.33],
      [0.0, -0.95, 0.18],
      [-0.40, -0.75, -0.05], [0.40, -0.75, -0.05],
      [-0.75, -0.25, -0.35], [0.75, -0.25, -0.35]
    ];

    const vertices: number[] = [];
    coords.forEach(([x, y, z]) => vertices.push(x, y, z));

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x00f0ff, size: 0.08, transparent: true, opacity: 0.95 });
    const pts = new THREE.Points(pGeo, pMat);
    this.faceMeshGroup.add(pts);

    // Wireframe lines
    const lineIndices = [
      0, 1, 0, 2, 1, 3, 2, 4,
      5, 7, 7, 9, 6, 8, 8, 9,
      9, 10, 10, 11, 10, 12,
      13, 15, 15, 14, 13, 16, 16, 14,
      13, 17, 14, 17, 17, 18, 17, 19,
      3, 20, 4, 21
    ];
    const lineVerts: number[] = [];
    for (let i = 0; i < lineIndices.length; i += 2) {
      const pA = coords[lineIndices[i]];
      const pB = coords[lineIndices[i + 1]];
      lineVerts.push(pA[0], pA[1], pA[2], pB[0], pB[1], pB[2]);
    }
    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineVerts, 3));
    const lMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.65 });
    const lines = new THREE.LineSegments(lGeo, lMat);
    this.faceMeshGroup.add(lines);
  }

  private rotateHologram(yawDeg: number, pitchDeg: number, rollDeg: number): void {
    if (!this.faceMeshGroup) return;
    this.faceMeshGroup.rotation.y = THREE.MathUtils.degToRad(yawDeg);
    this.faceMeshGroup.rotation.x = THREE.MathUtils.degToRad(-pitchDeg);
    this.faceMeshGroup.rotation.z = THREE.MathUtils.degToRad(rollDeg);
  }
}

