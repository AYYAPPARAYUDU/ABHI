import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BrowserService } from './browser.service';

describe('BrowserService', () => {
  let service: BrowserService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BrowserService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(BrowserService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created with default signals and computed values', () => {
    expect(service).toBeTruthy();
    expect(service.status().worker_state).toBe('READY');
    expect(service.capabilities().length).toBeGreaterThanOrEqual(7);
    expect(service.totalCapabilitiesCount()).toBe(service.capabilities().length);
  });

  it('should filter capabilities by query', () => {
    service.setSearchQuery('download');
    const filtered = service.filteredCapabilities();
    expect(filtered.length).toBe(1);
    expect(filtered[0].name).toBe('download');

    service.setSearchQuery('unknown_query_xyz');
    expect(service.filteredCapabilities().length).toBe(0);
  });

  it('should load status via HTTP GET', async () => {
    const statusPromise = service.loadStatus();
    const req = httpTesting.expectOne('http://127.0.0.1:8000/api/v1/browser/status');
    expect(req.request.method).toBe('GET');
    req.flush({
      worker_state: 'READY',
      is_headless: true,
      active_sessions_count: 2,
      downloads_count: 3,
      security_events_count: 1,
      current_url: 'http://127.0.0.1:8765/test_app.html',
      current_title: 'Local Test'
    });
    await statusPromise;

    expect(service.status().active_sessions_count).toBe(2);
    expect(service.status().downloads_count).toBe(3);
  });

  it('should load capabilities via HTTP GET', async () => {
    const capPromise = service.loadCapabilities();
    const req = httpTesting.expectOne('http://127.0.0.1:8000/api/v1/browser/capabilities');
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        name: 'open_url',
        skill_id: 'browser.open_url',
        risk_level: 'LOW',
        permissions: ['BROWSER_NAVIGATE'],
        description: 'Open URL',
        verification_policy: 'URL_ORIGIN_MATCH'
      }
    ]);
    await capPromise;

    expect(service.capabilities().length).toBe(1);
    expect(service.capabilities()[0].name).toBe('open_url');
  });

  it('should load sessions via HTTP GET', async () => {
    const sessPromise = service.loadSessions();
    const req = httpTesting.expectOne('http://127.0.0.1:8000/api/v1/browser/sessions');
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        session_id: 'b_sess_100',
        task_id: 'task_100',
        browser_type: 'chromium',
        current_origin: 'http://127.0.0.1:8765',
        current_url: 'http://127.0.0.1:8765/test.html',
        state: 'NAVIGATING',
        created_at_ts: 12345,
        last_observation_ts: 12345
      }
    ]);
    await sessPromise;

    expect(service.sessions().length).toBe(1);
    expect(service.sessions()[0].session_id).toBe('b_sess_100');
  });

  it('should load security events and downloads', async () => {
    const evtPromise = service.loadSecurityEvents();
    const req1 = httpTesting.expectOne('http://127.0.0.1:8000/api/v1/browser/security-events');
    expect(req1.request.method).toBe('GET');
    req1.flush([
      {
        event_id: 'evt_1',
        event_type: 'BROWSER_PROMPT_INJECTION_DETECTED',
        timestamp: 1000,
        details: {},
        severity: 'HIGH'
      }
    ]);
    await evtPromise;

    expect(service.securityEvents().length).toBe(1);
    expect(service.promptInjectionAlertsCount()).toBe(1);

    const dlPromise = service.loadDownloads();
    const req2 = httpTesting.expectOne('http://127.0.0.1:8000/api/v1/browser/downloads');
    expect(req2.request.method).toBe('GET');
    req2.flush([
      {
        download_id: 'dl_1',
        filename: 'file.txt',
        file_path: 'downloads/file.txt',
        origin: 'http://127.0.0.1:8765/file.txt',
        size_bytes: 50,
        mime_type: 'text/plain',
        is_executable: false,
        verified: true
      }
    ]);
    await dlPromise;

    expect(service.downloads().length).toBe(1);
  });

  it('should start a session via HTTP POST', async () => {
    const startPromise = service.startSession('task_test_start');
    const req = httpTesting.expectOne('http://127.0.0.1:8000/api/v1/browser/sessions/start');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ task_id: 'task_test_start' });
    req.flush({
      session_id: 'b_sess_new_01',
      task_id: 'task_test_start',
      browser_type: 'chromium',
      current_origin: 'http://127.0.0.1:8765',
      current_url: 'http://127.0.0.1:8765/test_app.html',
      state: 'READY',
      created_at_ts: 1000,
      last_observation_ts: 1000
    });
    await startPromise;

    expect(service.sessions().some(s => s.session_id === 'b_sess_new_01')).toBe(true);
  });

  it('should stop a session via HTTP POST', async () => {
    service.sessions.set([
      {
        session_id: 'sess_to_stop',
        task_id: 'task_0',
        browser_type: 'chromium',
        current_origin: 'http://127.0.0.1:8765',
        current_url: 'http://127.0.0.1:8765/test.html',
        state: 'READY',
        created_at_ts: 100,
        last_observation_ts: 100
      }
    ]);

    const stopPromise = service.stopSession('sess_to_stop');
    const req = httpTesting.expectOne('http://127.0.0.1:8000/api/v1/browser/sessions/sess_to_stop/stop');
    expect(req.request.method).toBe('POST');
    req.flush({ success: true });
    await stopPromise;

    expect(service.sessions()[0].state).toBe('STOPPED');
  });

  it('should clear security events via HTTP POST', async () => {
    const clearPromise = service.clearSecurityEvents();
    const req = httpTesting.expectOne('http://127.0.0.1:8000/api/v1/browser/clear-events');
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, cleared_count: 2 });
    await clearPromise;

    expect(service.securityEvents().length).toBe(0);
  });
});
