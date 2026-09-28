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
      memories: signal([]) as any,
      totalMemories: signal(0) as any,
      selectedMemory: signal(null) as any,
      userProfiles: signal([]) as any,
      categories: signal(['general', 'desktop']) as any,
      isLoading: signal(false) as any,
      errorMessage: signal(null) as any,
      successMessage: signal(null) as any,
      filters: signal({
        category: 'all',
        query: '',
        page: 1,
        pageSize: 12
      }) as any,
      totalPages: signal(1) as any,
      loadMemories: vi.fn(),
      loadUserProfiles: vi.fn()
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
});
