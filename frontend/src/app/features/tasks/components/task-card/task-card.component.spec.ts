import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskCardComponent } from './task-card.component';

describe('TaskCardComponent', () => {
  let component: TaskCardComponent;
  let fixture: ComponentFixture<TaskCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TaskCardComponent);
    component = fixture.componentInstance;
    component.task = {
      task_id: 'task_abc_123',
      goal: 'Open Notepad and write greetings',
      state: 'COMPLETED',
      duration_ms: 1250,
      created_at: new Date().toISOString()
    };
    fixture.detectChanges();
  });

  it('should create task card component', () => {
    expect(component).toBeTruthy();
  });

  it('should emit taskSelected on click', () => {
    const spy = vi.spyOn(component.taskSelected, 'emit');
    component.taskSelected.emit('task_abc_123');
    expect(spy).toHaveBeenCalledWith('task_abc_123');
  });
});
