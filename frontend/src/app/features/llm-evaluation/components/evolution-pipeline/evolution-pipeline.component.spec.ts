import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvolutionPipelineComponent } from './evolution-pipeline.component';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('EvolutionPipelineComponent', () => {
  let component: EvolutionPipelineComponent;
  let fixture: ComponentFixture<EvolutionPipelineComponent>;

  beforeEach(async () => {
    const mockApiService = {
      getEvaluationStatus: () => Promise.resolve({ status: 'OPERATIONAL' }),
      listEvaluationRuns: () => Promise.resolve([]),
      getEvaluationTimeline: () => Promise.resolve([]),
      listEvaluationModels: () => Promise.resolve([]),
      listEvaluationBenchmarks: () => Promise.resolve([]),
      listResearchPapers: () => Promise.resolve([]),
      listEvaluationExperiments: () => Promise.resolve([]),
      createCandidateExperiment: () => Promise.resolve({ success: true }),
      promoteCandidate: () => Promise.resolve({ success: true }),
      rollbackModel: () => Promise.resolve({ success: true })
    };

    await TestBed.configureTestingModule({
      imports: [EvolutionPipelineComponent],
      providers: [{ provide: TaskApiService, useValue: mockApiService }]
    }).compileComponents();

    fixture = TestBed.createComponent(EvolutionPipelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create evolution pipeline component', () => {
    expect(component).toBeTruthy();
  });
});
