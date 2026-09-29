import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { WorkloadQueueTableComponent } from './workload-queue-table.component';

describe('WorkloadQueueTableComponent', () => {
  let component: WorkloadQueueTableComponent;
  let fixture: ComponentFixture<WorkloadQueueTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkloadQueueTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkloadQueueTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should map priority numbers to human-readable labels', () => {
    expect(component.getPriorityLabel(100)).toBe('P0 Safety');
    expect(component.getPriorityLabel(90)).toBe('P1 Interactive');
    expect(component.getPriorityLabel(80)).toBe('P2 Task');
    expect(component.getPriorityLabel(50)).toBe('P4 Indexing');
  });

  it('should render empty state message when no leases exist', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No active resource leases currently allocated');
  });
});
