import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { KnowledgeSearchComponent } from './knowledge-search.component';
import { KnowledgeService } from '../../services/knowledge.service';

describe('KnowledgeSearchComponent', () => {
  let component: KnowledgeSearchComponent;
  let fixture: ComponentFixture<KnowledgeSearchComponent>;
  let knowledgeServiceMock: Partial<KnowledgeService>;

  beforeEach(async () => {
    knowledgeServiceMock = {
      isSearching: signal(false) as any,
      activeQuery: signal('') as any,
      executeSearch: vi.fn(),
      clearSearch: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [KnowledgeSearchComponent],
      providers: [
        { provide: KnowledgeService, useValue: knowledgeServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KnowledgeSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create knowledge search component', () => {
    expect(component).toBeTruthy();
  });

  it('should call executeSearch on form submit', () => {
    component.searchQuery = 'Windows UIA';
    component.onSearch();
    expect(knowledgeServiceMock.executeSearch).toHaveBeenCalledWith('Windows UIA');
  });
});
