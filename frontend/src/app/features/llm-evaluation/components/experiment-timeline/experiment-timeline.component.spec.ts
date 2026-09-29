import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExperimentTimelineComponent } from './experiment-timeline.component';
import { EvaluationService } from '../../services/evaluation.service';
import { describe, beforeEach, it, expect } from 'vitest';

describe('ExperimentTimelineComponent', () => {
  let component: ExperimentTimelineComponent;
  let fixture: ComponentFixture<ExperimentTimelineComponent>;

  const mockEvalService = {};

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExperimentTimelineComponent],
      providers: [
        { provide: EvaluationService, useValue: mockEvalService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ExperimentTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create experiment timeline component', () => {
    expect(component).toBeTruthy();
  });

  it('should have 7 lifecycle stages', () => {
    expect(component.stages.length).toBe(7);
  });
});
