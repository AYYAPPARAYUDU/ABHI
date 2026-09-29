import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { BrowserPageComponent } from './browser-page.component';
import { BrowserService } from '../../services/browser.service';

describe('BrowserPageComponent', () => {
  let component: BrowserPageComponent;
  let fixture: ComponentFixture<BrowserPageComponent>;
  let browserService: BrowserService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserPageComponent],
      providers: [
        BrowserService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BrowserPageComponent);
    component = fixture.componentInstance;
    browserService = TestBed.inject(BrowserService);
    fixture.detectChanges();
  });

  it('should create the browser page component', () => {
    expect(component).toBeTruthy();
  });

  it('should render header with title and subtitle', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Browser & Web Automation');
    expect(el.textContent).toContain('Phase 7 Stage 7.3');
  });

  it('should handle search input filter', () => {
    const searchSpy = vi.spyOn(browserService, 'setSearchQuery');
    const inputEvent = { target: { value: 'download' } } as unknown as Event;
    component.onSearch(inputEvent);
    expect(searchSpy).toHaveBeenCalledWith('download');
  });

  it('should trigger start session', () => {
    const startSpy = vi.spyOn(browserService, 'startSession');
    component.onStartSession('task_123');
    expect(startSpy).toHaveBeenCalledWith('task_123');
  });

  it('should trigger stop session', () => {
    const stopSpy = vi.spyOn(browserService, 'stopSession');
    component.onStopSession('b_sess_123');
    expect(stopSpy).toHaveBeenCalledWith('b_sess_123');
  });

  it('should trigger clear security events', () => {
    const clearSpy = vi.spyOn(browserService, 'clearSecurityEvents');
    component.onClearSecurityEvents();
    expect(clearSpy).toHaveBeenCalled();
  });
});
