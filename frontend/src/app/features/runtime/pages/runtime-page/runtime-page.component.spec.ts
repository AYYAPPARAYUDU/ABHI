import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { RuntimePageComponent } from './runtime-page.component';
import { RuntimeService } from '../../services/runtime.service';

describe('RuntimePageComponent', () => {
  let component: RuntimePageComponent;
  let fixture: ComponentFixture<RuntimePageComponent>;
  let runtimeServiceMock: Partial<RuntimeService>;

  beforeEach(async () => {
    runtimeServiceMock = {
      state: signal({
        current_mode: 'ARMED',
        identity_level: 'LEVEL_1_WAKE_WORD',
        is_locked: false,
        is_listening: false,
        is_resting: false,
        wake_word_active: true,
        camera_power_policy: 'LOW_POWER',
        microphone_power_policy: 'LOW_POWER',
        last_wake_timestamp: undefined,
        uptime_sec: 120,
        active_user: 'local_operator',
        lockout_remaining_sec: 0
      }) as any,
      startupHealth: signal({
        status: 'HEALTHY',
        services: {
          backend_api: 'HEALTHY',
          sqlite_database: 'HEALTHY',
          ollama_engine: 'HEALTHY',
          wake_word_engine: 'HEALTHY',
          perception_daemon: 'HEALTHY',
          windows_host_worker: 'HEALTHY',
          websocket_telemetry: 'HEALTHY'
        },
        auto_start_policy: 'ARMED_WITHOUT_TASK_EXECUTION',
        runtime_mode: 'ARMED'
      }) as any,
      lastWakeWordEvent: signal(null) as any,
      authError: signal(null) as any,
      isAuthenticating: signal(false) as any,
      isArmed: signal(true) as any,
      isListening: signal(false) as any,
      isResting: signal(false) as any,
      isLocked: signal(false) as any,
      isEmergencyStopped: signal(false) as any,
      refreshState: vi.fn(),
      refreshStartupHealth: vi.fn(),
      wakeAssistant: vi.fn(),
      sleepAssistant: vi.fn(),
      armAssistant: vi.fn(),
      lockAssistant: vi.fn(),
      unlockAssistant: vi.fn(),
      triggerWakeWord: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [RuntimePageComponent],
      providers: [
        { provide: RuntimeService, useValue: runtimeServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RuntimePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the runtime page component', () => {
    expect(component).toBeTruthy();
  });
});
