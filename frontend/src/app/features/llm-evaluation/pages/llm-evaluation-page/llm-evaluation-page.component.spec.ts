import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LlmEvaluationPageComponent } from './llm-evaluation-page.component';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('LlmEvaluationPageComponent', () => {
  let component: LlmEvaluationPageComponent;
  let fixture: ComponentFixture<LlmEvaluationPageComponent>;

  beforeEach(async () => {
    const mockApiService = {
      getEvaluationStatus: () => Promise.resolve({ status: 'OPERATIONAL', production_model: { model_name: 'qwen3:8b' } }),
      listEvaluationRuns: () => Promise.resolve([]),
      getEvaluationTimeline: () => Promise.resolve([]),
      listEvaluationModels: () => Promise.resolve([]),
      listEvaluationBenchmarks: () => Promise.resolve([]),
      listResearchPapers: () => Promise.resolve([]),
      listEvaluationExperiments: () => Promise.resolve([])
    };

    await TestBed.configureTestingModule({
      imports: [LlmEvaluationPageComponent],
      providers: [{ provide: TaskApiService, useValue: mockApiService }]
    }).compileComponents();

    fixture = TestBed.createComponent(LlmEvaluationPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create llm evaluation page component', () => {
    expect(component).toBeTruthy();
  });
});
