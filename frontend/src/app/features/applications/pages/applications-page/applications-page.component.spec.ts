import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { ApplicationsPageComponent } from './applications-page.component';
import { ApplicationService } from '../../services/application.service';

describe('ApplicationsPageComponent', () => {
  let component: ApplicationsPageComponent;
  let fixture: ComponentFixture<ApplicationsPageComponent>;
  let appService: ApplicationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplicationsPageComponent],
      providers: [
        ApplicationService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ApplicationsPageComponent);
    component = fixture.componentInstance;
    appService = TestBed.inject(ApplicationService);
    fixture.detectChanges();
  });

  it('should create the applications page', () => {
    expect(component).toBeTruthy();
  });

  it('should render page title and subtitle', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Windows & Application Capabilities');
    expect(compiled.textContent).toContain('STAGE 7.2');
  });

  it('should handle search input', () => {
    const searchSpy = vi.spyOn(appService, 'setSearchQuery');
    const inputEvent = { target: { value: 'calculator' } } as unknown as Event;
    component.onSearch(inputEvent);
    expect(searchSpy).toHaveBeenCalledWith('calculator');
  });

  it('should trigger select application on card selection', () => {
    const selectSpy = vi.spyOn(appService, 'selectApplication');
    component.onSelectApp('explorer');
    expect(selectSpy).toHaveBeenCalledWith('explorer');
  });

  it('should trigger toggle application', () => {
    const toggleSpy = vi.spyOn(appService, 'toggleApplication');
    component.onToggleApp({ id: 'notepad', enabled: false });
    expect(toggleSpy).toHaveBeenCalledWith('notepad', false);
  });

  it('should trigger launch and focus application', () => {
    const launchSpy = vi.spyOn(appService, 'launchApplication');
    const focusSpy = vi.spyOn(appService, 'focusApplication');

    component.onLaunchApp('calculator');
    expect(launchSpy).toHaveBeenCalledWith('calculator');

    component.onFocusApp('calculator');
    expect(focusSpy).toHaveBeenCalledWith('calculator');
  });
});

