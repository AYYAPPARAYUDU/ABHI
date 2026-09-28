import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EvolutionTimeline3dComponent } from './evolution-timeline-3d.component';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('EvolutionTimeline3dComponent', () => {
  let component: EvolutionTimeline3dComponent;
  let fixture: ComponentFixture<EvolutionTimeline3dComponent>;

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
      imports: [EvolutionTimeline3dComponent],
      providers: [{ provide: TaskApiService, useValue: mockApiService }]
    }).compileComponents();

    fixture = TestBed.createComponent(EvolutionTimeline3dComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create evolution timeline 3d component', () => {
    expect(component).toBeTruthy();
  });
});
