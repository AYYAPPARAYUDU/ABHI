import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { KnowledgeDetailComponent } from './knowledge-detail.component';
import { KnowledgeService } from '../../services/knowledge.service';

describe('KnowledgeDetailComponent', () => {
  let component: KnowledgeDetailComponent;
  let fixture: ComponentFixture<KnowledgeDetailComponent>;
  let knowledgeServiceMock: Partial<KnowledgeService>;

  beforeEach(async () => {
    knowledgeServiceMock = {
      selectedChunk: signal({
        chunk_id: 'chk_123',
        source: 'architecture.md',
        text: 'Deterministic DAG planning engine',
        score: 0.95,
        tags: ['dag', 'planning'],
        citation: '[architecture.md (ID: chk_123)]'
      }) as any,
      selectChunk: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [KnowledgeDetailComponent],
      providers: [
        { provide: KnowledgeService, useValue: knowledgeServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(KnowledgeDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create knowledge detail component', () => {
    expect(component).toBeTruthy();
  });
});
