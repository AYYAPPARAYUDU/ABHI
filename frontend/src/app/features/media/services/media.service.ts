import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  MediaJobDTO,
  MediaArtifactDTO,
  VideoArtifactDTO,
  ImageModelDefinitionDTO,
  VideoModelDefinitionDTO,
  ImageGenerationRequestDTO,
  VideoGenerationRequestDTO,
  MediaResourceStatusDTO,
  ImageEditModelDefinitionDTO,
  ImageEditRequestDTO,
  MaskArtifactDTO,
  ArtifactLineageRecordDTO,
  MediaWorkflow,
  MediaWorkflowTemplate,
  MediaWorkflowSimulationResult,
  MediaWorkflowManifest,
  MediaCompositionRequestDTO,
  CreativeBrief,
  CreativePipeline,
  CreativePipelineTemplate,
  CreativeProjectManifest,
  CreativeRevisionRequest,
  MediaRuntimeAttestation,
  TechnicalValidationResult,
  CreativeQualityEvidence,
  ReplayInspectionResult,
} from '../models/media.model';

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/media';

  // Core Signals (Workflow Composer Domain - Phase 8 Stage 8.4)
  templates = signal<MediaWorkflowTemplate[]>([]);
  workflows = signal<MediaWorkflow[]>([]);
  activeWorkflow = signal<MediaWorkflow | null>(null);
  simulationResult = signal<MediaWorkflowSimulationResult | null>(null);
  activeManifest = signal<MediaWorkflowManifest | null>(null);
  isWorkflowLoading = signal<boolean>(false);
  workflowErrorMessage = signal<string | null>(null);

  // Core Signals (Image Domain)
  models = signal<ImageModelDefinitionDTO[]>([]);
  jobs = signal<MediaJobDTO[]>([]);
  artifacts = signal<MediaArtifactDTO[]>([]);
  resourceStatus = signal<MediaResourceStatusDTO | null>(null);
  activeJob = signal<MediaJobDTO | null>(null);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // Core Signals (Video Domain - Phase 8 Stage 8.2)
  videoModels = signal<VideoModelDefinitionDTO[]>([]);
  videoJobs = signal<MediaJobDTO[]>([]);
  videoArtifacts = signal<VideoArtifactDTO[]>([]);
  activeVideoJob = signal<MediaJobDTO | null>(null);
  isVideoLoading = signal<boolean>(false);
  videoErrorMessage = signal<string | null>(null);

  // Core Signals (Image Editing Domain - Phase 8 Stage 8.3)
  editModels = signal<ImageEditModelDefinitionDTO[]>([]);
  activeLineage = signal<ArtifactLineageRecordDTO | null>(null);
  artifactMasks = signal<MaskArtifactDTO[]>([]);
  isEditLoading = signal<boolean>(false);
  editErrorMessage = signal<string | null>(null);

  // Core Signals (Creative Pipeline Studio - Phase 8 Stage 8.5)
  creativeTemplates = signal<CreativePipelineTemplate[]>([]);
  creativePipelines = signal<CreativePipeline[]>([]);
  activeCreativePipeline = signal<CreativePipeline | null>(null);
  creativeSimulationResult = signal<MediaWorkflowSimulationResult | null>(null);
  activeCreativeManifest = signal<CreativeProjectManifest | null>(null);
  isCreativeLoading = signal<boolean>(false);
  creativeErrorMessage = signal<string | null>(null);

  // Core Signals (Provenance, Validation & Replay - Phase 8 Stage 8.6)
  attestations = signal<MediaRuntimeAttestation[]>([]);
  activeAttestation = signal<MediaRuntimeAttestation | null>(null);
  lastValidationResult = signal<TechnicalValidationResult | null>(null);
  lastQualityEvidence = signal<CreativeQualityEvidence | null>(null);
  lastReplayResult = signal<ReplayInspectionResult | null>(null);
  isProvenanceLoading = signal<boolean>(false);
  provenanceErrorMessage = signal<string | null>(null);

  // Computed Signals (Creative Studio)
  isCreativeExecuting = computed<boolean>(() => {
    const status = this.activeCreativePipeline()?.status;
    return this.isCreativeLoading() || (status !== undefined && ['PLANNING', 'ASSET_GENERATION', 'SCENE_GENERATION', 'NARRATION', 'COMPOSITION', 'RENDERING', 'VALIDATING'].includes(status));
  });

  // Computed Signals (Workflow Composer)
  isWorkflowExecuting = computed<boolean>(() => {
    return this.isWorkflowLoading() || this.activeWorkflow()?.status === 'RUNNING';
  });

  // Computed Signals (Editing)
  productionEditModels = computed<ImageEditModelDefinitionDTO[]>(() => {
    return this.editModels().filter((m) => m.is_production);
  });

  candidateEditModels = computed<ImageEditModelDefinitionDTO[]>(() => {
    return this.editModels().filter((m) => m.is_candidate);
  });

  // Computed Signals (Image)
  isGenerating = computed<boolean>(() => {
    const aj = this.activeJob();
    return (
      aj !== null &&
      ['QUEUED', 'ADMITTED', 'LOADING_MODEL', 'GENERATING', 'VALIDATING', 'STORING'].includes(
        aj.status
      )
    );
  });

  activeJobsCount = computed<number>(() => {
    return this.jobs().filter((j) =>
      ['QUEUED', 'ADMITTED', 'LOADING_MODEL', 'GENERATING', 'VALIDATING', 'STORING'].includes(
        j.status
      )
    ).length;
  });

  completedJobsCount = computed<number>(() => {
    return this.jobs().filter((j) => j.status === 'COMPLETED').length;
  });

  productionModels = computed<ImageModelDefinitionDTO[]>(() => {
    return this.models().filter((m) => m.is_production);
  });

  candidateModels = computed<ImageModelDefinitionDTO[]>(() => {
    return this.models().filter((m) => m.is_candidate);
  });

  vramFreeMB = computed<number>(() => {
    return Math.round(this.resourceStatus()?.vram_free_mb || 0);
  });

  // Computed Signals (Video)
  isGeneratingVideo = computed<boolean>(() => {
    const vj = this.activeVideoJob();
    return (
      vj !== null &&
      ['QUEUED', 'ADMITTED', 'LOADING_MODEL', 'GENERATING', 'VALIDATING', 'STORING'].includes(
        vj.status
      )
    );
  });

  productionVideoModels = computed<VideoModelDefinitionDTO[]>(() => {
    return this.videoModels().filter((m) => m.is_production);
  });

  candidateVideoModels = computed<VideoModelDefinitionDTO[]>(() => {
    return this.videoModels().filter((m) => m.is_candidate);
  });

  // Image API Methods
  fetchModels(): Observable<ImageModelDefinitionDTO[]> {
    return this.http.get<ImageModelDefinitionDTO[]>(`${this.baseUrl}/models`).pipe(
      tap({
        next: (data) => this.models.set(data),
        error: (err) => this.errorMessage.set(err.message || 'Failed to fetch media models'),
      })
    );
  }

  fetchJobs(): Observable<MediaJobDTO[]> {
    return this.http.get<MediaJobDTO[]>(`${this.baseUrl}/jobs`).pipe(
      tap({
        next: (data) => {
          this.jobs.set(data);
          if (data.length > 0 && (!this.activeJob() || this.activeJob()?.status !== 'GENERATING')) {
            this.activeJob.set(data[0]);
          }
        },
        error: (err) => this.errorMessage.set(err.message || 'Failed to fetch media jobs'),
      })
    );
  }

  fetchArtifacts(): Observable<MediaArtifactDTO[]> {
    return this.http.get<MediaArtifactDTO[]>(`${this.baseUrl}/artifacts`).pipe(
      tap({
        next: (data) => this.artifacts.set(data),
        error: (err) => this.errorMessage.set(err.message || 'Failed to fetch media artifacts'),
      })
    );
  }

  fetchResourceStatus(): Observable<MediaResourceStatusDTO> {
    return this.http.get<MediaResourceStatusDTO>(`${this.baseUrl}/resources`).pipe(
      tap({
        next: (data) => this.resourceStatus.set(data),
        error: (err) => this.errorMessage.set(err.message || 'Failed to fetch media resources'),
      })
    );
  }

  generateImage(request: ImageGenerationRequestDTO): Observable<MediaJobDTO> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    return this.http.post<MediaJobDTO>(`${this.baseUrl}/image/generate`, request).pipe(
      tap({
        next: (job) => {
          this.activeJob.set(job);
          this.isLoading.set(false);
          this.refreshAll();
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.detail || err.message || 'Image generation failed');
        },
      })
    );
  }

  // Image Edit API Methods (Phase 8 Stage 8.3)
  fetchEditModels(): Observable<ImageEditModelDefinitionDTO[]> {
    return this.http.get<ImageEditModelDefinitionDTO[]>(`${this.baseUrl}/edit/models`).pipe(
      tap({
        next: (data) => this.editModels.set(data),
        error: (err) => this.editErrorMessage.set(err.message || 'Failed to fetch image edit models'),
      })
    );
  }

  editImage(request: ImageEditRequestDTO): Observable<MediaJobDTO> {
    this.isEditLoading.set(true);
    this.editErrorMessage.set(null);
    return this.http.post<MediaJobDTO>(`${this.baseUrl}/image/edit`, request).pipe(
      tap({
        next: (job) => {
          this.activeJob.set(job);
          this.isEditLoading.set(false);
          this.refreshAll();
        },
        error: (err) => {
          this.isEditLoading.set(false);
          this.editErrorMessage.set(err.error?.detail || err.message || 'Image editing failed');
        },
      })
    );
  }

  inpaintImage(request: ImageEditRequestDTO): Observable<MediaJobDTO> {
    this.isEditLoading.set(true);
    this.editErrorMessage.set(null);
    return this.http.post<MediaJobDTO>(`${this.baseUrl}/image/inpaint`, request).pipe(
      tap({
        next: (job) => {
          this.activeJob.set(job);
          this.isEditLoading.set(false);
          this.refreshAll();
        },
        error: (err) => {
          this.isEditLoading.set(false);
          this.editErrorMessage.set(err.error?.detail || err.message || 'Image inpainting failed');
        },
      })
    );
  }

  outpaintImage(request: ImageEditRequestDTO): Observable<MediaJobDTO> {
    this.isEditLoading.set(true);
    this.editErrorMessage.set(null);
    return this.http.post<MediaJobDTO>(`${this.baseUrl}/image/outpaint`, request).pipe(
      tap({
        next: (job) => {
          this.activeJob.set(job);
          this.isEditLoading.set(false);
          this.refreshAll();
        },
        error: (err) => {
          this.isEditLoading.set(false);
          this.editErrorMessage.set(err.error?.detail || err.message || 'Image outpainting failed');
        },
      })
    );
  }

  uploadMask(data: { source_artifact_id: string; mask_base64: string; mask_semantics?: string }): Observable<MaskArtifactDTO> {
    return this.http.post<MaskArtifactDTO>(`${this.baseUrl}/image/mask`, data).pipe(
      tap({
        next: (mask) => {
          this.artifactMasks.update((masks) => [mask, ...masks]);
        },
      })
    );
  }

  fetchArtifactLineage(artifactId: string): Observable<ArtifactLineageRecordDTO> {
    return this.http.get<ArtifactLineageRecordDTO>(`${this.baseUrl}/artifacts/${artifactId}/lineage`).pipe(
      tap({
        next: (lineage) => this.activeLineage.set(lineage),
        error: () => this.activeLineage.set(null),
      })
    );
  }

  fetchArtifactMasks(artifactId: string): Observable<MaskArtifactDTO[]> {
    return this.http.get<MaskArtifactDTO[]>(`${this.baseUrl}/artifacts/${artifactId}/masks`).pipe(
      tap({
        next: (masks) => this.artifactMasks.set(masks),
      })
    );
  }

  cancelJob(jobId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/jobs/${jobId}/cancel`, {}).pipe(
      tap(() => {
        this.refreshAll();
      })
    );
  }

  deleteArtifact(artifactId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/artifacts/${artifactId}`).pipe(
      tap(() => {
        this.fetchArtifacts().subscribe();
      })
    );
  }

  // Video API Methods (Phase 8 Stage 8.2)
  fetchVideoModels(): Observable<VideoModelDefinitionDTO[]> {
    return this.http.get<VideoModelDefinitionDTO[]>(`${this.baseUrl}/video/models`).pipe(
      tap({
        next: (data) => this.videoModels.set(data),
        error: (err) => this.videoErrorMessage.set(err.message || 'Failed to fetch video models'),
      })
    );
  }

  fetchVideoJobs(): Observable<MediaJobDTO[]> {
    return this.http.get<MediaJobDTO[]>(`${this.baseUrl}/video/jobs`).pipe(
      tap({
        next: (data) => {
          this.videoJobs.set(data);
          if (data.length > 0 && (!this.activeVideoJob() || this.activeVideoJob()?.status !== 'GENERATING')) {
            this.activeVideoJob.set(data[0]);
          }
        },
        error: (err) => this.videoErrorMessage.set(err.message || 'Failed to fetch video jobs'),
      })
    );
  }

  fetchVideoArtifacts(): Observable<VideoArtifactDTO[]> {
    return this.http.get<VideoArtifactDTO[]>(`${this.baseUrl}/video/artifacts`).pipe(
      tap({
        next: (data) => this.videoArtifacts.set(data),
        error: (err) => this.videoErrorMessage.set(err.message || 'Failed to fetch video artifacts'),
      })
    );
  }

  generateVideo(request: VideoGenerationRequestDTO): Observable<MediaJobDTO> {
    this.isVideoLoading.set(true);
    this.videoErrorMessage.set(null);
    return this.http.post<MediaJobDTO>(`${this.baseUrl}/video/generate`, request).pipe(
      tap({
        next: (job) => {
          this.activeVideoJob.set(job);
          this.isVideoLoading.set(false);
          this.refreshAll();
        },
        error: (err) => {
          this.isVideoLoading.set(false);
          this.videoErrorMessage.set(err.error?.detail || err.message || 'Video generation failed');
        },
      })
    );
  }

  cancelVideoJob(jobId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/video/jobs/${jobId}/cancel`, {}).pipe(
      tap(() => {
        this.refreshAll();
      })
    );
  }

  deleteVideoArtifact(artifactId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/video/artifacts/${artifactId}`).pipe(
      tap(() => {
        this.fetchVideoArtifacts().subscribe();
      })
    );
  }

  // Workflow Composer API Methods (Phase 8 Stage 8.4)
  fetchTemplates(): Observable<MediaWorkflowTemplate[]> {
    return this.http.get<MediaWorkflowTemplate[]>(`${this.baseUrl}/workflows/templates`).pipe(
      tap({
        next: (data) => this.templates.set(data),
        error: (err) => this.workflowErrorMessage.set(err.message || 'Failed to fetch workflow templates'),
      })
    );
  }

  fetchTemplate(templateId: string): Observable<MediaWorkflowTemplate> {
    return this.http.get<MediaWorkflowTemplate>(`${this.baseUrl}/workflows/templates/${templateId}`);
  }

  simulateWorkflow(workflow: MediaWorkflow): Observable<MediaWorkflowSimulationResult> {
    this.isWorkflowLoading.set(true);
    this.workflowErrorMessage.set(null);
    return this.http.post<MediaWorkflowSimulationResult>(`${this.baseUrl}/workflows/simulate`, workflow).pipe(
      tap({
        next: (res) => {
          this.simulationResult.set(res);
          this.isWorkflowLoading.set(false);
        },
        error: (err) => {
          this.isWorkflowLoading.set(false);
          this.workflowErrorMessage.set(err.error?.detail || err.message || 'Workflow simulation failed');
        },
      })
    );
  }

  executeWorkflow(workflow: MediaWorkflow): Observable<MediaWorkflow> {
    this.isWorkflowLoading.set(true);
    this.workflowErrorMessage.set(null);
    return this.http.post<MediaWorkflow>(`${this.baseUrl}/workflows/execute`, workflow).pipe(
      tap({
        next: (wf) => {
          this.activeWorkflow.set(wf);
          this.isWorkflowLoading.set(false);
          this.fetchWorkflows().subscribe();
          this.fetchArtifacts().subscribe();
          this.fetchVideoArtifacts().subscribe();
        },
        error: (err) => {
          this.isWorkflowLoading.set(false);
          this.workflowErrorMessage.set(err.error?.detail || err.message || 'Workflow execution failed');
        },
      })
    );
  }

  fetchWorkflows(): Observable<MediaWorkflow[]> {
    return this.http.get<MediaWorkflow[]>(`${this.baseUrl}/workflows`).pipe(
      tap({
        next: (wfs) => this.workflows.set(wfs),
        error: (err) => this.workflowErrorMessage.set(err.message || 'Failed to fetch workflows'),
      })
    );
  }

  fetchWorkflow(workflowId: string): Observable<MediaWorkflow> {
    return this.http.get<MediaWorkflow>(`${this.baseUrl}/workflows/${workflowId}`).pipe(
      tap({
        next: (wf) => this.activeWorkflow.set(wf),
        error: (err) => this.workflowErrorMessage.set(err.message || 'Failed to fetch workflow'),
      })
    );
  }

  cancelWorkflow(workflowId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/workflows/${workflowId}/cancel`, {}).pipe(
      tap(() => {
        this.fetchWorkflow(workflowId).subscribe();
        this.fetchWorkflows().subscribe();
      })
    );
  }

  resumeWorkflow(workflowId: string): Observable<MediaWorkflow> {
    this.isWorkflowLoading.set(true);
    return this.http.post<MediaWorkflow>(`${this.baseUrl}/workflows/${workflowId}/resume`, {}).pipe(
      tap({
        next: (wf) => {
          this.activeWorkflow.set(wf);
          this.isWorkflowLoading.set(false);
          this.fetchWorkflows().subscribe();
        },
        error: (err) => {
          this.isWorkflowLoading.set(false);
          this.workflowErrorMessage.set(err.error?.detail || err.message || 'Workflow recovery failed');
        },
      })
    );
  }

  fetchManifest(workflowId: string): Observable<MediaWorkflowManifest> {
    return this.http.get<MediaWorkflowManifest>(`${this.baseUrl}/workflows/${workflowId}/manifest`).pipe(
      tap({
        next: (m) => this.activeManifest.set(m),
        error: (err) => this.workflowErrorMessage.set(err.message || 'Failed to fetch manifest'),
      })
    );
  }

  exportWorkflow(workflow: MediaWorkflow): Observable<any> {
    return this.http.post(`${this.baseUrl}/workflows/export`, workflow);
  }

  importWorkflow(workflowData: any): Observable<MediaWorkflow> {
    return this.http.post<MediaWorkflow>(`${this.baseUrl}/workflows/import`, workflowData).pipe(
      tap({
        next: (wf) => this.activeWorkflow.set(wf),
      })
    );
  }

  composeMedia(request: MediaCompositionRequestDTO): Observable<VideoArtifactDTO> {
    return this.http.post<VideoArtifactDTO>(`${this.baseUrl}/composition/execute`, request);
  }

  // ==========================================
  // Creative Pipeline Methods (Phase 8 Stage 8.5)
  // ==========================================

  fetchCreativeTemplates(): Observable<CreativePipelineTemplate[]> {
    return this.http.get<CreativePipelineTemplate[]>(`${this.baseUrl}/creative/templates`).pipe(
      tap({
        next: (t) => this.creativeTemplates.set(t),
        error: (err) => this.creativeErrorMessage.set(err.message || 'Failed to fetch creative templates'),
      })
    );
  }

  fetchCreativePipelines(): Observable<CreativePipeline[]> {
    this.isCreativeLoading.set(true);
    return this.http.get<CreativePipeline[]>(`${this.baseUrl}/creative/pipelines`).pipe(
      tap({
        next: (p) => {
          this.creativePipelines.set(p);
          this.isCreativeLoading.set(false);
        },
        error: (err) => {
          this.isCreativeLoading.set(false);
          this.creativeErrorMessage.set(err.message || 'Failed to fetch creative pipelines');
        },
      })
    );
  }

  createCreativePipeline(
    brief: CreativeBrief,
    templateId?: string,
    retentionPolicy = 'FINAL_ONLY',
    renderProfile = 'MP4_H264_STANDARD'
  ): Observable<CreativePipeline> {
    this.isCreativeLoading.set(true);
    this.creativeErrorMessage.set(null);
    const payload = {
      creative_brief: brief,
      template_id: templateId,
      retention_policy: retentionPolicy,
      render_profile: renderProfile,
    };
    return this.http.post<CreativePipeline>(`${this.baseUrl}/creative/pipelines`, payload).pipe(
      tap({
        next: (p) => {
          this.activeCreativePipeline.set(p);
          this.isCreativeLoading.set(false);
          this.fetchCreativePipelines().subscribe();
        },
        error: (err) => {
          this.isCreativeLoading.set(false);
          this.creativeErrorMessage.set(err.error?.detail || err.message || 'Failed to create creative pipeline');
        },
      })
    );
  }

  getCreativePipeline(pipelineId: string): Observable<CreativePipeline> {
    return this.http.get<CreativePipeline>(`${this.baseUrl}/creative/pipelines/${pipelineId}`).pipe(
      tap({
        next: (p) => this.activeCreativePipeline.set(p),
        error: (err) => this.creativeErrorMessage.set(err.message || 'Failed to get pipeline'),
      })
    );
  }

  simulateCreativePipeline(pipelineId: string): Observable<MediaWorkflowSimulationResult> {
    this.isCreativeLoading.set(true);
    return this.http.post<MediaWorkflowSimulationResult>(`${this.baseUrl}/creative/pipelines/${pipelineId}/simulate`, {}).pipe(
      tap({
        next: (res) => {
          this.creativeSimulationResult.set(res);
          this.isCreativeLoading.set(false);
        },
        error: (err) => {
          this.isCreativeLoading.set(false);
          this.creativeErrorMessage.set(err.error?.detail || err.message || 'Simulation failed');
        },
      })
    );
  }

  executeCreativePipeline(pipelineId: string): Observable<CreativePipeline> {
    this.isCreativeLoading.set(true);
    this.creativeErrorMessage.set(null);
    return this.http.post<CreativePipeline>(`${this.baseUrl}/creative/pipelines/${pipelineId}/execute`, {}).pipe(
      tap({
        next: (p) => {
          this.activeCreativePipeline.set(p);
          this.isCreativeLoading.set(false);
          this.fetchCreativePipelines().subscribe();
        },
        error: (err) => {
          this.isCreativeLoading.set(false);
          this.creativeErrorMessage.set(err.error?.detail || err.message || 'Pipeline execution failed');
        },
      })
    );
  }

  reviseCreativePipeline(pipelineId: string, revision: CreativeRevisionRequest): Observable<CreativePipeline> {
    this.isCreativeLoading.set(true);
    this.creativeErrorMessage.set(null);
    return this.http.post<CreativePipeline>(`${this.baseUrl}/creative/pipelines/${pipelineId}/revise`, revision).pipe(
      tap({
        next: (p) => {
          this.activeCreativePipeline.set(p);
          this.isCreativeLoading.set(false);
          this.fetchCreativePipelines().subscribe();
        },
        error: (err) => {
          this.isCreativeLoading.set(false);
          this.creativeErrorMessage.set(err.error?.detail || err.message || 'Pipeline revision failed');
        },
      })
    );
  }

  cancelCreativePipeline(pipelineId: string): Observable<CreativePipeline> {
    return this.http.post<CreativePipeline>(`${this.baseUrl}/creative/pipelines/${pipelineId}/cancel`, {}).pipe(
      tap({
        next: (p) => {
          this.activeCreativePipeline.set(p);
          this.fetchCreativePipelines().subscribe();
        },
        error: (err) => this.creativeErrorMessage.set(err.message || 'Failed to cancel pipeline'),
      })
    );
  }

  fetchCreativeManifest(pipelineId: string): Observable<CreativeProjectManifest> {
    return this.http.get<CreativeProjectManifest>(`${this.baseUrl}/creative/pipelines/${pipelineId}/manifest`).pipe(
      tap({
        next: (m) => this.activeCreativeManifest.set(m),
        error: (err) => this.creativeErrorMessage.set(err.message || 'Failed to fetch creative manifest'),
      })
    );
  }

  exportCreativeProject(pipelineId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/creative/pipelines/export`, null, { params: { pipeline_id: pipelineId } });
  }

  importCreativeProject(projectData: any): Observable<CreativePipeline> {
    return this.http.post<CreativePipeline>(`${this.baseUrl}/creative/pipelines/import`, projectData).pipe(
      tap({
        next: (p) => {
          this.activeCreativePipeline.set(p);
          this.fetchCreativePipelines().subscribe();
        },
      })
    );
  }

  // ==========================================
  // Provenance, Validation & Replay Methods (Phase 8 Stage 8.6)
  // ==========================================

  fetchAttestations(): Observable<MediaRuntimeAttestation[]> {
    this.isProvenanceLoading.set(true);
    return this.http.get<MediaRuntimeAttestation[]>(`${this.baseUrl}/provenance/attestations`).pipe(
      tap({
        next: (data) => {
          this.attestations.set(data);
          this.isProvenanceLoading.set(false);
        },
        error: (err) => {
          this.isProvenanceLoading.set(false);
          this.provenanceErrorMessage.set(err.message || 'Failed to fetch attestations');
        },
      })
    );
  }

  getAttestation(attestationId: string): Observable<MediaRuntimeAttestation> {
    return this.http.get<MediaRuntimeAttestation>(`${this.baseUrl}/provenance/attestations/${attestationId}`).pipe(
      tap({
        next: (att) => this.activeAttestation.set(att),
      })
    );
  }

  getArtifactAttestation(artifactId: string): Observable<MediaRuntimeAttestation> {
    return this.http.get<MediaRuntimeAttestation>(`${this.baseUrl}/provenance/artifact/${artifactId}`).pipe(
      tap({
        next: (att) => this.activeAttestation.set(att),
      })
    );
  }

  createRuntimeAttestation(payload: any): Observable<MediaRuntimeAttestation> {
    this.isProvenanceLoading.set(true);
    return this.http.post<MediaRuntimeAttestation>(`${this.baseUrl}/provenance/attestations`, payload).pipe(
      tap({
        next: (att) => {
          this.activeAttestation.set(att);
          this.attestations.update((list) => [att, ...list]);
          this.isProvenanceLoading.set(false);
        },
        error: (err) => {
          this.isProvenanceLoading.set(false);
          this.provenanceErrorMessage.set(err.error?.detail || err.message || 'Failed to record attestation');
        },
      })
    );
  }

  validateMediaArtifact(payload: {
    artifact_id: string;
    file_path: string;
    media_type: string;
    expected_hash?: string;
    expected_dimensions?: [number, number];
    expected_fps?: number;
    expected_duration?: number;
  }): Observable<TechnicalValidationResult> {
    this.isProvenanceLoading.set(true);
    return this.http.post<TechnicalValidationResult>(`${this.baseUrl}/provenance/validate`, payload).pipe(
      tap({
        next: (res) => {
          this.lastValidationResult.set(res);
          this.isProvenanceLoading.set(false);
        },
        error: (err) => {
          this.isProvenanceLoading.set(false);
          this.provenanceErrorMessage.set(err.error?.detail || err.message || 'Technical validation failed');
        },
      })
    );
  }

  evaluateCreativeQuality(payload: {
    project_id: string;
    artifact_ids: string[];
    script_text?: string;
    prompt?: string;
    video_duration?: number;
    audio_duration?: number;
    subtitle_segments?: any[];
  }): Observable<CreativeQualityEvidence> {
    this.isProvenanceLoading.set(true);
    return this.http.post<CreativeQualityEvidence>(`${this.baseUrl}/quality/evaluate`, payload).pipe(
      tap({
        next: (res) => {
          this.lastQualityEvidence.set(res);
          this.isProvenanceLoading.set(false);
        },
        error: (err) => {
          this.isProvenanceLoading.set(false);
          this.provenanceErrorMessage.set(err.error?.detail || err.message || 'Creative quality evaluation failed');
        },
      })
    );
  }

  inspectReplay(manifest: any): Observable<ReplayInspectionResult> {
    this.isProvenanceLoading.set(true);
    return this.http.post<ReplayInspectionResult>(`${this.baseUrl}/replay/inspect`, manifest).pipe(
      tap({
        next: (res) => {
          this.lastReplayResult.set(res);
          this.isProvenanceLoading.set(false);
        },
        error: (err) => {
          this.isProvenanceLoading.set(false);
          this.provenanceErrorMessage.set(err.error?.detail || err.message || 'Replay inspection failed');
        },
      })
    );
  }

  simulateReplay(manifest: any): Observable<ReplayInspectionResult> {
    this.isProvenanceLoading.set(true);
    return this.http.post<ReplayInspectionResult>(`${this.baseUrl}/replay/simulate`, manifest).pipe(
      tap({
        next: (res) => {
          this.lastReplayResult.set(res);
          this.isProvenanceLoading.set(false);
        },
        error: (err) => {
          this.isProvenanceLoading.set(false);
          this.provenanceErrorMessage.set(err.error?.detail || err.message || 'Replay simulation failed');
        },
      })
    );
  }

  executeReplay(manifest: any): Observable<any> {
    this.isProvenanceLoading.set(true);
    return this.http.post<any>(`${this.baseUrl}/replay/execute`, manifest).pipe(
      tap({
        next: () => {
          this.isProvenanceLoading.set(false);
          this.refreshAll();
        },
        error: (err) => {
          this.isProvenanceLoading.set(false);
          this.provenanceErrorMessage.set(err.error?.detail || err.message || 'Replay execution failed');
        },
      })
    );
  }

  refreshAll(): void {
    this.fetchModels().subscribe();
    this.fetchEditModels().subscribe();
    this.fetchJobs().subscribe();
    this.fetchArtifacts().subscribe();
    this.fetchResourceStatus().subscribe();
    this.fetchVideoModels().subscribe();
    this.fetchVideoJobs().subscribe();
    this.fetchVideoArtifacts().subscribe();
    this.fetchTemplates().subscribe();
    this.fetchWorkflows().subscribe();
    this.fetchCreativeTemplates().subscribe();
    this.fetchCreativePipelines().subscribe();
    this.fetchAttestations().subscribe();
  }
}


