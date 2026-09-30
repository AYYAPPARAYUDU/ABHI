import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaService } from '../../services/media.service';
import { ImageGenerationFormComponent } from '../../components/image-generation-form/image-generation-form.component';
import { MediaJobQueueComponent } from '../../components/media-job-queue/media-job-queue.component';
import { MediaArtifactGalleryComponent } from '../../components/media-artifact-gallery/media-artifact-gallery.component';
import { MediaModelCatalogComponent } from '../../components/media-model-catalog/media-model-catalog.component';
import { VideoGenerationFormComponent } from '../../components/video-generation-form/video-generation-form.component';
import { VideoJobQueueComponent } from '../../components/video-job-queue/video-job-queue.component';
import { VideoArtifactGalleryComponent } from '../../components/video-artifact-gallery/video-artifact-gallery.component';
import { ImageEditFormComponent } from '../../components/image-edit-form/image-edit-form.component';
import { MaskCanvasEditorComponent } from '../../components/mask-canvas-editor/mask-canvas-editor.component';
import { ImageDiffViewerComponent } from '../../components/image-diff-viewer/image-diff-viewer.component';
import { ArtifactLineageGraphComponent } from '../../components/artifact-lineage-graph/artifact-lineage-graph.component';
import { VisualWorkflowComposerComponent } from '../../components/visual-workflow-composer/visual-workflow-composer.component';
import { WorkflowTemplateCatalogComponent } from '../../components/workflow-template-catalog/workflow-template-catalog.component';
import { WorkflowSimulationPanelComponent } from '../../components/workflow-simulation-panel/workflow-simulation-panel.component';
import { WorkflowManifestViewerComponent } from '../../components/workflow-manifest-viewer/workflow-manifest-viewer.component';
import { CreativePipelineStudioComponent } from '../../components/creative-pipeline-studio/creative-pipeline-studio.component';
import {
  ImageGenerationRequestDTO,
  VideoGenerationRequestDTO,
  ImageEditRequestDTO,
  MediaArtifactDTO,
  MediaWorkflowTemplate,
} from '../../models/media.model';

