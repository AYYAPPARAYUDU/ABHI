import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';
import { OperatorStateService } from './core/services/operator-state.service';
import { TelemetryService } from './core/websocket/telemetry.service';
import { TelemetryEvent } from './core/models/telemetry.model';

describe('Phase 6 Stage 6.1 — Angular Operator Console & Live Telemetry Suite', () => {
  let stateService: OperatorStateService;
  let telemetryService: TelemetryService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OperatorStateService,
        TelemetryService
      ]
    }).compileComponents();

    stateService = TestBed.inject(OperatorStateService);
    telemetryService = TestBed.inject(TelemetryService);
  });

  describe('App Shell & Component Rendering', () => {
    it('should create the App shell successfully', () => {
      const fixture = TestBed.createComponent(App);
      const app = fixture.componentInstance;
      expect(app).toBeTruthy();
    });

    it('should render brand identity in status bar', async () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.brand-title')?.textContent).toContain('ABHI');
      expect(compiled.querySelector('.brand-sub')?.textContent).toContain('OPERATOR CONSOLE');
    });

    it('should render all modular operator regions', async () => {
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      await fixture.whenStable();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('app-status-bar')).toBeTruthy();
      expect(compiled.querySelector('app-avatar-viewport')).toBeTruthy();
      expect(compiled.querySelector('app-visual-grounding-panel')).toBeTruthy();
      expect(compiled.querySelector('app-task-panel')).toBeTruthy();
      expect(compiled.querySelector('app-safety-panel')).toBeTruthy();
      expect(compiled.querySelector('app-execution-timeline')).toBeTruthy();
      expect(compiled.querySelector('app-telemetry-panel')).toBeTruthy();
    });
  });

  describe('Telemetry Buffer & Stream Processing', () => {
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
  });

  describe('Reactive State Transitions & Timeline Updates', () => {
    it('should transition through task lifecycle events smoothly', () => {
      const testTaskId = 'task_test_101';

      // 1. TASK_CREATED
      stateService.processTelemetryEvent({
        id: 'e1',
        type: 'TASK_CREATED',
        task_id: testTaskId,
        timestamp: 1000,
        payload: { goal: 'Click Run Test button', execution_id: 'exec_01' }
      });

      expect(stateService.currentTask()?.taskId).toBe(testTaskId);
      expect(stateService.currentTask()?.state).toBe('CREATED');
      expect(stateService.avatarState()).toBe('PLANNING');

      // 2. GROUNDING_SELECTED
      stateService.processTelemetryEvent({
        id: 'e2',
        type: 'GROUNDING_SELECTED',
        task_id: testTaskId,
        timestamp: 2000,
        payload: {
          source: 'LEVEL_3_OCR',
          target_identity: 'Run Test',
          confidence: 0.94,
          observation_id: 'obs_ocr_88',
          fallback_reason: 'UIA element not exposed'
        }
      });

      expect(stateService.grounding().level).toBe('LEVEL_3_OCR');
      expect(stateService.grounding().confidence).toBe(0.94);
      expect(stateService.grounding().isFallback).toBe(true);

      // 3. ACTION_EXECUTING
      stateService.processTelemetryEvent({
        id: 'e3',
        type: 'ACTION_EXECUTING',
        task_id: testTaskId,
        timestamp: 3000,
        payload: { action_id: 'act_click_01' }
      });

      expect(stateService.avatarState()).toBe('EXECUTING');

      // 4. VERIFICATION_COMPLETED
      stateService.processTelemetryEvent({
        id: 'e4',
        type: 'VERIFICATION_COMPLETED',
        task_id: testTaskId,
        timestamp: 4000,
        payload: { verified: true }
      });

      expect(stateService.verification().isVerified).toBe(true);
      expect(stateService.verification().state).toBe('VERIFIED');

      // 5. TASK_COMPLETED
      stateService.processTelemetryEvent({
        id: 'e5',
        type: 'TASK_COMPLETED',
        task_id: testTaskId,
        timestamp: 5000,
        payload: { duration_ms: 4000 }
      });

      expect(stateService.currentTask()?.state).toBe('COMPLETED');
      expect(stateService.currentTask()?.isSuccess).toBe(true);
      expect(stateService.avatarState()).toBe('SUCCESS');

      // Verify timeline recorded all items
      expect(stateService.timeline().length).toBe(5);
    });

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
