import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvaluationHeaderComponent } from './evaluation-header.component';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('EvaluationHeaderComponent', () => {
  let component: EvaluationHeaderComponent;
  let fixture: ComponentFixture<EvaluationHeaderComponent>;

  beforeEach(async () => {
    const mockApiService = {
      getEvaluationStatus: () => Promise.resolve({ status: 'OPERATIONAL', production_model: { model_name: 'qwen3:8b', version: '1.0.0' } }),
      listEvaluationRuns: () => Promise.resolve([]),
      getEvaluationTimeline: () => Promise.resolve([]),
      listEvaluationModels: () => Promise.resolve([]),
      listEvaluationBenchmarks: () => Promise.resolve([]),
      listResearchPapers: () => Promise.resolve([]),
      listEvaluationExperiments: () => Promise.resolve([]),
      triggerEvaluationRun: () => Promise.resolve({ success: true })
    };

    await TestBed.configureTestingModule({
      imports: [EvaluationHeaderComponent],
      providers: [{ provide: TaskApiService, useValue: mockApiService }]
    }).compileComponents();

    fixture = TestBed.createComponent(EvaluationHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create evaluation header component', () => {
    expect(component).toBeTruthy();
  });
});
