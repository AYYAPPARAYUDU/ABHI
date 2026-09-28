import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MemorySearchComponent } from './memory-search.component';
import { MemoryService } from '../../services/memory.service';

describe('MemorySearchComponent', () => {
  let component: MemorySearchComponent;
  let fixture: ComponentFixture<MemorySearchComponent>;
  let memoryServiceMock: Partial<MemoryService>;

  beforeEach(async () => {
    memoryServiceMock = {
      setSearchQuery: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [MemorySearchComponent],
      providers: [
        { provide: MemoryService, useValue: memoryServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MemorySearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create memory search component', () => {
    expect(component).toBeTruthy();
  });

  it('should call setSearchQuery on input change', () => {
    component.searchQuery = 'Notepad';
    component.onSearchChange();
    expect(memoryServiceMock.setSearchQuery).toHaveBeenCalledWith('Notepad');
  });
});
