import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
  HostListener,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ThemeService } from '../../../core/services/theme.service';
import { SpeechVoiceService } from '../../../core/services/speech-voice.service';
import { AgentCommandService } from '../../../core/services/agent-command.service';
import { getApiUrl } from '../../../core/config/api-config';

export type NotchTab = 'MUSIC' | 'VITALS' | 'FOCUS' | 'SHELF' | 'APPS';
export type BotMood = 'happy' | 'focus' | 'listening' | 'singing' | 'proud' | 'sleep';

export interface ClipboardItem {
  id: string;
  text: string;
  timeAgo: string;
}

@Component({
  selector: 'app-abhi-notch',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './abhi-notch.component.html',
  styleUrls: ['./abhi-notch.component.css']
})
export class AbhiNotchComponent implements OnInit, OnDestroy {
  public themeService = inject(ThemeService);
  public speechService = inject(SpeechVoiceService);
  public agentCommand = inject(AgentCommandService);
  private http = inject(HttpClient);
  private hostRef = inject(ElementRef);

  // Dynamic Island Expansion & State
  readonly isExpanded = signal<boolean>(false);
  readonly activeTab = signal<NotchTab>('MUSIC');
  readonly botMood = signal<BotMood>('happy');

  // Media Player State (Image 1 Style)
  readonly isPlaying = signal<boolean>(false);
  readonly trackTitle = signal<string>('Golden Hour');
  readonly trackArtist = signal<string>('Nova Lane');
  readonly trackLyrics = signal<string>("Windows down, the city's glowing");
  readonly currentTime = signal<number>(34); // 0:34
  readonly totalDuration = signal<number>(195); // 3:15
  readonly volume = signal<number>(80);
  readonly isMuted = signal<boolean>(false);

  private playbackTimer: any = null;
  private audioCtx: AudioContext | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;

  // System Vitals State (Image 2 Vayli Style)
  readonly cpuPercent = signal<number>(18);
  readonly ramPercent = signal<number>(54);
  readonly diskPercent = signal<number>(29);
  readonly screenTimeHours = signal<string>('4h 24m');
  readonly activeAppName = signal<string>('Visual Studio Code');
  readonly weatherTemp = signal<string>('28°');
  readonly weatherCondition = signal<string>('Sunny');

  // Focus & Pomodoro State
  readonly focusRemaining = signal<number>(1498); // 24:58
  readonly isFocusActive = signal<boolean>(false);
  private focusTimer: any = null;

  // Clipboard & Shelf State (Vayli File & Clipboard Shelf)
  readonly clipboardHistory = signal<ClipboardItem[]>([
    { id: '1', text: 'https://github.com/elayadesign/ai-design-skills', timeAgo: '2m ago' },
    { id: '2', text: 'curl http://127.0.0.1:8000/api/v1/agent/command', timeAgo: '8m ago' },
    { id: '3', text: 'Ravuvai Ayyapparayudu (Mamu) — Sovereign AI co-pilot', timeAgo: '15m ago' }
  ]);
  readonly quickNoteInput = signal<string>('');
  readonly copyFeedback = signal<string | null>(null);

  // Time & Date strings
  readonly currentTimeStr = signal<string>('');
  readonly currentDateStr = signal<string>('');
  private clockTimer: any = null;
  private telemetryTimer: any = null;

  // Progress percentage computed for music slider
  readonly progressPercent = computed(() => {
    const cur = this.currentTime();
    const tot = this.totalDuration();
    if (tot <= 0) return 0;
    return Math.min(100, Math.round((cur / tot) * 100));
  });

  // Focus Timer formatted mm:ss
  readonly formattedFocusTime = computed(() => {
    const totalSec = this.focusRemaining();
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  });

  // Music timestamps formatted
  readonly formattedCurrentTime = computed(() => {
    const s = this.currentTime();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  });

  readonly formattedRemainingTime = computed(() => {
    const rem = Math.max(0, this.totalDuration() - this.currentTime());
    const m = Math.floor(rem / 60);
    const sec = rem % 60;
    return `-${m}:${sec.toString().padStart(2, '0')}`;
  });

