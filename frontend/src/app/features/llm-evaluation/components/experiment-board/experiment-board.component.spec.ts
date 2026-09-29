import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExperimentBoardComponent } from './experiment-board.component';
import { EvaluationService } from '../../services/evaluation.service';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('ExperimentBoardComponent', () => {
  let component: ExperimentBoardComponent;
  let fixture: ComponentFixture<ExperimentBoardComponent>;

  const mockEvalService = {
    candidates: () => [
      {
        candidate_id: 'cand_test_01',
        name: 'Test Candidate',
        status: 'READY',
        candidate_type: 'PROMPT_CANDIDATE',
        hypothesis: {
          title: 'Telugu Argument Test',
          target_capability: 'multilingual_te',
          baseline_score: 0.85,
          target_score: 0.95
        }
      }
    ],
    selectedCandidate: () => null,
    selectCandidate: vi.fn(),
    startTraining: vi.fn().mockResolvedValue(undefined),
    evaluateCandidate: vi.fn().mockResolvedValue(undefined)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExperimentBoardComponent],
      providers: [
        { provide: EvaluationService, useValue: mockEvalService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ExperimentBoardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create experiment board component', () => {
    expect(component).toBeTruthy();
  });

  it('should filter candidates by status', () => {
    const readyCands = component.getCandidatesByStatus('READY');
    expect(readyCands.length).toBe(1);
    const passedCands = component.getCandidatesByStatus('PASSED');
    expect(passedCands.length).toBe(0);
  });
});
