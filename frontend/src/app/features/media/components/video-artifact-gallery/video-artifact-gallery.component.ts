import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoArtifactDTO } from '../../models/media.model';

@Component({
  selector: 'app-video-artifact-gallery',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card bg-dark border-secondary text-light">
      <div class="card-header border-secondary d-flex justify-content-between align-items-center">
        <h6 class="mb-0 text-info">
          <i class="bi bi-collection-play me-2"></i>Generated Video Artifacts Gallery
        </h6>
        <span class="badge bg-secondary">{{ artifacts.length }} Artifacts</span>
      </div>
      <div class="card-body">
        <div class="row g-3" *ngIf="artifacts.length > 0">
          <div *ngFor="let artifact of artifacts" class="col-6 col-md-4 col-lg-3">
            <div class="card bg-black border-secondary h-100 position-relative group-hover">
              <!-- Thumbnail / Poster preview with duration badge -->
              <div
                class="position-relative ratio ratio-16x9 bg-dark rounded-top overflow-hidden cursor-pointer"
                (click)="selectedArtifact = artifact"
              >
                <img
                  *ngIf="artifact.poster_path"
                  [src]="'/api/v1/media/video/artifacts/' + artifact.artifact_id + '/thumbnail'"
                  class="w-100 h-100 object-fit-cover"
                  [alt]="artifact.filename"
                />
                <div
                  *ngIf="!artifact.poster_path"
                  class="d-flex align-items-center justify-content-center h-100 text-secondary"
                >
                  <i class="bi bi-play-btn fs-1 text-info"></i>
                </div>
                <!-- Play Icon Overlay -->
                <div class="position-absolute top-50 start-50 translate-middle text-white bg-dark bg-opacity-75 rounded-circle p-2">
                  <i class="bi bi-play-fill fs-4"></i>
                </div>
                <!-- Duration Badge -->
                <span class="position-absolute bottom-0 end-0 m-1 badge bg-dark bg-opacity-75 text-info">
                  {{ artifact.duration_seconds }}s ({{ artifact.fps }}fps)
                </span>
              </div>

              <!-- Card Body -->
              <div class="card-body p-2 d-flex flex-column justify-content-between">
                <div>
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="badge bg-primary text-uppercase">{{ artifact.format }}</span>
                    <span class="small text-secondary">{{ formatBytes(artifact.size_bytes) }}</span>
                  </div>
                  <p class="small text-light text-truncate mb-1" [title]="artifact.prompt_preview">
                    {{ artifact.prompt_preview || artifact.filename }}
                  </p>
                  <div class="small text-secondary font-monospace" style="font-size: 0.75rem;">
                    {{ artifact.width }}x{{ artifact.height }} • {{ artifact.model_id }}
                  </div>
                </div>

                <!-- Footer Actions -->
                <div class="d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-secondary">
                  <a
                    [href]="'/api/v1/media/video/artifacts/' + artifact.artifact_id + '/file'"
                    target="_blank"
                    class="btn btn-sm btn-outline-info py-0 px-2 small"
                    title="Open or download raw video file"
                  >
                    <i class="bi bi-download me-1"></i>Save
                  </a>
                  <button
                    class="btn btn-sm btn-outline-danger py-0 px-2 small"
                    (click)="delete.emit(artifact.artifact_id)"
                    title="Delete artifact"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div *ngIf="artifacts.length === 0" class="text-center py-5 text-secondary">
          <i class="bi bi-film fs-1 text-secondary mb-2 d-block"></i>
          <p class="mb-0">No video artifacts generated yet.</p>
          <small>Use the Video Studio form above to generate your first clip.</small>
        </div>
      </div>
    </div>

    <!-- Video Modal Player Preview -->
    <div
      *ngIf="selectedArtifact"
      class="modal fade show d-block"
      tabindex="-1"
      style="background: rgba(0,0,0,0.85);"
    >
      <div class="modal-dialog modal-lg modal-dialog-centered">
        <div class="modal-content bg-dark border-secondary text-light">
          <div class="modal-header border-secondary">
            <h6 class="modal-title text-info">
              <i class="bi bi-play-circle me-2"></i>{{ selectedArtifact.filename }}
            </h6>
            <button
              type="button"
              class="btn-close btn-close-white"
              (click)="selectedArtifact = null"
            ></button>
          </div>
          <div class="modal-body text-center p-0 bg-black">
            <video
              controls
              autoplay
              loop
              class="w-100"
              style="max-height: 520px;"
              [src]="'/api/v1/media/video/artifacts/' + selectedArtifact.artifact_id + '/file'"
            ></video>
          </div>
          <div class="modal-footer border-secondary justify-content-between">
            <div class="small text-secondary font-monospace">
              SHA256: {{ selectedArtifact.sha256 | slice: 0 : 16 }}... |
              {{ selectedArtifact.width }}x{{ selectedArtifact.height }} @ {{ selectedArtifact.fps }}fps
            </div>
            <button class="btn btn-sm btn-secondary" (click)="selectedArtifact = null">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class VideoArtifactGalleryComponent {
  @Input() artifacts: VideoArtifactDTO[] = [];
  @Output() delete = new EventEmitter<string>();

  selectedArtifact: VideoArtifactDTO | null = null;

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
