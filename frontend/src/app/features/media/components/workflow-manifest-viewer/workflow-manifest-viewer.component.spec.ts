import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkflowManifestViewerComponent } from './workflow-manifest-viewer.component';
import { MediaWorkflowManifest } from '../../models/media.model';

describe('WorkflowManifestViewerComponent', () => {
  let component: WorkflowManifestViewerComponent;
  let fixture: ComponentFixture<WorkflowManifestViewerComponent>;

  const mockManifest: MediaWorkflowManifest = {
    manifest_id: 'mnf_test_123',
    workflow_id: 'wf_exec_01',
    workflow_hash: '9a8b7c6d5e4f3a2b1c',
    title: 'Text to Video Pipeline',
    goal: 'Create animated clip',
    primary_artifact_id: 'art_vid_composed_01',
    artifacts: [
      {
        node_id: 'n1',
        artifact_id: 'art_img_01',
        media_type: 'IMAGE',
        filename: 'source.png',
        sha256: 'abcdef1234567890abcdef',
        size_bytes: 204800,
        model_id: 'sd-turbo-local',
      },
      {
        node_id: 'n2',
        artifact_id: 'art_vid_composed_01',
        media_type: 'VIDEO',
        filename: 'final.mp4',
        sha256: 'fedcba0987654321fedcba',
        size_bytes: 1048576,
        model_id: 'media-composition-engine',
      },
    ],
    nodes_executed: ['n1', 'n2'],
    resource_summary: { completed_nodes: 2 },
    verification_passed: true,
    created_at: 1700000000,
    completed_at: 1700000010,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowManifestViewerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowManifestViewerComponent);
    component = fixture.componentInstance;
  });

  it('should create manifest viewer component', () => {
    expect(component).toBeTruthy();
  });

  it('should render empty state when no manifest provided', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No signed manifest available');
  });

  it('should render manifest details and artifacts when provided', () => {
    fixture.componentRef.setInput('manifest', mockManifest);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('9a8b7c6d5e4f3a2b1c');
    expect(compiled.textContent).toContain('art_vid_composed_01');
    expect(compiled.textContent).toContain('Registered Artifacts (2)');
  });

  it('should render nodes executed and SHA-256 verification indicator', () => {
    fixture.componentRef.setInput('manifest', mockManifest);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('SHA-256 Verified');
    expect(compiled.textContent).toContain('n1, n2');
  });

  it('should handle manifest with zero artifacts gracefully', () => {
    const emptyArtifactsManifest: MediaWorkflowManifest = {
      ...mockManifest,
      artifacts: [],
    };
    fixture.componentRef.setInput('manifest', emptyArtifactsManifest);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Registered Artifacts (0)');
  });
});
