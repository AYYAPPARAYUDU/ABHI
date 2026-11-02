import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ThreeSceneManagerService } from '../../../../shared/3d/three-scene-manager.service';
import { AnimeInteractiveDirective } from '../../../../shared/directives/anime-interactive.directive';

export interface AudioTrackPreset {
  id: string;
  title: string;
  artist: string;
  genre: string;
  duration: number; // in seconds
  sampleRate: number;
  channels: number;
  bitDepth: number;
  c2paSigned: boolean;
  provenanceHash: string;
}

@Component({
  selector: 'app-media-audio-spectrum',
  standalone: true,
  imports: [CommonModule, FormsModule, AnimeInteractiveDirective],
  templateUrl: './media-audio-spectrum.component.html',
  styleUrl: './media-audio-spectrum.component.css',
})
export class MediaAudioSpectrumComponent implements OnInit, OnDestroy {
  private readonly threeScene = inject(ThreeSceneManagerService);
  private readonly http = inject(HttpClient);

  @ViewChild('waveformCanvas') waveformCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  // Playback state
  isPlaying = signal<boolean>(false);
  currentTime = signal<number>(0);
  duration = signal<number>(184); // Default 3:04
  volume = signal<number>(0.85);
  isMuted = signal<boolean>(false);
  playbackRate = signal<number>(1.0);
  activeTrack = signal<AudioTrackPreset>({
    id: 'track-neural',
    title: 'ABHI Autonomous Core (Cybernetic Harmonic)',
    artist: 'ABHI Audio Subsystem',
    genre: 'Algorithmic Ambient',
    duration: 184,
    sampleRate: 48000,
    channels: 2,
    bitDepth: 24,
    c2paSigned: true,
    provenanceHash: 'c2pa:sha256:7e8a92b1f4509e81dc093a21',
  });

  // TTS Narration input
  narrationText = signal<string>('Welcome to ABHI Media & Audio Studio. Multimodal generative pipelines operational.');
  narrationVoice = signal<string>('en');
  isSynthesizing = signal<boolean>(false);

  // Equalizer / Spectrum bar levels (32 bands)
  spectrumBars = signal<number[]>(new Array(32).fill(6));
  peakBars = signal<number[]>(new Array(32).fill(6));
  vuMeterLeft = signal<number>(0);
  vuMeterRight = signal<number>(0);

  // Presets
  presets: AudioTrackPreset[] = [
    {
      id: 'track-neural',
      title: 'ABHI Autonomous Core (Cybernetic Harmonic)',
      artist: 'ABHI Audio Subsystem',
      genre: 'Algorithmic Ambient',
      duration: 184,
      sampleRate: 48000,
      channels: 2,
      bitDepth: 24,
      c2paSigned: true,
      provenanceHash: 'c2pa:sha256:7e8a92b1f4509e81dc093a21',
    },
    {
      id: 'track-synthwave',
      title: 'Neon Orbit 2099 (Master Track)',
      artist: 'Diffusion Soundscape Engine',
      genre: 'Retro-Futurism',
      duration: 142,
      sampleRate: 48000,
      channels: 2,
      bitDepth: 24,
      c2paSigned: true,
      provenanceHash: 'c2pa:sha256:4b91ac0528e1460391cb0992',
    },
    {
      id: 'track-narration',
      title: 'Multimodal Spatial Narration Segment #1',
      artist: 'Local Kokoro/Piper TTS Engine',
      genre: 'Spoken Dialogue',
      duration: 48,
      sampleRate: 44100,
      channels: 1,
      bitDepth: 16,
      c2paSigned: true,
      provenanceHash: 'c2pa:sha256:aa28019e095b21041cb33902',
    },
  ];

  // Web Audio Nodes
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private oscillatorNode: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private animationFrameId: number | null = null;
  private timerInterval: any = null;

  ngOnInit(): void {
    // Ensure 3D Scene is in MEDIA mode for spectrum bar alignment
    this.threeScene.setMode('MEDIA');
    this.initAudioContext();
    this.startSpectrumLoop();
  }

  ngOnDestroy(): void {
    this.stopAudio();
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
  }

