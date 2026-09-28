import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MemoryTypeFilterComponent } from './memory-type-filter.component';
import { MemoryService } from '../../services/memory.service';

describe('MemoryTypeFilterComponent', () => {
  let component: MemoryTypeFilterComponent;
  let fixture: ComponentFixture<MemoryTypeFilterComponent>;
  let memoryServiceMock: Partial<MemoryService>;

  beforeEach(async () => {
    memoryServiceMock = {
      categories: signal(['general', 'browser', 'desktop', 'preference', 'workflow', 'system']) as any,
      totalMemories: signal(10) as any,
      filters: signal({
        category: 'all',
        query: '',
        page: 1,
        pageSize: 12
      }) as any,
      setCategoryFilter: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [MemoryTypeFilterComponent],
      providers: [
        { provide: MemoryService, useValue: memoryServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MemoryTypeFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create memory type filter component', () => {
    expect(component).toBeTruthy();
  });

  it('should call setCategory on click', () => {
    component.setCategory('desktop');
    expect(memoryServiceMock.setCategoryFilter).toHaveBeenCalledWith('desktop');
  });
});
