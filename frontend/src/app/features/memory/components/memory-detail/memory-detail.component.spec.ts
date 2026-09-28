import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MemoryDetailComponent } from './memory-detail.component';
import { MemoryService } from '../../services/memory.service';

describe('MemoryDetailComponent', () => {
  let component: MemoryDetailComponent;
  let fixture: ComponentFixture<MemoryDetailComponent>;
  let memoryServiceMock: Partial<MemoryService>;

  beforeEach(async () => {
    memoryServiceMock = {
      selectedMemory: signal({
        memory_id: 'mem_xyz_789',
        category: 'desktop',
        context_summary: 'User opened notepad',
        solution_summary: 'Typed text with UIA worker',
        outcome: 'SUCCESS',
        tags: ['notepad', 'uia'],
        privacy_class: 'task_derived',
        created_at: new Date().toISOString()
      }) as any,
      clearSelection: vi.fn(),
      forgetMemory: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [MemoryDetailComponent],
      providers: [
        { provide: MemoryService, useValue: memoryServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MemoryDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create memory detail component', () => {
    expect(component).toBeTruthy();
  });
});
