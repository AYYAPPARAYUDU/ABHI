import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DailyScorecardComponent } from './daily-scorecard.component';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('DailyScorecardComponent', () => {
  let component: DailyScorecardComponent;
  let fixture: ComponentFixture<DailyScorecardComponent>;

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
      imports: [DailyScorecardComponent],
      providers: [{ provide: TaskApiService, useValue: mockApiService }]
    }).compileComponents();

    fixture = TestBed.createComponent(DailyScorecardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create daily scorecard component', () => {
    expect(component).toBeTruthy();
  });
});
