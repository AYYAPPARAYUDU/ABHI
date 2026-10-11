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
import { MediaProvenanceInspectorComponent } from '../../components/media-provenance-inspector/media-provenance-inspector.component';
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
    MediaProvenanceInspectorComponent,
  ],
  template: `
    <div class="abhi-media-workspace" role="region" aria-label="Media & Vision Studio">
      <!-- Header Banner -->
      <header class="media-header-card">
        <div class="media-title-group">
          <div class="media-title-row">
            <h1 class="media-title">
              <span class="title-sparkle">✨</span> Local Media, Inpainting & Video Studio
            </h1>
            <span class="media-stage-badge">
              Phase 8.6 Hardened
            </span>
          </div>
          <p class="media-subtitle">
            Multimodal creative pipelines, DAG workflows, non-destructive editing, inpainting, canvas outpainting, diffusion synthesis & lineage tracking
          </p>
        </div>

        <!-- Telemetry & Status Badges -->
        <div class="media-telemetry-row">
          <div class="media-metric-well">
            <span class="metric-label">VRAM HEADROOM</span>
            <span class="metric-value cyan-val">
              {{ mediaService.vramFreeMB() }} MB Free
            </span>
          </div>

          <div class="media-metric-well">
            <span class="metric-label">ACTIVE JOBS</span>
            <span class="metric-value blue-val">
              {{ mediaService.activeJobsCount() }} Active
            </span>
          </div>

          <button
            type="button"
            (click)="mediaService.refreshAll()"
            class="media-refresh-btn"
            title="Refresh Media State"
          >
            🔄
          </button>
        </div>
      </header>

      <!-- Studio Navigation Tabs (Neumorphic Ribbon) -->
      <nav class="media-tabs-ribbon" role="tablist" aria-label="Media Studio Sub-routes">
        <button
          type="button"
          role="tab"
          (click)="activeTab.set('provenance')"
          [class.active]="activeTab() === 'provenance'"
          class="media-tab-btn"
        >
          <span>🛡️</span> Provenance & Replay
        </button>
        <button
          type="button"
          role="tab"
          (click)="activeTab.set('creative')"
          [class.active]="activeTab() === 'creative'"
          class="media-tab-btn"
        >
          <span>🎬</span> Creative Studio
        </button>
        <button
          type="button"
          role="tab"
          (click)="activeTab.set('composer')"
          [class.active]="activeTab() === 'composer'"
          class="media-tab-btn"
        >
          <span>⚡</span> Workflow Composer
        </button>
        <button
          type="button"
          role="tab"
          (click)="activeTab.set('edit')"
          [class.active]="activeTab() === 'edit'"
          class="media-tab-btn"
        >
          <span>🎨</span> Edit & Inpainting
        </button>
        <button
          type="button"
          role="tab"
          (click)="activeTab.set('video')"
          [class.active]="activeTab() === 'video'"
          class="media-tab-btn"
        >
          <span>🎥</span> Video Studio
        </button>
        <button
          type="button"
          role="tab"
          (click)="activeTab.set('image')"
          [class.active]="activeTab() === 'image'"
          class="media-tab-btn"
        >
          <span>🖼️</span> Image Synthesis
        </button>
      </nav>

      <!-- Error Message Banner -->
      @if (mediaService.errorMessage() || mediaService.videoErrorMessage() || mediaService.editErrorMessage() || mediaService.creativeErrorMessage() || mediaService.provenanceErrorMessage()) {
        <div class="media-error-alert" role="alert">
          <span>⚠️ {{ mediaService.errorMessage() || mediaService.videoErrorMessage() || mediaService.editErrorMessage() || mediaService.creativeErrorMessage() || mediaService.provenanceErrorMessage() }}</span>
          <button type="button" (click)="clearErrors()" class="error-dismiss-btn">✕</button>
        </div>
      }

      <!-- PROVENANCE & REPLAY TAB CONTENT (Phase 8.6) -->
      @if (activeTab() === 'provenance') {
        <div class="tab-pane-container">
          <app-media-provenance-inspector></app-media-provenance-inspector>
        </div>
      }

      <!-- CREATIVE STUDIO TAB CONTENT (Phase 8.5) -->
      @if (activeTab() === 'creative') {
        <div class="tab-pane-container">
          <app-creative-pipeline-studio></app-creative-pipeline-studio>
        </div>
      }

      <!-- WORKFLOW COMPOSER TAB CONTENT (Phase 8.4) -->
      @if (activeTab() === 'composer') {
        <div class="tab-pane-container composer-grid">
          <div class="composer-main-col">
            <app-visual-workflow-composer #workflowComposer></app-visual-workflow-composer>
            <app-workflow-simulation-panel
              [simulation]="mediaService.simulationResult()"
            ></app-workflow-simulation-panel>
          </div>

          <div class="composer-side-col">
            <app-workflow-template-catalog
              [templates]="mediaService.templates()"
              (templateSelected)="onTemplateSelected($event)"
            ></app-workflow-template-catalog>

            <app-workflow-manifest-viewer
              [manifest]="mediaService.activeManifest()"
            ></app-workflow-manifest-viewer>
          </div>
        </div>
      }

      <!-- EDIT & INPAINTING STUDIO TAB CONTENT (Phase 8.3) -->
      @if (activeTab() === 'edit') {
        <div class="tab-pane-container edit-grid">
          <div class="edit-form-col">
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

          <div class="edit-canvas-col">
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

          <div class="edit-gallery-row">
            <div class="gallery-title-bar">
              <h3 class="gallery-heading">
                Source Image Artifacts (Click image to load into Edit Studio)
              </h3>
              <span class="gallery-count">
                {{ mediaService.artifacts().length }} Registered Local Artifacts
              </span>
            </div>
            <app-media-artifact-gallery
              [artifacts]="mediaService.artifacts()"
              (delete)="onDeleteImageArtifact($event)"
            ></app-media-artifact-gallery>
          </div>
        </div>
      }

      <!-- VIDEO STUDIO TAB CONTENT (Phase 8.2) -->
      @if (activeTab() === 'video') {
        <div class="tab-pane-container studio-split-grid">
          <div class="studio-main-col">
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

          <div class="studio-side-col">
            <app-video-job-queue
              [jobs]="mediaService.videoJobs()"
              [activeJob]="mediaService.activeVideoJob()"
              (cancel)="onCancelVideoJob($event)"
            ></app-video-job-queue>
          </div>
        </div>
      }

      <!-- IMAGE STUDIO TAB CONTENT (Phase 8.1) -->
      @if (activeTab() === 'image') {
        <div class="tab-pane-container studio-split-grid">
          <div class="studio-main-col">
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

          <div class="studio-side-col">
            <app-media-job-queue
              [jobs]="mediaService.jobs()"
              (cancel)="onCancelImageJob($event)"
            ></app-media-job-queue>

            <app-media-model-catalog
              [models]="mediaService.models()"
            ></app-media-model-catalog>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-height: 100%;
    }

    .abhi-media-workspace {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 8px 4px 40px 4px;
    }

    /* Header Card */
    .media-header-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      padding: 20px 24px;
      background: var(--abhi-surface-raised, #0e1828);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: var(--abhi-radius-control, 18px);
      box-shadow: var(--abhi-raised-shadow, 9px 9px 22px rgba(0, 0, 0, 0.43));
      backdrop-filter: blur(16px);
    }

    .media-title-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .media-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .media-title {
      font-size: 20px;
      font-weight: 800;
      color: var(--abhi-text-primary, #eef5ff);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .title-sparkle {
      font-size: 20px;
    }

    .media-stage-badge {
      font-size: 10px;
      font-family: monospace;
      padding: 3px 8px;
      background: rgba(168, 85, 247, 0.15);
      border: 1px solid rgba(168, 85, 247, 0.35);
      color: var(--abhi-accent-violet, #c084fc);
      border-radius: 12px;
      font-weight: 600;
    }

    .media-subtitle {
      font-size: 12px;
      color: var(--abhi-text-muted, #8193ac);
      margin: 0;
    }

    .media-telemetry-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .media-metric-well {
      display: flex;
      flex-direction: column;
      padding: 6px 14px;
      background: var(--abhi-surface-inset, #080e18);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: 14px;
      box-shadow: var(--abhi-inset-shadow, inset 4px 4px 10px rgba(0,0,0,0.4));
      text-align: right;
    }

    .metric-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--abhi-text-muted, #8193ac);
    }

    .metric-value {
      font-size: 13px;
      font-family: monospace;
      font-weight: 700;
    }

    .cyan-val { color: var(--abhi-cyan, #38d9ff); }
    .blue-val { color: var(--abhi-blue, #397bff); }

    .media-refresh-btn {
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--abhi-surface-raised, #0e1828);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: 12px;
      box-shadow: var(--abhi-raised-shadow, 9px 9px 22px rgba(0,0,0,0.43));
      color: var(--abhi-text-primary, #eef5ff);
      cursor: pointer;
      transition: all var(--abhi-transition-fast, 160ms);
    }

    .media-refresh-btn:hover {
      border-color: var(--abhi-cyan, #38d9ff);
      color: var(--abhi-cyan, #38d9ff);
    }

    /* Tabs Ribbon */
    .media-tabs-ribbon {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      padding-bottom: 4px;
    }

    .media-tab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: var(--abhi-surface-raised, #0e1828);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: var(--abhi-radius-control, 18px);
      box-shadow: var(--abhi-raised-shadow, 9px 9px 22px rgba(0,0,0,0.43));
      color: var(--abhi-text-secondary, #a7b7cc);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--abhi-transition-fast, 160ms);
    }

    .media-tab-btn:hover {
      border-color: var(--abhi-border-active, rgba(56, 217, 255, 0.42));
      color: var(--abhi-text-primary, #eef5ff);
    }

    .media-tab-btn.active {
      background: var(--abhi-surface-inset, #080e18);
      border-color: var(--abhi-cyan, #38d9ff);
      color: var(--abhi-cyan, #38d9ff);
      box-shadow: var(--abhi-inset-shadow, inset 4px 4px 10px rgba(0,0,0,0.4)), 0 0 12px rgba(56, 217, 255, 0.2);
    }

    /* Error Alert */
    .media-error-alert {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      background: rgba(255, 91, 113, 0.12);
      border: 1px solid rgba(255, 91, 113, 0.35);
      border-radius: 14px;
      color: var(--abhi-danger, #ff5b71);
      font-size: 12px;
    }

    .error-dismiss-btn {
      background: none;
      border: none;
      color: var(--abhi-danger, #ff5b71);
      cursor: pointer;
      font-size: 14px;
    }

    /* Tab Panes */
    .tab-pane-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .composer-grid, .edit-grid, .studio-split-grid {
      display: grid;
      gap: 20px;
    }

    .composer-grid {
      grid-template-columns: 2fr 1fr;
    }

    .composer-main-col, .composer-side-col, .studio-main-col, .studio-side-col, .edit-form-col, .edit-canvas-col {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .edit-grid {
      grid-template-columns: 1fr 1.3fr;
    }

    .edit-gallery-row {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: var(--abhi-surface-raised, #0e1828);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: var(--abhi-radius-control, 18px);
      box-shadow: var(--abhi-raised-shadow, 9px 9px 22px rgba(0,0,0,0.43));
      padding: 18px;
    }

    .gallery-title-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .gallery-heading {
      font-size: 13px;
      font-weight: 700;
      color: var(--abhi-text-primary, #eef5ff);
      margin: 0;
    }

    .gallery-count {
      font-size: 11px;
      font-family: monospace;
      color: var(--abhi-text-muted, #8193ac);
    }

    .studio-split-grid {
      grid-template-columns: 1.4fr 1fr;
    }

    @media (max-width: 1024px) {
      .composer-grid, .edit-grid, .studio-split-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .media-header-card {
        flex-direction: column;
        align-items: flex-start;
      }
      .media-telemetry-row {
        width: 100%;
        justify-content: space-between;
      }
      .media-tabs-ribbon {
        overflow-x: auto;
        flex-wrap: nowrap;
        scrollbar-width: none;
      }
      .media-tab-btn {
        flex-shrink: 0;
      }
    }
  `]
})
export class MediaPageComponent implements OnInit {
  @ViewChild('workflowComposer') workflowComposer?: VisualWorkflowComposerComponent;

  mediaService = inject(MediaService);
  activeTab = signal<'provenance' | 'creative' | 'composer' | 'edit' | 'video' | 'image'>('provenance');

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
    this.mediaService.provenanceErrorMessage.set(null);
  }
}

