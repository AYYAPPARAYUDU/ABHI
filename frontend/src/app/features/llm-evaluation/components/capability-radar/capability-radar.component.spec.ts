import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CapabilityRadarComponent } from './capability-radar.component';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('CapabilityRadarComponent', () => {
  let component: CapabilityRadarComponent;
  let fixture: ComponentFixture<CapabilityRadarComponent>;

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
      imports: [CapabilityRadarComponent],
      providers: [{ provide: TaskApiService, useValue: mockApiService }]
    }).compileComponents();

    fixture = TestBed.createComponent(CapabilityRadarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create capability radar component', () => {
    expect(component).toBeTruthy();
  });
});
