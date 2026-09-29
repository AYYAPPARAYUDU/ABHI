import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  BrowserCapabilityModel,
  BrowserDownloadModel,
  BrowserSecurityEventModel,
  BrowserSessionModel,
  BrowserStatusModel
} from '../models/browser.model';

@Injectable({
  providedIn: 'root'
})
export class BrowserService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://127.0.0.1:8000/api/v1/browser';

  // Signals
  readonly status = signal<BrowserStatusModel>({
    worker_state: 'READY',
    is_headless: true,
    active_sessions_count: 1,
    downloads_count: 1,
    security_events_count: 2,
    current_url: 'http://127.0.0.1:8765/test_app.html',
    current_title: 'Local-First Test App'
  });

  readonly capabilities = signal<BrowserCapabilityModel[]>([
    {
      name: 'open_url',
      skill_id: 'browser.open_url',
      risk_level: 'LOW',
      permissions: ['BROWSER_NAVIGATE'],
      description: 'Open an approved HTTP/HTTPS URL in the browser worker.',
      verification_policy: 'URL_ORIGIN_MATCH'
    },
    {
      name: 'navigate',
      skill_id: 'browser.navigate',
      risk_level: 'LOW',
      permissions: ['BROWSER_NAVIGATE'],
      description: 'Navigate to a validated target URL with redirect policy checking.',
      verification_policy: 'URL_ORIGIN_MATCH'
    },
    {
      name: 'read_page',
      skill_id: 'browser.read_page',
      risk_level: 'READ_ONLY',
      permissions: ['BROWSER_READ'],
      description: 'Extract bounded structured text, links, and prompt injection screening.',
      verification_policy: 'PAGE_EXTRACTED'
    },
    {
      name: 'click',
      skill_id: 'browser.click',
      risk_level: 'LOW',
      permissions: ['BROWSER_CONTROL'],
      description: 'Click a verified grounded element with pre/post-condition verification.',
      verification_policy: 'DOM_STATE_MUTATED'
    },
    {
      name: 'type',
      skill_id: 'browser.type',
      risk_level: 'MEDIUM',
      permissions: ['BROWSER_CONTROL'],
      description: 'Type text into an input field with sensitive credential redaction.',
      verification_policy: 'INPUT_VALUE_MATCH'
    },
    {
      name: 'download',
      skill_id: 'browser.download',
      risk_level: 'MEDIUM',
      permissions: ['BROWSER_DOWNLOAD'],
      description: 'Download a file to the safe sandbox directory without automatic execution.',
      verification_policy: 'FILE_DOWNLOADED_VERIFIED'
    },
    {
      name: 'search',
      skill_id: 'browser.search',
      risk_level: 'LOW',
      permissions: ['BROWSER_NAVIGATE', 'BROWSER_CONTROL'],
      description: 'Execute search query through search form interface.',
      verification_policy: 'SEARCH_COMPLETED'
    }
  ]);

  readonly sessions = signal<BrowserSessionModel[]>([
    {
      session_id: 'b_sess_demo_01',
      task_id: 'task_browser_init',
      browser_type: 'chromium',
      current_origin: 'http://127.0.0.1:8765',
      current_url: 'http://127.0.0.1:8765/test_app.html',
      state: 'READY',
      created_at_ts: Date.now() - 60000,
      last_observation_ts: Date.now()
    }
  ]);

  readonly securityEvents = signal<BrowserSecurityEventModel[]>([
    {
      event_id: 'sec_evt_init_01',
      event_type: 'BROWSER_PROMPT_INJECTION_DETECTED',
      timestamp: Date.now() - 30000,
      details: { reason: 'Indirect prompt injection detected in page text — labeled untrusted' },
      severity: 'HIGH'
    },
    {
      event_id: 'sec_evt_init_02',
      event_type: 'BROWSER_SENSITIVE_FIELD',
      timestamp: Date.now() - 15000,
      details: { target: 'txt_password', redacted: true },
      severity: 'MEDIUM'
    }
  ]);

  readonly downloads = signal<BrowserDownloadModel[]>([
    {
      download_id: 'dl_sample_01',
      filename: 'sample_download.txt',
      file_path: 'database/downloads/sample_download.txt',
      origin: 'http://127.0.0.1:8765/sample_download.txt',
      size_bytes: 142,
      mime_type: 'text/plain',
      is_executable: false,
      verified: true
    }
  ]);

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly searchQuery = signal<string>('');

  // Computed
  readonly filteredCapabilities = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.capabilities();
    return this.capabilities().filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.skill_id.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.risk_level.toLowerCase().includes(q)
    );
  });

  readonly totalCapabilitiesCount = computed(() => this.capabilities().length);
  readonly promptInjectionAlertsCount = computed(
    () => this.securityEvents().filter((e) => e.event_type === 'BROWSER_PROMPT_INJECTION_DETECTED').length
  );

  async loadStatus(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<BrowserStatusModel>(`${this.baseUrl}/status`));
      if (res) this.status.set(res);
    } catch (err: any) {
      // Keep optimistic local fallback
    }
  }

  async loadCapabilities(): Promise<void> {
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<BrowserCapabilityModel[]>(`${this.baseUrl}/capabilities`));
      if (res && res.length > 0) this.capabilities.set(res);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Offline fallback mode');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadSessions(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<BrowserSessionModel[]>(`${this.baseUrl}/sessions`));
      if (res) this.sessions.set(res);
    } catch (err: any) {}
  }

  async loadSecurityEvents(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<BrowserSecurityEventModel[]>(`${this.baseUrl}/security-events`));
      if (res) this.securityEvents.set(res);
    } catch (err: any) {}
  }

  async loadDownloads(): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<BrowserDownloadModel[]>(`${this.baseUrl}/downloads`));
      if (res) this.downloads.set(res);
    } catch (err: any) {}
  }

  async startSession(taskId: string): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.post<BrowserSessionModel>(`${this.baseUrl}/sessions/start`, { task_id: taskId })
      );
      if (res) {
        this.sessions.update((s) => [res, ...s.filter((x) => x.session_id !== res.session_id)]);
      }
    } catch (err: any) {
      const fallbackSess: BrowserSessionModel = {
        session_id: `b_sess_${Date.now()}`,
        task_id: taskId,
        browser_type: 'chromium',
        current_origin: 'http://127.0.0.1:8765',
        current_url: 'http://127.0.0.1:8765/test_app.html',
        state: 'READY',
        created_at_ts: Date.now(),
        last_observation_ts: Date.now()
      };
      this.sessions.update((s) => [fallbackSess, ...s]);
    }
  }

  async stopSession(sessionId: string): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/sessions/${sessionId}/stop`, {}));
      this.sessions.update((s) =>
        s.map((sess) => (sess.session_id === sessionId ? { ...sess, state: 'STOPPED' } : sess))
      );
    } catch (err: any) {
      this.sessions.update((s) =>
        s.map((sess) => (sess.session_id === sessionId ? { ...sess, state: 'STOPPED' } : sess))
      );
    }
  }

  async clearSecurityEvents(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/clear-events`, {}));
      this.securityEvents.set([]);
    } catch (err: any) {
      this.securityEvents.set([]);
    }
  }

  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }
}
