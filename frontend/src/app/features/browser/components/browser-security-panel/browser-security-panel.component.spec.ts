import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserSecurityPanelComponent } from './browser-security-panel.component';
import { vi } from 'vitest';

describe('BrowserSecurityPanelComponent', () => {
  let component: BrowserSecurityPanelComponent;
  let fixture: ComponentFixture<BrowserSecurityPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserSecurityPanelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BrowserSecurityPanelComponent);
    component = fixture.componentInstance;
    component.securityEvents = [
      {
        event_id: 'sec_01',
        event_type: 'BROWSER_PROMPT_INJECTION_DETECTED',
        timestamp: Date.now(),
        details: { msg: 'Prompt injection in page text' },
        severity: 'HIGH'
      }
    ];
    fixture.detectChanges();
  });

  it('should create security panel', () => {
    expect(component).toBeTruthy();
  });

  it('should render security event items with badges', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('BROWSER_PROMPT_INJECTION_DETECTED');
    expect(el.textContent).toContain('HIGH');
  });

  it('should emit clear events on button click', () => {
    const spy = vi.spyOn(component.clearEvents, 'emit');
    const clearBtn = fixture.nativeElement.querySelector('[data-testid="btn-clear-events"]');
    clearBtn.click();
    expect(spy).toHaveBeenCalled();
  });
});
