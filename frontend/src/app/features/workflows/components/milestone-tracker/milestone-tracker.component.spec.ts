import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MilestoneTrackerComponent } from './milestone-tracker.component';

describe('MilestoneTrackerComponent', () => {
  let component: MilestoneTrackerComponent;
  let fixture: ComponentFixture<MilestoneTrackerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MilestoneTrackerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MilestoneTrackerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with empty milestones', () => {
    expect(component).toBeTruthy();
    expect(component.milestones().length).toBe(0);
    expect(component.progressPercentage()).toBe(0);
  });

  it('should return correct status classes', () => {
    expect(component.getStatusClass('COMPLETED')).toBe('milestone-completed');
    expect(component.getStatusClass('RUNNING')).toBe('milestone-running');
    expect(component.getStatusClass('FAILED')).toBe('milestone-failed');
    expect(component.getStatusClass('PENDING')).toBe('milestone-pending');
  });

  it('should handle milestone inputs properly', () => {
    fixture.componentRef.setInput('progressPercentage', 75.5);
    fixture.componentRef.setInput('activeMilestone', 'Extracting Text');
    fixture.detectChanges();
    expect(component.progressPercentage()).toBe(75.5);
    expect(component.activeMilestone()).toBe('Extracting Text');
  });
});
