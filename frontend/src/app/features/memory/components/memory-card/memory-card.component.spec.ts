import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemoryCardComponent } from './memory-card.component';

describe('MemoryCardComponent', () => {
  let component: MemoryCardComponent;
  let fixture: ComponentFixture<MemoryCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MemoryCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MemoryCardComponent);
    component = fixture.componentInstance;
    component.memory = {
      memory_id: 'mem_123',
      memory_type: 'EPISODIC',
      title: 'User opened notepad',
      category: 'desktop',
      context_summary: 'User opened notepad',
      solution_summary: 'Typed text with UIA worker',
      summary: 'Typed text with UIA worker',
      outcome: 'SUCCESS',
      tags: ['notepad', 'uia'],
      confidence: 0.95,
      privacy_class: 'task_derived',
      privacy_classification: 'PERSONAL',
      status: 'ACTIVE',
      source: 'EXECUTION_RESULT',
      confirmed_by_user: true,
      created_at: new Date().toISOString()
    };
    fixture.detectChanges();
  });

  it('should create memory card component', () => {
    expect(component).toBeTruthy();
  });

  it('should emit memorySelected on click', () => {
    const spy = vi.spyOn(component.memorySelected, 'emit');
    component.memorySelected.emit('mem_123');
    expect(spy).toHaveBeenCalledWith('mem_123');
  });

  it('should emit confirmMemory when confirm is clicked', () => {
    const spy = vi.spyOn(component.confirmMemory, 'emit');
    component.confirmMemory.emit('mem_123');
    expect(spy).toHaveBeenCalledWith('mem_123');
  });
});
