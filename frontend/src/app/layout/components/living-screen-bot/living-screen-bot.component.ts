import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  signal,
  inject,
  HostListener,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { getApiUrl } from '../../../core/config/api-config';
import { SpeechVoiceService } from '../../../core/services/speech-voice.service';
import { landCards, pulseAura } from '../../../core/motion';

export interface ChatMessage {
  sender: 'mamu' | 'bot';
  text: string;
  timestamp: string;
}

export interface DesktopContext {
  active_window: {
    hwnd: number;
    title: string;
    is_foreground: boolean;
    rect: { left: number; top: number; right: number; bottom: number; width: number; height: number };
  };
  observation_summary: string;
  telemetry: {
    cpu_percent: number;
    memory: { total_gb: number; available_gb: number; percent_used: number };
    display: { resolution: string };
    open_windows_count: number;
    battery?: { percent: number; power_plugged: boolean };
  };
  open_applications: Array<{ hwnd: number; title: string; process_id: number }>;
}

@Component({
  selector: 'app-living-screen-bot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './living-screen-bot.component.html',
  styleUrls: ['./living-screen-bot.component.css'],
})
export class LivingScreenBotComponent implements OnInit, AfterViewInit, OnDestroy {
  private http = inject(HttpClient);
  public speechService = inject(SpeechVoiceService);

  @ViewChild('hudCard') hudCardRef?: ElementRef<HTMLElement>;
  @ViewChild('livingOrb') livingOrbRef?: ElementRef<HTMLElement>;

  // Dynamic Positioning Signals
  readonly posX = signal<number>(24);
  readonly posY = signal<number>(window.innerHeight - 380);
  readonly isDragging = signal<boolean>(false);
  private dragStartX = 0;
  private dragStartY = 0;
  private initialPosX = 0;
  private initialPosY = 0;

  // Bot Living States
  readonly isExpanded = signal<boolean>(false);
  readonly botState = signal<'IDLE' | 'LISTENING' | 'OBSERVING' | 'EXECUTING' | 'SPEAKING'>('IDLE');
  readonly currentObservation = signal<string>('Observing screen...');
  readonly activeWindowName = signal<string>('Detecting...');

  // Conversational Stream
  readonly chatInput = signal<string>('');
  readonly messages = signal<ChatMessage[]>([
    {
      sender: 'bot',
      text: "Pranam Mamu! I'm active on your screen. Say 'Hey Mamu' or click me anytime to control your PC, observe your screen, or execute tasks.",
      timestamp: 'Just now',
    },
  ]);

  // Telemetry Snapshot
  readonly telemetryData = signal<any>(null);

  // Background Speech Recognition Engine for Wake-Word
  private recognition: any = null;
  private isListeningContinuous = false;
  private contextPollingInterval: any = null;

  ngOnInit(): void {
    this.restorePosition();
    this.fetchScreenContext();
    this.initWakeWordListener();

    // Periodic lightweight screen observation update every 8 seconds
    this.contextPollingInterval = setInterval(() => {
      this.fetchScreenContext();
    }, 8000);
  }

  ngAfterViewInit(): void {
    if (this.livingOrbRef?.nativeElement) {
      pulseAura(this.livingOrbRef.nativeElement, 'rgba(0, 240, 255, 0.45)');
    }
  }

  ngOnDestroy(): void {
    if (this.contextPollingInterval) {
      clearInterval(this.contextPollingInterval);
    }
    this.stopWakeWordListener();
  }

  // --- Dynamic Positioning & Dragging ---

  private restorePosition(): void {
    try {
      const saved = localStorage.getItem('abhi_screen_bot_pos');
      if (saved) {
        const { x, y } = JSON.parse(saved);
        const maxX = Math.max(10, window.innerWidth - 380);
        const maxY = Math.max(10, window.innerHeight - 120);
        this.posX.set(Math.min(Math.max(10, x), maxX));
        this.posY.set(Math.min(Math.max(10, y), maxY));
        return;
      }
    } catch {}
    // Default: bottom right corner
    this.posX.set(Math.max(20, window.innerWidth - 380));
    this.posY.set(Math.max(20, window.innerHeight - 380));
  }

  onPointerDown(event: PointerEvent): void {
    // Only drag from handle or orb
    const target = event.target as HTMLElement;
    if (target.closest('.interactive-control')) return;

    this.isDragging.set(true);
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.initialPosX = this.posX();
    this.initialPosY = this.posY();

    event.preventDefault();
  }

  @HostListener('window:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.isDragging()) return;

    const deltaX = event.clientX - this.dragStartX;
    const deltaY = event.clientY - this.dragStartY;

    const width = this.isExpanded() ? 360 : 64;
    const height = this.isExpanded() ? 440 : 64;

    const maxX = window.innerWidth - width - 10;
    const maxY = window.innerHeight - height - 10;

    const newX = Math.min(Math.max(10, this.initialPosX + deltaX), maxX);
    const newY = Math.min(Math.max(10, this.initialPosY + deltaY), maxY);

    this.posX.set(newX);
    this.posY.set(newY);
  }

  @HostListener('window:pointerup')
  onPointerUp(): void {
    if (this.isDragging()) {
      this.isDragging.set(false);
      try {
        localStorage.setItem(
          'abhi_screen_bot_pos',
          JSON.stringify({ x: this.posX(), y: this.posY() })
        );
      } catch {}
    }
  }

  // --- Toggle Compact / Expanded (Never Closes) ---

