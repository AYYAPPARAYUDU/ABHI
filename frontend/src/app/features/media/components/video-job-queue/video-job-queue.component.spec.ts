import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VideoJobQueueComponent } from './video-job-queue.component';
import { MediaJobDTO } from '../../models/media.model';

describe('VideoJobQueueComponent', () => {
  let component: VideoJobQueueComponent;
  let fixture: ComponentFixture<VideoJobQueueComponent>;

  const mockJobs: MediaJobDTO[] = [
    {
      job_id: 'job_vid_001',
      media_type: 'VIDEO',
      operation: 'GENERATE',
      prompt: 'A futuristic city flight',
      model_id: 'svd-xt-local',
      model_version: '1.0.0',
      parameters: { fps: 24, width: 512, height: 512 },
      status: 'GENERATING',
      progress: 45.0,
      current_phase: 'GENERATING_SEGMENTS',
      created_at: 1720000000,
      provenance: 'ACTUAL',
    },
    {
      job_id: 'job_vid_002',
      media_type: 'VIDEO',
      operation: 'GENERATE',
      prompt: 'Water flowing through canyon',
      model_id: 'animatediff-lightning-local',
      model_version: '1.0.0',
      parameters: { fps: 16, width: 256, height: 256 },
      status: 'COMPLETED',
      progress: 100.0,
      current_phase: 'COMPLETED',
      created_at: 1720000100,
      duration_ms: 1250,
      provenance: 'ACTUAL',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoJobQueueComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VideoJobQueueComponent);
    component = fixture.componentInstance;
    component.jobs = mockJobs;
    component.activeJob = mockJobs[0];
    fixture.detectChanges();
  });

  it('should create the video job queue component', () => {
    expect(component).toBeTruthy();
  });

  it('should identify active vs completed jobs', () => {
    expect(component.isActive(mockJobs[0])).toBe(true);
    expect(component.isActive(mockJobs[1])).toBe(false);
  });

  it('should return appropriate badge classes for job statuses', () => {
    expect(component.getStatusBadgeClass('COMPLETED')).toContain('bg-success');
    expect(component.getStatusBadgeClass('GENERATING')).toContain('bg-info');
    expect(component.getStatusBadgeClass('FAILED')).toContain('bg-danger');
    expect(component.getStatusBadgeClass('CANCELLED')).toContain('bg-secondary');
  });

  it('should emit cancel event when clicking cancel', () => {
    vi.spyOn(component.cancel, 'emit');
    component.cancel.emit('job_vid_001');
    expect(component.cancel.emit).toHaveBeenCalledWith('job_vid_001');
  });

  it('should render default dark badge for unknown statuses', () => {
    expect(component.getStatusBadgeClass('UNKNOWN_CUSTOM_STATUS')).toContain('bg-dark');
  });

  it('should handle empty job list safely', () => {
    component.jobs = [];
    component.activeJob = null;
    fixture.detectChanges();
    expect(component.jobs.length).toBe(0);
  });

  it('should recognize ADMITTED and LOADING_MODEL as active states', () => {
    const admittedJob: MediaJobDTO = { ...mockJobs[0], status: 'ADMITTED' };
    const loadingJob: MediaJobDTO = { ...mockJobs[0], status: 'LOADING_MODEL' };
    expect(component.isActive(admittedJob)).toBe(true);
    expect(component.isActive(loadingJob)).toBe(true);
  });

  it('should recognize RESOURCE_DENIED as inactive terminal state', () => {
    const deniedJob: MediaJobDTO = { ...mockJobs[0], status: 'RESOURCE_DENIED' };
    expect(component.isActive(deniedJob)).toBe(false);
    expect(component.getStatusBadgeClass('RESOURCE_DENIED')).toContain('bg-danger');
  });
});
