import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SearchResultsComponent } from './search-results.component';
import { KnowledgeService } from '../../services/knowledge.service';

describe('SearchResultsComponent', () => {
  let component: SearchResultsComponent;
  let fixture: ComponentFixture<SearchResultsComponent>;
  let knowledgeServiceMock: Partial<KnowledgeService>;

  beforeEach(async () => {
    knowledgeServiceMock = {
      searchResults: signal([]) as any,
      totalSearchResults: signal(0) as any,
      activeQuery: signal('') as any,
      selectedChunk: signal(null) as any,
      isSearching: signal(false) as any,
      errorMessage: signal(null) as any,
      selectChunk: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [SearchResultsComponent],
      providers: [
        { provide: KnowledgeService, useValue: knowledgeServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create search results component', () => {
    expect(component).toBeTruthy();
  });
});
