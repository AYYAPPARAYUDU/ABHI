import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { AppShellComponent } from './app-shell.component';
import { OperatorStateService } from '../../../core/services/operator-state.service';
import { TelemetryService } from '../../../core/websocket/telemetry.service';
import { TaskApiService } from '../../../core/api/task-api.service';

describe('AppShellComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'home', component: AppShellComponent },
          { path: 'network', component: AppShellComponent }
        ]),
        TaskApiService,
        TelemetryService,
        OperatorStateService
      ]
    }).compileComponents();
  });

  it('should create app shell component', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render 3d background and router outlet on main agent without permanent sidebar', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-spatial-background')).toBeTruthy();
    expect(el.querySelector('router-outlet')).toBeTruthy();
    // Verify zero permanent sidebar on default main agent view
    expect(el.querySelector('.sidebar')).toBeFalsy();
    expect(el.querySelector('aside')).toBeFalsy();
  });

  it('should identify main agent route correctly', () => {
    const fixture = TestBed.createComponent(AppShellComponent);
    const component = fixture.componentInstance;
    expect(component.isMainAgent()).toBe(true);
  });
});
