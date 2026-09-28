import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SourceCardComponent } from './source-card.component';
import { KnowledgeService } from '../../services/knowledge.service';

describe('SourceCardComponent', () => {
  let component: SourceCardComponent;
  let fixture: ComponentFixture<SourceCardComponent>;
  let knowledgeServiceMock: Partial<KnowledgeService>;

  beforeEach(async () => {
    knowledgeServiceMock = {
      sourcesInfo: signal({
        sources: [{ source: 'architecture.md', chunk_count: 5 }],
        total_chunks: 5,
        vector_dimension: 384,
        table_name: 'knowledge_chunks'
      }) as any
    };

    await TestBed.configureTestingModule({
      imports: [SourceCardComponent],
      providers: [
        { provide: KnowledgeService, useValue: knowledgeServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SourceCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create source card component', () => {
    expect(component).toBeTruthy();
  });
});
