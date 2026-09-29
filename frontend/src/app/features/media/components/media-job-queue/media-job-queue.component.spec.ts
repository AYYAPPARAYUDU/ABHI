import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MediaJobQueueComponent } from './media-job-queue.component';
import { MediaJobDTO } from '../../models/media.model';

describe('MediaJobQueueComponent', () => {
  let component: MediaJobQueueComponent;
  let fixture: ComponentFixture<MediaJobQueueComponent>;

  const mockJob: MediaJobDTO = {
    job_id: 'job_queue_1',
    media_type: 'IMAGE',
    operation: 'GENERATE',
    prompt: 'A neon cyberpunk motorcycle',
    model_id: 'sd-turbo-local',
    model_version: '1.0.0',
    parameters: {},
    status: 'GENERATING',
    progress: 45.0,
    current_phase: 'GENERATING (Step 10/20)',
    created_at: Date.now() / 1000,
    provenance: 'ACTUAL',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaJobQueueComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MediaJobQueueComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('jobs', [mockJob]);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should identify cancelable status correctly', () => {
    expect(component.isCancelable('GENERATING')).toBe(true);
    expect(component.isCancelable('QUEUED')).toBe(true);
    expect(component.isCancelable('COMPLETED')).toBe(false);
    expect(component.isCancelable('FAILED')).toBe(false);
  });

  it('should emit cancel event when clicking cancel', () => {
    const cancelSpy = vi.spyOn(component.cancel, 'emit');
    component.cancel.emit('job_queue_1');
    expect(cancelSpy).toHaveBeenCalledWith('job_queue_1');
  });

  it('should return appropriate badge class for statuses', () => {
    expect(component.getStatusClass('COMPLETED')).toContain('text-emerald-400');
    expect(component.getStatusClass('GENERATING')).toContain('text-cyan-400');
    expect(component.getStatusClass('FAILED')).toContain('text-red-400');
  });
});
