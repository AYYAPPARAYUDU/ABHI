import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CandidateListComponent } from './candidate-list.component';
import { EvaluationService } from '../../services/evaluation.service';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('CandidateListComponent', () => {
  let component: CandidateListComponent;
  let fixture: ComponentFixture<CandidateListComponent>;

  const mockEvalService = {
    candidates: () => [
      {
        candidate_id: 'cand_test_01',
        candidate_type: 'PROMPT_CANDIDATE',
        name: 'Test Candidate',
        status: 'READY',
        hypothesis: {
          title: 'Test Hypothesis',
          description: 'Testing description',
          target_capability: 'multilingual_te',
          baseline_score: 0.85,
          target_score: 0.95
        }
      }
    ],
    selectedCandidate: () => null,
    isEvaluatingCandidate: () => false,
    selectCandidate: vi.fn(),
    createCandidate: vi.fn().mockResolvedValue(undefined),
    evaluateCandidate: vi.fn().mockResolvedValue(undefined),
    promoteCandidate: vi.fn().mockResolvedValue(undefined)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandidateListComponent],
      providers: [
        { provide: EvaluationService, useValue: mockEvalService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CandidateListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create candidate list component', () => {
    expect(component).toBeTruthy();
  });

  it('should open and close create modal', () => {
    component.openCreateModal();
    expect(component.showCreateModal).toBe(true);
    component.closeCreateModal();
    expect(component.showCreateModal).toBe(false);
  });

  it('should select candidate on click', () => {
    const cand = mockEvalService.candidates()[0] as any;
    component.selectCandidate(cand);
    expect(mockEvalService.selectCandidate).toHaveBeenCalledWith('cand_test_01');
  });
});
