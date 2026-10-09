import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { BusinessPageComponent } from './business-page.component';
import { BusinessService } from '../../services/business.service';

describe('BusinessPageComponent', () => {
  let component: BusinessPageComponent;
  let fixture: ComponentFixture<BusinessPageComponent>;
  let businessService: BusinessService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessPageComponent],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(BusinessPageComponent);
    component = fixture.componentInstance;
    businessService = TestBed.inject(BusinessService);
    fixture.detectChanges();
  });

  it('should create business page component', () => {
    expect(component).toBeTruthy();
  });

  it('should render revenue & ledger observatory with honest disclaimers', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('REVENUE & LEDGER OBSERVATORY');
    expect(compiled.textContent).toContain('Forecast only — not actual earnings');
  });

  it('should toggle modals cleanly', () => {
    expect(component.showNewProjModal()).toBe(false);
    component.showNewProjModal.set(true);
    expect(component.showNewProjModal()).toBe(true);

    expect(component.showNewOppModal()).toBe(false);
    component.showNewOppModal.set(true);
    expect(component.showNewOppModal()).toBe(true);
  });
});