  ngOnInit(): void {
    this.updateClock();
    this.clockTimer = setInterval(() => this.updateClock(), 1000);
    this.startTelemetrySync();

    // Listen to speech synthesis events to reflect mood
    if (this.speechService.isSpeaking()) {
      this.botMood.set('singing');
    }
  }

  ngOnDestroy(): void {
    if (this.clockTimer) clearInterval(this.clockTimer);
    if (this.playbackTimer) clearInterval(this.playbackTimer);
    if (this.focusTimer) clearInterval(this.focusTimer);
    if (this.telemetryTimer) clearInterval(this.telemetryTimer);
    this.stopSynthAudio();
  }

  // Keyboard shortcut listener for instantaneous toggle
  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Ctrl + Space or Alt + N toggles the notch
    if ((event.ctrlKey && event.code === 'Space') || (event.altKey && event.key.toLowerCase() === 'n')) {
      event.preventDefault();
      this.toggleExpanded();
    }
    // Escape closes expanded notch
    if (event.key === 'Escape' && this.isExpanded()) {
      this.isExpanded.set(false);
    }
  }

  // Close when clicking outside expanded HUD
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isExpanded()) return;
    const target = event.target as HTMLElement;
    if (!this.hostRef.nativeElement.contains(target)) {
      this.isExpanded.set(false);
    }
  }

  toggleExpanded(): void {
    const next = !this.isExpanded();
    this.isExpanded.set(next);
    if (next) {
      this.botMood.set('happy');
    }
  }

  setTab(tab: NotchTab): void {
    this.activeTab.set(tab);
    if (tab === 'MUSIC') this.botMood.set(this.isPlaying() ? 'singing' : 'happy');
    if (tab === 'VITALS') this.botMood.set('focus');
    if (tab === 'FOCUS') this.botMood.set('focus');
  }

  setMood(mood: BotMood): void {
    this.botMood.set(mood);
  }

  // Media Player Controls
  togglePlay(): void {
    const willPlay = !this.isPlaying();
    this.isPlaying.set(willPlay);
    this.botMood.set(willPlay ? 'singing' : 'happy');

    if (willPlay) {
      this.startSynthAudio();
      this.playbackTimer = setInterval(() => {
        const cur = this.currentTime();
        if (cur >= this.totalDuration()) {
          this.currentTime.set(0);
        } else {
          this.currentTime.set(cur + 1);
        }
      }, 1000);
    } else {
      this.stopSynthAudio();
      if (this.playbackTimer) {
        clearInterval(this.playbackTimer);
        this.playbackTimer = null;
      }
    }
  }

  seek(event: any): void {
    const val = Number(event.target.value);
    const newSec = Math.round((val / 100) * this.totalDuration());
    this.currentTime.set(newSec);
  }

  nextTrack(): void {
    const tracks = [
      { title: 'Golden Hour', artist: 'Nova Lane', lyrics: "Windows down, the city's glowing" },
      { title: 'Cyber Horizon', artist: 'ABHI Core Beats', lyrics: 'Neural bus active, all agents synchronized' },
      { title: 'Starry Canopy', artist: 'Ambient Chill', lyrics: 'Calm night over the sovereign workstation' }
    ];
    const curIdx = tracks.findIndex(t => t.title === this.trackTitle());
    const next = tracks[(curIdx + 1) % tracks.length];
    this.trackTitle.set(next.title);
    this.trackArtist.set(next.artist);
    this.trackLyrics.set(next.lyrics);
    this.currentTime.set(0);
  }

  prevTrack(): void {
    this.currentTime.set(0);
  }

  openYouTube(): void {
    try {
      if (typeof window !== 'undefined') {
        const query = encodeURIComponent(`${this.trackTitle()} ${this.trackArtist()}`);
        window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
      }
    } catch {}
  }

  launchApp(appName: string): void {
    const urlMap: Record<string, string> = {
      youtube: 'https://www.youtube.com',
      whatsapp: 'https://web.whatsapp.com',
      gmail: 'https://mail.google.com',
      github: 'https://github.com/elayadesign/ai-design-skills',
      chrome: 'https://www.google.com'
    };
    if (urlMap[appName]) {
      window.open(urlMap[appName], '_blank');
    } else {
      this.agentCommand.submitCommand(`open ${appName}`);
    }
  }

  // Focus Timer controls
  toggleFocusTimer(): void {
    const next = !this.isFocusActive();
    this.isFocusActive.set(next);
    if (next) {
      this.botMood.set('focus');
      this.focusTimer = setInterval(() => {
        if (this.focusRemaining() > 0) {
          this.focusRemaining.update(v => v - 1);
        } else {
          this.isFocusActive.set(false);
          clearInterval(this.focusTimer);
          this.speechService.speak('Focus session completed, Mamu! Excellent work.', true);
        }
      }, 1000);
    } else {
      if (this.focusTimer) clearInterval(this.focusTimer);
    }
  }

  resetFocusTimer(): void {
    if (this.focusTimer) clearInterval(this.focusTimer);
    this.isFocusActive.set(false);
    this.focusRemaining.set(1500); // 25 min
  }

  // Clipboard & Notes Shelf
  copyToClipboard(item: ClipboardItem): void {
    try {
      navigator.clipboard.writeText(item.text);
      this.copyFeedback.set(`Copied: "${item.text.slice(0, 24)}..."`);
      setTimeout(() => this.copyFeedback.set(null), 2500);
    } catch {}
  }

  saveQuickNote(): void {
    const note = this.quickNoteInput().trim();
    if (!note) return;
    this.clipboardHistory.update(list => [
      { id: Date.now().toString(), text: note, timeAgo: 'Just now' },
      ...list.slice(0, 5)
    ]);
    this.quickNoteInput.set('');
    this.copyFeedback.set('Note added to Shelf!');
    setTimeout(() => this.copyFeedback.set(null), 2500);
  }

  // Live Clock & Date
  private updateClock(): void {
    const now = new Date();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const dayName = days[now.getDay()];
    const dateNum = now.getDate().toString().padStart(2, '0');
    const monthName = months[now.getMonth()];

    let h = now.getHours();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const m = now.getMinutes().toString().padStart(2, '0');

    this.currentDateStr.set(`${dayName} ${dateNum} ${monthName}`);
    this.currentTimeStr.set(`${h}:${m} ${ampm}`);
  }

  // Background Telemetry Sync
  private startTelemetrySync(): void {
    const fetchTelemetry = () => {
      this.http.get<any>(getApiUrl('/api/v1/health/system-telemetry')).subscribe({
        next: (data) => {
          if (data?.cpu) this.cpuPercent.set(Math.round(data.cpu.percent || 18));
          if (data?.memory) this.ramPercent.set(Math.round(data.memory.percent_used || 54));
          if (data?.active_window?.title) this.activeAppName.set(data.active_window.title);
        },
        error: () => {
          // Keep smooth local estimates
        }
      });
    };
    fetchTelemetry();
    this.telemetryTimer = setInterval(fetchTelemetry, 15000);
  }

  // Gentle synthesized ambient tone for music preview
  private startSynthAudio(): void {
    try {
      if (typeof window === 'undefined') return;
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.stopSynthAudio();

      // Create warm ambient chord pad
      this.ambientGain = this.audioCtx.createGain();
      this.ambientGain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
      this.ambientGain.connect(this.audioCtx.destination);

      this.ambientOsc = this.audioCtx.createOscillator();
      this.ambientOsc.type = 'sine';
      this.ambientOsc.frequency.setValueAtTime(432, this.audioCtx.currentTime); // 432 Hz healing tone
      this.ambientOsc.connect(this.ambientGain);
      this.ambientOsc.start();
    } catch {}
  }

  private stopSynthAudio(): void {
    try {
      if (this.ambientOsc) {
        this.ambientOsc.stop();
        this.ambientOsc.disconnect();
        this.ambientOsc = null;
      }
      if (this.ambientGain) {
        this.ambientGain.disconnect();
        this.ambientGain = null;
      }
    } catch {}
  }
}
