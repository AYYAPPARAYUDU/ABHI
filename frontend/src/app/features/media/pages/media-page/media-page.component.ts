import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaService } from '../../services/media.service';
import { ImageGenerationFormComponent } from '../../components/image-generation-form/image-generation-form.component';
import { MediaJobQueueComponent } from '../../components/media-job-queue/media-job-queue.component';
import { MediaArtifactGalleryComponent } from '../../components/media-artifact-gallery/media-artifact-gallery.component';
import { MediaModelCatalogComponent } from '../../components/media-model-catalog/media-model-catalog.component';
import { VideoGenerationFormComponent } from '../../components/video-generation-form/video-generation-form.component';
import { VideoJobQueueComponent } from '../../components/video-job-queue/video-job-queue.component';
import { VideoArtifactGalleryComponent } from '../../components/video-artifact-gallery/video-artifact-gallery.component';
import { ImageGenerationRequestDTO, VideoGenerationRequestDTO } from '../../models/media.model';

@Component({
  selector: 'app-media-page',
  standalone: true,
  imports: [
    CommonModule,
    ImageGenerationFormComponent,
    MediaJobQueueComponent,
    MediaArtifactGalleryComponent,
    MediaModelCatalogComponent,
    VideoGenerationFormComponent,
    VideoJobQueueComponent,
    VideoArtifactGalleryComponent,
  ],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <!-- Header Banner -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span class="text-2xl">🎬</span> Local Media & Video Generation Studio
            </h1>
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Phase 8.2 Active
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-1">
            Local image synthesis, temporal video diffusion, chunked VRAM budgeting, and verified artifact storage
          </p>
        </div>

        <!-- Telemetry & Status Badges -->
        <div class="flex items-center gap-2.5 flex-wrap">
          <div class="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-right">
            <span class="block text-[10px] text-slate-500 uppercase tracking-wider">VRAM Usable Headroom</span>
            <span class="text-xs font-mono font-semibold text-cyan-400">
              {{ mediaService.vramFreeMB() }} MB Free
            </span>
          </div>

          <div class="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-right">
            <span class="block text-[10px] text-slate-500 uppercase tracking-wider">Active Jobs</span>
            <span class="text-xs font-mono font-semibold text-indigo-400">
              {{ mediaService.activeJobsCount() }} Active
            </span>
          </div>

          <button
            type="button"
            (click)="mediaService.refreshAll()"
            class="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/50"
            title="Refresh Media State"
          >
            🔄
          </button>
        </div>
      </div>

      <!-- Studio Navigation Tabs -->
      <div class="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          (click)="activeTab.set('video')"
          [ngClass]="activeTab() === 'video' ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'"
          class="px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2"
        >
          <span>🎥</span> Video Studio (Phase 8.2)
        </button>
        <button
          type="button"
          (click)="activeTab.set('image')"
          [ngClass]="activeTab() === 'image' ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'"
          class="px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2"
        >
          <span>🖼️</span> Image Studio (Phase 8.1)
        </button>
      </div>

      <!-- Error Message Banner -->
      <div *ngIf="mediaService.errorMessage() || mediaService.videoErrorMessage()" class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
        <span>⚠️ {{ mediaService.errorMessage() || mediaService.videoErrorMessage() }}</span>
        <button (click)="clearErrors()" class="text-red-400 hover:text-white">✕</button>
      </div>

      <!-- VIDEO STUDIO TAB CONTENT (Phase 8.2) -->
      <div *ngIf="activeTab() === 'video'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Left: Video Generation Form (7 cols) -->
        <div class="lg:col-span-7 space-y-6">
          <app-video-generation-form
            [models]="mediaService.videoModels()"
            [isGenerating]="mediaService.isVideoLoading()"
            (generate)="onGenerateVideo($event)"
          ></app-video-generation-form>

          <app-video-artifact-gallery
            [artifacts]="mediaService.videoArtifacts()"
            (delete)="onDeleteVideoArtifact($event)"
          ></app-video-artifact-gallery>
        </div>

        <!-- Right: Video Queue & Models (5 cols) -->
        <div class="lg:col-span-5 space-y-6">
          <app-video-job-queue
            [jobs]="mediaService.videoJobs()"
            [activeJob]="mediaService.activeVideoJob()"
            (cancel)="onCancelVideoJob($event)"
          ></app-video-job-queue>
        </div>
      </div>

      <!-- IMAGE STUDIO TAB CONTENT (Phase 8.1) -->
      <div *ngIf="activeTab() === 'image'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Left: Image Generation Form (7 cols) -->
        <div class="lg:col-span-7 space-y-6">
          <app-image-generation-form
            [models]="mediaService.models()"
            [isLoading]="mediaService.isLoading()"
            (generate)="onGenerateImage($event)"
          ></app-image-generation-form>

          <app-media-artifact-gallery
            [artifacts]="mediaService.artifacts()"
            (delete)="onDeleteImageArtifact($event)"
          ></app-media-artifact-gallery>
        </div>

        <!-- Right: Queue & Catalog (5 cols) -->
        <div class="lg:col-span-5 space-y-6">
          <app-media-job-queue
            [jobs]="mediaService.jobs()"
            (cancel)="onCancelImageJob($event)"
          ></app-media-job-queue>

          <app-media-model-catalog
            [models]="mediaService.models()"
          ></app-media-model-catalog>
        </div>
      </div>
    </div>
  `,
})
export class MediaPageComponent implements OnInit {
  mediaService = inject(MediaService);
  activeTab = signal<'video' | 'image'>('video');

  ngOnInit(): void {
    this.mediaService.refreshAll();
  }

  onGenerateVideo(request: VideoGenerationRequestDTO): void {
    this.mediaService.generateVideo(request).subscribe();
  }

  onCancelVideoJob(jobId: string): void {
    this.mediaService.cancelVideoJob(jobId).subscribe();
  }

  onDeleteVideoArtifact(artifactId: string): void {
    this.mediaService.deleteVideoArtifact(artifactId).subscribe();
  }

  onGenerateImage(request: ImageGenerationRequestDTO): void {
    this.mediaService.generateImage(request).subscribe();
  }

  onCancelImageJob(jobId: string): void {
    this.mediaService.cancelJob(jobId).subscribe();
  }

  onDeleteImageArtifact(artifactId: string): void {
    this.mediaService.deleteArtifact(artifactId).subscribe();
  }

  clearErrors(): void {
    this.mediaService.errorMessage.set(null);
    this.mediaService.videoErrorMessage.set(null);
  }
}
