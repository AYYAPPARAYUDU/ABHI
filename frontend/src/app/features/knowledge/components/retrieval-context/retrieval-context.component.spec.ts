import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { RetrievalContextComponent } from './retrieval-context.component';
import { KnowledgeService } from '../../services/knowledge.service';

describe('RetrievalContextComponent', () => {
  let component: RetrievalContextComponent;
  let fixture: ComponentFixture<RetrievalContextComponent>;
  let knowledgeServiceMock: Partial<KnowledgeService>;

  beforeEach(async () => {
    knowledgeServiceMock = {
      retrievalContext: signal([]) as any
    };

    await TestBed.configureTestingModule({
      imports: [RetrievalContextComponent],
      providers: [
        { provide: KnowledgeService, useValue: knowledgeServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RetrievalContextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create retrieval context component', () => {
    expect(component).toBeTruthy();
  });
});
