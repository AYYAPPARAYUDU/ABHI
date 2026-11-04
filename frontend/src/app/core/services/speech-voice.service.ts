import { Injectable, signal } from '@angular/core';
import { getApiUrl } from '../config/api-config';

export type AppLanguage = 'auto' | 'en' | 'te' | 'hi' | 'ta';

@Injectable({
  providedIn: 'root'
})
export class SpeechVoiceService {
  readonly isSpeaking = signal<boolean>(false);
  readonly isListening = signal<boolean>(false);
  readonly isAlexaConversationMode = signal<boolean>(false);
  private alexaCommandCallback: ((text: string) => void) | null = null;
  readonly isMuted = signal<boolean>(false);
  readonly lastSpokenText = signal<string>('');
  readonly hasUserInteracted = signal<boolean>(false);

  // Universal Language Selection Signal
  readonly selectedLanguage = signal<AppLanguage>('auto');

  // Tony Stark & J.A.R.V.I.S. Persona & Dynamic Call-signs
  readonly personaMode = signal<'JARVIS' | 'FRIDAY'>('JARVIS');
  readonly userCallsign = signal<'Sir' | 'Boss' | 'Tony' | 'Partner'>('Sir');

  // Natural Human Voice & Instagram Reel Subtitle Signals
  readonly speechSpeedRate = signal<number>(1.0);
  readonly activeWord = signal<string>('');
  readonly activeWordIndex = signal<number>(-1);
  readonly spokenWords = signal<string[]>([]);
  readonly selectedVoiceName = signal<string>('Natural Neural Voice');

  private synth: SpeechSynthesis | null = null;
  private recognition: any = null;
  private voices: SpeechSynthesisVoice[] = [];
  private sharedAudioCtx: AudioContext | null = null;

