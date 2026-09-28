import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { InteractionStatusComponent } from './interaction-status.component';
import { InteractionService } from '../../services/interaction.service';

describe('InteractionStatusComponent', () => {
  let component: InteractionStatusComponent;
  let fixture: ComponentFixture<InteractionStatusComponent>;

  beforeEach(async () => {
    const interactionServiceMock: Partial<InteractionService> = {
      history: signal([
        {
          inputId: 'in_1',
          source: 'VOICE',
          timestamp: Date.now(),
          language: 'en',
          normalizedText: 'Open calculator',
          intent: 'OPEN_APPLICATION',
          confidence: 0.95
        }
      ]) as any,
      state: signal({} as any) as any
    };

    await TestBed.configureTestingModule({
      imports: [InteractionStatusComponent],
      providers: [
        { provide: InteractionService, useValue: interactionServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InteractionStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the interaction status component', () => {
    expect(component).toBeTruthy();
  });

  it('should render history items', () => {
    expect(component.history().length).toBe(1);
  });
});