@Component({
  selector: 'app-media-page',
  standalone: true,
  imports: [
    CommonModule,
    CreativePipelineStudioComponent,
    ImageGenerationFormComponent,
    MediaJobQueueComponent,
    MediaArtifactGalleryComponent,
    MediaModelCatalogComponent,
    VideoGenerationFormComponent,
    VideoJobQueueComponent,
    VideoArtifactGalleryComponent,
    ImageEditFormComponent,
    MaskCanvasEditorComponent,
    ImageDiffViewerComponent,
    ArtifactLineageGraphComponent,
    VisualWorkflowComposerComponent,
    WorkflowTemplateCatalogComponent,
    WorkflowSimulationPanelComponent,
    WorkflowManifestViewerComponent,
  ],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      <!-- Header Banner -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-md">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span class="text-2xl">✨</span> Local Media, Inpainting & Video Studio
            </h1>
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/30">
              Phase 8.5 Active
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-1">
            Multimodal creative pipelines, DAG workflows, non-destructive editing, inpainting, canvas outpainting, diffusion synthesis & lineage tracking
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

      <!-- Studio Navigation Tabs -->
      <div class="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
        <button
          type="button"
          (click)="activeTab.set('creative')"
          [ngClass]="activeTab() === 'creative' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-lg shadow-violet-600/30' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'"
          class="px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2"
        >
          <span>🎬</span> Creative Studio (Phase 8.5)
        </button>
        <button
          type="button"
          (click)="activeTab.set('composer')"
          [ngClass]="activeTab() === 'composer' ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'"
          class="px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2"
        >
          <span>⚡</span> Workflow Composer (Phase 8.4)
        </button>
        <button
          type="button"
          (click)="activeTab.set('edit')"
          [ngClass]="activeTab() === 'edit' ? 'bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'"
          class="px-4 py-2 rounded-xl text-sm transition-all flex items-center gap-2"
        >
          <span>🎨</span> Edit & Inpainting Studio (Phase 8.3)
        </button>
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
          <span>🖼️</span> Image Synthesis (Phase 8.1)
        </button>
      </div>

      <!-- Error Message Banner -->
      <div *ngIf="mediaService.errorMessage() || mediaService.videoErrorMessage() || mediaService.editErrorMessage() || mediaService.creativeErrorMessage()" class="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
        <span>⚠️ {{ mediaService.errorMessage() || mediaService.videoErrorMessage() || mediaService.editErrorMessage() || mediaService.creativeErrorMessage() }}</span>
        <button (click)="clearErrors()" class="text-red-400 hover:text-white">✕</button>
      </div>

      <!-- CREATIVE STUDIO TAB CONTENT (Phase 8.5) -->
      <div *ngIf="activeTab() === 'creative'" class="space-y-6">
        <app-creative-pipeline-studio></app-creative-pipeline-studio>
      </div>

      <!-- WORKFLOW COMPOSER TAB CONTENT (Phase 8.4) -->
      <div *ngIf="activeTab() === 'composer'" class="space-y-6">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Left / Main: Visual Workflow Composer (8 cols) -->
          <div class="lg:col-span-8 space-y-6">
            <app-visual-workflow-composer #workflowComposer></app-visual-workflow-composer>
            <app-workflow-simulation-panel
              [simulation]="mediaService.simulationResult()"
            ></app-workflow-simulation-panel>
          </div>

          <!-- Right Sidebar: Templates Catalog & Manifest Viewer (4 cols) -->
          <div class="lg:col-span-4 space-y-6">
            <app-workflow-template-catalog
              [templates]="mediaService.templates()"
              (templateSelected)="onTemplateSelected($event)"
            ></app-workflow-template-catalog>

            <app-workflow-manifest-viewer
              [manifest]="mediaService.activeManifest()"
            ></app-workflow-manifest-viewer>
          </div>
        </div>
      </div>

      <!-- EDIT & INPAINTING STUDIO TAB CONTENT (Phase 8.3) -->
      <div *ngIf="activeTab() === 'edit'" class="space-y-6">
        <!-- Top Section: Form (Left) & Mask Studio (Right) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Left: Edit Form (5 cols) -->
          <div class="lg:col-span-5 space-y-6">
            <app-image-edit-form
              [sourceArtifact]="selectedSourceArtifact()"
              [editModels]="mediaService.editModels()"
              [maskBase64]="currentMaskBase64()"
              [isLoading]="mediaService.isEditLoading()"
              (editSubmitted)="onEditSubmitted($event)"
            ></app-image-edit-form>

            <app-artifact-lineage-graph
              [selectedArtifact]="selectedSourceArtifact()"
              [lineageRecord]="mediaService.activeLineage()"
            ></app-artifact-lineage-graph>
          </div>

          <!-- Right: Interactive Mask Studio & Diff Viewer (7 cols) -->
          <div class="lg:col-span-7 space-y-6">
            <app-mask-canvas-editor
              [sourceArtifact]="selectedSourceArtifact()"
              (maskApplied)="onMaskApplied($event)"
            ></app-mask-canvas-editor>

            @if (selectedSourceArtifact() && latestEditedArtifact()) {
              <app-image-diff-viewer
                [originalArtifact]="selectedSourceArtifact()"
                [editedArtifact]="latestEditedArtifact()"
                [lineageRecord]="mediaService.activeLineage()"
              ></app-image-diff-viewer>
            }
          </div>
        </div>

        <!-- Bottom: Artifact Gallery to Select Source Image -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-200">
              Source Image Artifacts (Click image to load into Edit Studio)
            </h3>
            <span class="text-xs text-slate-400">
              {{ mediaService.artifacts().length }} Registered Local Artifacts
            </span>
          </div>
          <app-media-artifact-gallery
            [artifacts]="mediaService.artifacts()"
            (delete)="onDeleteImageArtifact($event)"
          ></app-media-artifact-gallery>
        </div>
      </div>

      <!-- VIDEO STUDIO TAB CONTENT (Phase 8.2) -->
      <div *ngIf="activeTab() === 'video'" class="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
  @ViewChild('workflowComposer') workflowComposer?: VisualWorkflowComposerComponent;

  mediaService = inject(MediaService);
  activeTab = signal<'creative' | 'composer' | 'edit' | 'video' | 'image'>('creative');

  selectedSourceArtifact = signal<MediaArtifactDTO | null>(null);
  currentMaskBase64 = signal<string | null>(null);
  latestEditedArtifact = signal<MediaArtifactDTO | null>(null);

  ngOnInit(): void {
    this.mediaService.refreshAll();
    this.mediaService.fetchTemplates().subscribe();

    // Auto-select first artifact as default if available
    const arts = this.mediaService.artifacts();
    if (arts.length > 0) {
      this.selectedSourceArtifact.set(arts[0]);
      this.mediaService.fetchArtifactLineage(arts[0].artifact_id).subscribe();
    }
  }

  onTemplateSelected(template: MediaWorkflowTemplate): void {
    if (this.workflowComposer) {
      this.workflowComposer.loadTemplate(template);
    }
  }

  onSelectArtifactForEdit(art: MediaArtifactDTO): void {
    this.selectedSourceArtifact.set(art);
    this.currentMaskBase64.set(null);
    this.mediaService.fetchArtifactLineage(art.artifact_id).subscribe();
  }

  onMaskApplied(maskBase64: string): void {
    this.currentMaskBase64.set(maskBase64);
  }

  onEditSubmitted(request: ImageEditRequestDTO): void {
    let obs;
    if (request.operation === 'INPAINTING') {
      obs = this.mediaService.inpaintImage(request);
    } else if (request.operation === 'OUTPAINTING') {
      obs = this.mediaService.outpaintImage(request);
    } else {
      obs = this.mediaService.editImage(request);
    }

    obs.subscribe({
      next: (job) => {
        if (job.artifact_id) {
          // Find the newly produced artifact
          setTimeout(() => {
            const arts = this.mediaService.artifacts();
            const child = arts.find((a) => a.artifact_id === job.artifact_id);
            if (child) {
              this.latestEditedArtifact.set(child);
              this.mediaService.fetchArtifactLineage(child.artifact_id).subscribe();
            }
          }, 500);
        }
      },
    });
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
    if (this.selectedSourceArtifact()?.artifact_id === artifactId) {
      this.selectedSourceArtifact.set(null);
      this.latestEditedArtifact.set(null);
    }
  }

  clearErrors(): void {
    this.mediaService.errorMessage.set(null);
    this.mediaService.videoErrorMessage.set(null);
    this.mediaService.editErrorMessage.set(null);
    this.mediaService.workflowErrorMessage.set(null);
    this.mediaService.creativeErrorMessage.set(null);
  }
}

