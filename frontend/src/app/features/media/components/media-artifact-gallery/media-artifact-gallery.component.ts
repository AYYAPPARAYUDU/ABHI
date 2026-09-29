import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaArtifactDTO } from '../../models/media.model';

@Component({
  selector: 'app-media-artifact-gallery',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h3 class="text-base font-semibold text-white flex items-center gap-2">
            <span>Generated Media Library</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {{ artifacts().length }}
            </span>
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">Locally stored validated image artifacts</p>
        </div>
      </div>

      @if (artifacts().length === 0) {
        <div class="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800/80 rounded-xl">
          No artifacts generated yet. Generate an image to populate your library.
        </div>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (art of artifacts(); track art.artifact_id) {
            <div class="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all group flex flex-col">
              <!-- Image Thumbnail / View Trigger -->
              <div
                (click)="selectedArtifact.set(art)"
                class="relative aspect-square bg-slate-900 overflow-hidden cursor-pointer flex items-center justify-center"
              >
                <img
                  [src]="'/api/v1/media/artifacts/' + art.artifact_id + '/file'"
                  [alt]="art.prompt_preview || art.filename"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <span class="text-[11px] text-white font-medium truncate">
                    {{ art.prompt_preview || art.filename }}
                  </span>
                </div>
              </div>

              <!-- Metadata & Actions -->
              <div class="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                <div>
                  <div class="flex items-center justify-between gap-1 text-[11px] mb-1">
                    <span class="text-slate-300 font-mono font-medium truncate max-w-[140px]">{{ art.filename }}</span>
                    <span class="text-cyan-400 font-medium">{{ art.width }}×{{ art.height }}</span>
                  </div>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {{ art.model_id }}
                    </span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {{ formatBytes(art.size_bytes) }}
                    </span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                      {{ art.provenance }}
                    </span>
                  </div>
                </div>

                <div class="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span class="text-[10px] text-slate-500 font-mono">
                    {{ art.sha256.substring(0, 8) }}...
                  </span>
                  <div class="flex items-center gap-1.5">
                    <button
                      type="button"
                      (click)="selectedArtifact.set(art)"
                      class="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      (click)="delete.emit(art.artifact_id)"
                      class="text-[11px] px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Modal Full-size Preview -->
      @if (selectedArtifact()) {
        <div class="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
            <div class="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 class="text-sm font-semibold text-white">{{ selectedArtifact()?.filename }}</h4>
                <p class="text-xs text-slate-400">{{ selectedArtifact()?.prompt_preview }}</p>
              </div>
              <button
                type="button"
                (click)="selectedArtifact.set(null)"
                class="text-slate-400 hover:text-white text-lg px-2"
              >
                ✕
              </button>
            </div>
            <div class="p-4 bg-slate-950 flex items-center justify-center max-h-[500px]">
              <img
                [src]="'/api/v1/media/artifacts/' + selectedArtifact()?.artifact_id + '/file'"
                [alt]="selectedArtifact()?.filename"
                class="max-h-[460px] object-contain rounded-lg"
              />
            </div>
            <div class="p-4 bg-slate-900/90 text-xs text-slate-400 space-y-1">
              <div><strong class="text-slate-300">Path:</strong> {{ selectedArtifact()?.path }}</div>
              <div><strong class="text-slate-300">SHA-256:</strong> {{ selectedArtifact()?.sha256 }}</div>
              <div><strong class="text-slate-300">Model:</strong> {{ selectedArtifact()?.model_id }} ({{ selectedArtifact()?.width }}×{{ selectedArtifact()?.height }})</div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class MediaArtifactGalleryComponent {
  artifacts = input<MediaArtifactDTO[]>([]);
  delete = output<string>();

  selectedArtifact = signal<MediaArtifactDTO | null>(null);

  formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }
}
