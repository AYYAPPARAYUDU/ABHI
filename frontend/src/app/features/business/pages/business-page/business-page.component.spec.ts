import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { BusinessPageComponent } from './business-page.component';
import { BusinessService } from '../../services/business.service';

describe('BusinessPageComponent', () => {
  let component: BusinessPageComponent;
  let fixture: ComponentFixture<BusinessPageComponent>;
  let businessService: BusinessService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BusinessPageComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(BusinessPageComponent);
    component = fixture.componentInstance;
    businessService = TestBed.inject(BusinessService);
    fixture.detectChanges();
  });

  it('should create business page component', () => {
    expect(component).toBeTruthy();
  });

  it('should render sovereign treasury and settlement observatory', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('State Bank of India');
  });

  it('should toggle workspace perspective tabs cleanly', () => {
    expect(component.activeTab()).toBe('office');
    component.setActiveTab('overview');
    expect(component.activeTab()).toBe('overview');
    component.setActiveTab('receipts');
    expect(component.activeTab()).toBe('receipts');
  });

  it('should toggle modals cleanly', () => {
    expect(component.showUtrModal()).toBe(false);
    component.showUtrModal.set(true);
    expect(component.showUtrModal()).toBe(true);

    expect(component.showCreateInvoiceModal()).toBe(false);
    component.showCreateInvoiceModal.set(true);
    expect(component.showCreateInvoiceModal()).toBe(true);
  });
});
