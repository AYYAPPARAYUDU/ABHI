import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { MediaService } from './media.service';
import {
  MediaJobDTO,
  MediaArtifactDTO,
  ImageModelDefinitionDTO,
  MediaResourceStatusDTO,
} from '../models/media.model';

describe('MediaService', () => {
  let service: MediaService;
  let httpMock: any;

  const mockModel: ImageModelDefinitionDTO = {
    model_id: 'sd-turbo-local',
    name: 'SD-Turbo Local',
    version: '1.0.0',
    digest: 'sha256:abc12345',
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
    source: 'local-verified',
    status: 'AVAILABLE',
    is_production: true,
    is_candidate: false,
  };

  const mockJob: MediaJobDTO = {
    job_id: 'job_123',
    media_type: 'IMAGE',
    operation: 'GENERATE',
    prompt: 'A golden sunset over mountains',
    model_id: 'sd-turbo-local',
    model_version: '1.0.0',
    parameters: { width: 512, height: 512 },
    status: 'COMPLETED',
    progress: 100.0,
    current_phase: 'COMPLETED',
    created_at: Date.now() / 1000,
    completed_at: Date.now() / 1000 + 2,
    artifact_id: 'art_123',
    output_path: 'media/images/2026/09/img_123.png',
    provenance: 'ACTUAL',
  };

  const mockArtifact: MediaArtifactDTO = {
    artifact_id: 'art_123',
    job_id: 'job_123',
    media_type: 'IMAGE',
    path: 'media/images/2026/09/img_123.png',
    filename: 'img_123.png',
    format: 'PNG',
    width: 512,
    height: 512,
    size_bytes: 450000,
    sha256: 'sha256_abcdef123456',
    created_at: Date.now() / 1000,
    model_id: 'sd-turbo-local',
    model_version: '1.0.0',
    generation_parameters_hash: 'param_hash_123',
    prompt_preview: 'A golden sunset...',
    provenance: 'ACTUAL',
  };

  const mockResourceStatus: MediaResourceStatusDTO = {
    gpu_detected: true,
    gpu_model: 'NVIDIA GeForce RTX 5050',
    vram_total_mb: 8151.0,
    vram_free_mb: 6500.0,
    pressure_level: 'NORMAL',
    active_media_models: [mockModel],
  };

  beforeEach(() => {
    httpMock = {
      get: vi.fn((url: string) => {
        if (url.includes('/models')) return of([mockModel]);
        if (url.includes('/jobs')) return of([mockJob]);
        if (url.includes('/artifacts')) return of([mockArtifact]);
        if (url.includes('/resources')) return of(mockResourceStatus);
        return of({});
      }),
      post: vi.fn().mockReturnValue(of(mockJob)),
      delete: vi.fn().mockReturnValue(of({ status: 'SUCCESS' })),
    };

    TestBed.configureTestingModule({
      providers: [MediaService, { provide: HttpClient, useValue: httpMock }],
    });
    service = TestBed.inject(MediaService);
  });

  it('should initialize with default empty signals', () => {
    expect(service.models().length).toBe(0);
    expect(service.jobs().length).toBe(0);
    expect(service.artifacts().length).toBe(0);
    expect(service.activeJob()).toBeNull();
    expect(service.isGenerating()).toBe(false);
  });

  it('should fetch media models and compute production/candidate models', () => {
    service.fetchModels().subscribe((models) => {
      expect(models.length).toBe(1);
    });

    expect(httpMock.get).toHaveBeenCalledWith('/api/v1/media/models');
    expect(service.models().length).toBe(1);
    expect(service.productionModels().length).toBe(1);
    expect(service.candidateModels().length).toBe(0);
  });

  it('should fetch media jobs and compute active/completed counts', () => {
    service.fetchJobs().subscribe((jobs) => {
      expect(jobs.length).toBe(1);
    });

    expect(httpMock.get).toHaveBeenCalledWith('/api/v1/media/jobs');
    expect(service.jobs().length).toBe(1);
    expect(service.completedJobsCount()).toBe(1);
    expect(service.activeJobsCount()).toBe(0);
  });

  it('should fetch artifacts and update signal', () => {
    service.fetchArtifacts().subscribe((artifacts) => {
      expect(artifacts.length).toBe(1);
    });

    expect(httpMock.get).toHaveBeenCalledWith('/api/v1/media/artifacts');
    expect(service.artifacts().length).toBe(1);
  });

  it('should fetch resource status and compute free VRAM MB', () => {
    service.fetchResourceStatus().subscribe();
    expect(service.vramFreeMB()).toBe(6500);
  });

  it('should submit image generation and set active job', () => {
    service
      .generateImage({
        prompt: 'A cyberpunk city',
        model_id: 'sd-turbo-local',
        width: 512,
        height: 512,
        steps: 20,
        output_format: 'PNG',
      })
      .subscribe((job) => {
        expect(job.status).toBe('COMPLETED');
      });

    expect(httpMock.post).toHaveBeenCalledWith(
      '/api/v1/media/image/generate',
      expect.objectContaining({ prompt: 'A cyberpunk city' })
    );
  });

  it('should call cancel endpoint on cancelJob', () => {
    service.cancelJob('job_123').subscribe();
    expect(httpMock.post).toHaveBeenCalledWith('/api/v1/media/jobs/job_123/cancel', {});
  });

  it('should call delete endpoint on deleteArtifact', () => {
    service.deleteArtifact('art_123').subscribe();
    expect(httpMock.delete).toHaveBeenCalledWith('/api/v1/media/artifacts/art_123');
  });

  it('should compute isGenerating true when active job is GENERATING', () => {
    service.activeJob.set({ ...mockJob, status: 'GENERATING' });
    expect(service.isGenerating()).toBe(true);
  });

  it('should refresh all signals in refreshAll', () => {
    service.refreshAll();
    expect(httpMock.get).toHaveBeenCalledWith('/api/v1/media/models');
    expect(httpMock.get).toHaveBeenCalledWith('/api/v1/media/jobs');
    expect(httpMock.get).toHaveBeenCalledWith('/api/v1/media/artifacts');
    expect(httpMock.get).toHaveBeenCalledWith('/api/v1/media/resources');
  });
});
