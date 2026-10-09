import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { FloatingSidebarComponent } from './floating-sidebar.component';
import { OperatorStateService } from '../../../core/services/operator-state.service';

describe('FloatingSidebarComponent', () => {
  let component: FloatingSidebarComponent;
  let fixture: ComponentFixture<FloatingSidebarComponent>;
  let stateService: OperatorStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FloatingSidebarComponent],
      providers: [
        provideRouter([]),
        provideHttpClient()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FloatingSidebarComponent);
    component = fixture.componentInstance;
    stateService = TestBed.inject(OperatorStateService);
    fixture.detectChanges();
  });

  it('should create floating sidebar component', () => {
    expect(component).toBeTruthy();
  });

  it('should render core navigation destinations', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Main Agent');
    expect(compiled.textContent).toContain('Agent Network');
    expect(compiled.textContent).toContain('Intelligence Lab');
    expect(compiled.textContent).toContain('Business Sectors');
  });

  it('should toggle sidebar collapse state', () => {
    expect(stateService.sidebarCollapsed()).toBe(false);
    stateService.toggleSidebar();
    expect(stateService.sidebarCollapsed()).toBe(true);
  });
});
