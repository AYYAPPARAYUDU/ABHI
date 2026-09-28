import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { VoiceInputComponent } from './voice-input.component';
import { InteractionService } from '../../services/interaction.service';

describe('VoiceInputComponent', () => {
  let component: VoiceInputComponent;
  let fixture: ComponentFixture<VoiceInputComponent>;
  let interactionServiceMock: Partial<InteractionService>;

  beforeEach(async () => {
    interactionServiceMock = {
      voiceState: signal('IDLE') as any,
      isListening: signal(false) as any,
      transcript: signal('Sample transcription') as any,
      state: signal({
        mode: 'VOICE',
        voiceState: 'IDLE',
        listening: false,
        transcript: 'Sample transcription',
        detectedLanguage: 'en',
        confidence: 0.95,
        canonicalIntent: '',
        preview: null,
        awaitingConsent: false,
        activeTaskId: null,
        executionState: 'IDLE',
        lastResult: null,
        errorMessage: null,
        gesture: {} as any,
        face: {} as any,
        history: [],
        timestamp: Date.now()
      }) as any,
      startVoiceSession: vi.fn(),
      stopVoiceSession: vi.fn(),
      cancelInteraction: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [VoiceInputComponent],
      providers: [
        { provide: InteractionService, useValue: interactionServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VoiceInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the voice input component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle voice listening session', () => {
    component.toggleVoice();
    expect(interactionServiceMock.startVoiceSession).toHaveBeenCalled();
  });
});
