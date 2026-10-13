import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { ContextualTopbarComponent } from './contextual-topbar.component';
import { OperatorStateService } from '../../../core/services/operator-state.service';

describe('ContextualTopbarComponent', () => {
  let component: ContextualTopbarComponent;
  let fixture: ComponentFixture<ContextualTopbarComponent>;
  let stateService: OperatorStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContextualTopbarComponent],
      providers: [
        provideRouter([]),
        provideHttpClient()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContextualTopbarComponent);
    component = fixture.componentInstance;
    stateService = TestBed.inject(OperatorStateService);
    fixture.detectChanges();
  });

  it('should create contextual topbar component', () => {
    expect(component).toBeTruthy();
  });

  it('should render brand identity pill with ABHI and CENTRAL INTELLIGENCE', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('ABHI');
    expect(compiled.textContent).toContain('CENTRAL INTELLIGENCE');
    expect(compiled.querySelector('.hud-brand-pill')).toBeTruthy();
  });

  it('should render holographic workspace navigation ribbon', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.bar-nav-ribbon')).toBeTruthy();
    expect(component.navItems.length).toBeGreaterThanOrEqual(10);
  });

  it('should render voice audio toggle button and toggle mute', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.voice-audio-btn')).toBeTruthy();
    expect(component.speechVoice.isMuted()).toBe(false);
    component.toggleVoiceAudio();
    expect(component.speechVoice.isMuted()).toBe(true);
  });

  it('should switch user experience mode', () => {
    component.setMode('ADVANCED');
    expect(stateService.userMode()).toBe('ADVANCED');
    component.setMode('DEVELOPER');
    expect(stateService.userMode()).toBe('DEVELOPER');
  });

  it('should trigger emergency stop with both estop-btn and e-stop-btn selectors', () => {
    const estopBtn = fixture.nativeElement.querySelector('.estop-btn') as HTMLButtonElement;
    expect(estopBtn).toBeTruthy();
    const eStopBtn = fixture.nativeElement.querySelector('.e-stop-btn') as HTMLButtonElement;
    expect(eStopBtn).toBeTruthy();
    eStopBtn.click();
    expect(stateService.safety().emergencyStopped).toBe(true);
  });
});
