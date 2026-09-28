import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { InteractionPageComponent } from './interaction-page.component';
import { InteractionService } from '../../services/interaction.service';

describe('InteractionPageComponent', () => {
  let component: InteractionPageComponent;
  let fixture: ComponentFixture<InteractionPageComponent>;
  let interactionServiceMock: Partial<InteractionService>;

  beforeEach(async () => {
    interactionServiceMock = {
      state: signal({
        mode: 'TEXT',
        voiceState: 'IDLE',
        listening: false,
        transcript: '',
        detectedLanguage: 'en',
        confidence: 1.0,
        canonicalIntent: '',
        preview: null,
        awaitingConsent: false,
        activeTaskId: null,
        executionState: 'IDLE',
        lastResult: null,
        errorMessage: null,
        gesture: {
          activeGesture: 'NONE',
          isStabilized: false,
          stabilizationFrames: 0,
          confidence: 1.0,
          isEmergencyStop: false,
          isConsentApproval: false,
          timestamp: Date.now()
        },
        face: {
          attentionState: 'ENGAGED',
          gazeOrientation: 'CENTER',
          confidence: 1.0,
          timestamp: Date.now()
        },
        history: [],
        timestamp: Date.now()
      }) as any,
      mode: signal('TEXT') as any,
      voiceState: signal('IDLE') as any,
      isListening: signal(false) as any,
      transcript: signal('') as any,
      preview: signal(null) as any,
      gesture: signal({
        activeGesture: 'NONE',
        isStabilized: false,
        stabilizationFrames: 0,
        confidence: 1.0,
        isEmergencyStop: false,
        isConsentApproval: false,
        timestamp: Date.now()
      }) as any,
      face: signal({
        attentionState: 'ENGAGED',
        gazeOrientation: 'CENTER',
        confidence: 1.0,
        timestamp: Date.now()
      }) as any,
      history: signal([]) as any,
      isBusy: signal(false) as any,
      setMode: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [InteractionPageComponent],
      providers: [
        { provide: InteractionService, useValue: interactionServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InteractionPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the interaction page component', () => {
    expect(component).toBeTruthy();
  });

  it('should allow mode switching', () => {
    component.setMode('VOICE');
    expect(interactionServiceMock.setMode).toHaveBeenCalledWith('VOICE');
  });
});
