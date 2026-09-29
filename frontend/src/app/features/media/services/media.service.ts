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
} from '../models/media.model';

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/media';

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

  refreshAll(): void {
    this.fetchModels().subscribe();
    this.fetchJobs().subscribe();
    this.fetchArtifacts().subscribe();
    this.fetchResourceStatus().subscribe();
    this.fetchVideoModels().subscribe();
    this.fetchVideoJobs().subscribe();
    this.fetchVideoArtifacts().subscribe();
  }
}
