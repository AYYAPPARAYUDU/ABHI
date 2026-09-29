import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MediaService } from './media.service';
import {
  ImageModelDefinitionDTO,
  VideoModelDefinitionDTO,
  MediaJobDTO,
  MediaArtifactDTO,
  VideoArtifactDTO,
  ImageGenerationRequestDTO,
  VideoGenerationRequestDTO,
  MediaResourceStatusDTO,
} from '../models/media.model';

describe('MediaService', () => {
  let service: MediaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MediaService],
    });

    service = TestBed.inject(MediaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should initialize with default empty signals', () => {
    expect(service.models()).toEqual([]);
    expect(service.videoModels()).toEqual([]);
    expect(service.jobs()).toEqual([]);
    expect(service.videoJobs()).toEqual([]);
    expect(service.artifacts()).toEqual([]);
    expect(service.videoArtifacts()).toEqual([]);
    expect(service.activeJob()).toBeNull();
    expect(service.activeVideoJob()).toBeNull();
    expect(service.isLoading()).toBe(false);
    expect(service.isVideoLoading()).toBe(false);
  });

  it('should fetch media models and compute production/candidate models', () => {
    const mockModels: ImageModelDefinitionDTO[] = [
      {
        model_id: 'sd-turbo-local',
        name: 'SD-Turbo Real-Time Local',
        version: '1.0.0',
        digest: 'sha256:123',
        runtime: 'Local-Diffusion-Engine',
        format: 'Diffusers-Local',
        quantization: 'FP16',
        supported_devices: ['GPU', 'CPU'],
        base_vram_mb: 3200.0,
        base_ram_mb: 2048.0,
        gpu_compute_percent: 60.0,
        supported_resolutions: [[512, 512]],
        max_batch: 4,
        capabilities: ['text-to-image'],
        license_metadata: 'Open-RAIL',
        source: 'local',
        status: 'AVAILABLE',
        is_production: true,
        is_candidate: false,
      },
    ];

    service.fetchModels().subscribe((models) => {
      expect(models.length).toBe(1);
    });

    const req = httpMock.expectOne('/api/v1/media/models');
    expect(req.request.method).toBe('GET');
    req.flush(mockModels);

    expect(service.models().length).toBe(1);
    expect(service.productionModels().length).toBe(1);
    expect(service.candidateModels().length).toBe(0);
  });

  it('should fetch video models and compute production video models', () => {
    const mockVideoModels: VideoModelDefinitionDTO[] = [
      {
        model_id: 'svd-xt-local',
        name: 'Stable Video Diffusion XT Local',
        version: '1.1.0',
        digest: 'sha256:7e3d1a9b4c8f205e',
        runtime: 'Local-Video-Diffusion-Engine',
        format: 'Diffusers-Video',
        quantization: 'FP16',
        supported_devices: ['GPU', 'CPU'],
        base_vram_mb: 4200.0,
        per_second_vram_mb: 280.0,
        base_ram_mb: 3072.0,
        gpu_compute_percent: 75.0,
        supported_resolutions: [[512, 512]],
        supported_fps: [12, 16, 24],
        max_duration_seconds: 4.0,
        supported_operations: ['TEXT_TO_VIDEO'],
        capabilities: ['text-to-video'],
        license_metadata: 'Open-RAIL',
        source: 'local',
        status: 'AVAILABLE',
        is_production: true,
        is_candidate: false,
      },
    ];

    service.fetchVideoModels().subscribe((models) => {
      expect(models.length).toBe(1);
    });

    const req = httpMock.expectOne('/api/v1/media/video/models');
    expect(req.request.method).toBe('GET');
    req.flush(mockVideoModels);

    expect(service.videoModels().length).toBe(1);
    expect(service.productionVideoModels().length).toBe(1);
  });

  it('should submit video generation and set active video job', () => {
    const requestDTO: VideoGenerationRequestDTO = {
      prompt: 'A car racing on a neon track',
      model_id: 'svd-xt-local',
      width: 512,
      height: 512,
      fps: 24,
      duration_seconds: 2.0,
      steps: 25,
      output_format: 'MP4',
    };

    const mockJob: MediaJobDTO = {
      job_id: 'job_vid_100',
      media_type: 'VIDEO',
      operation: 'GENERATE',
      prompt: 'A car racing on a neon track',
      model_id: 'svd-xt-local',
      model_version: '1.0.0',
      parameters: { fps: 24, width: 512, height: 512 },
      status: 'GENERATING',
      progress: 50.0,
      current_phase: 'GENERATING_SEGMENTS',
      created_at: 1720000000,
      provenance: 'ACTUAL',
    };

    service.generateVideo(requestDTO).subscribe((job) => {
      expect(job.job_id).toBe('job_vid_100');
    });

    const genReq = httpMock.expectOne('/api/v1/media/video/generate');
    expect(genReq.request.method).toBe('POST');
    genReq.flush(mockJob);

    // After flush, refreshAll requests trigger
    httpMock.expectOne('/api/v1/media/models').flush([]);
    httpMock.expectOne('/api/v1/media/edit/models').flush([]);
    httpMock.expectOne('/api/v1/media/jobs').flush([]);
    httpMock.expectOne('/api/v1/media/artifacts').flush([]);
    httpMock.expectOne('/api/v1/media/resources').flush({ gpu_detected: true, pressure_level: 'NORMAL', active_media_models: [] });
    httpMock.expectOne('/api/v1/media/video/models').flush([]);
    httpMock.expectOne('/api/v1/media/video/jobs').flush([]);
    httpMock.expectOne('/api/v1/media/video/artifacts').flush([]);

    expect(service.activeVideoJob()?.job_id).toBe('job_vid_100');
  });

  it('should call cancel endpoint on cancelVideoJob', () => {
    service.cancelVideoJob('job_vid_100').subscribe();

    const cancelReq = httpMock.expectOne('/api/v1/media/video/jobs/job_vid_100/cancel');
    expect(cancelReq.request.method).toBe('POST');
    cancelReq.flush({ status: 'SUCCESS' });

    httpMock.expectOne('/api/v1/media/models').flush([]);
    httpMock.expectOne('/api/v1/media/edit/models').flush([]);
    httpMock.expectOne('/api/v1/media/jobs').flush([]);
    httpMock.expectOne('/api/v1/media/artifacts').flush([]);
    httpMock.expectOne('/api/v1/media/resources').flush({ gpu_detected: true, pressure_level: 'NORMAL', active_media_models: [] });
    httpMock.expectOne('/api/v1/media/video/models').flush([]);
    httpMock.expectOne('/api/v1/media/video/jobs').flush([]);
    httpMock.expectOne('/api/v1/media/video/artifacts').flush([]);
  });

  it('should call delete endpoint on deleteVideoArtifact', () => {
    service.deleteVideoArtifact('art_vid_100').subscribe();

    const delReq = httpMock.expectOne('/api/v1/media/video/artifacts/art_vid_100');
    expect(delReq.request.method).toBe('DELETE');
    delReq.flush({ status: 'SUCCESS' });

    httpMock.expectOne('/api/v1/media/video/artifacts').flush([]);
  });

  it('should fetch edit models and compute production/candidate edit models', () => {
    service.fetchEditModels().subscribe((models) => {
      expect(models.length).toBe(1);
    });

    const req = httpMock.expectOne('/api/v1/media/edit/models');
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        model_id: 'instruct-pix2pix-local',
        name: 'InstructPix2Pix Local',
        version: '1.0',
        digest: 'sha256:abcd',
        runtime: 'diffusers',
        format: 'safetensors',
        quantization: 'fp16',
        supported_devices: ['GPU', 'CPU'],
        base_vram_mb: 3200,
        base_ram_mb: 4000,
        gpu_compute_percent: 65,
        supported_resolutions: [[512, 512]],
        supported_operations: ['IMAGE_TO_IMAGE'],
        max_expansion_pixels: 512,
        capabilities: ['image_editing'],
        license_metadata: 'CreativeML',
        source: 'local',
        status: 'AVAILABLE',
        is_production: true,
        is_candidate: false,
      },
    ]);

    expect(service.editModels().length).toBe(1);
    expect(service.productionEditModels().length).toBe(1);
    expect(service.candidateEditModels().length).toBe(0);
  });

  it('should call image edit endpoints and refresh all on editImage', () => {
    service.editImage({
      source_artifact_id: 'art_orig_1',
      operation: 'IMAGE_TO_IMAGE',
      prompt: 'Make it vintage oil painting',
      model_id: 'instruct-pix2pix-local',
    }).subscribe();

    const editReq = httpMock.expectOne('/api/v1/media/image/edit');
    expect(editReq.request.method).toBe('POST');
    editReq.flush({
      job_id: 'job_edit_01',
      media_type: 'IMAGE',
      operation: 'EDIT',
      status: 'ADMITTED',
      created_at: 1000,
    });

    httpMock.expectOne('/api/v1/media/models').flush([]);
    httpMock.expectOne('/api/v1/media/edit/models').flush([]);
    httpMock.expectOne('/api/v1/media/jobs').flush([]);
    httpMock.expectOne('/api/v1/media/artifacts').flush([]);
    httpMock.expectOne('/api/v1/media/resources').flush({ gpu_detected: true, pressure_level: 'NORMAL', active_media_models: [] });
    httpMock.expectOne('/api/v1/media/video/models').flush([]);
    httpMock.expectOne('/api/v1/media/video/jobs').flush([]);
    httpMock.expectOne('/api/v1/media/video/artifacts').flush([]);
  });

  it('should fetch artifact lineage and masks', () => {
    service.fetchArtifactLineage('art_child_1').subscribe();
    const linReq = httpMock.expectOne('/api/v1/media/artifacts/art_child_1/lineage');
    expect(linReq.request.method).toBe('GET');
    linReq.flush({
      lineage_id: 'lin_01',
      parent_artifact_id: 'art_parent_1',
      child_artifact_id: 'art_child_1',
      job_id: 'job_edit_01',
      operation: 'IMAGE_TO_IMAGE',
      prompt: 'Test prompt',
      model_id: 'instruct-pix2pix-local',
      model_version: '1.0',
      parameters_hash: 'hash',
      created_at: 1000,
    });
    expect(service.activeLineage()?.lineage_id).toBe('lin_01');

    service.fetchArtifactMasks('art_parent_1').subscribe();
    const maskReq = httpMock.expectOne('/api/v1/media/artifacts/art_parent_1/masks');
    expect(maskReq.request.method).toBe('GET');
    maskReq.flush([]);
    expect(service.artifactMasks().length).toBe(0);
  });

  it('should compute isGeneratingVideo as true when activeVideoJob is GENERATING', () => {
    expect(service.isGeneratingVideo()).toBe(false);

    const activeJob: MediaJobDTO = {
      job_id: 'job_vid_act',
      media_type: 'VIDEO',
      operation: 'GENERATE',
      prompt: 'Test video',
      model_id: 'svd-xt-local',
      model_version: '1.0.0',
      parameters: {},
      status: 'GENERATING',
      progress: 50.0,
      current_phase: 'GENERATING_SEGMENTS',
      created_at: 1720000000,
      provenance: 'ACTUAL',
    };
    service.activeVideoJob.set(activeJob);
    expect(service.isGeneratingVideo()).toBe(true);
  });

  it('should compute candidateVideoModels correctly', () => {
    const mockVideoModels: VideoModelDefinitionDTO[] = [
      {
        model_id: 'cogvideox-candidate',
        name: 'CogVideoX 2B (Candidate)',
        version: '0.9.0',
        digest: 'sha256:3d7a1c9e8b2f4501',
        runtime: 'Local-Video-Diffusion-Engine',
        format: 'Diffusers-Video',
        quantization: 'INT8',
        supported_devices: ['GPU'],
        base_vram_mb: 5600.0,
        per_second_vram_mb: 350.0,
        base_ram_mb: 4096.0,
        gpu_compute_percent: 88.0,
        supported_resolutions: [[512, 512]],
        supported_fps: [12, 16, 24],
        max_duration_seconds: 6.0,
        supported_operations: ['TEXT_TO_VIDEO'],
        capabilities: ['text-to-video'],
        license_metadata: 'Open-RAIL',
        source: 'local',
        status: 'AVAILABLE',
        is_production: false,
        is_candidate: true,
      },
    ];
    service.videoModels.set(mockVideoModels);
    expect(service.candidateVideoModels().length).toBe(1);
    expect(service.productionVideoModels().length).toBe(0);
  });

  it('should handle video generation error gracefully and set videoErrorMessage', () => {
    const requestDTO: VideoGenerationRequestDTO = {
      prompt: 'A car racing',
      model_id: 'svd-xt-local',
      width: 512,
      height: 512,
      fps: 24,
      duration_seconds: 2.0,
      steps: 25,
      output_format: 'MP4',
    };

    service.generateVideo(requestDTO).subscribe({
      error: () => {},
    });

    const genReq = httpMock.expectOne('/api/v1/media/video/generate');
    genReq.flush({ detail: 'OOM error' }, { status: 500, statusText: 'Server Error' });

    expect(service.isVideoLoading()).toBe(false);
    expect(service.videoErrorMessage()).toBe('OOM error');
  });
});
