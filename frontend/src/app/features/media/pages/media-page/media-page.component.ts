import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThreeSceneManagerService } from '../../../../shared/3d/three-scene-manager.service';
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
import { MediaAudioSpectrumComponent } from '../../components/media-audio-spectrum/media-audio-spectrum.component';
import {
  ImageGenerationRequestDTO,
  VideoGenerationRequestDTO,
  ImageEditRequestDTO,
  MediaArtifactDTO,
  MediaWorkflowTemplate,
  MediaVaultItemDTO,
} from '../../models/media.model';
import { AnimeInteractiveDirective } from '../../../../shared/directives/anime-interactive.directive';
import { AnimeCounterDirective } from '../../../../shared/directives/anime-counter.directive';

export type MediaTab =
  | 'studio'
  | 'vault'
  | 'advanced'
  | 'provenance'
  | 'audio'
  | 'creative'
  | 'video'
  | 'edit'
  | 'composer'
  | 'image';

@Component({
  selector: 'app-media-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    MediaAudioSpectrumComponent,
    AnimeInteractiveDirective,
    AnimeCounterDirective,
  ],
  templateUrl: './media-page.component.html',
  styleUrl: './media-page.component.css'
})
export class MediaPageComponent implements OnInit {
  @ViewChild('workflowComposer') workflowComposer?: VisualWorkflowComposerComponent;

  readonly mediaService = inject(MediaService);
  private readonly threeScene = inject(ThreeSceneManagerService);

  // Active workspace navigation tab
  activeTab = signal<MediaTab>('studio');

  // Automated 3-Button Studio state
  automatedCategory = signal<'image' | 'video' | 'audio'>('image');
  promptText = '';
  selectedAspectRatio = signal<string>('1:1');
  selectedAudioStyle = signal<'SPEECH' | 'MUSIC'>('SPEECH');
  selectedVoice = signal<string>('en-GB-RyanNeural');

  // Video VFX Cinema-Grade Presets
  readonly videoVfxPresets = [
    {
      name: '🌐 3D Bot Workspace',
      prompt: 'create 3d cybernetic workspace colony for video with rotating radar, laser conduits, and specialist bot stations',
      ratio: '16:9'
    },
    {
      name: '⚛️ Quantum Arc Reactor',
      prompt: 'quantum arc reactor core holographic singularity with counter-rotating dials and orbiting satellites',
      ratio: '16:9'
    },
    {
      name: '🧠 Neural Cortex & Synapses',
      prompt: '3D holographic neural brain with flowing synaptic action potentials and attention waves',
      ratio: '16:9'
    },
    {
      name: '⚡ Matrix Cyber Stream',
      prompt: '3D matrix cybernetic stream with cascading code runes and audio oscilloscope',
      ratio: '16:9'
    },
    {
      name: '🌌 Cosmic Nebula Vortex',
      prompt: 'deep space cosmic nebula accretion vortex with swirling star sparks and diamond flares',
      ratio: '16:9'
    }
  ];

  applyVideoPreset(preset: { name: string; prompt: string; ratio: string }): void {
    this.promptText = preset.prompt;
    this.selectedAspectRatio.set(preset.ratio);
  }

