import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { GestureStatusComponent } from './gesture-status.component';
import { InteractionService } from '../../services/interaction.service';

describe('GestureStatusComponent', () => {
  let component: GestureStatusComponent;
  let fixture: ComponentFixture<GestureStatusComponent>;

  beforeEach(async () => {
    const interactionServiceMock: Partial<InteractionService> = {
      gesture: signal({
        activeGesture: 'THUMBS_UP',
        isStabilized: true,
        stabilizationFrames: 3,
        confidence: 0.95,
        isEmergencyStop: false,
        isConsentApproval: true,
        timestamp: Date.now()
      }) as any,
      face: signal({
        attentionState: 'ENGAGED',
        gazeOrientation: 'CENTER',
        confidence: 0.98,
        timestamp: Date.now()
      }) as any
    };

    await TestBed.configureTestingModule({
      imports: [GestureStatusComponent],
      providers: [
        { provide: InteractionService, useValue: interactionServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GestureStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the gesture status component', () => {
    expect(component).toBeTruthy();
  });

  it('should resolve correct emoji for gestures', () => {
    expect(component.getGestureEmoji('THUMBS_UP')).toBe('👍');
    expect(component.getGestureEmoji('OPEN_PALM')).toBe('✋');
  });
});
