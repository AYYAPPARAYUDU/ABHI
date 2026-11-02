import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinancialLedgerComponent } from './financial-ledger.component';
import { FinancialSummary } from '../../models/business.model';

describe('FinancialLedgerComponent', () => {
  let component: FinancialLedgerComponent;
  let fixture: ComponentFixture<FinancialLedgerComponent>;

  const mockFinancials: FinancialSummary = {
    actual_revenue_received_usd: 120.5,
    gross_sales_usd: 140.0,
    refunds_usd: 0.0,
    operating_expenses_usd: 25.0,
    net_result_usd: 95.5,
    pending_payments_usd: 40.0,
    forecast_revenue_usd: 500.0,
    potential_revenue_usd: 1200.0,
    revenue_provenance: 'MEASURED',
    has_verified_financial_connection: true,
    disclaimer: 'Verified local audit test',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinancialLedgerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FinancialLedgerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('financials', mockFinancials);
    fixture.detectChanges();
  });

  it('should create financial ledger component', () => {
    expect(component).toBeTruthy();
  });

  it('should evaluate isNetPositive correctly', () => {
    expect(component.isNetPositive).toBe(true);
  });

  it('should render ledger elements and disclaimer', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('REVENUE & LEDGER OBSERVATORY');
    expect(compiled.textContent).toContain('ACTUAL RECEIVED');
    expect(compiled.textContent).toContain('PROVENANCE: MEASURED');
    expect(compiled.textContent).toContain('BANK LINKED');
  });
});
