import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Location } from '@angular/common';
import { App } from './app';
import { routes } from './app.routes';
import { OperatorStateService } from './core/services/operator-state.service';
import { TelemetryService } from './core/websocket/telemetry.service';
import { TaskApiService } from './core/api/task-api.service';

describe('Phase 6 Stage 6.2 — Application Shell, Routing & Design System Suite', () => {
  let stateService: OperatorStateService;
  let telemetryService: TelemetryService;
  let router: Router;
  let location: Location;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        TaskApiService,
        TelemetryService,
        OperatorStateService
      ]
    }).compileComponents();

    stateService = TestBed.inject(OperatorStateService);
    telemetryService = TestBed.inject(TelemetryService);
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
  });

  describe('Application Shell & Structure', () => {
    it('should create the App shell successfully', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      expect(app).toBeTruthy();
    });

    it('should render header, navigation, global safety bar, and router outlet', async () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('app-shell')).toBeTruthy();
      expect(compiled.querySelector('app-header')).toBeTruthy();
      expect(compiled.querySelector('app-navigation')).toBeTruthy();
      expect(compiled.querySelector('router-outlet')).toBeTruthy();
    });

    it('should render brand identity in application header', async () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.brand-title')?.textContent).toContain('ABHI');
      expect(compiled.querySelector('.brand-sub')?.textContent).toContain('OPERATOR CONSOLE');
    });
  });

  describe('Routing & Navigation', () => {
    it('should redirect root path to /console', async () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await router.navigate(['']);
      await fixture.whenStable();

      expect(location.path()).toBe('/console');
    });

    it('should navigate to /tasks and load TasksPageComponent', async () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await router.navigate(['/tasks']);
      await fixture.whenStable();

      expect(location.path()).toBe('/tasks');
    });

    it('should navigate to /applications and load ApplicationsPageComponent', async () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await router.navigate(['/applications']);
      await fixture.whenStable();

      expect(location.path()).toBe('/applications');
    });

    it('should navigate to /browser and load BrowserPageComponent', async () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await router.navigate(['/browser']);
      await fixture.whenStable();

      expect(location.path()).toBe('/browser');
    });

    it('should navigate to /workflows and load WorkflowPageComponent', async () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await router.navigate(['/workflows']);
      await fixture.whenStable();

      expect(location.path()).toBe('/workflows');
    });

    it('should navigate to /perception and load PerceptionPageComponent', async () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await router.navigate(['/perception']);
      await fixture.whenStable();

      expect(location.path()).toBe('/perception');
    });

    it('should navigate to /avatar and load AvatarPageComponent', async () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await router.navigate(['/avatar']);
      await fixture.whenStable();

      expect(location.path()).toBe('/avatar');
    });

    it('should navigate to /interaction and load InteractionPageComponent', async () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await router.navigate(['/interaction']);
      await fixture.whenStable();

      expect(location.path()).toBe('/interaction');
    });

    it('should navigate to /system and load SystemPageComponent', async () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await router.navigate(['/system']);
      await fixture.whenStable();

      expect(location.path()).toBe('/system');
    });

    it('should redirect unknown routes to /console', async () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await router.navigate(['/non-existent-route']);
      await fixture.whenStable();

      expect(location.path()).toBe('/console');
    });
  });

  describe('Telemetry Buffer & State Persistence across Navigation', () => {
    it('should enforce bounded memory buffer on telemetry events', () => {
      telemetryService.clearBuffer();
      expect(telemetryService.eventBuffer().length).toBe(0);

      // Simulate 150 events exceeding the 100 max buffer limit
      for (let i = 0; i < 150; i++) {
        (telemetryService as any).handleIncomingEvent({
          id: `test_evt_${i}`,
          channel: 'telemetry',
          type: 'ACTION_EXECUTING',
          timestamp: Date.now() + i,
          payload: { action_id: `act_${i}` }
        });
      }

      // Assert bounded size is maintained at exactly 100
      expect(telemetryService.eventBuffer().length).toBe(100);
      expect(telemetryService.eventBuffer()[0].id).toBe('test_evt_149');
    });

    it('should preserve state across route changes without disconnecting telemetry', async () => {
      const testTaskId = 'task_nav_test_1';
      stateService.processTelemetryEvent({
        id: 'e1',
        type: 'TASK_CREATED',
        task_id: testTaskId,
        timestamp: 1000,
        payload: { goal: 'Test Navigation State Preservation' }
      });

      expect(stateService.currentTask()?.taskId).toBe(testTaskId);

      // Navigate across routes
      await router.navigate(['/tasks']);
      expect(stateService.currentTask()?.taskId).toBe(testTaskId);

      await router.navigate(['/system']);
      expect(stateService.currentTask()?.taskId).toBe(testTaskId);

      await router.navigate(['/console']);
      expect(stateService.currentTask()?.taskId).toBe(testTaskId);
    });
  });

  describe('Reactive Safety & Emergency Stop Handling', () => {
    it('should handle Consent gate and Emergency Stop correctly', () => {
      // Consent Required
      stateService.processTelemetryEvent({
        id: 'c1',
        type: 'CONSENT_REQUIRED',
        task_id: 't_consent',
        timestamp: 1000,
        payload: { action_id: 'delete_resource', tier: 'Critical', reason: 'High-risk action' }
      });

      expect(stateService.safety().consentPending).toBe(true);
      expect(stateService.avatarState()).toBe('WAITING_CONSENT');

      // Emergency Stop
      stateService.processTelemetryEvent({
        id: 'es1',
        type: 'TASK_EMERGENCY_STOPPED',
        task_id: 't_consent',
        timestamp: 2000,
        payload: { reason: 'Operator pressed physical ESTOP' }
      });

      expect(stateService.safety().emergencyStopped).toBe(true);
      expect(stateService.safety().leaseStatus).toBe('REVOKED');
      expect(stateService.avatarState()).toBe('EMERGENCY_STOP');
    });
  });
});
