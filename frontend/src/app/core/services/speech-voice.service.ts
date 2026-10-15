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

  // Tony Stark & J.A.R.V.I.S. Persona & Dynamic Call-signs
  readonly personaMode = signal<'JARVIS' | 'FRIDAY'>('JARVIS');
  readonly userCallsign = signal<'Sir' | 'Boss' | 'Tony' | 'Partner'>('Sir');

  private synth: SpeechSynthesis | null = null;
  private recognition: any = null;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    // Restore persistent persona preferences
    if (typeof localStorage !== 'undefined') {
      const savedPersona = localStorage.getItem('abhi_persona_mode');
      if (savedPersona === 'JARVIS' || savedPersona === 'FRIDAY') {
        this.personaMode.set(savedPersona);
      }
      const savedCallsign = localStorage.getItem('abhi_user_callsign');
      if (savedCallsign && ['Sir', 'Boss', 'Tony', 'Partner'].includes(savedCallsign)) {
        this.userCallsign.set(savedCallsign as any);
      }
    }

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

  setPersonaMode(mode: 'JARVIS' | 'FRIDAY'): void {
    this.personaMode.set(mode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('abhi_persona_mode', mode);
    }
    const name = mode === 'JARVIS' ? 'J.A.R.V.I.S.' : 'F.R.I.D.A.Y.';
    this.speak(`${name} online. At your service, ${this.userCallsign()}.`, true);
  }

  setUserCallsign(callsign: 'Sir' | 'Boss' | 'Tony' | 'Partner'): void {
    this.userCallsign.set(callsign);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('abhi_user_callsign', callsign);
    }
    this.speak(`Callsign acknowledged, ${callsign}.`, true);
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
   * Sanitizes markdown, strips code blocks and special characters,
   * and produces a pleasant, concise spoken summary so the user doesn't hear
   * code syntax, symbols, or long paragraphs read aloud.
   */
  sanitizeAndSummarizeForSpeech(rawText: string): string {
    if (!rawText) return '';
    let text = rawText.trim();

    const hasCodeBlock = text.includes('```');
    const isVeryLong = text.length > 200 || (text.match(/\n/g) || []).length > 2;

    // Remove markdown code fences and their contents
    text = text.replace(/```[\s\S]*?```/g, ' ');

    // Remove markdown headers, bold, italics, links, images
    text = text.replace(/!\[.*?\]\(.*?\)/g, ''); // images
    text = text.replace(/\[([^\]]+)\]\(.*?\)/g, '$1'); // links
    text = text.replace(/`([^`]+)`/g, '$1'); // inline code
    text = text.replace(/^#+\s+/gm, ''); // headers
    text = text.replace(/(\*\*|__)(.*?)\1/g, '$2'); // bold
    text = text.replace(/(\*|_)(.*?)\1/g, '$2'); // italics
    text = text.replace(/~~(.*?)~~/g, '$2'); // strikethrough
    text = text.replace(/^[>\-\*\+]\s+/gm, ''); // lists & blockquotes
    text = text.replace(/---+/g, ''); // dividers

    // Remove emojis and miscellaneous non-alphanumeric punctuation symbols
    text = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    text = text.replace(/[\\\/\{\}\[\]<>~_=\|\^]/g, ' ');

    // Collapse whitespace
    text = text.replace(/\s+/g, ' ').trim();

    if (hasCodeBlock) {
      if (text.length > 0 && text.length < 140) {
        return `${text}. I have displayed the full implementation on your screen.`;
      }
      return 'I have generated the complete solution and code. You can review the details on your screen.';
    }

    if (isVeryLong) {
      const firstSentenceMatch = text.match(/^([^.!?]+[.!?])/);
      if (firstSentenceMatch && firstSentenceMatch[1].length < 160) {
        return `${firstSentenceMatch[1].trim()} I have displayed the complete response on your screen.`;
      }
      const truncated = text.substring(0, 130).trim();
      return `${truncated}... I have displayed the complete response on your screen.`;
    }

    return text;
  }

  /**
   * Speak text aloud using Web Speech API synthesis.
   */
  speak(text: string, force = false): void {
    if (this.isMuted() && !force) return;
    if (!this.synth || !text.trim()) return;

    const spokenText = this.sanitizeAndSummarizeForSpeech(text);
    if (!spokenText.trim()) return;

    try {
      this.synth.cancel(); // Cancel any ongoing speech

      const utterance = new SpeechSynthesisUtterance(spokenText.trim());
      const isJarvis = this.personaMode() === 'JARVIS';
      utterance.rate = isJarvis ? 1.02 : 1.06;
      utterance.pitch = isJarvis ? 0.98 : 1.06;
      utterance.volume = 1.0;

      // Select voice tuned to persona
      if (this.voices.length > 0) {
        let preferred: SpeechSynthesisVoice | undefined;
        if (isJarvis) {
          // J.A.R.V.I.S. British English / crisp tone
          preferred = this.voices.find(
            (v) => (v.lang === 'en-GB' || v.name.includes('UK') || v.name.includes('George') || v.name.includes('Ryan'))
          ) || this.voices.find(
            (v) => (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Male')) && v.lang.startsWith('en')
          ) || this.voices.find((v) => v.lang.startsWith('en'));
        } else {
          // F.R.I.D.A.Y. Irish / Neural female tone
          preferred = this.voices.find(
            (v) => (v.lang === 'en-IE' || v.name.includes('Ireland') || v.name.includes('Hazel') || v.name.includes('Sonia') || v.name.includes('Zira') || v.name.includes('Female'))
          ) || this.voices.find(
            (v) => (v.name.includes('Natural') || v.name.includes('Neural')) && v.lang.startsWith('en')
          ) || this.voices.find((v) => v.lang.startsWith('en'));
        }

        if (preferred) {
          utterance.voice = preferred;
        }
      }

      utterance.onstart = () => {
        this.isSpeaking.set(true);
        this.lastSpokenText.set(spokenText);
      };

      utterance.onend = () => {
        this.isSpeaking.set(false);
      };

      utterance.onerror = () => {
        this.isSpeaking.set(false);
      };

      this.synth.speak(utterance);
    } catch {
      this.isSpeaking.set(false);
    }
  }

  /**
   * Initial spoken welcome greeting on app launch tailored to Stark & JARVIS.
   */
  greetUserOnLaunch(): void {
    const callsign = this.userCallsign();
    const isJarvis = this.personaMode() === 'JARVIS';
    const greeting = isJarvis
      ? `Good day, ${callsign}. J.A.R.V.I.S. protocol is active. All arc reactors online, telemetry locked, and at your complete service. What are we engineering today, ${callsign}?`
      : `${callsign}, F.R.I.D.A.Y. is online and synced. Diagnostics clean, cognitive pipelines ready. Standing by for your directive.`;

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
