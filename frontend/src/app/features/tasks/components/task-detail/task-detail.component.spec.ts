import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TaskDetailComponent } from './task-detail.component';
import { TaskHistoryService } from '../../services/task-history.service';

describe('TaskDetailComponent', () => {
  let component: TaskDetailComponent;
  let fixture: ComponentFixture<TaskDetailComponent>;
  let taskHistoryServiceMock: Partial<TaskHistoryService>;

  beforeEach(async () => {
    taskHistoryServiceMock = {
      selectedTask: signal({
        task_id: 'task_abc_456',
        goal: 'Open Notepad and write text',
        state: 'COMPLETED',
        duration_ms: 1200,
        dag: {
          nodes: {
            node_1: { action: 'LAUNCH_APP', state: 'COMPLETED', target: 'notepad.exe' }
          }
        },
        created_at: new Date().toISOString()
      }) as any,
      clearSelection: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [TaskDetailComponent],
      providers: [
        { provide: TaskHistoryService, useValue: taskHistoryServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create task detail component', () => {
    expect(component).toBeTruthy();
  });

  it('should parse DAG nodes correctly', () => {
    const nodes = component.getDagNodes(component.selectedTask?.dag);
    expect(nodes.length).toBe(1);
    expect(nodes[0].action).toBe('LAUNCH_APP');
  });
});
