import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModelComparisonComponent } from './model-comparison.component';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('ModelComparisonComponent', () => {
  let component: ModelComparisonComponent;
  let fixture: ComponentFixture<ModelComparisonComponent>;

  beforeEach(async () => {
    const mockApiService = {
      getEvaluationStatus: () => Promise.resolve({ status: 'OPERATIONAL' }),
      listEvaluationRuns: () => Promise.resolve([]),
      getEvaluationTimeline: () => Promise.resolve([]),
      listEvaluationModels: () => Promise.resolve([]),
      listEvaluationBenchmarks: () => Promise.resolve([]),
      listResearchPapers: () => Promise.resolve([]),
      listEvaluationExperiments: () => Promise.resolve([])
    };

    await TestBed.configureTestingModule({
      imports: [ModelComparisonComponent],
      providers: [{ provide: TaskApiService, useValue: mockApiService }]
    }).compileComponents();

    fixture = TestBed.createComponent(ModelComparisonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create model comparison component', () => {
    expect(component).toBeTruthy();
  });
});
