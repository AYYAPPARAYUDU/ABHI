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
import { AnimeInteractiveDirective } from '../../../../shared/directives/anime-interactive.directive';
import { AnimeCounterDirective } from '../../../../shared/directives/anime-counter.directive';

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
    AnimeInteractiveDirective,
    AnimeCounterDirective,
  ],
  templateUrl: './media-page.component.html',
  styleUrl: './media-page.component.css'
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