  private initAudioContext(): void {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 64; // 32 frequency bins
        this.analyser.smoothingTimeConstant = 0.8;

        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.value = this.volume();
        this.gainNode.connect(this.analyser);
        this.analyser.connect(this.audioCtx.destination);
      }
    } catch {
      // AudioContext fallback handled smoothly in simulated loop
    }
  }

  togglePlay(): void {
    if (this.isPlaying()) {
      this.pauseAudio();
    } else {
      this.playAudio();
    }
  }

  playAudio(): void {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.isPlaying.set(true);

    // If no oscillator is running, start procedural melodic ambient drone
    if (!this.oscillatorNode && this.audioCtx && this.gainNode) {
      try {
        const osc = this.audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, this.audioCtx.currentTime); // Low A

        // Modulation for cyber sound
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, this.audioCtx.currentTime);
        filter.Q.setValueAtTime(4.0, this.audioCtx.currentTime);

        osc.connect(filter);
        filter.connect(this.gainNode);
        osc.start();
        this.oscillatorNode = osc;
      } catch {
        // Fallback procedural
      }
    }

    if (!this.timerInterval) {
      this.timerInterval = setInterval(() => {
        if (this.isPlaying()) {
          const next = this.currentTime() + 1;
          if (next >= this.duration()) {
            this.currentTime.set(0);
          } else {
            this.currentTime.set(next);
          }
        }
      }, 1000 / this.playbackRate());
    }
  }

  pauseAudio(): void {
    this.isPlaying.set(false);
    if (this.oscillatorNode) {
      try {
        this.oscillatorNode.stop();
        this.oscillatorNode.disconnect();
      } catch {}
      this.oscillatorNode = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  stopAudio(): void {
    this.pauseAudio();
    this.currentTime.set(0);
  }

  seek(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.currentTime.set(parseFloat(input.value));
  }

  setVolume(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val = parseFloat(input.value);
    this.volume.set(val);
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.isMuted() ? 0 : val, this.audioCtx.currentTime);
    }
  }

  toggleMute(): void {
    this.isMuted.set(!this.isMuted());
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.isMuted() ? 0 : this.volume(), this.audioCtx.currentTime);
    }
  }

  setSpeed(speed: number): void {
    this.playbackRate.set(speed);
    if (this.timerInterval && this.isPlaying()) {
      clearInterval(this.timerInterval);
      this.timerInterval = setInterval(() => {
        if (this.isPlaying()) {
          const next = this.currentTime() + 1;
          if (next >= this.duration()) {
            this.currentTime.set(0);
          } else {
            this.currentTime.set(next);
          }
        }
      }, 1000 / speed);
    }
  }

  selectPreset(track: AudioTrackPreset): void {
    this.stopAudio();
    this.activeTrack.set(track);
    this.duration.set(track.duration);
    this.currentTime.set(0);
    this.playAudio();
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      const customTrack: AudioTrackPreset = {
        id: 'track-custom-' + Date.now(),
        title: file.name.replace(/\.[^/.]+$/, ''),
        artist: 'Local User Artifact',
        genre: file.type || 'Audio Upload',
        duration: 120,
        sampleRate: 48000,
        channels: 2,
        bitDepth: 24,
        c2paSigned: false,
        provenanceHash: 'local:hash:' + Math.random().toString(36).substring(2, 10),
      };
      this.presets.unshift(customTrack);
      this.selectPreset(customTrack);
    }
  }

  synthesizeNarration(): void {
    const text = this.narrationText().trim();
    if (!text) return;

    this.isSynthesizing.set(true);

    // Try Web Speech API for instantaneous real speech synthesis
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.playbackRate();
      utterance.volume = this.volume();

      utterance.onstart = () => {
        this.isSynthesizing.set(false);
        this.playAudio();
      };

      utterance.onend = () => {
        this.pauseAudio();
      };

      utterance.onerror = () => {
        this.isSynthesizing.set(false);
        this.playAudio();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback
      setTimeout(() => {
        this.isSynthesizing.set(false);
        this.playAudio();
      }, 500);
    }
  }

  private startSpectrumLoop(): void {
    let phase = 0;
    const dataArray = new Uint8Array(32);

    const update = () => {
      phase += 0.05;

      if (this.analyser && this.isPlaying()) {
        this.analyser.getByteFrequencyData(dataArray);
      }

      const newBars: number[] = [];
      const newPeaks = [...this.peakBars()];

      for (let i = 0; i < 32; i++) {
        let val = 4;
        if (this.isPlaying()) {
          if (this.analyser) {
            val = Math.max(6, Math.round((dataArray[i] / 255) * 88));
          } else {
            // High fidelity rhythmic synthetic simulation
            const harmonic = Math.sin(phase * 3.5 + i * 0.4) * 25 + Math.cos(phase * 1.8 - i * 0.25) * 20;
            const beat = (Math.sin(phase * 2.2) > 0.6 ? 24 : 0);
            val = Math.max(6, Math.min(94, Math.round(30 + harmonic + beat)));
          }
        } else {
          // Subtle resting breathing wave
          val = Math.max(4, Math.round(6 + Math.sin(phase * 0.8 + i * 0.2) * 4));
        }

        newBars.push(val);

        if (val > newPeaks[i]) {
          newPeaks[i] = val;
        } else {
          newPeaks[i] = Math.max(4, newPeaks[i] - 1.2);
        }
      }

      this.spectrumBars.set(newBars);
      this.peakBars.set(newPeaks);

      // Stereo VU meters
      if (this.isPlaying()) {
        const avg = newBars.reduce((a, b) => a + b, 0) / newBars.length;
        this.vuMeterLeft.set(Math.min(98, Math.round(avg * 1.05 + Math.sin(phase * 4) * 8)));
        this.vuMeterRight.set(Math.min(98, Math.round(avg * 0.98 + Math.cos(phase * 3.5) * 9)));
      } else {
        this.vuMeterLeft.set(2);
        this.vuMeterRight.set(2);
      }

      // Draw high resolution oscilloscope in canvas
      this.drawOscilloscope(phase);

      this.animationFrameId = requestAnimationFrame(update);
    };

    this.animationFrameId = requestAnimationFrame(update);
  }

  private drawOscilloscope(phase: number): void {
    if (!this.waveformCanvasRef) return;
    const canvas = this.waveformCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Glowing grid lines
    ctx.strokeStyle = 'rgba(56, 217, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Oscilloscope path
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#38d9ff';
    ctx.shadowColor = '#38d9ff';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    const sliceWidth = width / 64;
    let x = 0;

    for (let i = 0; i < 64; i++) {
      let amp = 0;
      if (this.isPlaying()) {
        amp =
          Math.sin(phase * 4.5 + i * 0.2) * 22 +
          Math.sin(phase * 9.0 + i * 0.45) * 12 +
          (Math.sin(phase * 2.0) > 0.5 ? Math.sin(i * 0.8) * 14 : 0);
      } else {
        amp = Math.sin(phase * 1.2 + i * 0.15) * 4;
      }

      const y = height / 2 + amp;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.stroke();
    ctx.shadowBlur = 0; // Reset
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
