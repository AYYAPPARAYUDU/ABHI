import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MemoryPageComponent } from './memory-page.component';
import { MemoryService } from '../../services/memory.service';

describe('MemoryPageComponent', () => {
  let component: MemoryPageComponent;
  let fixture: ComponentFixture<MemoryPageComponent>;
  let memoryServiceMock: Partial<MemoryService>;

  beforeEach(async () => {
    memoryServiceMock = {
      activeTab: signal('memories') as any,
      memories: signal([]) as any,
      totalMemories: signal(0) as any,
      selectedMemory: signal(null) as any,
      procedures: signal([]) as any,
      totalProcedures: signal(0) as any,
      conflicts: signal([]) as any,
      userProfiles: signal([]) as any,
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
      setTab: vi.fn(),
      loadMemories: vi.fn(),
      loadProcedures: vi.fn(),
      loadConflicts: vi.fn(),
      loadUserProfiles: vi.fn(),
      promoteProcedure: vi.fn(),
      deprecateProcedure: vi.fn(),
      resolveConflict: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [MemoryPageComponent],
      providers: [
        { provide: MemoryService, useValue: memoryServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MemoryPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create memory page component', () => {
    expect(component).toBeTruthy();
  });

  it('should switch tabs on tab click', () => {
    component.onTabChange('procedures');
    expect(memoryServiceMock.setTab).toHaveBeenCalledWith('procedures');
  });
});
