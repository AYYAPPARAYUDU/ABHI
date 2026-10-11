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

  it('should render brand pill and top HUD header', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('ABHI');
    expect(compiled.textContent).toContain('CENTRAL INTELLIGENCE');
    expect(compiled.querySelector('.e-stop-btn')).toBeTruthy();
  });

  it('should render floating neumorphic command dock and input field', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.neumorphic-dock-shell')).toBeTruthy();
    expect(compiled.querySelector('.dock-input-field')).toBeTruthy();
    expect(compiled.querySelector('.voice-btn')).toBeTruthy();
    expect(compiled.querySelector('.submit-btn')).toBeTruthy();
  });

  it('should have 4 primary operating workspaces available in switcher', () => {
    expect(component.workspaceRoutes.length).toBe(4);
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
});
