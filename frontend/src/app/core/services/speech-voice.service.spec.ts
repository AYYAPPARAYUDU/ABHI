import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SpeechVoiceService } from './speech-voice.service';

describe('SpeechVoiceService', () => {
  let service: SpeechVoiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SpeechVoiceService]
    });
    service = TestBed.inject(SpeechVoiceService);
  });

  it('should be created successfully', () => {
    expect(service).toBeTruthy();
    expect(service.isSpeaking()).toBe(false);
    expect(service.isListening()).toBe(false);
    expect(service.isMuted()).toBe(false);
  });

  it('should toggle mute state cleanly', () => {
    expect(service.isMuted()).toBe(false);
    const muted = service.toggleMute();
    expect(muted).toBe(true);
    expect(service.isMuted()).toBe(true);
    const unmuted = service.toggleMute();
    expect(unmuted).toBe(false);
    expect(service.isMuted()).toBe(false);
  });

  it('should handle speak invocation gracefully without crashing in test environments', () => {
    expect(() => service.speak('System online')).not.toThrow();
  });

  it('should trigger greetUserOnLaunch without errors', () => {
    expect(() => service.greetUserOnLaunch()).not.toThrow();
  });

  it('should handle stopVoiceListening cleanly', () => {
    expect(() => service.stopVoiceListening()).not.toThrow();
    expect(service.isListening()).toBe(false);
  });

  it('should initialize with JARVIS persona and Sir callsign by default', () => {
    expect(service.personaMode()).toBe('JARVIS');
    expect(service.userCallsign()).toBe('Sir');
  });

  it('should update persona mode and user callsign correctly', () => {
    service.setPersonaMode('FRIDAY');
    expect(service.personaMode()).toBe('FRIDAY');

    service.setUserCallsign('Boss');
    expect(service.userCallsign()).toBe('Boss');

    service.setUserCallsign('Tony');
    expect(service.userCallsign()).toBe('Tony');
  });
});
