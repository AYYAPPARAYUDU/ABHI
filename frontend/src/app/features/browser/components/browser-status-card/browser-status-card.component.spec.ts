import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserStatusCardComponent } from './browser-status-card.component';
import { vi } from 'vitest';

describe('BrowserStatusCardComponent', () => {
  let component: BrowserStatusCardComponent;
  let fixture: ComponentFixture<BrowserStatusCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserStatusCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BrowserStatusCardComponent);
    component = fixture.componentInstance;
    component.status = {
      worker_state: 'READY',
      is_headless: true,
      active_sessions_count: 1,
      downloads_count: 2,
      security_events_count: 1,
      current_url: 'http://127.0.0.1:8765/test_app.html',
      current_title: 'Local Test Website'
    };
    component.activeSessions = [
      {
        session_id: 'b_sess_01',
        task_id: 'task_01',
        browser_type: 'chromium',
        current_origin: 'http://127.0.0.1:8765',
        current_url: 'http://127.0.0.1:8765/test_app.html',
        state: 'READY',
        created_at_ts: Date.now(),
        last_observation_ts: Date.now()
      }
    ];
    fixture.detectChanges();
  });

  it('should create status card', () => {
    expect(component).toBeTruthy();
  });

  it('should render active url and worker state', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('READY');
    expect(el.textContent).toContain('http://127.0.0.1:8765/test_app.html');
  });

  it('should emit start session event on button click', () => {
    const spy = vi.spyOn(component.startSession, 'emit');
    const startBtn = fixture.nativeElement.querySelector('[data-testid="btn-start-session"]');
    startBtn.click();
    expect(spy).toHaveBeenCalled();
  });

  it('should emit stop session event', () => {
    const spy = vi.spyOn(component.stopSession, 'emit');
    component.onStop('b_sess_01');
    expect(spy).toHaveBeenCalledWith('b_sess_01');
  });
});
