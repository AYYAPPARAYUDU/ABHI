import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ExecutionHistoryComponent } from './execution-history.component';
import { TaskHistoryService } from '../../services/task-history.service';

describe('ExecutionHistoryComponent', () => {
  let component: ExecutionHistoryComponent;
  let fixture: ComponentFixture<ExecutionHistoryComponent>;

  beforeEach(async () => {
    const taskHistoryServiceMock = {
      tasks: signal([]) as any,
      selectedTask: signal(null) as any
    };

    await TestBed.configureTestingModule({
      imports: [ExecutionHistoryComponent],
      providers: [
        { provide: TaskHistoryService, useValue: taskHistoryServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ExecutionHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create execution history component', () => {
    expect(component).toBeTruthy();
  });

  it('should render all 7 execution stages', () => {
    expect(component.stages.length).toBe(7);
  });
});
