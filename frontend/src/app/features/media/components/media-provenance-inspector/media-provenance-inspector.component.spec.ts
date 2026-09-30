import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { MediaProvenanceInspectorComponent } from './media-provenance-inspector.component';
import { MediaService } from '../../services/media.service';
import { MediaRuntimeAttestation, TechnicalValidationResult, ReplayInspectionResult } from '../../models/media.model';

describe('MediaProvenanceInspectorComponent', () => {
  let component: MediaProvenanceInspectorComponent;
  let fixture: ComponentFixture<MediaProvenanceInspectorComponent>;
  let mediaService: MediaService;

  const mockAttestation: MediaRuntimeAttestation = {
    attestation_id: 'att_test_123',
    operation_id: 'op_test_123',
    artifact_id: 'art_test_123',
    operation_type: 'IMAGE_GENERATE',
    model_id: 'sdxl-turbo-local',
    model_digest: 'sha256:abcd1234ef567890',
    runtime_name: 'LocalImageDiffusionRuntime',
    runtime_version: '1.0.0',
    adapter_version: '1.0.0',
    device: 'cuda:0',
    compute_runtime: 'torch_cuda',
    provenance_class: 'ACTUAL_MODEL_INFERENCE',
    parameters_hash: 'params_hash_123',
    input_hashes: [],
    output_hashes: ['output_hash_123'],
    attestation_hash: 'att_hash_123',
    seed: 42,
    started_at: '2026-09-30T10:00:00Z',
    completed_at: '2026-09-30T10:00:02Z',
  };

  const mockValidationResult: TechnicalValidationResult = {
    artifact_id: 'art_test_123',
    media_type: 'IMAGE',
    status: 'PASS',
    measured_sha256: 'output_hash_123',
    measured_dimensions: [1024, 1024],
    checks: [
      { check_name: 'EXISTENCE', passed: true, detail: 'File exists' },
      { check_name: 'DIMENSIONS', passed: true, detail: '1024x1024' },
    ],
    validated_at: '2026-09-30T10:00:05Z',
  };

  const mockReplayResult: ReplayInspectionResult = {
    pipeline_id: 'pipeline_replay_demo',
    manifest_hash: 'demo_manifest_hash_12345678',
    mode: 'INSPECT',
    can_replay: true,
    reusable_artifact_count: 3,
    regenerate_node_count: 0,
    discrepancies: [],
    inspected_at: '2026-09-30T10:00:10Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaProvenanceInspectorComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MediaService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MediaProvenanceInspectorComponent);
    component = fixture.componentInstance;
    mediaService = TestBed.inject(MediaService);

    vi.spyOn(mediaService, 'fetchAttestations').mockReturnValue(of([mockAttestation]));
    vi.spyOn(mediaService, 'validateMediaArtifact').mockReturnValue(of(mockValidationResult));
    vi.spyOn(mediaService, 'inspectReplay').mockReturnValue(of(mockReplayResult));
    vi.spyOn(mediaService, 'simulateReplay').mockReturnValue(of(mockReplayResult));

    fixture.detectChanges();
  });

  it('should create the provenance inspector component', () => {
    expect(component).toBeTruthy();
  });

  it('should render attestation and select it', () => {
    expect(component.selectedAttestation()?.attestation_id).toBe('att_test_123');
    expect(component.selectedAttestation()?.model_id).toBe('sdxl-turbo-local');
  });

  it('should return appropriate badge styling for provenance classes', () => {
    expect(component.getProvenanceBadgeClass('ACTUAL_MODEL_INFERENCE')).toContain('text-emerald-300');
    expect(component.getProvenanceBadgeClass('PROCEDURAL')).toContain('text-cyan-300');
    expect(component.getProvenanceBadgeClass('MOCKED')).toContain('text-purple-300');
  });

  it('should switch tabs properly', () => {
    component.activeTab.set('validation');
    fixture.detectChanges();
    expect(component.activeTab()).toBe('validation');

    component.activeTab.set('replay');
    fixture.detectChanges();
    expect(component.activeTab()).toBe('replay');
  });

  it('should trigger replay inspection', () => {
    component.inspectCurrentManifest();
    expect(mediaService.inspectReplay).toHaveBeenCalled();
  });
});
