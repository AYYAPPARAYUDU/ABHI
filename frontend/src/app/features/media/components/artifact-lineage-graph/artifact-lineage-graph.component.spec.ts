import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ArtifactLineageGraphComponent } from './artifact-lineage-graph.component';
import {
  MediaArtifactDTO,
  ArtifactLineageRecordDTO,
} from '../../models/media.model';

describe('ArtifactLineageGraphComponent', () => {
  let component: ArtifactLineageGraphComponent;
  let fixture: ComponentFixture<ArtifactLineageGraphComponent>;

  const mockArtifact: MediaArtifactDTO = {
    artifact_id: 'art_root_001',
    job_id: 'job_001',
    media_type: 'IMAGE',
    path: '/media/images/2026/09/root.png',
    filename: 'root.png',
    format: 'PNG',
    width: 512,
    height: 512,
    size_bytes: 180000,
    sha256: 'rootsha',
    created_at: 1000,
    model_id: 'sd-turbo-local',
    model_version: '1.0',
    generation_parameters_hash: 'hash001',
    prompt_preview: 'Root landscape',
    provenance: 'ACTUAL',
  };

  const mockLineage: ArtifactLineageRecordDTO = {
    lineage_id: 'lin_root_to_child',
    parent_artifact_id: 'art_root_001',
    child_artifact_id: 'art_child_002',
    job_id: 'job_inpaint_02',
    operation: 'INPAINTING',
    prompt: 'Add a crystal monument',
    model_id: 'sdxl-inpainting-local',
    model_version: '1.0',
    parameters_hash: 'hash002',
    created_at: 2000,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArtifactLineageGraphComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ArtifactLineageGraphComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('selectedArtifact', mockArtifact);
    fixture.detectChanges();
  });

  it('should create the lineage graph component', () => {
    expect(component).toBeTruthy();
  });

  it('should display root information when lineage is null', () => {
    fixture.componentRef.setInput('lineageRecord', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('art_root_001');
    expect(fixture.nativeElement.textContent).toContain('unedited primary source (v1)');
  });

  it('should display parent-to-child lineage tree when lineageRecord is provided', () => {
    fixture.componentRef.setInput('lineageRecord', mockLineage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('INPAINTING');
    expect(fixture.nativeElement.textContent).toContain('art_child_002');
    expect(fixture.nativeElement.textContent).toContain('sdxl-inpainting-local');
  });

  it('should show placeholder message when selectedArtifact is null', () => {
    fixture.componentRef.setInput('selectedArtifact', null);
    fixture.componentRef.setInput('lineageRecord', null);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Select an artifact to inspect its cryptographic lineage graph');
  });

  it('should display parameters hash preview', () => {
    fixture.componentRef.setInput('lineageRecord', mockLineage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('hash002');
  });

  it('should display prompt conditioning preview in lineage node', () => {
    fixture.componentRef.setInput('lineageRecord', mockLineage);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Add a crystal monument');
  });
});
