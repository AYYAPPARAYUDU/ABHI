import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResearchFeedComponent } from './research-feed.component';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('ResearchFeedComponent', () => {
  let component: ResearchFeedComponent;
  let fixture: ComponentFixture<ResearchFeedComponent>;

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
      imports: [ResearchFeedComponent],
      providers: [{ provide: TaskApiService, useValue: mockApiService }]
    }).compileComponents();

    fixture = TestBed.createComponent(ResearchFeedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create research feed component', () => {
    expect(component).toBeTruthy();
  });
});
