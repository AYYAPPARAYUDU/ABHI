import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarketDynamicsComponent } from './market-dynamics.component';
import { BusinessOpportunity } from '../../models/business.model';

describe('MarketDynamicsComponent', () => {
  let component: MarketDynamicsComponent;
  let fixture: ComponentFixture<MarketDynamicsComponent>;

  const mockOpportunities: BusinessOpportunity[] = [
    {
      id: 'opp_test',
      title: 'Local Test Concept',
      sector_id: 'software_tools',
      summary: 'Automated test suite concept',
      total_score: 88,
      dimensions: [
        {
          dimension: 'Demand',
          score: 90,
          confidence: 0.9,
          provenance: 'MEASURED',
          rationale: 'High local demand',
        },
      ],
      sources: ['Internal Test'],
      created_at: '2026-01-01',
      status: 'EVALUATED',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketDynamicsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MarketDynamicsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('opportunities', mockOpportunities);
    fixture.detectChanges();
  });

  it('should create market dynamics component', () => {
    expect(component).toBeTruthy();
  });

  it('should render opportunity card and weighted matrix formula', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('MARKET DYNAMICS & SCORED CONCEPTS');
    expect(compiled.textContent).toContain('FORMULA (6-DIMENSIONAL WEIGHTED MATRIX)');
    expect(compiled.textContent).toContain('Local Test Concept');
    expect(compiled.textContent).toContain('88');
  });

  it('should emit openNewOpportunity on click', () => {
    let triggered = false;
    component.openNewOpportunity.subscribe(() => (triggered = true));
    component.onOpenNewOpportunity();
    expect(triggered).toBe(true);
  });
});
