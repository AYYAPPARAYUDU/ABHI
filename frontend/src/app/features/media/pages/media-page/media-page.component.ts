import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaService } from '../../services/media.service';
import { ImageGenerationFormComponent } from '../../components/image-generation-form/image-generation-form.component';
import { MediaJobQueueComponent } from '../../components/media-job-queue/media-job-queue.component';
import { MediaArtifactGalleryComponent } from '../../components/media-artifact-gallery/media-artifact-gallery.component';
import { MediaModelCatalogComponent } from '../../components/media-model-catalog/media-model-catalog.component';
import { ImageGenerationRequestDTO } from '../../models/media.model';

@Component({
  selector: 'app-media-page',
  standalone: true,
  imports: [
    CommonModule,
    ImageGenerationFormComponent,
    MediaJobQueueComponent,
    MediaArtifactGalleryComponent,
    MediaModelCatalogComponent,
  ],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <!-- Header Banner -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span class="text-2xl">🎨</span> Local Media & Image Runtime
            </h1>
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Phase 8.1 Active
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-1">
            Privacy-first local image synthesis, resource-aware hardware admission, and verified artifact storage
          </p>
        </div>

        <!-- Telemetry & Status Badges -->
        <div class="flex items-center gap-2.5 flex-wrap">
          <div class="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-right">
            <span class="block text-[10px] text-slate-500 uppercase tracking-wider">VRAM Headroom</span>
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

      <!-- Error Message Banner -->
      @if (mediaService.errorMessage()) {
        <div class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
          <span>⚠️ {{ mediaService.errorMessage() }}</span>
          <button (click)="mediaService.errorMessage.set(null)" class="text-red-400 hover:text-white">✕</button>
        </div>
      }

      <!-- Main Layout: 2 Columns on Desktop -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Left: Generation Studio (7 cols) -->
        <div class="lg:col-span-7 space-y-6">
          <app-image-generation-form
            [models]="mediaService.models()"
            [isLoading]="mediaService.isLoading()"
            (generate)="onGenerate($event)"
          ></app-image-generation-form>

          <app-media-artifact-gallery
            [artifacts]="mediaService.artifacts()"
            (delete)="onDeleteArtifact($event)"
          ></app-media-artifact-gallery>
        </div>

        <!-- Right: Queue & Catalog (5 cols) -->
        <div class="lg:col-span-5 space-y-6">
          <app-media-job-queue
            [jobs]="mediaService.jobs()"
            (cancel)="onCancelJob($event)"
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

  ngOnInit(): void {
    this.mediaService.refreshAll();
  }

  onGenerate(request: ImageGenerationRequestDTO): void {
    this.mediaService.generateImage(request).subscribe();
  }

  onCancelJob(jobId: string): void {
    this.mediaService.cancelJob(jobId).subscribe();
  }

  onDeleteArtifact(artifactId: string): void {
    this.mediaService.deleteArtifact(artifactId).subscribe();
  }
}
