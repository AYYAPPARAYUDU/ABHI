import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ApplicationService } from './application.service';

describe('ApplicationService', () => {
  let service: ApplicationService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApplicationService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ApplicationService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created with default application matrix', () => {
    expect(service).toBeTruthy();
    expect(service.applications().length).toBeGreaterThanOrEqual(5);
    expect(service.totalCapabilities()).toBeGreaterThan(15);
  });

  it('should filter applications by query', () => {
    service.setSearchQuery('notepad');
    const filtered = service.filteredApplications();
    expect(filtered.length).toBe(1);
    expect(filtered[0].application_id).toBe('notepad');
  });

  it('should select application and load capabilities', async () => {
    const selectPromise = service.selectApplication('notepad');
    const req = httpTesting.expectOne('http://127.0.0.1:8000/api/v1/applications/notepad');
    expect(req.request.method).toBe('GET');
    req.flush({
      application_id: 'notepad',
      display_name: 'Notepad',
      executable_names: ['notepad.exe'],
      icon_name: 'file-text',
      description: 'Built-in Windows text editor',
      enabled: true,
      state: 'RUNNING',
      capabilities_count: 7,
      capabilities: [
        { capability_name: 'read_text', skill_id: 'app.notepad.read_text', risk_level: 'READ_ONLY', description: 'Read document text' }
      ]
    });
    await selectPromise;

    expect(service.selectedApp()).toBeTruthy();
    expect(service.selectedApp()?.application_id).toBe('notepad');
  });

  it('should clear selection', async () => {
    const selectPromise = service.selectApplication('notepad');
    const req = httpTesting.expectOne('http://127.0.0.1:8000/api/v1/applications/notepad');
    req.flush({
      application_id: 'notepad',
      display_name: 'Notepad',
      capabilities: []
    });
    await selectPromise;

    expect(service.selectedApp()).toBeTruthy();
    service.clearSelection();
    expect(service.selectedApp()).toBeNull();
  });

  it('should toggle application state', async () => {
    const togglePromise = service.toggleApplication('notepad', false);
    const req = httpTesting.expectOne('http://127.0.0.1:8000/api/v1/applications/notepad/toggle');
    expect(req.request.method).toBe('POST');
    req.flush({ application_id: 'notepad', enabled: false });
    await togglePromise;

    const app = service.applications().find(a => a.application_id === 'notepad');
    expect(app?.enabled).toBe(false);
  });

  it('should launch application', async () => {
    const launchPromise = service.launchApplication('notepad');
    const req = httpTesting.expectOne('http://127.0.0.1:8000/api/v1/applications/notepad/launch');
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, application_id: 'notepad', state: 'RUNNING' });
    await launchPromise;

    const app = service.applications().find(a => a.application_id === 'notepad');
    expect(app?.state).toBe('RUNNING');
  });

  it('should focus application', async () => {
    const focusPromise = service.focusApplication('notepad');
    const req = httpTesting.expectOne('http://127.0.0.1:8000/api/v1/applications/notepad/focus');
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, application_id: 'notepad', state: 'FOCUSED' });
    await focusPromise;

    const app = service.applications().find(a => a.application_id === 'notepad');
    expect(app?.state).toBe('FOCUSED');
  });
});

