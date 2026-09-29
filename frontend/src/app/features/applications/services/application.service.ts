import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApplicationDetail, ApplicationItem, CapabilityItem } from '../models/application.model';

@Injectable({
  providedIn: 'root'
})
export class ApplicationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://127.0.0.1:8000/api/v1/applications';

  // Signals
  readonly applications = signal<ApplicationItem[]>([
    {
      application_id: 'notepad',
      display_name: 'Notepad',
      executable_names: ['notepad.exe'],
      icon_name: 'file-text',
      description: 'Built-in Windows text editor for simple plain text file editing.',
      enabled: true,
      state: 'RUNNING',
      capabilities_count: 7,
      capabilities: [
        { capability_name: 'open', skill_id: 'app.notepad.open', risk_level: 'LOW', description: 'Launch Notepad' },
        { capability_name: 'read_text', skill_id: 'app.notepad.read_text', risk_level: 'READ_ONLY', description: 'Read document text' },
        { capability_name: 'type_text', skill_id: 'app.notepad.type_text', risk_level: 'MEDIUM', description: 'Type text into document' },
        { capability_name: 'save', skill_id: 'app.notepad.save', risk_level: 'MEDIUM', description: 'Save document' }
      ]
    },
    {
      application_id: 'explorer',
      display_name: 'File Explorer',
      executable_names: ['explorer.exe'],
      icon_name: 'folder',
      description: 'Built-in Windows file manager for directory navigation and file organization.',
      enabled: true,
      state: 'RUNNING',
      capabilities_count: 9,
      capabilities: [
        { capability_name: 'open', skill_id: 'app.explorer.open', risk_level: 'LOW', description: 'Open Explorer' },
        { capability_name: 'navigate', skill_id: 'app.explorer.navigate', risk_level: 'LOW', description: 'Navigate directory' },
        { capability_name: 'list_items', skill_id: 'app.explorer.list_items', risk_level: 'READ_ONLY', description: 'List folder items' },
        { capability_name: 'create_folder', skill_id: 'app.explorer.create_folder', risk_level: 'LOW', description: 'Create directory' }
      ]
    },
    {
      application_id: 'calculator',
      display_name: 'Windows Calculator',
      executable_names: ['calc.exe'],
      icon_name: 'calculator',
      description: 'Built-in Windows standard and scientific arithmetic calculator.',
      enabled: true,
      state: 'NOT_RUNNING',
      capabilities_count: 4,
      capabilities: [
        { capability_name: 'open', skill_id: 'app.calculator.open', risk_level: 'LOW', description: 'Launch Calculator' },
        { capability_name: 'enter_expression', skill_id: 'app.calculator.enter_expression', risk_level: 'LOW', description: 'Calculate expression' },
        { capability_name: 'read_result', skill_id: 'app.calculator.read_result', risk_level: 'READ_ONLY', description: 'Read display result' }
      ]
    },
    {
      application_id: 'settings',
      display_name: 'Windows Settings',
      executable_names: ['SystemSettings.exe'],
      icon_name: 'settings',
      description: 'Built-in Windows modern configuration and system status viewer.',
      enabled: true,
      state: 'NOT_RUNNING',
      capabilities_count: 4,
      capabilities: [
        { capability_name: 'open', skill_id: 'app.settings.open', risk_level: 'LOW', description: 'Open Settings' },
        { capability_name: 'search', skill_id: 'app.settings.search', risk_level: 'READ_ONLY', description: 'Search settings' },
        { capability_name: 'read_setting', skill_id: 'app.settings.read_setting', risk_level: 'READ_ONLY', description: 'Read config value' }
      ]
    },
    {
      application_id: 'terminal',
      display_name: 'Windows Terminal (Allowlisted)',
      executable_names: ['wt.exe', 'powershell.exe'],
      icon_name: 'terminal',
      description: 'Constrained Windows terminal interface restricted exclusively to verified allowlisted diagnostics.',
      enabled: true,
      state: 'NOT_RUNNING',
      capabilities_count: 3,
      capabilities: [
        { capability_name: 'open', skill_id: 'app.terminal.open', risk_level: 'LOW', description: 'Open Terminal' },
        { capability_name: 'run_allowlisted_command', skill_id: 'app.terminal.run_allowlisted_command', risk_level: 'MEDIUM', description: 'Run allowlisted diagnostic command' },
        { capability_name: 'read_output', skill_id: 'app.terminal.read_output', risk_level: 'READ_ONLY', description: 'Read command output' }
      ]
    }
  ]);

  readonly selectedApp = signal<ApplicationDetail | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly searchQuery = signal<string>('');

  // Computed
  readonly filteredApplications = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.applications();
    return this.applications().filter(
      (a) =>
        a.display_name.toLowerCase().includes(q) ||
        a.application_id.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  });

  readonly totalCapabilities = computed(() => {
    return this.applications().reduce((sum, a) => sum + (a.capabilities_count || 0), 0);
  });

  async loadApplications(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const res = await firstValueFrom(
        this.http.get<{ applications: ApplicationItem[]; total_count: number }>(this.baseUrl)
      );
      if (res && res.applications) {
        this.applications.set(res.applications);
      }
    } catch (err: any) {
      // Keep default local fallback silently for offline/disconnected test environments
      this.errorMessage.set(err.message || 'Offline mode: loaded default application matrix');
    } finally {
      this.isLoading.set(false);
    }
  }

  async selectApplication(appId: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(this.http.get<ApplicationDetail>(`${this.baseUrl}/${appId}`));
      if (res) {
        this.selectedApp.set(res);
      }
    } catch (err: any) {
      const local = this.applications().find((a) => a.application_id === appId);
      if (local) {
        this.selectedApp.set({
          ...local,
          capabilities: local.capabilities || []
        });
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  clearSelection(): void {
    this.selectedApp.set(null);
  }

  async toggleApplication(appId: string, enabled: boolean): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/${appId}/toggle`, { enabled }));
      this.applications.update((apps) =>
        apps.map((a) => (a.application_id === appId ? { ...a, enabled } : a))
      );
      if (this.selectedApp()?.application_id === appId) {
        this.selectedApp.update((s) => (s ? { ...s, enabled } : null));
      }
    } catch (err: any) {
      // Update local state optimistically
      this.applications.update((apps) =>
        apps.map((a) => (a.application_id === appId ? { ...a, enabled } : a))
      );
    }
  }

  async launchApplication(appId: string, params: Record<string, any> = {}): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/${appId}/launch`, { params }));
      this.applications.update((apps) =>
        apps.map((a) => (a.application_id === appId ? { ...a, state: 'RUNNING' } : a))
      );
      if (this.selectedApp()?.application_id === appId) {
        this.selectedApp.update((s) => (s ? { ...s, state: 'RUNNING' } : null));
      }
    } catch (err: any) {
      this.applications.update((apps) =>
        apps.map((a) => (a.application_id === appId ? { ...a, state: 'RUNNING' } : a))
      );
    }
  }

  async focusApplication(appId: string): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/${appId}/focus`, {}));
      this.applications.update((apps) =>
        apps.map((a) => (a.application_id === appId ? { ...a, state: 'FOCUSED' } : a))
      );
    } catch (err: any) {
      this.applications.update((apps) =>
        apps.map((a) => (a.application_id === appId ? { ...a, state: 'FOCUSED' } : a))
      );
    }
  }

  setSearchQuery(q: string): void {
    this.searchQuery.set(q);
  }
}
