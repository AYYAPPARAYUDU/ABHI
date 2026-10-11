import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SpeechVoiceService {
  readonly isSpeaking = signal<boolean>(false);
  readonly isListening = signal<boolean>(false);
  readonly isMuted = signal<boolean>(false);
  readonly lastSpokenText = signal<string>('');
  readonly hasUserInteracted = signal<boolean>(false);

  private synth: SpeechSynthesis | null = null;
  private recognition: any = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }

      // Track user interaction to unlock audio synthesis on browser autoplay restrictions
      const unlockAudio = () => {
        if (!this.hasUserInteracted()) {
          this.hasUserInteracted.set(true);
          window.removeEventListener('click', unlockAudio);
          window.removeEventListener('keydown', unlockAudio);
        }
      };
      window.addEventListener('click', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
    }

    this.initSpeechRecognition();
  }

  private loadVoices(): void {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  private initSpeechRecognition(): void {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
      } catch {
        this.recognition = null;
      }
    }
  }

  /**
   * Speak text aloud using Web Speech API synthesis.
   */
  speak(text: string, force = false): void {
    if (this.isMuted() && !force) return;
    if (!this.synth || !text.trim()) return;

    try {
      this.synth.cancel(); // Cancel any ongoing speech

      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Prefer high quality English voice if available
      if (this.voices.length > 0) {
        const preferred = this.voices.find(
          (v) => (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Microsoft')) && v.lang.startsWith('en')
        ) || this.voices.find((v) => v.lang.startsWith('en'));
        if (preferred) {
          utterance.voice = preferred;
        }
      }

      utterance.onstart = () => {
        this.isSpeaking.set(true);
        this.lastSpokenText.set(text);
      };

      utterance.onend = () => {
        this.isSpeaking.set(false);
      };

      utterance.onerror = () => {
        this.isSpeaking.set(false);
      };

      this.synth.speak(utterance);
    } catch (err) {
      this.isSpeaking.set(false);
    }
  }

  /**
   * Initial spoken welcome greeting on app launch.
   */
  greetUserOnLaunch(): void {
    const greeting = 'Welcome to ABHI Central Intelligence. All systems online, Arc Reactor primed, ready for your command.';
    // Small delay to allow audio context to initialize
    setTimeout(() => {
      this.speak(greeting);
    }, 600);
  }

  /**
   * Toggle mute state for text-to-speech.
   */
  toggleMute(): boolean {
    const muted = !this.isMuted();
    this.isMuted.set(muted);
    if (muted && this.synth) {
      this.synth.cancel();
      this.isSpeaking.set(false);
    } else if (!muted) {
      this.speak('Voice audio enabled.');
    }
    return muted;
  }

  /**
   * Start listening to voice input from microphone with callback for transcribed text.
   */
  startVoiceListening(onResult: (text: string) => void, onEnd?: () => void): boolean {
    if (!this.recognition) return false;

    try {
      this.isListening.set(true);

      this.recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          onResult(transcript);
        }
      };

      this.recognition.onerror = () => {
        this.isListening.set(false);
        if (onEnd) onEnd();
      };

      this.recognition.onend = () => {
        this.isListening.set(false);
        if (onEnd) onEnd();
      };

      this.recognition.start();
      return true;
    } catch {
      this.isListening.set(false);
      return false;
    }
  }

  /**
   * Stop voice listening.
   */
  stopVoiceListening(): void {
    if (this.recognition && this.isListening()) {
      try {
        this.recognition.stop();
      } catch {
        // no-op
      }
    }
    this.isListening.set(false);
  }
}
