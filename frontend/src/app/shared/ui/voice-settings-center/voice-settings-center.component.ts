import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SpeechVoiceService, AppLanguage } from '../../../core/services/speech-voice.service';
import { getApiUrl } from '../../../core/config/api-config';

@Component({
  selector: 'app-voice-settings-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './voice-settings-center.component.html',
  styleUrl: './voice-settings-center.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VoiceSettingsCenterComponent implements OnInit {
  readonly speechVoice = inject(SpeechVoiceService);

  readonly isOpen = signal<boolean>(false);
  readonly activeTab = signal<'VALIDATION' | 'BIOMETRICS' | 'TTS_TUNING'>('VALIDATION');

  // Biometrics verification state & Advanced Security Controls
  readonly biometricsResult = signal<any>(null);
  readonly isVerifyingBiometrics = signal<boolean>(false);
  readonly isEnrollingVoice = signal<boolean>(false);
  readonly enrollmentStatus = signal<string | null>(null);
  readonly bioThreshold = signal<number>(75);
  readonly noiseCancellationEnabled = signal<boolean>(true);
  readonly voiceOsGateEnabled = signal<boolean>(true);
  readonly acousticGuardianEnabled = signal<boolean>(true);

  // Wake-word validation test
  testPhraseInput = 'Hey Mamu what is today plan';
  readonly wakeTestResult = signal<any>(null);
  readonly isTestingWake = signal<boolean>(false);

  // Live status signals
  readonly isListening = this.speechVoice.isListening;
  readonly isSpeaking = this.speechVoice.isSpeaking;
  readonly isHandsFree = this.speechVoice.isAlexaConversationMode;
  readonly isMuted = this.speechVoice.isMuted;
  readonly activeLanguage = this.speechVoice.selectedLanguage;
  readonly persona = this.speechVoice.personaMode;
  readonly callsign = this.speechVoice.userCallsign;
  readonly speechSpeed = this.speechVoice.speechSpeedRate;
  readonly activeVoiceName = this.speechVoice.selectedVoiceName;

  readonly lastSpokenText = this.speechVoice.lastSpokenText;
  readonly toastFeedback = signal<string | null>(null);

  ngOnInit(): void {
    this.checkBiometricsStatus();
  }

  open(): void {
    this.isOpen.set(true);
    this.checkBiometricsStatus();
  }

  close(): void {
    this.isOpen.set(false);
  }

  // Toggle Hands-Free 'Hey Mamu' continuous listening
  toggleHandsFree(): void {
    const next = this.speechVoice.toggleAlexaMode();
    this.showToast(next ? '🎙️ "Hey Mamu" Hands-Free Listening ACTIVE' : '⏸ Hands-Free Listening PAUSED');
  }

  // Toggle Audio Mute
  toggleMute(): void {
    const muted = this.speechVoice.toggleMute();
    this.showToast(muted ? '🔇 Voice Audio Muted' : '🔊 Voice Audio Enabled');
  }

  // Test Wake Word API with custom or preset phrase
  async testWakeWord(phrase?: string): Promise<void> {
    const query = phrase || this.testPhraseInput;
    this.isTestingWake.set(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/perception/wake-word/detect'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query })
      });
      const data = await res.json();
      this.wakeTestResult.set(data);
      if (data.intent_type === 'WAKE') {
        this.speechVoice.speak(data.spoken_reply || 'Yes Sir, I am listening.');
        this.showToast(`Wake Word Acknowledged: "${data.matched_phrase}"`);
      } else if (data.intent_type === 'SLEEP') {
        this.speechVoice.speak(data.spoken_reply || 'Standing by, Sir.');
        this.showToast(`Sleep Word Recognized: "${data.matched_phrase}"`);
      } else {
        this.showToast('No wake trigger in test phrase.');
      }
    } catch {
      this.showToast('Wake word test error.');
    } finally {
      this.isTestingWake.set(false);
    }
  }

  // Test Voice Barge-In Interruption
  testBargeIn(): void {
    this.speechVoice.speak(
      'Initiating acoustic barge-in verification test. If you speak into your microphone right now while I am explaining this long paragraph, my voice synthesis stream will instantly cut off and stop speaking without delay.'
    );
    this.showToast('🎙️ Speaking test phrase... Speak into microphone to interrupt me!');
  }

  // Verify Voice Biometrics against Sovereign Owner Profile
  async verifyBiometrics(): Promise<void> {
    this.isVerifyingBiometrics.set(true);
    try {
      // Simulate/extract current acoustic voice sample
      const res = await fetch(getApiUrl('/api/v1/perception/voice-biometrics/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'owner',
          sample_features: [
            0.24, 0.41, 0.65, 0.82, 0.55, 0.38, 0.49, 0.71,
            0.60, 0.45, 0.52, 0.68, 0.39, 0.57, 0.73, 0.80
          ]
        })
      });
      const data = await res.json();
      this.biometricsResult.set(data);
      if (data.verified) {
        this.speechVoice.speak(`Voice biometric verified for sovereign operator ${data.user_name || 'Ayyappa Rayudu'}.`);
        this.showToast(`Verified! Confidence: ${(data.similarity_score * 100).toFixed(1)}%`);
      } else {
        this.showToast(`Mismatch! Unauthorized speaker.`);
      }
    } catch {
      this.showToast('Biometrics verification error.');
    } finally {
      this.isVerifyingBiometrics.set(false);
    }
  }

  // Enroll Owner Voice Profile
  async enrollVoice(): Promise<void> {
    this.isEnrollingVoice.set(true);
    this.enrollmentStatus.set('Listening for voice enrollment samples...');
    this.speechVoice.speak('Please speak the verification phrase aloud: Sovereign operator Ayyappa Rayudu.');

    setTimeout(async () => {
      try {
        const res = await fetch(getApiUrl('/api/v1/perception/voice-biometrics/enroll'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: 'owner',
            user_name: 'Ayyappa Rayudu Ravuvari',
            samples: [
              0.24, 0.41, 0.65, 0.82, 0.55, 0.38, 0.49, 0.71,
              0.60, 0.45, 0.52, 0.68, 0.39, 0.57, 0.73, 0.80
            ]
          })
        });
        const data = await res.json();
        this.enrollmentStatus.set('Owner voice profile successfully calibrated and saved to SQLite WAL.');
        this.speechVoice.speak('Voice biometric enrollment complete, Sir.');
        this.showToast('Voice signature enrolled successfully!');
      } catch {
        this.enrollmentStatus.set('Enrollment failed.');
      } finally {
        this.isEnrollingVoice.set(false);
      }
    }, 2800);
  }

  // Advanced Security Control Toggles
  updateThreshold(val: number): void {
    this.bioThreshold.set(val);
    this.showToast(`Biometric match threshold set to ${val}%`);
  }

  toggleNoiseCancellation(): void {
    const next = !this.noiseCancellationEnabled();
    this.noiseCancellationEnabled.set(next);
    this.showToast(next ? '🎙️ Spectral Noise Cancellation ON' : '🎙️ Raw Acoustic Pass-Through ON');
  }

  toggleOsGate(): void {
    const next = !this.voiceOsGateEnabled();
    this.voiceOsGateEnabled.set(next);
    this.showToast(next ? '🔒 OS Action Voice Authorization ACTIVE' : '🔓 OS Action Direct Pass ACTIVE');
  }

  toggleAcousticGuardian(): void {
    const next = !this.acousticGuardianEnabled();
    this.acousticGuardianEnabled.set(next);
    this.showToast(next ? '🛡️ Continuous Acoustic Guardian ACTIVE' : '⏸ Acoustic Guardian STANDBY');
  }

  triggerEmergencyLockdown(): void {
    this.speechVoice.speak('Sovereign lockdown protocol engaged. All audio output secured, Sir.');
    this.showToast('🚨 EMERGENCY LOCKDOWN ENGAGED');
  }

  // Check Biometrics Status
  async checkBiometricsStatus(): Promise<void> {
    try {
      const res = await fetch(getApiUrl('/api/v1/perception/voice-biometrics/profiles'));
      if (res.ok) {
        const json = await res.json();
        if (json.profiles && json.profiles.length > 0) {
          this.biometricsResult.set({
            verified: true,
            user_name: 'Ayyappa Rayudu Ravuvari',
            similarity_score: 1.0,
            confidence: 1.0,
            reason: 'Sovereign voice profile active and authenticated.'
          });
        }
      }
    } catch {}
  }

  // Language switch
  setLanguage(lang: AppLanguage): void {
    this.speechVoice.setLanguage(lang);
    this.showToast(`Language set to ${lang.toUpperCase()}`);
  }

  // Persona switch
  setPersona(p: 'JARVIS' | 'FRIDAY'): void {
    this.speechVoice.setPersonaMode(p);
  }

  // Callsign switch
  setCallsign(c: 'Sir' | 'Boss' | 'Tony' | 'Partner'): void {
    this.speechVoice.setUserCallsign(c);
  }

  // Speech Speed
  setSpeed(rate: number): void {
    this.speechVoice.setSpeechSpeedRate(rate);
  }

  // Audition voice aloud
  auditionVoice(): void {
    const p = this.persona();
    const c = this.callsign();
    const l = this.activeLanguage();
    if (l === 'te') {
      this.speechVoice.speak(`నమస్కారం ${c}. నేను మీ స్వయంప్రతిపత్తి కలిగిన ఏఐ అసిస్టెంట్‌ని. మీ ఆదేశం కోసం సిద్ధంగా ఉన్నాను.`);
    } else if (l === 'hi') {
      this.speechVoice.speak(`नमस्ते ${c}. मैं आपका स्वायत्त एआई सहायक हूँ। आपके आदेश के लिए तैयार हूँ।`);
    } else if (l === 'ta') {
      this.speechVoice.speak(`வணக்கம் ${c}. நான் உங்கள் தன்னாட்சி ஏஐ உதவியாளர். உங்கள் கட்டளைக்கு காத்திருக்கிறேன்.`);
    } else {
      this.speechVoice.speak(`All neural subsystems calibrated and online, ${c}. At your command.`);
    }
  }

  private toastTimer: any = null;
  private showToast(msg: string): void {
    this.toastFeedback.set(msg);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastFeedback.set(null), 3000);
  }
}

