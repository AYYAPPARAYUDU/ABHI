import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MemoryListComponent } from './memory-list.component';
import { MemoryService } from '../../services/memory.service';

describe('MemoryListComponent', () => {
  let component: MemoryListComponent;
  let fixture: ComponentFixture<MemoryListComponent>;
  let memoryServiceMock: Partial<MemoryService>;

  beforeEach(async () => {
    memoryServiceMock = {
      memories: signal([]) as any,
      totalMemories: signal(0) as any,
      selectedMemory: signal(null) as any,
      categories: signal(['general', 'desktop']) as any,
      memoryTypes: signal(['ALL', 'WORKING', 'EPISODIC', 'SEMANTIC', 'PREFERENCE', 'PROCEDURAL', 'KNOWLEDGE']) as any,
      privacyClasses: signal(['ALL', 'PUBLIC', 'PERSONAL', 'PRIVATE', 'SENSITIVE', 'RESTRICTED']) as any,
      isLoading: signal(false) as any,
      errorMessage: signal(null) as any,
      successMessage: signal(null) as any,
      filters: signal({
        category: 'all',
        memoryType: 'ALL',
        privacy: 'ALL',
        status: 'ALL',
        query: '',
        page: 1,
        pageSize: 12
      }) as any,
      totalPages: signal(1) as any,
      loadMemories: vi.fn(),
      selectMemory: vi.fn(),
      confirmMemory: vi.fn(),
      rejectMemory: vi.fn(),
      forgetMemory: vi.fn(),
      setCategoryFilter: vi.fn(),
      setTypeFilter: vi.fn(),
      setPrivacyFilter: vi.fn(),
      setStatusFilter: vi.fn(),
      setSearchQuery: vi.fn(),
      setPage: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [MemoryListComponent],
      providers: [
        { provide: MemoryService, useValue: memoryServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MemoryListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create memory list component', () => {
    expect(component).toBeTruthy();
  });
});
