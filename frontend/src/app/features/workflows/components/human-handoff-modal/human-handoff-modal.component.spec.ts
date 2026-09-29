import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HumanHandoffModalComponent } from './human-handoff-modal.component';

describe('HumanHandoffModalComponent', () => {
  let component: HumanHandoffModalComponent;
  let fixture: ComponentFixture<HumanHandoffModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HumanHandoffModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HumanHandoffModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and handle null handoff cleanly', () => {
    expect(component).toBeTruthy();
    expect(component.handoff()).toBeNull();
  });

  it('should emit resolve event with custom notes when resolve button is clicked', () => {
    fixture.componentRef.setInput('handoff', {
      handoff_id: 'ho_99',
      task_id: 't_99',
      goal_id: 'g_99',
      reason: 'CAPTCHA_REQUIRED',
      message: 'Solve captcha',
      completed_steps: 2,
      total_steps: 4,
      next_action_description: 'Proceed',
      created_at_ts: 1000,
      resolved: false
    });
    fixture.detectChanges();

    const spy = vi.spyOn(component.resolve, 'emit');
    component.resolutionNotes = 'Captcha solved successfully';
    component.onResolve();

    expect(spy).toHaveBeenCalledWith({
      handoffId: 'ho_99',
      notes: 'Captcha solved successfully'
    });
    expect(component.resolutionNotes).toBe('');
  });
});
