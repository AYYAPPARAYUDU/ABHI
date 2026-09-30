import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageDiffViewerComponent } from './image-diff-viewer.component';
import {
  MediaArtifactDTO,
  EditDifferenceEvidenceDTO,
  ArtifactLineageRecordDTO,
} from '../../models/media.model';

describe('ImageDiffViewerComponent', () => {
  let component: ImageDiffViewerComponent;
  let fixture: ComponentFixture<ImageDiffViewerComponent>;

  const mockOriginal: MediaArtifactDTO = {
    artifact_id: 'art_orig_123',
    job_id: 'job_gen_10',
    media_type: 'IMAGE',
    path: '/media/images/2026/09/orig.png',
    filename: 'orig.png',
    format: 'PNG',
    width: 512,
    height: 512,
    size_bytes: 200000,
    sha256: 'origsha256',
    created_at: 1000,
    model_id: 'sd-turbo-local',
    model_version: '1.0',
    generation_parameters_hash: 'hash1',
    prompt_preview: 'Original portrait',
    provenance: 'ACTUAL',
  };

  const mockEdited: MediaArtifactDTO = {
    artifact_id: 'art_edited_456',
    job_id: 'job_edit_11',
    media_type: 'IMAGE',
    path: '/media/images/edits/2026/09/edited.png',
    filename: 'edited.png',
    format: 'PNG',
    width: 512,
    height: 512,
    size_bytes: 220000,
    sha256: 'editedsha256',
    created_at: 2000,
    model_id: 'instruct-pix2pix-local',
    model_version: '1.0',
    generation_parameters_hash: 'hash2',
    prompt_preview: 'Make cybernetic',
    provenance: 'ACTUAL',
  };

  const mockEvidence: EditDifferenceEvidenceDTO = {
    changed_pixel_count: 45000,
    changed_pixel_ratio: 0.1716,
    bounding_box: [100, 100, 300, 300],
    source_dimensions: [512, 512],
    output_dimensions: [512, 512],
    mask_overlap_ratio: 0.98,
    evaluation_method: 'DETERMINISTIC_RGB_DIFF',
  };

  const mockLineage: ArtifactLineageRecordDTO = {
    lineage_id: 'lin_789',
    parent_artifact_id: 'art_orig_123',
    child_artifact_id: 'art_edited_456',
    job_id: 'job_edit_11',
    operation: 'IMAGE_TO_IMAGE',
    prompt: 'Make cybernetic',
    model_id: 'instruct-pix2pix-local',
    model_version: '1.0',
    parameters_hash: 'hash2',
    difference_evidence: mockEvidence,
    created_at: 2000,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageDiffViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageDiffViewerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('originalArtifact', mockOriginal);
    fixture.componentRef.setInput('editedArtifact', mockEdited);
    fixture.componentRef.setInput('differenceEvidence', mockEvidence);
    fixture.componentRef.setInput('lineageRecord', mockLineage);
    fixture.detectChanges();
  });

  it('should create the diff viewer', () => {
    expect(component).toBeTruthy();
  });

  it('should switch between split and side-by-side view modes', () => {
    expect(component.viewMode()).toBe('split');
    component.viewMode.set('side-by-side');
    expect(component.viewMode()).toBe('side-by-side');
    component.viewMode.set('split');
    expect(component.viewMode()).toBe('split');
  });

  it('should update slider position on drag', () => {
    component.sliderPosition.set(75);
    expect(component.sliderPosition()).toBe(75);
  });

  it('should return container width constant for rendering', () => {
    expect(component.getContainerWidth()).toBe(500);
  });

  it('should handle slider move event bounds correctly', () => {
    const mockTarget = document.createElement('div');
    Object.defineProperty(mockTarget, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 200, top: 0, height: 200 }),
    });

    const mockEvent = {
      currentTarget: mockTarget,
      clientX: 50,
    } as unknown as MouseEvent;

    component.onSliderMove(mockEvent);
    expect(component.sliderPosition()).toBe(25);
  });

  it('should handle touch move event bounds correctly', () => {
    const mockTarget = document.createElement('div');
    Object.defineProperty(mockTarget, 'getBoundingClientRect', {
      value: () => ({ left: 0, width: 200, top: 0, height: 200 }),
    });

    const mockTouchEvent = {
      currentTarget: mockTarget,
      touches: [{ clientX: 150 }],
    } as unknown as TouchEvent;

    component.onTouchMove(mockTouchEvent);
    expect(component.sliderPosition()).toBe(75);
  });
});
