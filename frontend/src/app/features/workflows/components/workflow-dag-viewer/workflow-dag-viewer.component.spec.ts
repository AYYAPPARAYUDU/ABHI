import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkflowDagViewerComponent } from './workflow-dag-viewer.component';

describe('WorkflowDagViewerComponent', () => {
  let component: WorkflowDagViewerComponent;
  let fixture: ComponentFixture<WorkflowDagViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowDagViewerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowDagViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render empty dag by default', () => {
    expect(component).toBeTruthy();
    expect(component.nodes().length).toBe(0);
  });

  it('should format status badge classes correctly', () => {
    expect(component.getStatusBadgeClass('COMPLETED')).toBe('status-completed');
    expect(component.getStatusBadgeClass('RUNNING')).toBe('status-running');
    expect(component.getStatusBadgeClass('FAILED')).toBe('status-failed');
    expect(component.getStatusBadgeClass('UNKNOWN')).toBe('status-pending');
  });

  it('should format risk badge classes correctly', () => {
    expect(component.getRiskBadgeClass('HIGH')).toBe('risk-high');
    expect(component.getRiskBadgeClass('MEDIUM')).toBe('risk-medium');
    expect(component.getRiskBadgeClass('READ_ONLY')).toBe('risk-readonly');
    expect(component.getRiskBadgeClass('LOW')).toBe('risk-low');
  });

  it('should return skipped status class', () => {
    expect(component.getStatusBadgeClass('SKIPPED')).toBe('status-skipped');
  });

  it('should handle inputs for planId and version', () => {
    fixture.componentRef.setInput('planId', 'plan_test_v1');
    fixture.componentRef.setInput('version', 2);
    fixture.detectChanges();
    expect(component.planId()).toBe('plan_test_v1');
    expect(component.version()).toBe(2);
  });
});
