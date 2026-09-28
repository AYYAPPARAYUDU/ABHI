import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AppNavigationComponent } from './app-navigation.component';
import { OperatorStateService } from '../../../core/services/operator-state.service';
import { TelemetryService } from '../../../core/websocket/telemetry.service';
import { TaskApiService } from '../../../core/api/task-api.service';

describe('AppNavigationComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppNavigationComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        TaskApiService,
        TelemetryService,
        OperatorStateService
      ]
    }).compileComponents();
  });

  it('should create navigation component', () => {
    const fixture = TestBed.createComponent(AppNavigationComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render all primary navigation links', () => {
    const fixture = TestBed.createComponent(AppNavigationComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const links = el.querySelectorAll('a.nav-tab');
    expect(links.length).toBe(6);
  });
});
