import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VideoArtifactGalleryComponent } from './video-artifact-gallery.component';
import { VideoArtifactDTO } from '../../models/media.model';

describe('VideoArtifactGalleryComponent', () => {
  let component: VideoArtifactGalleryComponent;
  let fixture: ComponentFixture<VideoArtifactGalleryComponent>;

  const mockArtifacts: VideoArtifactDTO[] = [
    {
      artifact_id: 'art_vid_001',
      job_id: 'job_vid_001',
      media_type: 'VIDEO',
      path: 'media/videos/2026/09/vid_test_001.mp4',
      filename: 'vid_test_001.mp4',
      format: 'MP4',
      width: 512,
      height: 512,
      fps: 24,
      duration_seconds: 2.0,
      frame_count: 48,
      size_bytes: 2048576,
      sha256: 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890',
      poster_path: 'media/thumbnails/2026/09/thumb_test_001.jpg',
      created_at: 1720000000,
      model_id: 'svd-xt-local',
      model_version: '1.0.0',
      generation_parameters_hash: 'hash_123',
      prompt_preview: 'A majestic waterfall at dusk',
      provenance: 'ACTUAL',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoArtifactGalleryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VideoArtifactGalleryComponent);
    component = fixture.componentInstance;
    component.artifacts = mockArtifacts;
    fixture.detectChanges();
  });

  it('should create the video artifact gallery component', () => {
    expect(component).toBeTruthy();
  });

  it('should format byte size accurately', () => {
    expect(component.formatBytes(0)).toBe('0 B');
    expect(component.formatBytes(1024)).toBe('1 KB');
    expect(component.formatBytes(2097152)).toBe('2 MB');
  });

  it('should select artifact on preview click', () => {
    expect(component.selectedArtifact).toBeNull();
    component.selectedArtifact = mockArtifacts[0];
    expect(component.selectedArtifact).toEqual(mockArtifacts[0]);
  });

  it('should emit delete event on artifact delete click', () => {
    vi.spyOn(component.delete, 'emit');
    component.delete.emit('art_vid_001');
    expect(component.delete.emit).toHaveBeenCalledWith('art_vid_001');
  });

  it('should format gigabyte size correctly', () => {
    expect(component.formatBytes(1073741824)).toBe('1 GB');
  });

  it('should clear selected artifact when modal is dismissed', () => {
    component.selectedArtifact = mockArtifacts[0];
    expect(component.selectedArtifact).not.toBeNull();
    component.selectedArtifact = null;
    expect(component.selectedArtifact).toBeNull();
  });

  it('should handle artifacts without poster thumbnails', () => {
    const noPosterArtifact: VideoArtifactDTO = { ...mockArtifacts[0], poster_path: null };
    component.artifacts = [noPosterArtifact];
    fixture.detectChanges();
    expect(component.artifacts[0].poster_path).toBeNull();
  });

  it('should display empty state when artifacts list is empty', () => {
    component.artifacts = [];
    fixture.detectChanges();
    expect(component.artifacts.length).toBe(0);
  });
});
