import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegressionAlertComponent } from './regression-alert.component';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('RegressionAlertComponent', () => {
  let component: RegressionAlertComponent;
  let fixture: ComponentFixture<RegressionAlertComponent>;

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
      imports: [RegressionAlertComponent],
      providers: [{ provide: TaskApiService, useValue: mockApiService }]
    }).compileComponents();

    fixture = TestBed.createComponent(RegressionAlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create regression alert component', () => {
    expect(component).toBeTruthy();
  });
});
