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
    httpMock.expectOne('/api/v1/media/workflows/templates').flush([]);
    httpMock.expectOne('/api/v1/media/workflows').flush([]);
    httpMock.expectOne('/api/v1/media/creative/templates').flush([]);
    httpMock.expectOne('/api/v1/media/creative/pipelines').flush([]);
    httpMock.expectOne('/api/v1/media/provenance/attestations').flush([]);

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
    httpMock.expectOne('/api/v1/media/workflows/templates').flush([]);
    httpMock.expectOne('/api/v1/media/workflows').flush([]);
    httpMock.expectOne('/api/v1/media/creative/templates').flush([]);
    httpMock.expectOne('/api/v1/media/creative/pipelines').flush([]);
    httpMock.expectOne('/api/v1/media/provenance/attestations').flush([]);
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
    httpMock.expectOne('/api/v1/media/workflows/templates').flush([]);
    httpMock.expectOne('/api/v1/media/workflows').flush([]);
    httpMock.expectOne('/api/v1/media/creative/templates').flush([]);
    httpMock.expectOne('/api/v1/media/creative/pipelines').flush([]);
    httpMock.expectOne('/api/v1/media/provenance/attestations').flush([]);
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

  it('should fetch workflow templates and populate templates signal', () => {
    const mockTemplates = [
      {
        template_id: 'creative.text_to_image@1.0.0',
        title: 'Text to Image',
        version: '1.0.0',
        description: 'Generates image',
        category: 'CREATIVE',
        is_builtin: true,
        nodes: [],
        edges: [],
        default_parameters: {},
      },
    ];

    service.fetchTemplates().subscribe((res) => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne('/api/v1/media/workflows/templates');
    expect(req.request.method).toBe('GET');
    req.flush(mockTemplates);

    expect(service.templates().length).toBe(1);
    expect(service.templates()[0].template_id).toBe('creative.text_to_image@1.0.0');
  });

  it('should simulate workflow and store simulationResult signal', () => {
    const mockWorkflow = {
      workflow_id: 'wf_test',
      title: 'Test Workflow',
      goal: 'Test',
      nodes: [],
      edges: [],
    };
    const mockSim = {
      feasible: true,
      peak_vram_mb: 3200.0,
      peak_ram_mb: 2048.0,
      estimated_duration_sec: 4.5,
      node_simulation: {},
      bottleneck_node_id: null,
      recommendations: [],
    };

    service.simulateWorkflow(mockWorkflow).subscribe((res) => {
      expect(res.feasible).toBe(true);
      expect(res.peak_vram_mb).toBe(3200.0);
    });

    const req = httpMock.expectOne('/api/v1/media/workflows/simulate');
    expect(req.request.method).toBe('POST');
    req.flush(mockSim);

    expect(service.simulationResult()?.feasible).toBe(true);
  });

  it('should execute workflow and store activeWorkflow signal', () => {
    const mockWorkflow = {
      workflow_id: 'wf_test',
      title: 'Test Workflow',
      goal: 'Test',
      nodes: [],
      edges: [],
    };
    const mockExecuted = {
      ...mockWorkflow,
      status: 'COMPLETED' as const,
      workflow_hash: 'sha256:abc',
    };

    service.executeWorkflow(mockWorkflow).subscribe((res) => {
      expect(res.status).toBe('COMPLETED');
    });

    const req = httpMock.expectOne('/api/v1/media/workflows/execute');
    expect(req.request.method).toBe('POST');
    req.flush(mockExecuted);

    httpMock.expectOne('/api/v1/media/workflows').flush([]);
    httpMock.expectOne('/api/v1/media/artifacts').flush([]);
    httpMock.expectOne('/api/v1/media/video/artifacts').flush([]);

    expect(service.activeWorkflow()?.status).toBe('COMPLETED');
    expect(service.isWorkflowExecuting()).toBe(false);
  });

  it('should fetch manifest and store activeManifest signal', () => {
    const mockManifest = {
      workflow_id: 'wf_test',
      workflow_hash: 'sha256:abc',
      timestamp: 1720000000,
      nodes_executed: ['node1'],
      artifacts: [],
      primary_artifact_id: 'art_123',
    };

    service.fetchManifest('wf_test').subscribe((res) => {
      expect(res.workflow_id).toBe('wf_test');
    });

    const req = httpMock.expectOne('/api/v1/media/workflows/wf_test/manifest');
    expect(req.request.method).toBe('GET');
    req.flush(mockManifest);

    expect(service.activeManifest()?.primary_artifact_id).toBe('art_123');
  });

  it('should compose media using composition profile endpoint', () => {
    const mockReq = {
      video_artifact_id: 'vid_1',
      audio_artifact_id: 'aud_1',
      profile: 'VIDEO_PLUS_AUDIO' as const,
    };
    const mockArtifact = {
      artifact_id: 'vid_composed_1',
      media_type: 'VIDEO' as const,
      file_path: '/path/to/composed.mp4',
      mime_type: 'video/mp4',
      size_bytes: 1024,
      sha256: 'sha256:def',
      metadata: {},
      created_at: 1720000000,
    };

    service.composeMedia(mockReq).subscribe((res) => {
      expect(res.artifact_id).toBe('vid_composed_1');
    });

    const req = httpMock.expectOne('/api/v1/media/composition/execute');
    expect(req.request.method).toBe('POST');
    req.flush(mockArtifact);
  });

  it('should call cancelWorkflow endpoint and refresh workflow details', () => {
    service.cancelWorkflow('wf_123').subscribe();

    const cancelReq = httpMock.expectOne('/api/v1/media/workflows/wf_123/cancel');
    expect(cancelReq.request.method).toBe('POST');
    cancelReq.flush({ status: 'CANCELLED' });

    httpMock.expectOne('/api/v1/media/workflows/wf_123').flush({ workflow_id: 'wf_123', status: 'CANCELLED' });
    httpMock.expectOne('/api/v1/media/workflows').flush([]);
  });

  it('should call resumeWorkflow endpoint and update activeWorkflow signal', () => {
    service.resumeWorkflow('wf_123').subscribe((wf) => {
      expect(wf.workflow_id).toBe('wf_123');
    });

    const resumeReq = httpMock.expectOne('/api/v1/media/workflows/wf_123/resume');
    expect(resumeReq.request.method).toBe('POST');
    resumeReq.flush({ workflow_id: 'wf_123', status: 'COMPLETED' });

    httpMock.expectOne('/api/v1/media/workflows').flush([]);
    expect(service.activeWorkflow()?.workflow_id).toBe('wf_123');
  });

  it('should call exportWorkflow and return JSON serializable workflow', () => {
    const mockWf = { workflow_id: 'wf_exp', title: 'Exported', goal: 'Test', nodes: [], edges: [] };
    service.exportWorkflow(mockWf).subscribe((res) => {
      expect(res.workflow_id).toBe('wf_exp');
    });

    const req = httpMock.expectOne('/api/v1/media/workflows/export');
    expect(req.request.method).toBe('POST');
    req.flush(mockWf);
  });

  it('should call importWorkflow and set activeWorkflow signal', () => {
    const mockWf = { workflow_id: 'wf_imp', title: 'Imported', goal: 'Test', nodes: [], edges: [] };
    service.importWorkflow(mockWf).subscribe((res) => {
      expect(res.workflow_id).toBe('wf_imp');
    });

    const req = httpMock.expectOne('/api/v1/media/workflows/import');
    expect(req.request.method).toBe('POST');
    req.flush(mockWf);

    expect(service.activeWorkflow()?.workflow_id).toBe('wf_imp');
  });

  // ==========================================
  // Phase 8 Stage 8.5 Creative Pipeline Tests
  // ==========================================

  it('should fetch creative templates and update creativeTemplates signal', () => {
    const mockTemplates = [
      {
        template_id: 'template.short_promotional_video@1.0.0',
        title: 'Short Promo',
        description: 'Short promotional video',
        pipeline_type: 'SHORT_PROMOTIONAL_VIDEO' as const,
        version: '1.0.0',
        is_builtin: true,
      },
    ];

    service.fetchCreativeTemplates().subscribe((res) => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne('/api/v1/media/creative/templates');
    expect(req.request.method).toBe('GET');
    req.flush(mockTemplates);

    expect(service.creativeTemplates().length).toBe(1);
    expect(service.creativeTemplates()[0].template_id).toBe('template.short_promotional_video@1.0.0');
  });

  it('should fetch creative pipelines and update creativePipelines signal', () => {
    const mockPipelines = [
      {
        pipeline_id: 'cpipe_1',
        goal: 'Promo',
        pipeline_type: 'SHORT_PROMOTIONAL_VIDEO' as const,
        version: '1.0.0',
        creative_brief: { title: 'Promo', description: 'Desc', style: 'Modern', tone: 'Excited', language: 'en', duration: 10 },
        scenes: [],
        assets: [],
        subtitle_tracks: [],
        outputs: [],
        status: 'READY' as const,
        resource_budget: {},
        storage_budget: {},
        retention_policy: 'FINAL_ONLY' as const,
        render_profile: 'MP4_H264_STANDARD' as const,
        pipeline_hash: 'hash1',
        created_at: 1000,
      },
    ];

    service.fetchCreativePipelines().subscribe((res) => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne('/api/v1/media/creative/pipelines');
    expect(req.request.method).toBe('GET');
    req.flush(mockPipelines);

    expect(service.creativePipelines().length).toBe(1);
    expect(service.isCreativeLoading()).toBe(false);
  });

  it('should create creative pipeline and update activeCreativePipeline signal', () => {
    const brief = {
      title: 'New Video',
      description: 'Futuristic teaser',
      style: 'Cyberpunk',
      tone: 'Dynamic',
      language: 'en',
      duration: 15,
    };

    const mockCreated = {
      pipeline_id: 'cpipe_new_1',
      goal: 'New Video',
      pipeline_type: 'SHORT_PROMOTIONAL_VIDEO' as const,
      version: '1.0.0',
      creative_brief: brief,
      scenes: [],
      assets: [],
      subtitle_tracks: [],
      outputs: [],
      status: 'PLANNING' as const,
      resource_budget: {},
      storage_budget: {},
      retention_policy: 'FINAL_ONLY' as const,
      render_profile: 'MP4_H264_STANDARD' as const,
      pipeline_hash: 'hash_new',
      created_at: 2000,
    };

    service.createCreativePipeline(brief, 'template.short_promotional_video@1.0.0', 'FULL_PROJECT', 'MP4_H264_LOW_RESOURCE').subscribe((res) => {
      expect(res.pipeline_id).toBe('cpipe_new_1');
    });

    const req = httpMock.expectOne('/api/v1/media/creative/pipelines');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.template_id).toBe('template.short_promotional_video@1.0.0');
    expect(req.request.body.retention_policy).toBe('FULL_PROJECT');
    expect(req.request.body.render_profile).toBe('MP4_H264_LOW_RESOURCE');
    req.flush(mockCreated);

    httpMock.expectOne('/api/v1/media/creative/pipelines').flush([mockCreated]);

    expect(service.activeCreativePipeline()?.pipeline_id).toBe('cpipe_new_1');
    expect(service.isCreativeLoading()).toBe(false);
  });

  it('should get single creative pipeline by id', () => {
    const mockPipe = {
      pipeline_id: 'cpipe_single',
      goal: 'Single',
      pipeline_type: 'CINEMATIC_SCENE' as const,
      version: '1.0.0',
      creative_brief: { title: 'Single', description: 'Desc', style: 'Cinematic', tone: 'Epic', language: 'en', duration: 12 },
      scenes: [],
      assets: [],
      subtitle_tracks: [],
      outputs: [],
      status: 'READY' as const,
      resource_budget: {},
      storage_budget: {},
      retention_policy: 'FINAL_ONLY' as const,
      render_profile: 'MP4_H264_STANDARD' as const,
      pipeline_hash: 'hash_single',
      created_at: 1000,
    };

    service.getCreativePipeline('cpipe_single').subscribe((res) => {
      expect(res.pipeline_id).toBe('cpipe_single');
    });

    const req = httpMock.expectOne('/api/v1/media/creative/pipelines/cpipe_single');
    expect(req.request.method).toBe('GET');
    req.flush(mockPipe);

    expect(service.activeCreativePipeline()?.pipeline_id).toBe('cpipe_single');
  });

  it('should simulate creative pipeline and store creativeSimulationResult signal', () => {
    const mockSim = {
      feasible: true,
      peak_vram_mb: 4800.0,
      peak_ram_mb: 3200.0,
      estimated_duration_sec: 14.2,
      node_simulation: {},
      bottleneck_node_id: null,
      recommendations: [],
    };

    service.simulateCreativePipeline('cpipe_100').subscribe((res) => {
      expect(res.feasible).toBe(true);
      expect(res.peak_vram_mb).toBe(4800.0);
    });

    const req = httpMock.expectOne('/api/v1/media/creative/pipelines/cpipe_100/simulate');
    expect(req.request.method).toBe('POST');
    req.flush(mockSim);

    expect(service.creativeSimulationResult()?.feasible).toBe(true);
    expect(service.isCreativeLoading()).toBe(false);
  });

  it('should execute creative pipeline and update signals', () => {
    const mockExecuted = {
      pipeline_id: 'cpipe_100',
      goal: 'Exec',
      pipeline_type: 'SHORT_PROMOTIONAL_VIDEO' as const,
      version: '1.0.0',
      creative_brief: { title: 'Exec', description: 'Desc', style: 'Style', tone: 'Tone', language: 'en', duration: 10 },
      scenes: [],
      assets: [],
      subtitle_tracks: [],
      outputs: [],
      status: 'COMPLETED' as const,
      resource_budget: {},
      storage_budget: {},
      retention_policy: 'FINAL_ONLY' as const,
      render_profile: 'MP4_H264_STANDARD' as const,
      pipeline_hash: 'hash_exec',
      created_at: 1000,
    };

    service.executeCreativePipeline('cpipe_100').subscribe((res) => {
      expect(res.status).toBe('COMPLETED');
    });

    const req = httpMock.expectOne('/api/v1/media/creative/pipelines/cpipe_100/execute');
    expect(req.request.method).toBe('POST');
    req.flush(mockExecuted);

    httpMock.expectOne('/api/v1/media/creative/pipelines').flush([mockExecuted]);

    expect(service.activeCreativePipeline()?.status).toBe('COMPLETED');
    expect(service.isCreativeLoading()).toBe(false);
  });

  it('should revise creative pipeline and update signals', () => {
    const revisionReq = {
      scene_id: 'scn_1',
      new_visual_prompt: 'Updated scene prompt',
      new_duration: 6,
    };

    const mockRevised = {
      pipeline_id: 'cpipe_100',
      goal: 'Revised',
      pipeline_type: 'SHORT_PROMOTIONAL_VIDEO' as const,
      version: '1.0.0',
      creative_brief: { title: 'Rev', description: 'Desc', style: 'Style', tone: 'Tone', language: 'en', duration: 11 },
      scenes: [],
      assets: [],
      subtitle_tracks: [],
      outputs: [],
      status: 'READY' as const,
      resource_budget: {},
      storage_budget: {},
      retention_policy: 'FINAL_ONLY' as const,
      render_profile: 'MP4_H264_STANDARD' as const,
      pipeline_hash: 'hash_revised',
      created_at: 1000,
    };

    service.reviseCreativePipeline('cpipe_100', revisionReq).subscribe((res) => {
      expect(res.pipeline_id).toBe('cpipe_100');
    });

    const req = httpMock.expectOne('/api/v1/media/creative/pipelines/cpipe_100/revise');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.new_visual_prompt).toBe('Updated scene prompt');
    req.flush(mockRevised);

    httpMock.expectOne('/api/v1/media/creative/pipelines').flush([mockRevised]);

    expect(service.activeCreativePipeline()?.pipeline_hash).toBe('hash_revised');
  });

  it('should cancel creative pipeline and refresh pipeline list', () => {
    const mockCancelled = {
      pipeline_id: 'cpipe_100',
      goal: 'Cancelled',
      pipeline_type: 'SHORT_PROMOTIONAL_VIDEO' as const,
      version: '1.0.0',
      creative_brief: { title: 'Cancelled', description: 'Desc', style: 'Style', tone: 'Tone', language: 'en', duration: 10 },
      scenes: [],
      assets: [],
      subtitle_tracks: [],
      outputs: [],
      status: 'CANCELLED' as const,
      resource_budget: {},
      storage_budget: {},
      retention_policy: 'FINAL_ONLY' as const,
      render_profile: 'MP4_H264_STANDARD' as const,
      pipeline_hash: 'hash_cancelled',
      created_at: 1000,
    };

    service.cancelCreativePipeline('cpipe_100').subscribe((res) => {
      expect(res.status).toBe('CANCELLED');
    });

    const req = httpMock.expectOne('/api/v1/media/creative/pipelines/cpipe_100/cancel');
    expect(req.request.method).toBe('POST');
    req.flush(mockCancelled);

    httpMock.expectOne('/api/v1/media/creative/pipelines').flush([mockCancelled]);

    expect(service.activeCreativePipeline()?.status).toBe('CANCELLED');
  });

  it('should fetch creative manifest and update activeCreativeManifest signal', () => {
    const mockManifest = {
      manifest_id: 'man_100',
      pipeline_id: 'cpipe_100',
      pipeline_hash: 'hash_manifest',
      title: 'Promo Video',
      pipeline_type: 'SHORT_PROMOTIONAL_VIDEO',
      version: '1.0.0',
      creative_brief: { title: 'Promo', description: 'Desc' },
      scenes: [],
      assets: [],
      models: ['sd-turbo-local'],
      artifacts: [{ artifact_id: 'art_1' }],
      subtitles: [],
      quality_report: {
        technical_integrity: 0.95,
        resource_efficiency: 0.92,
        workflow_completion: 1.0,
        prompt_adherence: 0.94,
        temporal_consistency: 0.9,
        audio_video_alignment: 0.96,
        overall_passed: true,
      },
      resource_summary: {},
      verification_passed: true,
      created_at: 1720000000,
    };

    service.fetchCreativeManifest('cpipe_100').subscribe((res) => {
      expect(res.pipeline_id).toBe('cpipe_100');
      expect(res.quality_report?.overall_passed).toBe(true);
    });

    const req = httpMock.expectOne('/api/v1/media/creative/pipelines/cpipe_100/manifest');
    expect(req.request.method).toBe('GET');
    req.flush(mockManifest);

    expect(service.activeCreativeManifest()?.manifest_id).toBe('man_100');
  });

  it('should export creative project data via POST /creative/pipelines/export', () => {
    const mockExport = { pipeline_id: 'cpipe_100', export_version: '1.0' };
    service.exportCreativeProject('cpipe_100').subscribe((res) => {
      expect(res.pipeline_id).toBe('cpipe_100');
    });

    const req = httpMock.expectOne('/api/v1/media/creative/pipelines/export?pipeline_id=cpipe_100');
    expect(req.request.method).toBe('POST');
    req.flush(mockExport);
  });

  it('should import creative project data via POST /creative/pipelines/import', () => {
    const mockImport = {
      pipeline_id: 'cpipe_imp_100',
      goal: 'Imported',
      pipeline_type: 'SHORT_PROMOTIONAL_VIDEO' as const,
      version: '1.0.0',
      creative_brief: { title: 'Imported', description: 'Desc', style: 'Style', tone: 'Tone', language: 'en', duration: 10 },
      scenes: [],
      assets: [],
      subtitle_tracks: [],
      outputs: [],
      status: 'READY' as const,
      resource_budget: {},
      storage_budget: {},
      retention_policy: 'FINAL_ONLY' as const,
      render_profile: 'MP4_H264_STANDARD' as const,
      pipeline_hash: 'hash_imp',
      created_at: 1000,
    };

    service.importCreativeProject(mockImport).subscribe((res) => {
      expect(res.pipeline_id).toBe('cpipe_imp_100');
    });

    const req = httpMock.expectOne('/api/v1/media/creative/pipelines/import');
    expect(req.request.method).toBe('POST');
    req.flush(mockImport);

    httpMock.expectOne('/api/v1/media/creative/pipelines').flush([mockImport]);

    expect(service.activeCreativePipeline()?.pipeline_id).toBe('cpipe_imp_100');
  });

  it('should handle creative creation errors gracefully and set creativeErrorMessage', () => {
    const brief = {
      title: 'Bad Video',
      description: 'Invalid',
      style: 'Cyberpunk',
      tone: 'Dynamic',
      language: 'en',
      duration: 10,
    };

    service.createCreativePipeline(brief).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne('/api/v1/media/creative/pipelines');
    req.flush({ detail: 'Invalid parameters' }, { status: 400, statusText: 'Bad Request' });

    expect(service.isCreativeLoading()).toBe(false);
    expect(service.creativeErrorMessage()).toBe('Invalid parameters');
  });

  it('should handle simulation errors and set creativeErrorMessage', () => {
    service.simulateCreativePipeline('cpipe_bad').subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne('/api/v1/media/creative/pipelines/cpipe_bad/simulate');
    req.flush({ detail: 'Resource constraint exceeded' }, { status: 400, statusText: 'Bad Request' });

    expect(service.isCreativeLoading()).toBe(false);
    expect(service.creativeErrorMessage()).toBe('Resource constraint exceeded');
  });

  it('should handle revision errors and set creativeErrorMessage', () => {
    service.reviseCreativePipeline('cpipe_100', { scene_id: 'scn_missing' }).subscribe({
      error: () => {},
    });

    const req = httpMock.expectOne('/api/v1/media/creative/pipelines/cpipe_100/revise');
    req.flush({ detail: 'Scene scn_missing not found in pipeline' }, { status: 404, statusText: 'Not Found' });

    expect(service.isCreativeLoading()).toBe(false);
    expect(service.creativeErrorMessage()).toBe('Scene scn_missing not found in pipeline');
  });

  // ==========================================
  // Phase 8 Stage 8.6 Provenance & Replay Tests
  // ==========================================

  it('should fetch attestations and update attestations signal', () => {
    const mockAttestations = [
      {
        attestation_id: 'att_01',
        operation_id: 'op_01',
        artifact_id: 'art_01',
        operation_type: 'IMAGE_GENERATE',
        model_id: 'sdxl-turbo-local',
        model_digest: 'sha256:1234',
        runtime_name: 'LocalImageDiffusionRuntime',
        runtime_version: '1.0.0',
        adapter_version: '1.0.0',
        device: 'cuda:0',
        compute_runtime: 'torch_cuda',
        provenance_class: 'ACTUAL_MODEL_INFERENCE' as const,
        parameters_hash: 'phash',
        input_hashes: [],
        output_hashes: ['ohash'],
        attestation_hash: 'athash',
        started_at: '2026-09-30T10:00:00Z',
        completed_at: '2026-09-30T10:00:02Z',
      },
    ];

    service.fetchAttestations().subscribe((res) => {
      expect(res.length).toBe(1);
    });

    const req = httpMock.expectOne('/api/v1/media/provenance/attestations');
    expect(req.request.method).toBe('GET');
    req.flush(mockAttestations);

    expect(service.attestations().length).toBe(1);
    expect(service.isProvenanceLoading()).toBe(false);
  });

  it('should fetch single attestation and artifact attestation', () => {
    const mockAtt = {
      attestation_id: 'att_single',
      operation_id: 'op_01',
      artifact_id: 'art_single',
      operation_type: 'VIDEO_GENERATE',
      model_id: 'svd-xt-local',
      model_digest: 'sha256:5678',
      runtime_name: 'LocalVideoDiffusionRuntime',
      runtime_version: '1.0.0',
      adapter_version: '1.0.0',
      device: 'cuda:0',
      compute_runtime: 'torch_cuda',
      provenance_class: 'ACTUAL_MODEL_INFERENCE' as const,
      parameters_hash: 'phash',
      input_hashes: [],
      output_hashes: ['ohash'],
      attestation_hash: 'athash_single',
      started_at: '2026-09-30T10:00:00Z',
      completed_at: '2026-09-30T10:00:05Z',
    };

    service.getAttestation('att_single').subscribe((res) => {
      expect(res.attestation_id).toBe('att_single');
    });
    const req1 = httpMock.expectOne('/api/v1/media/provenance/attestations/att_single');
    expect(req1.request.method).toBe('GET');
    req1.flush(mockAtt);
    expect(service.activeAttestation()?.attestation_id).toBe('att_single');

    service.getArtifactAttestation('art_single').subscribe((res) => {
      expect(res.artifact_id).toBe('art_single');
    });
    const req2 = httpMock.expectOne('/api/v1/media/provenance/artifact/art_single');
    expect(req2.request.method).toBe('GET');
    req2.flush(mockAtt);
    expect(service.activeAttestation()?.artifact_id).toBe('art_single');
  });

  it('should validate media artifact and update lastValidationResult signal', () => {
    const mockValidation = {
      artifact_id: 'art_video_01',
      media_type: 'VIDEO',
      status: 'PASS' as const,
      measured_sha256: 'sha256:vidhash',
      measured_dimensions: [1280, 720] as [number, number],
      measured_duration_seconds: 4.0,
      measured_fps: 24.0,
      checks: [{ check_name: 'FPS_DURATION_MATH', passed: true, detail: 'Exact math match' }],
      validated_at: '2026-09-30T10:00:10Z',
    };

    service.validateMediaArtifact({
      artifact_id: 'art_video_01',
      file_path: 'data/artifacts/video_01.mp4',
      media_type: 'VIDEO',
    }).subscribe((res) => {
      expect(res.status).toBe('PASS');
    });

    const req = httpMock.expectOne('/api/v1/media/provenance/validate');
    expect(req.request.method).toBe('POST');
    req.flush(mockValidation);

    expect(service.lastValidationResult()?.status).toBe('PASS');
    expect(service.isProvenanceLoading()).toBe(false);
  });

  it('should evaluate creative quality and store lastQualityEvidence signal', () => {
    const mockQuality = {
      evaluation_id: 'eval_01',
      project_id: 'proj_01',
      prompt_adherence_status: 'EVALUATED' as const,
      audio_alignment_status: 'EVALUATED' as const,
      visual_coherence_status: 'NOT_EVALUATED' as const,
      temporal_coherence_status: 'NOT_EVALUATED' as const,
      style_consistency_status: 'NOT_EVALUATED' as const,
      prompt_keyword_coverage: 0.9,
      alignment_delta_seconds: 0.15,
      evaluated_at: '2026-09-30T10:00:15Z',
    };

    service.evaluateCreativeQuality({
      project_id: 'proj_01',
      artifact_ids: ['art_01'],
      prompt: 'futuristic ai studio',
    }).subscribe((res) => {
      expect(res.prompt_adherence_status).toBe('EVALUATED');
      expect(res.visual_coherence_status).toBe('NOT_EVALUATED');
    });

    const req = httpMock.expectOne('/api/v1/media/quality/evaluate');
    expect(req.request.method).toBe('POST');
    req.flush(mockQuality);

    expect(service.lastQualityEvidence()?.visual_coherence_status).toBe('NOT_EVALUATED');
  });

  it('should inspect and simulate replay using ReplayEngine endpoints', () => {
    const mockManifest = { pipeline_id: 'pipe_replay' };
    const mockReplay = {
      pipeline_id: 'pipe_replay',
      manifest_hash: 'manhash',
      mode: 'INSPECT' as const,
      can_replay: true,
      reusable_artifact_count: 5,
      regenerate_node_count: 0,
      discrepancies: [],
      inspected_at: '2026-09-30T10:00:20Z',
    };

    service.inspectReplay(mockManifest).subscribe((res) => {
      expect(res.can_replay).toBe(true);
    });
    const req1 = httpMock.expectOne('/api/v1/media/replay/inspect');
    expect(req1.request.method).toBe('POST');
    req1.flush(mockReplay);
    expect(service.lastReplayResult()?.mode).toBe('INSPECT');

    service.simulateReplay(mockManifest).subscribe((res) => {
      expect(res.mode).toBe('SIMULATE');
    });
    const req2 = httpMock.expectOne('/api/v1/media/replay/simulate');
    expect(req2.request.method).toBe('POST');
    req2.flush({ ...mockReplay, mode: 'SIMULATE' as const });
    expect(service.lastReplayResult()?.mode).toBe('SIMULATE');
  });
});