  deleteItem(item: MediaVaultItemDTO, event?: Event): void {
    if (event) event.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${item.filename}" from the Media Vault?`)) {
      return;
    }
    this.mediaService.deleteVaultItem(item.relative_path).subscribe({
      next: () => {
        this.copyFeedback.set(`Deleted ${item.filename}`);
        setTimeout(() => this.copyFeedback.set(null), 2500);
        if (this.lightboxItem()?.filename === item.filename) {
          this.closeLightbox();
        }
      }
    });
  }

  clearAllVault(): void {
    const count = this.mediaService.vaultSummary()?.total_count || this.mediaService.vaultItems().length;
    if (count === 0) return;
    if (!confirm(`Are you sure you want to permanently delete all ${count} files from the Media Vault? This action cannot be undone.`)) {
      return;
    }
    this.mediaService.clearAllVault().subscribe({
      next: (res) => {
        this.copyFeedback.set(`Cleared Media Vault: ${res?.deleted_count || 0} files removed`);
        setTimeout(() => this.copyFeedback.set(null), 3000);
        this.closeLightbox();
      }
    });
  }

  // Animated Media Storage Vault state
  lightboxItem = signal<MediaVaultItemDTO | null>(null);
  copyFeedback = signal<string | null>(null);
  vaultFilterType = signal<string>('all');
  vaultSearchQuery = signal<string>('');
  vaultSort = signal<string>('newest');

  // Advanced modules sub-tab
  advancedSubTab = signal<'provenance' | 'audio' | 'creative' | 'video' | 'edit' | 'composer' | 'image'>('provenance');

  // Legacy artifact selection for editing
  selectedSourceArtifact = signal<MediaArtifactDTO | null>(null);
  currentMaskBase64 = signal<string | null>(null);
  latestEditedArtifact = signal<MediaArtifactDTO | null>(null);

  ngOnInit(): void {
    this.threeScene.setMode('MEDIA');
    this.mediaService.refreshAll();
    this.mediaService.fetchTemplates().subscribe();
    this.mediaService.fetchVault().subscribe();

    // Auto-select first artifact as default if available
    const arts = this.mediaService.artifacts();
    if (arts.length > 0) {
      this.selectedSourceArtifact.set(arts[0]);
      this.mediaService.fetchArtifactLineage(arts[0].artifact_id).subscribe();
    }
  }

  // ==========================================
  // Automated 3-Button Studio Handlers
  // ==========================================

  setCategory(cat: 'image' | 'video' | 'audio'): void {
    this.automatedCategory.set(cat);
  }

  getPromptLabel(): string {
    switch (this.automatedCategory()) {
      case 'image':
        return 'Image Generation Description';
      case 'video':
        return 'Cinematic Video Motion Prompt';
      case 'audio':
        return this.selectedAudioStyle() === 'MUSIC'
          ? 'Melodic Music Composition Prompt'
          : 'Speech & Narration Script';
    }
  }

  getPlaceholder(): string {
    switch (this.automatedCategory()) {
      case 'image':
        return 'Describe your image vision (e.g. "Futuristic AI core with glowing cyan neural nodes in deep obsidian space")...';
      case 'video':
        return 'Describe motion scene (e.g. "A smooth orbital camera pan revealing a glowing crystalline asteroid in neon light")...';
      case 'audio':
        return this.selectedAudioStyle() === 'MUSIC'
          ? 'Describe harmonic melody (e.g. "Inspiring ambient electronic synthwave with deep reverberant bass")...'
          : 'Enter speech narration script to synthesize (e.g. "Antigravity Media Studio is online and executing autonomous rendering.")...';
    }
  }

  createNow(): void {
    const text = this.promptText.trim();
    if (!text || this.mediaService.isAutomating()) return;

    this.mediaService.executeAutomated({
      category: this.automatedCategory(),
      prompt: text,
      aspect_ratio: this.selectedAspectRatio(),
    }).subscribe({
      next: (res) => {
        // Clear prompt upon successful creation
        if (res.status === 'SUCCESS') {
          this.promptText = '';
        }
      }
    });
  }

  // ==========================================
  // Animated Media Storage Vault Handlers
  // ==========================================

  openVaultTab(): void {
    this.activeTab.set('vault');
    this.mediaService.fetchVault(
      this.vaultFilterType(),
      this.vaultSearchQuery(),
      100,
      0,
      this.vaultSort()
    ).subscribe();
  }

  filterVault(type: string): void {
    this.vaultFilterType.set(type);
    this.mediaService.fetchVault(
      type,
      this.vaultSearchQuery(),
      100,
      0,
      this.vaultSort()
    ).subscribe();
  }

  onSearchVault(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input ? input.value : '';
    this.vaultSearchQuery.set(query);
    this.mediaService.fetchVault(
      this.vaultFilterType(),
      query,
      100,
      0,
      this.vaultSort()
    ).subscribe();
  }

  clearVaultSearch(): void {
    this.vaultSearchQuery.set('');
    this.mediaService.fetchVault(
      this.vaultFilterType(),
      '',
      100,
      0,
      this.vaultSort()
    ).subscribe();
  }

  onSortVault(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const sortVal = select ? select.value : 'newest';
    this.vaultSort.set(sortVal);
    this.mediaService.fetchVault(
      this.vaultFilterType(),
      this.vaultSearchQuery(),
      100,
      0,
      sortVal
    ).subscribe();
  }

  openLightbox(item: MediaVaultItemDTO): void {
    this.lightboxItem.set(item);
  }

  closeLightbox(): void {
    this.lightboxItem.set(null);
  }

  copyUrl(item: MediaVaultItemDTO, event?: Event): void {
    if (event) event.stopPropagation();
    const url = window.location.origin + this.mediaService.getVaultStreamUrl(item.relative_path);
    navigator.clipboard.writeText(url).then(() => {
      this.copyFeedback.set(`Copied link for ${item.filename}`);
      setTimeout(() => this.copyFeedback.set(null), 2500);
    }).catch(() => {
      this.copyFeedback.set(url);
      setTimeout(() => this.copyFeedback.set(null), 3000);
    });
  }

  downloadItem(item: MediaVaultItemDTO, event?: Event): void {
    if (event) event.stopPropagation();
    const link = document.createElement('a');
    link.href = this.mediaService.getVaultDownloadUrl(item.relative_path);
    link.download = item.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  jumpToVault(): void {
    this.openVaultTab();
  }

  clearErrors(): void {
    this.mediaService.errorMessage.set(null);
    this.mediaService.videoErrorMessage.set(null);
    this.mediaService.editErrorMessage.set(null);
    this.mediaService.creativeErrorMessage.set(null);
    this.mediaService.provenanceErrorMessage.set(null);
    this.mediaService.vaultError.set(null);
  }

  // ==========================================
  // Legacy & Advanced Handlers (Preserved)
  // ==========================================

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
  }
}
