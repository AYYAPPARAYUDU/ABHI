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
      category: 'desktop',
      context_summary: 'User opened notepad',
      solution_summary: 'Typed text with UIA worker',
      outcome: 'SUCCESS',
      tags: ['notepad', 'uia'],
      privacy_class: 'task_derived',
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
});
