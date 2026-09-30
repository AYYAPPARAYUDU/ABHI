import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AgentTaskCardComponent } from './agent-task-card.component';
import { TaskSummary } from '../../../core/models/telemetry.model';
import { OperatorStateService } from '../../../core/services/operator-state.service';

describe('AgentTaskCardComponent', () => {
  let component: AgentTaskCardComponent;
  let fixture: ComponentFixture<AgentTaskCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentTaskCardComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        OperatorStateService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AgentTaskCardComponent);
    component = fixture.componentInstance;
  });

  it('should create agent task card component', () => {
    expect(component).toBeTruthy();
  });

  it('should render task details and humanized step', () => {
    const task: TaskSummary = {
      taskId: 'task_demo_1',
      goal: 'Open Notepad and write today\'s plan',
      state: 'EXECUTING',
      isSuccess: false,
      progressPercent: 65,
      currentStep: 'Typing plan into Notepad',
      startTime: Date.now() - 5000,
      durationMs: 5000,
      actionsExecuted: 2
    };

    fixture.componentRef.setInput('task', task);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Open Notepad and write today\'s plan');
    expect(el.textContent).toContain('Typing plan into Notepad');
    expect(el.textContent).toContain('65%');
    expect(el.textContent).toContain('task_demo_1');
  });

  it('should emit onCancel when cancel button is pressed on active task', () => {
    let cancelledId = '';
    component.onCancel.subscribe((id) => (cancelledId = id));

    const task: TaskSummary = {
      taskId: 'task_cancel_1',
      goal: 'Generating video',
      state: 'EXECUTING',
      isSuccess: false,
      progressPercent: 30,
      currentStep: 'Rendering scene',
      startTime: Date.now(),
      durationMs: 0,
      actionsExecuted: 1
    };

    fixture.componentRef.setInput('task', task);
    fixture.detectChanges();

    const cancelBtn = fixture.nativeElement.querySelector('.action-pill.danger') as HTMLButtonElement;
    expect(cancelBtn).toBeTruthy();
    cancelBtn.click();
    expect(cancelledId).toBe('task_cancel_1');
  });
});
