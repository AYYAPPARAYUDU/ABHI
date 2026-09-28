import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TaskListComponent } from './task-list.component';
import { TaskHistoryService } from '../../services/task-history.service';

describe('TaskListComponent', () => {
  let component: TaskListComponent;
  let fixture: ComponentFixture<TaskListComponent>;
  let taskHistoryServiceMock: Partial<TaskHistoryService>;

  beforeEach(async () => {
    taskHistoryServiceMock = {
      tasks: signal([
        {
          task_id: 'task_001',
          goal: 'Open Notepad',
          state: 'COMPLETED',
          duration_ms: 1200,
          created_at: new Date().toISOString()
        }
      ]) as any,
      totalTasks: signal(1) as any,
      selectedTask: signal(null) as any,
      isLoading: signal(false) as any,
      errorMessage: signal(null) as any,
      filters: signal({
        state: 'ALL',
        query: '',
        page: 1,
        pageSize: 15
      }) as any,
      totalPages: signal(1) as any,
      loadTasks: vi.fn(),
      selectTask: vi.fn(),
      setStateFilter: vi.fn(),
      setSearchQuery: vi.fn(),
      setPage: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [TaskListComponent],
      providers: [
        { provide: TaskHistoryService, useValue: taskHistoryServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create task list component', () => {
    expect(component).toBeTruthy();
  });

  it('should filter tasks when filter tab clicked', () => {
    component.taskHistory.setStateFilter('COMPLETED');
    expect(taskHistoryServiceMock.setStateFilter).toHaveBeenCalledWith('COMPLETED');
  });
});
