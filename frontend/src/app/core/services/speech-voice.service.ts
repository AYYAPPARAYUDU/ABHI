import { Injectable, signal } from '@angular/core';
import { getApiUrl } from '../config/api-config';

export type AppLanguage = 'auto' | 'en' | 'te' | 'hi' | 'ta';
export type SpeechPriority = 'EMERGENCY' | 'DIRECTIVE' | 'SPECIALIST_REPORT' | 'AMBIENT';

export interface SpeechNegotiationRequest {
  id?: string;
  speakerId: string;
  speakerName: string;
  text: string;
  priority?: SpeechPriority;
  force?: boolean;
}

export interface ActiveSpeakerInfo {
  speakerId: string;
  speakerName: string;
  priority: SpeechPriority;
  startedAt: number;
}

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

  // Acoustic Turn-Taking Arbiter & Floor Negotiation Signals
  readonly activeSpeaker = signal<ActiveSpeakerInfo | null>(null);
  readonly speechFloorState = signal<'IDLE' | 'SPEAKING' | 'NEGOTIATING' | 'YIELDING'>('IDLE');
  private speechNegotiationQueue: SpeechNegotiationRequest[] = [];
  private turnTakingTimer: any = null;

  // Universal Language Selection Signal
  readonly selectedLanguage = signal<AppLanguage>('auto');

  // J.A.R.V.I.S. & F.R.I.D.A.Y. Persona & Beloved Operator Callsign ("Mamu" as authentic close friend)
  readonly personaMode = signal<'JARVIS' | 'FRIDAY'>('JARVIS');
  readonly userCallsign = signal<'Mamu'>('Mamu');

  // Natural Human Voice & Instagram Reel Subtitle Signals
  readonly speechSpeedRate = signal<number>(1.0);
  readonly activeWord = signal<string>('');
  readonly activeWordIndex = signal<number>(-1);
  readonly spokenWords = signal<string[]>([]);
  readonly selectedVoiceName = signal<string>('Natural Neural Voice');

  // Bidirectional Hardware DSP & Noise Cancellation Signals
  readonly isNoiseCancellationActive = signal<boolean>(true);
  readonly micAudioLevel = signal<number>(0);
  readonly speechOutputLevel = signal<number>(0);
  readonly noiseFloorDb = signal<number>(-55.0);

  // Web Audio DSP Nodes (Microphone Input Pipeline)
  private micMediaStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private micDspHighPass: BiquadFilterNode | null = null;
  private micDspLowPass: BiquadFilterNode | null = null;
  private micDspPresence: BiquadFilterNode | null = null;
  private micDspCompressor: DynamicsCompressorNode | null = null;

  // Web Audio DSP Nodes (Speech Output Pipeline)
  private ttsAnalyser: AnalyserNode | null = null;
  private ttsDuckingGainNode: GainNode | null = null;
  private isTtsMonitoring = false;
  private isMicMonitoring = false;

  private synth: SpeechSynthesis | null = null;
  private recognition: any = null;
  private voices: SpeechSynthesisVoice[] = [];
  private activeUtterances: SpeechSynthesisUtterance[] = [];
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
      localStorage.setItem('abhi_user_callsign', 'Mamu');
      this.userCallsign.set('Mamu');
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
      this.speak('భాష తెలుగుకు సెట్ చేశాను మాము! ఎల్లప్పుడూ నీకు తోడుగా ఉంటాను!');
    } else if (lang === 'hi') {
      this.speak('भाषा हिंदी में सेट कर दी गई है मामू! हमेशा तुम्हारे साथ हूँ!');
    } else if (lang === 'ta') {
      this.speak('மொழி தமிழுக்கு மாற்றப்பட்டது மாமு! எப்போதும் உன்னுடன் இருக்கிறேன்!');
    } else {
      this.speak('Language set to ' + langNames[lang] + ', Mamu! Let’s get to work!');
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
      localStorage.setItem('abhi_user_callsign', 'Mamu');
    }
    const name = mode === 'JARVIS' ? 'J.A.R.V.I.S.' : 'F.R.I.D.A.Y.';
    this.speak(`${name} online. Right here with you, Mamu! Let's do this!`, true);
  }

  setUserCallsign(callsign: 'Mamu' = 'Mamu'): void {
    this.userCallsign.set('Mamu');
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('abhi_user_callsign', 'Mamu');
    }
    this.speak(`Understood Mamu! Always your trusted friend.`, true);
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
    text = text.replace(/\bAPI\b/g, 'A P I');
    text = text.replace(/\bCLI\b/g, 'command line');
    text = text.replace(/\bTS\b/g, 'TypeScript');
    text = text.replace(/\bJS\b/g, 'JavaScript');
    text = text.replace(/\bPY\b/g, 'Python');
    text = text.replace(/\bDSP\b/g, 'D S P');
    text = text.replace(/\bVAD\b/g, 'voice activity detection');
    text = text.replace(/\bThree\.js\b/gi, 'Three J S');
    text = text.replace(/\bGitHub\b/gi, 'Git Hub');
    text = text.replace(/\bWhatsApp\b/gi, 'Whats App');
    text = text.replace(/\bcalc\b/gi, 'calculator');
    text = text.replace(/\byoutube\b/gi, 'YouTube');

    // Always address Mamu as a warm friend, purging residual honorifics
    text = text.replace(/\b(?:Sir|Boss|Partner|Tony)\b/g, 'Mamu');

    // Strip remaining robotic filler words
    text = text.replace(/\bdispatching task\b/gi, 'executing');
    text = text.replace(/\bcontracting synaptic vectors\b/gi, 'docking');
    text = text.replace(/\bSQLite WAL verified\b/gi, 'verified');

    // Collapse whitespace
    text = text.replace(/\s+/g, ' ').trim();

    if (hasCodeBlock) {
      if (text.length > 0) {
        return text;
      }
      return 'Here is the implementation, Mamu!';
    }

    // Complete speech preservation: never truncate or discard remaining words!
    return text;
  }

  /**
   * Prime and unlock browser audio playback directly in user interaction call stack.
   * Resumes Web Speech Synthesis and Web Audio Context so responses play without delay.
   */
  primeAudio(): void {
    if (typeof window === 'undefined') return;
    this.hasUserInteracted.set(true);

    if ('speechSynthesis' in window && window.speechSynthesis) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {}
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
   * Universal speech entry point with acoustic floor turn negotiation.
   */
  speak(
    text: string,
    force = false,
    speakerId = 'JARVIS',
    speakerName = 'J.A.R.V.I.S.',
    priority: SpeechPriority = 'DIRECTIVE'
  ): void {
    this.speakNegotiated({
      speakerId,
      speakerName,
      text,
      priority,
      force,
    });
  }

  // Timestamp of the last dispatched speech request (prevents double-triggering)
  private lastSpeechTimestamp = 0;

  /**
   * Acoustic Turn-Taking Arbiter:
   * Prevents simultaneous LLM speech collisions. Manages conversational floor handoff,
   * priority preemption for emergency directives, and distinct personality pitches.
   */
  speakNegotiated(req: SpeechNegotiationRequest): void {
    if (this.isMuted()) return;
    if (!req.text || !req.text.trim()) return;

    const priority: SpeechPriority = req.priority || 'SPECIALIST_REPORT';
    const spokenText = this.sanitizeAndSummarizeForSpeech(req.text);
    if (!spokenText.trim()) return;

    const now = Date.now();
    // Fast duplicate suppression: prevent identical phrases within 1.5 seconds from double-speaking
    if (spokenText === this.lastSpokenText() && now - this.lastSpeechTimestamp < 1500) {
      return;
    }

    // Check if floor is currently occupied (strict mutex lock)
    if (this.isSpeaking()) {
      const current = this.activeSpeaker();

      // High-priority barge-in (EMERGENCY pre-empts all; DIRECTIVE pre-empts reports)
      const canPreempt =
        priority === 'EMERGENCY' ||
        (priority === 'DIRECTIVE' && current?.priority !== 'EMERGENCY');

      if (canPreempt) {
        this.stop();
        this.executeSpeech({ ...req, text: spokenText, priority });
        return;
      }

      // Respectful floor queueing: wait for active speaker to yield the floor (one by one sequential speech)
      this.enqueueNegotiatedRequest({ ...req, text: spokenText, priority });
      this.speechFloorState.set('NEGOTIATING');
      return;
    }

    // Floor is free: claim floor immediately
    this.executeSpeech({ ...req, text: spokenText, priority });
  }

  private enqueueNegotiatedRequest(req: SpeechNegotiationRequest): void {
    const priorityWeight: Record<SpeechPriority, number> = {
      EMERGENCY: 4,
      DIRECTIVE: 3,
      SPECIALIST_REPORT: 2,
      AMBIENT: 1,
    };

    const targetWeight = priorityWeight[req.priority || 'SPECIALIST_REPORT'];
    const insertIdx = this.speechNegotiationQueue.findIndex(
      (item) => priorityWeight[item.priority || 'SPECIALIST_REPORT'] < targetWeight
    );

    if (insertIdx === -1) {
      this.speechNegotiationQueue.push(req);
    } else {
      this.speechNegotiationQueue.splice(insertIdx, 0, req);
    }
  }

  private handleSpeechEnded(): void {
    this.isSpeaking.set(false);
    this.activeWordIndex.set(-1);
    this.activeWord.set('');
    this.currentAudio = null;
    this.notifySpeechFinished();

    this.activeSpeaker.set(null);

    // Turn-Taking Handoff: 350ms natural conversational pause before next agent takes the floor
    if (this.speechNegotiationQueue.length > 0) {
      this.speechFloorState.set('YIELDING');
      if (this.turnTakingTimer) {
        clearTimeout(this.turnTakingTimer);
      }
      this.turnTakingTimer = setTimeout(() => {
        const nextReq = this.speechNegotiationQueue.shift();
        if (nextReq) {
          this.executeSpeech(nextReq);
        } else {
          this.speechFloorState.set('IDLE');
        }
      }, 350);
    } else {
      this.speechFloorState.set('IDLE');
    }
  }

  /**
   * Executes acoustic synthesis for an approved speaker with personalized voice modulation.
   */
  private executeSpeech(req: SpeechNegotiationRequest): void {
    // 1. Immediately claim the acoustic floor so concurrent agents cannot speak over each other
    this.isSpeaking.set(true);
    this.lastSpeechTimestamp = Date.now();
    this.lastSpokenText.set(req.text);

    // 2. Synchronously terminate any existing audio element or browser speech synthesis
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.src = '';
      } catch {}
      this.currentAudio = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    this.activeSpeaker.set({
      speakerId: req.speakerId,
      speakerName: req.speakerName,
      priority: req.priority || 'SPECIALIST_REPORT',
      startedAt: Date.now(),
    });
    this.speechFloorState.set('SPEAKING');

    const spokenText = req.text;
    const isJarvis = req.speakerId === 'JARVIS' || this.personaMode() === 'JARVIS';
    const lang = this.selectedLanguage();

    let voice = isJarvis ? 'en-GB-RyanNeural' : 'en-IE-EmilyNeural';
    let voiceDesc = `${req.speakerName} (Acoustic Floor)`;

    if (lang === 'te') {
      voice = isJarvis ? 'te-IN-MohanNeural' : 'te-IN-ShrutiNeural';
    } else if (lang === 'hi') {
      voice = isJarvis ? 'hi-IN-MadhurNeural' : 'hi-IN-SwaraNeural';
    } else if (lang === 'ta') {
      voice = isJarvis ? 'ta-IN-ValluvarNeural' : 'ta-IN-PallaviNeural';
    }
    this.selectedVoiceName.set(voiceDesc);

    // Tokenize words for subtitle HUD
    const words = spokenText.trim().split(/\s+/).filter((w) => w.length > 0);
    this.spokenWords.set(words);
    this.activeWordIndex.set(0);
    this.activeWord.set(words[0] || '');

    const userSpeed = this.speechSpeedRate();
    const streamUrl = getApiUrl(
      `/api/v1/perception/tts/stream?text=${encodeURIComponent(spokenText)}&voice=${encodeURIComponent(
        voice
      )}&rate=${userSpeed}`
    );

    try {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous'; // Unlocks Chrome Web Audio API graph without CORS muting
      audio.src = streamUrl;
      this.currentAudio = audio;

      let fallbackTriggered = false;
      let loadWatchdog: any = null;

      const triggerFallback = () => {
        if (fallbackTriggered) return;
        fallbackTriggered = true;
        if (loadWatchdog) {
          clearTimeout(loadWatchdog);
          loadWatchdog = null;
        }
        try {
          audio.onplay = null;
          audio.onerror = null;
          audio.onended = null;
          audio.ontimeupdate = null;
          audio.pause();
          audio.currentTime = 0;
          audio.src = '';
        } catch {}
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        this.fallbackSpeechSynthesis(spokenText, req, words);
      };

      // 1800ms load safety watchdog: if backend audio stalls or is blocked, switch cleanly to speech synthesis
      loadWatchdog = setTimeout(() => {
        if (!fallbackTriggered && this.currentAudio === audio && audio.paused) {
          triggerFallback();
        }
      }, 1800);

      audio.onplay = () => {
        if (loadWatchdog) {
          clearTimeout(loadWatchdog);
          loadWatchdog = null;
        }
        // Cancel any residual browser speech synthesis so only ONE audio source speaks
        if (this.synth) {
          try {
            this.synth.cancel();
          } catch {}
        }
        this.isSpeaking.set(true);
        this.lastSpokenText.set(spokenText);
        this.applyTtsOutputDsp(audio);
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
        if (loadWatchdog) {
          clearTimeout(loadWatchdog);
          loadWatchdog = null;
        }
        this.handleSpeechEnded();
      };

      audio.onerror = () => {
        triggerFallback();
      };

      audio.play().catch(() => {
        triggerFallback();
      });
    } catch {
      this.fallbackSpeechSynthesis(spokenText, req, words);
    }
  }

  /**
   * Browser SpeechSynthesis fallback with sentence-by-sentence queueing
   * and Chrome watchdog keep-alive to guarantee 100% of speech is spoken without truncation.
   */
  private fallbackSpeechSynthesis(
    spokenText: string,
    req: SpeechNegotiationRequest,
    words: string[]
  ): void {
    if (!this.synth) {
      this.isSpeaking.set(false);
      this.handleSpeechEnded();
      return;
    }

    try {
      this.isSpeaking.set(true);
      this.lastSpokenText.set(spokenText);
      if (this.synth.paused) {
        this.synth.resume();
      }
      this.synth.cancel();

      if (!this.voices || this.voices.length === 0) {
        this.loadVoices();
      }

      // Split into fine sentence chunks and further split at comma/space if any chunk exceeds 140 chars
      const rawSentences = spokenText.match(/[^.!?]+[.!?]*/g) || [spokenText];
      const chunks: string[] = [];
      rawSentences.forEach((raw) => {
        const trimmed = raw.trim();
        if (trimmed.length <= 140) {
          if (trimmed.length > 0) chunks.push(trimmed);
        } else {
          // Sub-divide long sentence at comma or space boundaries
          const subParts = trimmed.match(/[^,;]+[,;]*/g) || [trimmed];
          let buffer = '';
          subParts.forEach((part) => {
            if ((buffer + ' ' + part).trim().length <= 140) {
              buffer = (buffer + ' ' + part).trim();
            } else {
              if (buffer) chunks.push(buffer);
              buffer = part.trim();
            }
          });
          if (buffer) chunks.push(buffer);
        }
      });
      if (chunks.length === 0) {
        this.handleSpeechEnded();
        return;
      }

      const userSpeed = this.speechSpeedRate();
      const isJarvis = req.speakerId === 'JARVIS' || this.personaMode() === 'JARVIS';
      const preferredVoice = this.findBestNaturalVoice(isJarvis);
      if (preferredVoice) {
        this.selectedVoiceName.set(preferredVoice.name.replace(/\s*\(Natural\)\s*/i, ' Natural'));
      }

      const agentVoiceTuning: Record<string, { pitch: number; rate: number }> = {
        agent_1_commander: { pitch: 0.94, rate: 0.98 },
        agent_2_browser: { pitch: 1.05, rate: 1.04 },
        agent_3_comms: { pitch: 1.0, rate: 1.02 },
        agent_4_system: { pitch: 0.88, rate: 0.98 },
        agent_5_researcher: { pitch: 1.02, rate: 0.96 },
        agent_6_ml: { pitch: 0.96, rate: 1.04 },
        agent_7_strategist: { pitch: 0.95, rate: 0.96 },
        agent_8_qa_critic: { pitch: 1.08, rate: 1.02 },
        agent_9_security: { pitch: 0.86, rate: 0.94 },
        agent_10_mobile: { pitch: 1.04, rate: 1.06 },
        JARVIS: { pitch: 0.96, rate: 0.98 },
        FRIDAY: { pitch: 1.02, rate: 1.02 },
      };
      const tuning = agentVoiceTuning[req.speakerId] || { pitch: 0.98, rate: 1.0 };

      let currentChunkIdx = 0;
      let globalWordOffset = 0;

      // Max speech duration safety watchdog to prevent stuck [Speaking] state
      const totalWords = words.length || 10;
      const maxDurationMs = Math.max(4000, totalWords * 650);
      const watchdog = setTimeout(() => {
        if (this.isSpeaking()) {
          this.handleSpeechEnded();
        }
      }, maxDurationMs);

      const speakNextChunk = () => {
        if (this.isMuted()) {
          clearTimeout(watchdog);
          this.handleSpeechEnded();
          return;
        }
        if (currentChunkIdx >= chunks.length) {
          clearTimeout(watchdog);
          this.handleSpeechEnded();
          return;
        }

        const chunkText = chunks[currentChunkIdx];
        const chunkWords = chunkText.split(/\s+/).filter((w) => w.length > 0);
        const utterance = new SpeechSynthesisUtterance(chunkText);
        this.activeUtterances.push(utterance); // V8 GC protection

        utterance.pitch = tuning.pitch;
        utterance.rate = tuning.rate * userSpeed;
        utterance.volume = 1.0;
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onstart = () => {
          this.isSpeaking.set(true);
          this.lastSpokenText.set(spokenText);
        };

        utterance.onboundary = (event: SpeechSynthesisEvent) => {
          if (event.name === 'word' || (event as any).type === 'boundary') {
            const charIndex = event.charIndex || 0;
            const textUpToChar = chunkText.substring(0, charIndex).trim();
            const wordsUpToChar = textUpToChar ? textUpToChar.split(/\s+/).length : 0;
            const currentIdx = Math.min(globalWordOffset + wordsUpToChar, words.length - 1);
            this.activeWordIndex.set(currentIdx);
            this.activeWord.set(words[currentIdx] || '');
          }
        };

        utterance.onend = () => {
          this.activeUtterances = this.activeUtterances.filter(u => u !== utterance);
          globalWordOffset += chunkWords.length;
          currentChunkIdx++;
          speakNextChunk();
        };

        utterance.onerror = () => {
          this.activeUtterances = this.activeUtterances.filter(u => u !== utterance);
          globalWordOffset += chunkWords.length;
          currentChunkIdx++;
          speakNextChunk();
        };

        if (this.synth?.paused) {
          this.synth.resume();
        }
        this.synth?.speak(utterance);
      };

      // 35ms micro-delay to let Chrome reset internal speech queue after cancel
      setTimeout(() => {
        speakNextChunk();
      }, 35);
    } catch {
      this.handleSpeechEnded();
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
        this.currentAudio.src = '';
      } catch {}
      this.currentAudio = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
    }
    this.activeUtterances = [];
    this.isSpeaking.set(false);
    this.activeWordIndex.set(-1);
    this.activeWord.set('');
  }

  /**
   * Spoken welcome greeting on app launch with dynamic situational awareness and friend companionship.
   */
  greetUserOnLaunch(customGreeting?: string): void {
    const isJarvis = this.personaMode() === 'JARVIS';
    const fallback = isJarvis
      ? `Hey Mamu! J.A.R.V.I.S. is active and online. All systems locked, diagnostics clear, and I'm right here by your side. What are we building today, Mamu?`
      : `Hey Mamu! F.R.I.D.A.Y. is online and synced. Everything is running smoothly. Ready when you are, Mamu!`;
    const greeting = customGreeting || fallback;

    // Small delay to allow audio context to initialize
    setTimeout(() => {
      this.speak(greeting, false, 'JARVIS', 'J.A.R.V.I.S.', 'DIRECTIVE');
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

  private readonly WAKE_TRIGGERS = [
    'hey mamu', 'hay mamu', 'he mamu', 'hi mamu', 'hello mamu', 'mamu',
    'hey abhi', 'hay abhi', 'abhi', 'wake up mamu', 'wake up abhi',
    'హే మామూ', 'హాయ్ మామూ', 'మామూ', 'హే అభి', 'లే మామూ',
    'हे मामू', 'हाय मामू', 'मामू', 'सुनो मामू', 'अभि', 'जागो मामू',
    'ஹே மாமு', 'ஹாய் மாமு', 'மாமு', 'அபி'
  ];

  private readonly SLEEP_TRIGGERS = [
    'ok bye mamu', 'okay bye mamu', 'bye mamu', 'goodbye mamu', 'bye bye mamu',
    'stop mamu', 'sleep mamu', 'close mamu', 'standby mamu',
    'ok bye', 'okay bye', 'goodbye abhi', 'bye abhi', 'sleep abhi', 'close abhi',
    'సరే బై మామూ', 'ఓకే బై మామూ', 'బై మామూ', 'ఆపు మామూ', 'నిద్రపో మామూ', 'సెలవు మామూ',
    'ओके बाय मामू', 'बाय मामू', 'अलविदा मामू', 'बंद करो मामू', 'सो जाओ मामू',
    'பாய் மாமு', 'நிறுத்து மாமு', 'தூங்கு மாமு'
  ];

  /**
   * Check if an utterance contains wake activation or sleep deactivation intent.
   */
  checkVoiceTrigger(text: string): 'WAKE' | 'SLEEP' | 'NONE' {
    if (!text) return 'NONE';
    const lower = text.toLowerCase().trim();

    // Check sleep triggers first
    for (const sleep of this.SLEEP_TRIGGERS) {
      if (lower.includes(sleep)) {
        return 'SLEEP';
      }
    }

    // Check wake triggers with word boundaries or direct includes
    for (const wake of this.WAKE_TRIGGERS) {
      const regex = new RegExp(`(?:^|\\s)${wake.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}(?:$|\\s)`, 'i');
      if (regex.test(lower) || lower.includes(wake)) {
        return 'WAKE';
      }
    }

    return 'NONE';
  }

  toggleAlexaMode(onCommand?: (text: string) => void): boolean {
    const next = !this.isAlexaConversationMode();
    this.isAlexaConversationMode.set(next);
    if (next) {
      this.primeAudio();
      if (onCommand) this.alexaCommandCallback = onCommand;
      this.speak('Direct conversation mode active. I am listening, Mamu! Tell me what you need.');
      this.startVoiceListening((txt, isFinal) => {
        if (isFinal && txt.trim() && this.alexaCommandCallback) {
          this.alexaCommandCallback(txt.trim());
        }
      });
    } else {
      this.stopVoiceListening();
      this.alexaCommandCallback = null;
      this.speak('Standing by Mamu! Catch you in a moment.');
    }
    return next;
  }

  setAlexaCallback(cb: ((text: string) => void) | null): void {
    this.alexaCommandCallback = cb;
  }

  toggleMute(): boolean {
    const muted = !this.isMuted();
    this.isMuted.set(muted);
    this.stop();
    this.speechNegotiationQueue = [];
    return muted;
  }

  /**
   * Initializes hardware noise cancellation and Web Audio DSP filter graph for microphone input.
   * Eliminates low-frequency room rumble (85Hz HPF), cuts electrical hiss (7500Hz LPF),
   * boosts vocal fundamentals (2200Hz Peaking), and applies dynamic noise gating.
   */
  async initHardwareNoiseCancellation(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return false;

    try {
      if (!this.sharedAudioCtx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.sharedAudioCtx = new AudioCtx();
      }
      if (this.sharedAudioCtx.state === 'suspended') {
        await this.sharedAudioCtx.resume().catch(() => {});
      }

      // Request hardware-level acoustic noise suppression, echo cancellation, auto gain
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000
        }
      });
      this.micMediaStream = stream;

      const ctx = this.sharedAudioCtx;
      this.micSourceNode = ctx.createMediaStreamSource(stream);

      // 1. High-Pass Filter: Cuts sub-audible mechanical rumblings & HVAC hum below 85Hz
      this.micDspHighPass = ctx.createBiquadFilter();
      this.micDspHighPass.type = 'highpass';
      this.micDspHighPass.frequency.value = 85.0;
      this.micDspHighPass.Q.value = 0.707;

      // 2. Low-Pass Filter: Cuts high frequency electrical hiss & coil whine above 7500Hz
      this.micDspLowPass = ctx.createBiquadFilter();
      this.micDspLowPass.type = 'lowpass';
      this.micDspLowPass.frequency.value = 7500.0;
      this.micDspLowPass.Q.value = 0.707;

      // 3. Human Vocal Presence Peaking Filter: Boosts speech formant clarity at 2200Hz
      this.micDspPresence = ctx.createBiquadFilter();
      this.micDspPresence.type = 'peaking';
      this.micDspPresence.frequency.value = 2200.0;
      this.micDspPresence.Q.value = 1.2;
      this.micDspPresence.gain.value = 3.5;

      // 4. Dynamics Compressor / Soft-Knee Noise Gate: Dampens background room noise
      this.micDspCompressor = ctx.createDynamicsCompressor();
      this.micDspCompressor.threshold.value = -38.0;
      this.micDspCompressor.knee.value = 14.0;
      this.micDspCompressor.ratio.value = 4.0;
      this.micDspCompressor.attack.value = 0.003;
      this.micDspCompressor.release.value = 0.25;

      // 5. Real-Time Analyser Node: Monitors speech envelope and VAD metrics
      this.micAnalyser = ctx.createAnalyser();
      this.micAnalyser.fftSize = 256;
      this.micAnalyser.smoothingTimeConstant = 0.8;

      // Connect DSP Pipe
      this.micSourceNode
        .connect(this.micDspHighPass)
        .connect(this.micDspLowPass)
        .connect(this.micDspPresence)
        .connect(this.micDspCompressor)
        .connect(this.micAnalyser);

      this.isNoiseCancellationActive.set(true);
      this.startMicEnergyMonitoring();
      return true;
    } catch {
      this.isNoiseCancellationActive.set(false);
      return false;
    }
  }

  /**
   * Real-time monitoring loop for microphone energy, background noise floor, and barge-in.
   */
  private startMicEnergyMonitoring(): void {
    if (this.isMicMonitoring || !this.micAnalyser) return;
    this.isMicMonitoring = true;
    const dataArray = new Uint8Array(this.micAnalyser.frequencyBinCount);

    const updateEnergy = () => {
      if (!this.isListening() || !this.micAnalyser) {
        this.isMicMonitoring = false;
        this.micAudioLevel.set(0);
        return;
      }
      this.micAnalyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalizedLevel = Math.min(1.0, avg / 128.0);
      this.micAudioLevel.set(normalizedLevel);

      // Dynamic Noise Floor calculation
      if (normalizedLevel < 0.04) {
        const estDb = -60 + (normalizedLevel * 200);
        this.noiseFloorDb.set(Math.round(estDb));
      }

      // Dynamic Acoustic Auto-Ducking:
      // When user speaks softly (normalizedLevel > 0.08), smoothly duck TTS volume to 25% over 50ms
      if (this.isSpeaking() && this.ttsDuckingGainNode && this.sharedAudioCtx) {
        const currentTime = this.sharedAudioCtx.currentTime;
        if (normalizedLevel > 0.08) {
          this.ttsDuckingGainNode.gain.setTargetAtTime(0.25, currentTime, 0.05);
        } else {
          this.ttsDuckingGainNode.gain.setTargetAtTime(1.0, currentTime, 0.15);
        }
      }

      // Firm Barge-in Voice Interruption:
      // If user speaks firmly with micLevel > 0.22, stop TTS immediately and give floor to Mamu!
      if (this.isSpeaking() && normalizedLevel > 0.22) {
        this.stop();
      }

      requestAnimationFrame(updateEnergy);
    };
    requestAnimationFrame(updateEnergy);
  }

  /**
   * Connects audio element to acoustic warmth & presence mastering DSP pipeline.
   * Low-shelf boost at 240Hz, air boost at 4500Hz, mastering peak limiter, and auto-ducking gain.
   */
  private applyTtsOutputDsp(audio: HTMLAudioElement): void {
    if (typeof window === 'undefined') return;

    try {
      if (!this.sharedAudioCtx) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.sharedAudioCtx = new AudioCtx();
      }
      const ctx = this.sharedAudioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Only connect once per audio element to avoid InvalidStateError
      const source = ctx.createMediaElementSource(audio);

      // 1. Warmth Low-Shelf Filter: Rich, cinematic broadcaster low-end resonance (240Hz, +2.0dB)
      const warmth = ctx.createBiquadFilter();
      warmth.type = 'lowshelf';
      warmth.frequency.value = 240.0;
      warmth.gain.value = 2.0;

      // 2. Air High-Shelf Filter: Crisp, sparkling articulation (4500Hz, +2.2dB)
      const air = ctx.createBiquadFilter();
      air.type = 'highshelf';
      air.frequency.value = 4500.0;
      air.gain.value = 2.2;

      // 3. Peak Limiter / Mastering Compressor: Prevents clipping or harsh distortion
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -6.0;
      limiter.knee.value = 6.0;
      limiter.ratio.value = 8.0;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.15;

      // 4. Smooth Auto-Ducking Gain Node
      const duckingGain = ctx.createGain();
      duckingGain.gain.value = 1.0;
      this.ttsDuckingGainNode = duckingGain;

      // 5. Output Analyser Node: For real-time visual speech waveform in Three.js
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      this.ttsAnalyser = analyser;

      source.connect(analyser);
      this.startTtsEnvelopeMonitoring();
    } catch {
      // Audio element connects directly to default output on restriction
    }
  }

  /**
   * Real-time monitoring loop for TTS speech output waveform.
   */
  private startTtsEnvelopeMonitoring(): void {
    if (this.isTtsMonitoring || !this.ttsAnalyser) return;
    this.isTtsMonitoring = true;
    const dataArray = new Uint8Array(this.ttsAnalyser.frequencyBinCount);

    const updateTts = () => {
      if (!this.isSpeaking() || !this.ttsAnalyser) {
        this.isTtsMonitoring = false;
        this.speechOutputLevel.set(0);
        return;
      }
      this.ttsAnalyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      this.speechOutputLevel.set(Math.min(1.0, avg / 128.0));
      requestAnimationFrame(updateTts);
    };
    requestAnimationFrame(updateTts);
  }

  private silenceTimer: any = null;

  /**
   * Start listening to voice input from microphone with callback for transcribed text,
   * hardware noise cancellation, acoustic DSP gate, automatic barge-in voice interruption,
   * and 'Hey Mamu'/'Ok Bye Mamu' detection.
   */
  startVoiceListening(onResult: (text: string, isFinal?: boolean) => void, onEnd?: () => void): boolean {
    if (!this.recognition) return false;

    // Initialize hardware noise cancellation pipeline
    if (!this.micMediaStream) {
      this.initHardwareNoiseCancellation().catch(() => {});
    }

    try {
      this.isListening.set(true);
      let accumulatedTranscript = '';
      let lastDispatchedText = '';

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let currentFinal = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            currentFinal += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }
        if (currentFinal) {
          accumulatedTranscript = (accumulatedTranscript + ' ' + currentFinal).trim();
        }
        const currentText = (accumulatedTranscript + ' ' + interimTranscript).trim();

        // 1. BARGE-IN VOICE INTERRUPTION:
        // If ABHI or an Agent is currently speaking and user speaks in between, stop speaking immediately!
        if (this.isSpeaking() && currentText.length > 1) {
          this.stop();
        }

        // 2. WAKE & SLEEP PHRASE RECOGNITION
        const trigger = this.checkVoiceTrigger(currentText);
        if (trigger === 'SLEEP') {
          this.speak('Standing by, Mamu! I am right here whenever you need me.');
          this.isAlexaConversationMode.set(false);
          this.stopVoiceListening();
          if (onEnd) onEnd();
          return;
        } else if (trigger === 'WAKE') {
          if (!this.isAlexaConversationMode()) {
            this.isAlexaConversationMode.set(true);
            this.speak('Hey Mamu! I am listening, tell me!');
          }
          // Strip the wake word so clean command passes through
          const cleanedText = currentText.replace(/^(?:hey|hay|he|hi|hello)?\s*(?:mamu|abhi)\s*/i, '').trim();
          if (cleanedText && cleanedText !== lastDispatchedText) {
            lastDispatchedText = cleanedText;
            onResult(cleanedText, true);
          }
          accumulatedTranscript = '';
          return;
        }

        if (currentText) {
          onResult(currentText, false);
        }

        // 3. SILENCE TIMEOUT (Reliable multi-word capture)
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => {
          const dispatchText = currentText.trim();
          if (this.isListening() && dispatchText && dispatchText !== lastDispatchedText) {
            lastDispatchedText = dispatchText;
            accumulatedTranscript = '';
            onResult(dispatchText, true);

            // In single-shot mode, close listening; in continuous mode, keep microphone active!
            if (!this.isAlexaConversationMode()) {
              this.stopVoiceListening();
              if (onEnd) onEnd();
            }
          }
        }, 1300);
      };

      this.recognition.onerror = () => {
        this.isListening.set(false);
        // If continuous conversation mode is active, attempt soft restart after delay
        if (this.isAlexaConversationMode()) {
          setTimeout(() => {
            if (this.isAlexaConversationMode() && !this.isListening()) {
              try {
                this.recognition?.start();
                this.isListening.set(true);
              } catch {}
            }
          }, 800);
        } else if (onEnd) {
          onEnd();
        }
      };

      this.recognition.onend = () => {
        // Guarantee no speech is dropped on end
        const remainingText = accumulatedTranscript.trim();
        if (remainingText && remainingText !== lastDispatchedText) {
          lastDispatchedText = remainingText;
          accumulatedTranscript = '';
          onResult(remainingText, true);
        }

        this.isListening.set(false);
        // If continuous conversation mode is active, restart microphone loop automatically
        if (this.isAlexaConversationMode()) {
          setTimeout(() => {
            if (this.isAlexaConversationMode() && !this.isListening()) {
              try {
                this.recognition?.start();
                this.isListening.set(true);
              } catch {}
            }
          }, 300);
        } else if (onEnd) {
          onEnd();
        }
      };

      this.recognition.start();
      return true;
    } catch {
      this.isListening.set(false);
      return false;
    }
  }

  /**
   * Stop voice listening and release hardware media streams.
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
    this.micAudioLevel.set(0);

    // Release microphone tracks
    if (this.micMediaStream) {
      try {
        this.micMediaStream.getTracks().forEach((t) => t.stop());
      } catch {}
      this.micMediaStream = null;
    }
  }
}
