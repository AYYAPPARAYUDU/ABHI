import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanVersionHistoryComponent } from './plan-version-history.component';

describe('PlanVersionHistoryComponent', () => {
  let component: PlanVersionHistoryComponent;
  let fixture: ComponentFixture<PlanVersionHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanVersionHistoryComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlanVersionHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and return empty plan list if no active or history plans', () => {
    expect(component).toBeTruthy();
    expect(component.getAllPlans().length).toBe(0);
  });

  it('should sort plans descending by version with active plan included', () => {
    fixture.componentRef.setInput('activePlan', {
      plan_id: 'plan_v2',
      goal_id: 'g1',
      version: 2,
      is_active: true,
      nodes: {},
      milestones: [],
      success_contract: {} as any,
      risk_summary: 'LOW',
      estimated_cost: 2.0,
      estimated_duration_ms: 1000,
      created_at_ts: 2000
    });
    fixture.componentRef.setInput('planHistory', [
      {
        plan_id: 'plan_v1',
        goal_id: 'g1',
        version: 1,
        is_active: false,
        nodes: {},
        milestones: [],
        success_contract: {} as any,
        risk_summary: 'LOW',
        estimated_cost: 2.0,
        estimated_duration_ms: 1000,
        created_at_ts: 1000
      }
    ]);
    fixture.detectChanges();

    const all = component.getAllPlans();
    expect(all.length).toBe(2);
    expect(all[0].version).toBe(2);
    expect(all[1].version).toBe(1);
  });
});
