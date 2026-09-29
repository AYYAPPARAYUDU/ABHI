import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LlmEvaluationPageComponent } from './llm-evaluation-page.component';
import { TaskApiService } from '../../../../core/api/task-api.service';
import { describe, beforeEach, it, expect } from 'vitest';

describe('LlmEvaluationPageComponent', () => {
  let component: LlmEvaluationPageComponent;
  let fixture: ComponentFixture<LlmEvaluationPageComponent>;

  beforeEach(async () => {
    const mockApiService = {
      getEvaluationStatus: () => Promise.resolve({ status: 'OPERATIONAL', production_model: { model_name: 'qwen3:8b' } }),
      getLockedBaseline: () => Promise.resolve({ baseline_id: 'BASELINE_V1_LOCKED', unweighted_case_mean: 0.9583 }),
      listEvaluationRuns: () => Promise.resolve([]),
      getEvaluationTimeline: () => Promise.resolve([]),
      listEvaluationModels: () => Promise.resolve([]),
      listEvaluationBenchmarks: () => Promise.resolve([]),
      listResearchPapers: () => Promise.resolve([]),
      listEvaluationExperiments: () => Promise.resolve([]),
      listCandidates: () => Promise.resolve([]),
      getModelLineage: () => Promise.resolve([]),
      getResourceHeadroom: () => Promise.resolve({ is_training_safe: true, status: 'RESOURCE_HEADROOM_OK' })
    };

    await TestBed.configureTestingModule({
      imports: [LlmEvaluationPageComponent],
      providers: [{ provide: TaskApiService, useValue: mockApiService }]
    }).compileComponents();

    fixture = TestBed.createComponent(LlmEvaluationPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create llm evaluation page component', () => {
    expect(component).toBeTruthy();
  });

  it('should switch tabs', () => {
    component.setTab('CANDIDATES');
    expect(component.evalService.activeTab()).toBe('CANDIDATES');
  });
});
