import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MediaArtifactGalleryComponent } from './media-artifact-gallery.component';
import { MediaArtifactDTO } from '../../models/media.model';

describe('MediaArtifactGalleryComponent', () => {
  let component: MediaArtifactGalleryComponent;
  let fixture: ComponentFixture<MediaArtifactGalleryComponent>;

  const mockArtifact: MediaArtifactDTO = {
    artifact_id: 'art_gallery_1',
    job_id: 'job_1',
    media_type: 'IMAGE',
    path: 'media/images/2026/09/img_1.png',
    filename: 'img_1.png',
    format: 'PNG',
    width: 512,
    height: 512,
    size_bytes: 524288,
    sha256: 'sha256_1234567890abcdef',
    created_at: Date.now() / 1000,
    model_id: 'sd-turbo-local',
    model_version: '1.0.0',
    generation_parameters_hash: 'hash_123',
    prompt_preview: 'A majestic mountain',
    provenance: 'ACTUAL',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaArtifactGalleryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MediaArtifactGalleryComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('artifacts', [mockArtifact]);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should format file size bytes correctly', () => {
    expect(component.formatBytes(500)).toBe('500 B');
    expect(component.formatBytes(1048576)).toBe('1.00 MB');
    expect(component.formatBytes(2048)).toBe('2.0 KB');
  });

  it('should open modal preview when selecting an artifact', () => {
    expect(component.selectedArtifact()).toBeNull();
    component.selectedArtifact.set(mockArtifact);
    expect(component.selectedArtifact()).toEqual(mockArtifact);
  });

  it('should emit delete event when clicking delete', () => {
    const deleteSpy = vi.spyOn(component.delete, 'emit');
    component.delete.emit('art_gallery_1');
    expect(deleteSpy).toHaveBeenCalledWith('art_gallery_1');
  });
});