  constructor() {
    // Restore persistent persona preferences
    if (typeof localStorage !== 'undefined') {
      const savedLang = localStorage.getItem('abhi_selected_language');
      if (savedLang && ['auto', 'en', 'te', 'hi', 'ta'].includes(savedLang)) {
        this.selectedLanguage.set(savedLang as AppLanguage);
      }
      const savedPersona = localStorage.getItem('abhi_persona_mode');
      if (savedPersona === 'JARVIS' || savedPersona === 'FRIDAY') {
        this.personaMode.set(savedPersona);
      }
      const savedCallsign = localStorage.getItem('abhi_user_callsign');
      if (savedCallsign && ['Sir', 'Boss', 'Tony', 'Partner'].includes(savedCallsign)) {
        this.userCallsign.set(savedCallsign as any);
      }
      const savedSpeed = localStorage.getItem('abhi_speech_speed');
      if (savedSpeed) {
        const parsed = parseFloat(savedSpeed);
        if (!isNaN(parsed) && parsed >= 0.8 && parsed <= 1.4) {
          this.speechSpeedRate.set(parsed);
        }
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

  setLanguage(lang: AppLanguage): void {
    this.selectedLanguage.set(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('abhi_selected_language', lang);
    }
    this.updateRecognitionLanguage(lang);
    const langNames: Record<AppLanguage, string> = {
      auto: 'Auto Language Detection',
      en: 'English',
      te: 'Telugu',
      hi: 'Hindi',
      ta: 'Tamil'
    };
    if (lang === 'te') {
      this.speak('భాష తెలుగుకు సెట్ చేయబడింది, సర్.');
    } else if (lang === 'hi') {
      this.speak('भाषा हिंदी में सेट कर दी गई है, सर।');
    } else if (lang === 'ta') {
      this.speak('மொழி தமிழுக்கு மாற்றப்பட்டது, ஐயா.');
    } else {
      this.speak('Language set to ' + langNames[lang] + ', ' + this.userCallsign() + '.');
    }
  }

  updateRecognitionLanguage(lang: AppLanguage): void {
    if (!this.recognition) return;
    const mapping: Record<AppLanguage, string> = {
      auto: 'en-US',
      en: 'en-US',
      te: 'te-IN',
      hi: 'hi-IN',
      ta: 'ta-IN'
    };
    this.recognition.lang = mapping[lang] || 'en-US';
  }

  setPersonaMode(mode: 'JARVIS' | 'FRIDAY'): void {
    this.personaMode.set(mode);
    if (typeof localStorage !== 'undefined') {
      const savedLang = localStorage.getItem('abhi_selected_language');
      if (savedLang && ['auto', 'en', 'te', 'hi', 'ta'].includes(savedLang)) {
        this.selectedLanguage.set(savedLang as AppLanguage);
      }
      localStorage.setItem('abhi_persona_mode', mode);
    }
    const name = mode === 'JARVIS' ? 'J.A.R.V.I.S.' : 'F.R.I.D.A.Y.';
    this.speak(`${name} online. At your service, ${this.userCallsign()}.`, true);
  }

  setUserCallsign(callsign: 'Sir' | 'Boss' | 'Tony' | 'Partner'): void {
    this.userCallsign.set(callsign);
    if (typeof localStorage !== 'undefined') {
      const savedLang = localStorage.getItem('abhi_selected_language');
      if (savedLang && ['auto', 'en', 'te', 'hi', 'ta'].includes(savedLang)) {
        this.selectedLanguage.set(savedLang as AppLanguage);
      }
      localStorage.setItem('abhi_user_callsign', callsign);
    }
    this.speak(`Callsign acknowledged, ${callsign}.`, true);
  }

  setSpeechSpeedRate(rate: number): void {
    const clamped = Math.max(0.85, Math.min(1.25, rate));
    this.speechSpeedRate.set(clamped);
    if (typeof localStorage !== 'undefined') {
      const savedLang = localStorage.getItem('abhi_selected_language');
      if (savedLang && ['auto', 'en', 'te', 'hi', 'ta'].includes(savedLang)) {
        this.selectedLanguage.set(savedLang as AppLanguage);
      }
      localStorage.setItem('abhi_speech_speed', clamped.toString());
    }
  }

  private loadVoices(): void {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    this.updateActiveVoiceName();
  }

  private updateActiveVoiceName(): void {
    const isJarvis = this.personaMode() === 'JARVIS';
    const voice = this.findBestNaturalVoice(isJarvis);
    if (voice) {
      this.selectedVoiceName.set(voice.name.replace(/\s*\(Natural\)\s*/i, ' Natural'));
    }
  }

  /**
   * Search and select highest-fidelity human neural voice available in browser / OS.
   * Prioritizes Microsoft Natural Neural, Google UK/US Natural, Apple Samantha/Daniel.
   */
  private findBestNaturalVoice(isJarvis: boolean): SpeechSynthesisVoice | undefined {
    if (!this.voices || this.voices.length === 0) return undefined;

    const lang = this.selectedLanguage();
    if (lang === 'te') {
      const teVoice = this.voices.find(v => v.lang.startsWith('te'));
      if (teVoice) return teVoice;
    } else if (lang === 'hi') {
      const hiVoice = this.voices.find(v => v.lang.startsWith('hi'));
      if (hiVoice) return hiVoice;
    } else if (lang === 'ta') {
      const taVoice = this.voices.find(v => v.lang.startsWith('ta'));
      if (taVoice) return taVoice;
    }

    if (isJarvis) {
      // Natural male voice preferences with human warmth and British/US conversational tone
      const naturalCandidates = [
        (v: SpeechSynthesisVoice) => v.name.includes('Natural') && (v.name.includes('Guy') || v.name.includes('Ryan') || v.name.includes('Christopher') || v.name.includes('George') || v.name.includes('Brian') || v.name.includes('Liam') || v.name.includes('Arthur')),
        (v: SpeechSynthesisVoice) => v.name.includes('Natural') && v.lang.startsWith('en') && !v.name.includes('Jenny') && !v.name.includes('Aria') && !v.name.includes('Sonia'),
        (v: SpeechSynthesisVoice) => v.name.includes('Neural') && (v.name.includes('Male') || v.name.includes('George') || v.name.includes('Ryan')),
        (v: SpeechSynthesisVoice) => (v.lang === 'en-GB' || v.name.includes('UK') || v.name.includes('George')) && !v.name.includes('Female'),
        (v: SpeechSynthesisVoice) => (v.name.includes('Google') || v.name.includes('Daniel') || v.name.includes('Alex')) && v.lang.startsWith('en'),
        (v: SpeechSynthesisVoice) => v.lang.startsWith('en') && (v.name.includes('Male') || v.name.includes('David') || v.name.includes('Mark')),
        (v: SpeechSynthesisVoice) => v.lang.startsWith('en')
      ];

      for (const matcher of naturalCandidates) {
        const found = this.voices.find(matcher);
        if (found) return found;
      }
    } else {
      // Natural female voice preferences with warm human tone (FRIDAY)
      const naturalCandidates = [
        (v: SpeechSynthesisVoice) => v.name.includes('Natural') && (v.name.includes('Jenny') || v.name.includes('Aria') || v.name.includes('Sonia') || v.name.includes('Hazel') || v.name.includes('Emily') || v.name.includes('Maisie')),
        (v: SpeechSynthesisVoice) => v.name.includes('Natural') && v.lang.startsWith('en'),
        (v: SpeechSynthesisVoice) => v.name.includes('Neural') && (v.name.includes('Female') || v.name.includes('Jenny') || v.name.includes('Hazel')),
        (v: SpeechSynthesisVoice) => (v.lang === 'en-IE' || v.lang === 'en-GB' || v.name.includes('Ireland') || v.name.includes('Hazel') || v.name.includes('Zira')),
        (v: SpeechSynthesisVoice) => (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Karen')) && v.lang.startsWith('en'),
        (v: SpeechSynthesisVoice) => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Zira')),
        (v: SpeechSynthesisVoice) => v.lang.startsWith('en')
      ];

      for (const matcher of naturalCandidates) {
        const found = this.voices.find(matcher);
        if (found) return found;
      }
    }

    return this.voices.find(v => v.lang.startsWith('en')) || this.voices[0];
  }

  private initSpeechRecognition(): void {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.updateRecognitionLanguage(this.selectedLanguage());
      } catch {
        this.recognition = null;
      }
    }
  }

  /**
   * Sanitizes markdown, strips code blocks, eliminates robotic jargon,
   * phonetically translates abbreviations, and formats text for warm, human speech.
   */
  sanitizeAndSummarizeForSpeech(rawText: string): string {
    if (!rawText) return '';
    let text = rawText.trim();

    // 1. Strip agent system sender tags (e.g. [J.A.R.V.I.S.]: or [SYNAPSE-AI -> VISION]:)
    text = text.replace(/^\[.*?\]:\s*/g, '');
    text = text.replace(/\[[A-Z0-9_\-\s]+->[A-Z0-9_\-\s]+\]:?\s*/g, '');
    text = text.replace(/\[MARK-[IVXLCDM]+\]/gi, '');

    // 2. Map robotic canned system messages to natural human responses
    if (/contracting synaptic vectors|quantum dot singularity|sub-agents recalled/i.test(text)) {
      return 'All specialist agents have been docked.';
    }
    if (/iris unsealed|deploying 8 autonomous|synaptic laser mesh active/i.test(text)) {
      return 'All specialist agents deployed and online.';
    }
    if (/harmonic pulse dispatched through core/i.test(text)) {
      return 'Core systems harmonized.';
    }
    if (/token context window memory cache/i.test(text)) {
      return ''; // Omit internal memory cache ticker chatter from voice
    }
    if (/zero dependencies|zero cloud/i.test(text)) {
      text = text.replace(/zero cloud egress/gi, 'local inference');
      text = text.replace(/with zero cloud dependencies/gi, '');
      text = text.replace(/zero dependencies/gi, 'fully independent');
    }
    text = text.replace(/Action planned and verified:\s*/gi, '');
    text = text.replace(/Processed locally by Central Supervisor\s*/gi, '');
    text = text.replace(/dispatching task[s]?/gi, 'executing');
    text = text.replace(/\[J\.?A\.?R\.?V\.?I\.?S\.?\]:?\s*/gi, '');
    text = text.replace(/\[F\.?R\.?I\.?D\.?A\.?Y\.?\]:?\s*/gi, '');
    text = text.replace(/\[[A-Za-z0-9_\-]+\]:?\s*/g, '');

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

    // Comprehensive Emoji Removal (preventing TTS engines from reading "brain", "rocket", "lightning", etc.)
    text = text.replace(/[\u{1F000}-\u{1FAFF}\u{200D}\u{FE0F}\u{2600}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2300}-\u{23FF}\u{2B50}\u{203C}\u{2049}\u{25AA}-\u{25FE}]/gu, '');
    text = text.replace(/[\\\/\{\}\[\]<>~_=\|\^]/g, ' ');

    // Natural phonetic expansions of abbreviations so they aren't spelled out letter-by-letter
    text = text.replace(/\bJ\.?A\.?R\.?V\.?I\.?S\.?\b/gi, 'Jarvis');
    text = text.replace(/\bF\.?R\.?I\.?D\.?A\.?Y\.?\b/gi, 'Friday');
    text = text.replace(/\bA\.?B\.?H\.?I\.?\b/gi, 'Abhi');
    text = text.replace(/\bUI\b/g, 'user interface');
    text = text.replace(/\bOS\b/g, 'operating system');
    text = text.replace(/\bTTS\b/g, 'voice synthesis');
    text = text.replace(/\bSTT\b/g, 'voice input');
    text = text.replace(/\bLLMs\b/g, 'language models');
    text = text.replace(/\bLLM\b/g, 'language model');
    text = text.replace(/\bDAG\b/g, 'pipeline');
    text = text.replace(/\bWAL\b/g, 'log');
    text = text.replace(/\bDB\b/g, 'database');
    text = text.replace(/\bcalc\b/gi, 'calculator');
    text = text.replace(/\byoutube\b/gi, 'YouTube');

    // Strip remaining robotic filler words
    text = text.replace(/\bdispatching task\b/gi, 'executing');
    text = text.replace(/\bcontracting synaptic vectors\b/gi, 'docking');
    text = text.replace(/\bSQLite WAL verified\b/gi, 'verified');

    // Collapse whitespace
    text = text.replace(/\s+/g, ' ').trim();

    if (hasCodeBlock) {
      if (text.length > 0 && text.length < 200) {
        return text;
      }
      return 'Here is the implementation, Sir.';
    }

    if (isVeryLong) {
      const sentences = text.match(/[^.!?]+[.!?]+/g);
      if (sentences && sentences.length > 0) {
        let naturalVoiceText = '';
        for (const s of sentences) {
          if ((naturalVoiceText + s).length <= 350) {
            naturalVoiceText += (naturalVoiceText ? ' ' : '') + s.trim();
          } else {
            break;
          }
        }
        if (naturalVoiceText.length > 20) {
          return naturalVoiceText;
        }
      }
      const boundary = text.lastIndexOf(' ', 280);
      return (boundary > 0 ? text.substring(0, boundary) : text.substring(0, 280)).trim();
    }

    return text;
  }

  /**
   * Prime and unlock browser audio playback directly in user interaction call stack.
   * Resumes Web Speech Synthesis and Web Audio Context so responses play without delay.
   */
  primeAudio(): void {
    if (typeof window === 'undefined') return;
    this.hasUserInteracted.set(true);

    // Synchronously unlock browser HTML5 Audio policy with a silent micro-buffer
    try {
      const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
      silentAudio.volume = 0.01;
      silentAudio.play().catch(() => {});
    } catch {}

    if ('speechSynthesis' in window && window.speechSynthesis) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!this.sharedAudioCtx) {
          this.sharedAudioCtx = new AudioCtx();
        }
        if (this.sharedAudioCtx.state === 'suspended') {
          this.sharedAudioCtx.resume().catch(() => {});
        }
      }
    } catch {}
  }

  private currentAudio: HTMLAudioElement | null = null;

  /**
   * Speak text aloud using authentic neural human voice streaming from backend Edge-TTS,
   * with automatic fallback to high-fidelity Web Speech API synthesis.
   * Real-time word boundary and progress tracking for Instagram Reel subtitles.
   */
  speak(text: string, force = false): void {
    if (this.isMuted() && !force) return;
    if (!text.trim()) return;

    // Unpause speech synthesis if currently paused by browser
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    const spokenText = this.sanitizeAndSummarizeForSpeech(text);
    if (!spokenText.trim()) return;

    // 1. Stop any currently active speech audio
    this.stop();

    const isJarvis = this.personaMode() === 'JARVIS';
    const lang = this.selectedLanguage();
    let voice = isJarvis ? 'en-GB-RyanNeural' : 'en-IE-EmilyNeural';
    let voiceDesc = isJarvis ? 'J.A.R.V.I.S. (Ryan Natural Neural)' : 'F.R.I.D.A.Y. (Emily Natural Neural)';

    if (lang === 'te') {
      voice = isJarvis ? 'te-IN-MohanNeural' : 'te-IN-ShrutiNeural';
      voiceDesc = isJarvis ? 'J.A.R.V.I.S. (Mohan Telugu Neural)' : 'F.R.I.D.A.Y. (Shruti Telugu Neural)';
    } else if (lang === 'hi') {
      voice = isJarvis ? 'hi-IN-MadhurNeural' : 'hi-IN-SwaraNeural';
      voiceDesc = isJarvis ? 'J.A.R.V.I.S. (Madhur Hindi Neural)' : 'F.R.I.D.A.Y. (Swara Hindi Neural)';
    } else if (lang === 'ta') {
      voice = isJarvis ? 'ta-IN-ValluvarNeural' : 'ta-IN-PallaviNeural';
      voiceDesc = isJarvis ? 'J.A.R.V.I.S. (Valluvar Tamil Neural)' : 'F.R.I.D.A.Y. (Pallavi Tamil Neural)';
    }
    this.selectedVoiceName.set(voiceDesc);

    // Tokenize into words for Instagram Reel dynamic caption display
    const words = spokenText.trim().split(/\s+/).filter(w => w.length > 0);
    this.spokenWords.set(words);
    this.activeWordIndex.set(0);
    this.activeWord.set(words[0] || '');

    // 2. Stream authentic human audio from backend perception service
    const userSpeed = this.speechSpeedRate();
    const streamUrl = getApiUrl(`/api/v1/perception/tts/stream?text=${encodeURIComponent(spokenText)}&voice=${encodeURIComponent(voice)}&rate=${userSpeed}`);

    try {
      const audio = new Audio(streamUrl);
      this.currentAudio = audio;

      let fallbackTriggered = false;
      const triggerFallback = () => {
        if (fallbackTriggered) return;
        fallbackTriggered = true;
        this.fallbackSpeechSynthesis(spokenText, isJarvis, words);
      };

      audio.onplay = () => {
        this.isSpeaking.set(true);
        this.lastSpokenText.set(spokenText);
      };

      audio.ontimeupdate = () => {
        if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
          const progress = audio.currentTime / audio.duration;
          const wordIdx = Math.min(Math.floor(progress * words.length), words.length - 1);
          this.activeWordIndex.set(wordIdx);
          this.activeWord.set(words[wordIdx] || '');
        }
      };

      audio.onended = () => {
        this.isSpeaking.set(false);
        this.activeWordIndex.set(-1);
        this.activeWord.set('');
        this.currentAudio = null;
        this.notifySpeechFinished();
      };

      audio.onerror = () => {
        // Fallback to browser SpeechSynthesis if backend audio stream fails
        triggerFallback();
      };

      audio.play().catch(() => {
        // Browser autoplay restriction or connection error fallback
        triggerFallback();
      });
    } catch {
      this.fallbackSpeechSynthesis(spokenText, isJarvis, words);
    }
  }

  /**
   * Browser SpeechSynthesis fallback when backend audio stream is unavailable.
   */
  private fallbackSpeechSynthesis(spokenText: string, isJarvis: boolean, words: string[]): void {
    if (!this.synth) {
      this.isSpeaking.set(false);
      return;
    }

    try {
      if (this.synth.paused) {
        this.synth.resume();
      }
      this.synth.cancel();

      if (!this.voices || this.voices.length === 0) {
        this.loadVoices();
      }

      const utterance = new SpeechSynthesisUtterance(spokenText.trim());
      const userSpeed = this.speechSpeedRate();
      utterance.rate = isJarvis ? (0.98 * userSpeed) : (1.02 * userSpeed);
      utterance.pitch = isJarvis ? 0.96 : 1.02;
      utterance.volume = 1.0;

      const preferredVoice = this.findBestNaturalVoice(isJarvis);
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        this.selectedVoiceName.set(preferredVoice.name.replace(/\s*\(Natural\)\s*/i, ' Natural'));
      }

      utterance.onboundary = (event: SpeechSynthesisEvent) => {
        if (event.name === 'word' || (event as any).type === 'boundary') {
          const charIndex = event.charIndex || 0;
          const textUpToChar = spokenText.substring(0, charIndex).trim();
          const wordsUpToChar = textUpToChar ? textUpToChar.split(/\s+/).length : 0;
          const currentIdx = Math.min(wordsUpToChar, words.length - 1);
          this.activeWordIndex.set(currentIdx);
          this.activeWord.set(words[currentIdx] || '');
        }
      };

      utterance.onstart = () => {
        this.isSpeaking.set(true);
        this.lastSpokenText.set(spokenText);
      };

      utterance.onend = () => {
        this.isSpeaking.set(false);
        this.activeWordIndex.set(-1);
        this.activeWord.set('');
        this.notifySpeechFinished();
      };

      utterance.onerror = () => {
        this.isSpeaking.set(false);
        this.activeWordIndex.set(-1);
        this.activeWord.set('');
      };

      if (this.synth.paused) {
        this.synth.resume();
      }
      this.synth.speak(utterance);
      if (this.synth.paused) {
        this.synth.resume();
      }
    } catch {
      this.isSpeaking.set(false);
    }
  }

  /**
   * Immediately stops any active audio stream or speech synthesis utterance.
   */
  stop(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }
    if (this.synth) {
      this.synth.cancel();
    }
    this.isSpeaking.set(false);
    this.activeWordIndex.set(-1);
    this.activeWord.set('');
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
  notifySpeechFinished(): void {
    if (this.isAlexaConversationMode() && this.alexaCommandCallback) {
      setTimeout(() => {
        if (this.isAlexaConversationMode() && !this.isSpeaking() && !this.isListening()) {
          this.startVoiceListening((txt) => {
            if (this.alexaCommandCallback) this.alexaCommandCallback(txt);
          });
        }
      }, 450);
    }
  }

  toggleAlexaMode(onCommand: (text: string) => void): boolean {
    const next = !this.isAlexaConversationMode();
    this.isAlexaConversationMode.set(next);
    if (next) {
      this.primeAudio();
      this.alexaCommandCallback = onCommand;
      this.speak('Direct conversation mode active. I am listening, Sir.');
    } else {
      this.stopVoiceListening();
      this.alexaCommandCallback = null;
      this.speak('Conversation mode paused.');
    }
    return next;
  }

  setAlexaCallback(cb: ((text: string) => void) | null): void {
    this.alexaCommandCallback = cb;
  }

  toggleMute(): boolean {
    const muted = !this.isMuted();
    this.isMuted.set(muted);
    if (muted) {
      this.stop();
    } else {
      this.speak('Voice audio enabled.');
    }
    return muted;
  }

  private silenceTimer: any = null;

  /**
   * Start listening to voice input from microphone with callback for transcribed text and natural turn-taking silence detection.
   */
  startVoiceListening(onResult: (text: string) => void, onEnd?: () => void): boolean {
    if (!this.recognition) return false;

    try {
      this.isListening.set(true);
      let finalTranscript = '';

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        const currentText = (finalTranscript + ' ' + interimTranscript).trim();
        if (currentText) {
          onResult(currentText);
        }

        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => {
          if (this.isListening() && finalTranscript.trim()) {
            this.stopVoiceListening();
            if (onEnd) onEnd();
          }
        }, 1800);
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
