import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { KnowledgePageComponent } from './knowledge-page.component';
import { KnowledgeService } from '../../services/knowledge.service';

describe('KnowledgePageComponent', () => {
  let component: KnowledgePageComponent;
  let fixture: ComponentFixture<KnowledgePageComponent>;
  let knowledgeServiceMock: Partial<KnowledgeService>;

  beforeEach(async () => {
    knowledgeServiceMock = {
      searchResults: signal([]) as any,
      totalSearchResults: signal(0) as any,
      activeQuery: signal('') as any,
      sourcesInfo: signal(null) as any,
      indexedChunks: signal([]) as any,
      retrievalContext: signal([]) as any,
      selectedChunk: signal(null) as any,
      isLoading: signal(false) as any,
      isSearching: signal(false) as any,
      errorMessage: signal(null) as any,
      loadSources: vi.fn(),
      loadIndexedChunks: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [KnowledgePageComponent],
      providers: [
        { provide: KnowledgeService, useValue: knowledgeServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KnowledgePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create knowledge page component', () => {
    expect(component).toBeTruthy();
  });
});
