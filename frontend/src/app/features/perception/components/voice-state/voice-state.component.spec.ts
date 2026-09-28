import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VoiceStateComponent } from './voice-state.component';
import { PerceptionService } from '../../services/perception.service';

describe('VoiceStateComponent', () => {
  let component: VoiceStateComponent;
  let fixture: ComponentFixture<VoiceStateComponent>;
  let perceptionService: PerceptionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VoiceStateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(VoiceStateComponent);
    component = fixture.componentInstance;
    perceptionService = TestBed.inject(PerceptionService);
    fixture.detectChanges();
  });

  it('should create and render voice perception panel', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle microphone state on click', () => {
    const initialListening = component.voice().isListening;
    component.toggleMic();
    expect(component.voice().isListening).toBe(!initialListening);
  });
});
