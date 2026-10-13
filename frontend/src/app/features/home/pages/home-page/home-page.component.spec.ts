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
    expect(compiled.textContent).toContain('CENTRAL INTELLIGENCE');
    expect(compiled.querySelector('.subconscious-thought-bar')).toBeTruthy();
  });

  it('should render floating neumorphic command dock and input field', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.neumorphic-dock-shell')).toBeTruthy();
    expect(compiled.querySelector('.dock-input-field')).toBeTruthy();
    expect(compiled.querySelector('.voice-btn')).toBeTruthy();
    expect(compiled.querySelector('.submit-btn')).toBeTruthy();
  });

  it('should render in-panel view segment tabs and switch active tab', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.vision-view-segment-bar')).toBeTruthy();
    expect(component.activeMainTab()).toBe('AUTOMATION');
    component.setActiveTab('TELEMETRY');
    expect(component.activeMainTab()).toBe('TELEMETRY');
    component.setActiveTab('SWARM');
    expect(component.activeMainTab()).toBe('SWARM');
    component.setActiveTab('NEURAL');
    expect(component.activeMainTab()).toBe('NEURAL');
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
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.auto-cycle-btn')).toBeTruthy();
    expect(component.isAutoCycleRunning()).toBe(false);
    component.toggleAutoCycle();
    expect(component.isAutoCycleRunning()).toBe(true);
    component.toggleAutoCycle();
    expect(component.isAutoCycleRunning()).toBe(false);
  });
});
