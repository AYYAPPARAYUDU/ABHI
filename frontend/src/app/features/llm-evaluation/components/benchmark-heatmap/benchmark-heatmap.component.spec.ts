import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BenchmarkHeatmapComponent } from './benchmark-heatmap.component';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('BenchmarkHeatmapComponent', () => {
  let component: BenchmarkHeatmapComponent;
  let fixture: ComponentFixture<BenchmarkHeatmapComponent>;

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
      imports: [BenchmarkHeatmapComponent],
      providers: [{ provide: TaskApiService, useValue: mockApiService }]
    }).compileComponents();

    fixture = TestBed.createComponent(BenchmarkHeatmapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create benchmark heatmap component', () => {
    expect(component).toBeTruthy();
  });
});
