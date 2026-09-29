import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrainingProgressComponent } from './training-progress.component';
import { EvaluationService } from '../../services/evaluation.service';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('TrainingProgressComponent', () => {
  let component: TrainingProgressComponent;
  let fixture: ComponentFixture<TrainingProgressComponent>;

  const mockEvalService = {
    activeTrainingJob: () => ({
      job_id: 'job_test_01',
      candidate_id: 'cand_test',
      state: 'TRAINING',
      progress_percent: 45.0,
      current_epoch: 2,
      total_epochs: 3,
      current_step: 45,
      total_steps: 100,
      current_loss: 0.42,
      vram_usage_mb: 1850,
      ram_usage_mb: 520,
      elapsed_seconds: 14.5
    }),
    cancelTraining: vi.fn().mockResolvedValue(undefined)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrainingProgressComponent],
      providers: [
        { provide: EvaluationService, useValue: mockEvalService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TrainingProgressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create training progress component', () => {
    expect(component).toBeTruthy();
  });

  it('should trigger cancel training on click', async () => {
    await component.cancelTraining();
    expect(mockEvalService.cancelTraining).toHaveBeenCalled();
  });
});