  toggleExpanded(): void {
    const next = !this.isExpanded();
    this.isExpanded.set(next);
    if (next) {
      setTimeout(() => {
        if (this.hudCardRef?.nativeElement) {
          landCards([this.hudCardRef.nativeElement], { y: 16, duration: 0.5 });
        }
      }, 20);
    }
  }

  // --- Screen Context Observation ---

  fetchScreenContext(): void {
    this.http.get<DesktopContext>(getApiUrl('/api/v1/desktop/active-context')).subscribe({
      next: (ctx) => {
        if (ctx?.active_window?.title) {
          this.activeWindowName.set(ctx.active_window.title);
        }
        if (ctx?.observation_summary) {
          this.currentObservation.set(ctx.observation_summary);
        }
        if (ctx?.telemetry) {
          this.telemetryData.set(ctx.telemetry);
        }
      },
      error: () => {
        this.activeWindowName.set('ABHI AI Operating System');
      },
    });
  }

  // --- Wake Word Detection ("Mamu" / "Hey Mamu") ---

  private initWakeWordListener(): void {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn('SpeechRecognition API not available in browser.');
      return;
    }

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript.trim().toLowerCase();
          const isFinal = event.results[i].isFinal;

          // Check wake-word triggers
          if (
            transcript.includes('mamu') ||
            transcript.includes('hey mamu') ||
            transcript.includes('oi mamu') ||
            transcript.includes('hello mamu') ||
            transcript.includes('ok mamu')
          ) {
            this.handleWakeWordTrigger(transcript, isFinal);
            return;
          }

          // If currently in LISTENING mode, capture command
          if (this.botState() === 'LISTENING' && isFinal && transcript.length > 2) {
            this.executeDirective(transcript);
          }
        }
      };

      this.recognition.onerror = () => {
        // Automatically recover listening loop
        setTimeout(() => this.restartWakeWordListener(), 2000);
      };

      this.recognition.onend = () => {
        if (this.isListeningContinuous) {
          this.restartWakeWordListener();
        }
      };

      this.isListeningContinuous = true;
      this.recognition.start();
    } catch (e) {
      console.warn('Could not start continuous speech recognition:', e);
    }
  }

  private restartWakeWordListener(): void {
    if (!this.isListeningContinuous || !this.recognition) return;
    try {
      this.recognition.start();
    } catch {}
  }

  private stopWakeWordListener(): void {
    this.isListeningContinuous = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
  }

  private handleWakeWordTrigger(transcript: string, isFinal: boolean): void {
    this.botState.set('LISTENING');
    if (!this.isExpanded()) {
      this.isExpanded.set(true);
    }

    // Play subtle audio cue and acknowledge
    this.speechService.speakNotification("Yes Mamu, I'm listening! Tell me what to do.");

    // Extract any command spoken immediately after the wake word
    const cleaned = transcript
      .replace(/^(hey|oi|hello|ok|sun)?\s*mamu\s*/i, '')
      .trim();

    if (cleaned.length > 3 && isFinal) {
      this.executeDirective(cleaned);
    }
  }

  // --- PC Execution & Intelligent Q&A ---

  submitChat(): void {
    const query = this.chatInput().trim();
    if (!query) return;
    this.chatInput.set('');
    this.executeDirective(query);
  }

  executeDirective(query: string): void {
    // Add Mamu message to history
    this.messages.update((list) => [
      ...list,
      { sender: 'mamu', text: query, timestamp: 'Now' },
    ]);

    this.botState.set('EXECUTING');

    this.http
      .post<any>(getApiUrl('/api/v1/desktop/ask-bot'), {
        query,
        screen_context: `Active Window: ${this.activeWindowName()}`,
      })
      .subscribe({
        next: (res) => {
          const reply = res.reply || 'Task processed, Mamu.';
          this.messages.update((list) => [
            ...list,
            { sender: 'bot', text: reply, timestamp: 'Now' },
          ]);

          this.botState.set('SPEAKING');
          this.speechService.speakNotification(reply);
          setTimeout(() => this.botState.set('IDLE'), 3500);

          // Refresh screen state if an action was executed
          if (res.action_executed) {
            this.fetchScreenContext();
          }
        },
        error: () => {
          const fallback = `Mamu, I've noted your request for '${query}'. All local intelligence systems are standing by.`;
          this.messages.update((list) => [
            ...list,
            { sender: 'bot', text: fallback, timestamp: 'Now' },
          ]);
          this.botState.set('IDLE');
        },
      });
  }

  // --- Quick Action Buttons ---

  triggerQuickAction(action: string, params: any = {}): void {
    this.botState.set('EXECUTING');
    this.http
      .post<any>(getApiUrl('/api/v1/desktop/quick-action'), { action, params })
      .subscribe({
        next: (res) => {
          const message = res.message || 'Action executed, Mamu.';
          this.messages.update((list) => [
            ...list,
            { sender: 'bot', text: message, timestamp: 'Now' },
          ]);
          this.speechService.speakNotification(message);
          this.fetchScreenContext();
          setTimeout(() => this.botState.set('IDLE'), 2500);
        },
        error: () => {
          this.botState.set('IDLE');
        },
      });
  }

  observeScreenNow(): void {
    this.botState.set('OBSERVING');
    this.fetchScreenContext();
    setTimeout(() => {
      const summary = this.currentObservation();
      this.messages.update((list) => [
        ...list,
        { sender: 'bot', text: summary, timestamp: 'Now' },
      ]);
      this.speechService.speakNotification(summary);
      this.botState.set('IDLE');
    }, 600);
  }
}
