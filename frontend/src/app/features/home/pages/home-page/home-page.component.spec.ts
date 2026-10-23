import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HomePageComponent } from './home-page.component';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { AgentCommandService } from '../../../../core/services/agent-command.service';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('HomePageComponent', () => {
  let component: HomePageComponent;
  let fixture: ComponentFixture<HomePageComponent>;
  let stateService: OperatorStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        OperatorStateService,
        AgentCommandService,
        TaskApiService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePageComponent);
    component = fixture.componentInstance;
    stateService = TestBed.inject(OperatorStateService);
    fixture.detectChanges();
  });

  it('should create home page component', () => {
    expect(component).toBeTruthy();
  });

  it('should render brand identity in thought stream and calibration HUD', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('ABHI');
    expect(compiled.textContent).toContain('ARC REACTOR');
    expect(compiled.querySelector('.subconscious-thought-bar')).toBeTruthy();
  });

  it('should render floating neumorphic command dock and input field', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.neumorphic-dock-shell')).toBeTruthy();
    expect(compiled.querySelector('.dock-input-field')).toBeTruthy();
    expect(compiled.querySelector('.voice-btn')).toBeTruthy();
    expect(compiled.querySelector('.submit-btn')).toBeTruthy();
  });

  it('should render zero permanent sidebars and full-viewport center workspace with quick action chips', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.telemetry-readings-column')).toBeFalsy();
    expect(compiled.querySelector('.vocal-studio-column')).toBeFalsy();
    expect(compiled.querySelector('.main-agent-center-viewport')).toBeTruthy();
    expect(compiled.querySelector('.quick-action-chips-dock')).toBeTruthy();
  });

  it('should switch left column mode between READINGS and AUTOMATIONS', () => {
    expect(component.activeLeftTab()).toBe('READINGS');
    component.setLeftTab('AUTOMATIONS');
    expect(component.activeLeftTab()).toBe('AUTOMATIONS');
    component.setLeftTab('READINGS');
    expect(component.activeLeftTab()).toBe('READINGS');
  });

  it('should have primary operating workspaces available in routing table', () => {
    expect(component.workspaceRoutes.length).toBe(10);
    const routes = component.workspaceRoutes.map(w => w.route);
    expect(routes).toContain('/network');
    expect(routes).toContain('/intelligence');
    expect(routes).toContain('/business');
    expect(routes).toContain('/media');
  });

  it('should toggle workspace menu on switcher button click', () => {
    expect(component.showWorkspaceMenu()).toBe(false);
    component.toggleWorkspaceMenu();
    expect(component.showWorkspaceMenu()).toBe(true);
    component.toggleWorkspaceMenu();
    expect(component.showWorkspaceMenu()).toBe(false);
  });

  it('should render auto-cycle button and toggle auto cycle loop', () => {
    expect(component.isAutoCycleRunning()).toBe(false);
    component.toggleAutoCycle();
    expect(component.isAutoCycleRunning()).toBe(true);
    component.toggleAutoCycle();
    expect(component.isAutoCycleRunning()).toBe(false);
  });

  it('should support Tony Stark & JARVIS persona switching and callsign updates', () => {
    component.setPersona('FRIDAY');
    expect(component.speechVoice.personaMode()).toBe('FRIDAY');
    component.setPersona('JARVIS');
    expect(component.speechVoice.personaMode()).toBe('JARVIS');

    component.setCallsign('Boss');
    expect(component.speechVoice.userCallsign()).toBe('Boss');
    component.setCallsign('Tony');
    expect(component.speechVoice.userCallsign()).toBe('Tony');
  });

  it('should support speech speed cadence adjustments', () => {
    component.setSpeechSpeed(0.95);
    expect(component.speechVoice.speechSpeedRate()).toBe(0.95);
    component.setSpeechSpeed(1.05);
    expect(component.speechVoice.speechSpeedRate()).toBe(1.05);
    component.setSpeechSpeed(1.0);
    expect(component.speechVoice.speechSpeedRate()).toBe(1.0);
  });

  it('should contain 8 specialist agents configured with Stark armor protocols', () => {
    expect(component.specialistAgents.length).toBe(8);
    const protocols = component.specialistAgents.map(a => a.protocolCode);
    expect(protocols).toContain('PROTOCOL-01 // COMMAND');
    expect(protocols).toContain('PROTOCOL-08 // VERONICA');
  });

  it('should provide quick companion banter prompts and Instagram reel action chips', () => {
    expect(component.companionBanterPrompts.length).toBe(6);
    expect(component.companionBanterPrompts[0].prompt).toContain('build something');
    expect(component.instaReelPrompts.length).toBe(8);
    expect(component.instaReelPrompts[0].label).toContain('WhatsApp');
  });
});
