import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResourceMetricsComponent } from './resource-metrics.component';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('ResourceMetricsComponent', () => {
  let component: ResourceMetricsComponent;
  let fixture: ComponentFixture<ResourceMetricsComponent>;

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
      imports: [ResourceMetricsComponent],
      providers: [{ provide: TaskApiService, useValue: mockApiService }]
    }).compileComponents();

    fixture = TestBed.createComponent(ResourceMetricsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create resource metrics component', () => {
    expect(component).toBeTruthy();
  });
});
