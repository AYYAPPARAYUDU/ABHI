import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvaluationReplayComponent } from './evaluation-replay.component';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('EvaluationReplayComponent', () => {
  let component: EvaluationReplayComponent;
  let fixture: ComponentFixture<EvaluationReplayComponent>;

  beforeEach(async () => {
    const mockApiService = {
      getEvaluationStatus: () => Promise.resolve({ status: 'OPERATIONAL', production_model: { model_name: 'qwen3:8b' } }),
      listEvaluationRuns: () => Promise.resolve([{ run_id: 'eval_run_day_01', day_index: 1 }]),
      getEvaluationTimeline: () => Promise.resolve([]),
      listEvaluationModels: () => Promise.resolve([]),
      listEvaluationBenchmarks: () => Promise.resolve([]),
      listResearchPapers: () => Promise.resolve([]),
      listEvaluationExperiments: () => Promise.resolve([])
    };

    await TestBed.configureTestingModule({
      imports: [EvaluationReplayComponent],
      providers: [{ provide: TaskApiService, useValue: mockApiService }]
    }).compileComponents();

    fixture = TestBed.createComponent(EvaluationReplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create evaluation replay component', () => {
    expect(component).toBeTruthy();
  });
});
