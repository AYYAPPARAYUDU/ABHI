import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MediaArtifactDTO,
  EditDifferenceEvidenceDTO,
  ArtifactLineageRecordDTO,
} from '../../models/media.model';

@Component({
  selector: 'app-image-diff-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
          <h3 class="text-sm font-semibold text-slate-100 tracking-wide">
            Before / After Transformation Inspector
          </h3>
        </div>
        <!-- View Mode Selector -->
        <div class="flex items-center gap-1.5 text-xs bg-slate-950/80 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            (click)="viewMode.set('split')"
            [class]="viewMode() === 'split' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'"
            class="px-2.5 py-1 rounded transition-all"
          >
            ↔️ Split Slider
          </button>
          <button
            type="button"
            (click)="viewMode.set('side-by-side')"
            [class]="viewMode() === 'side-by-side' ? 'bg-cyan-500/20 text-cyan-300 font-semibold' : 'text-slate-400 hover:text-slate-200'"
            class="px-2.5 py-1 rounded transition-all"
          >
            ⊞ Side by Side
          </button>
        </div>
      </div>

      <!-- Main Viewer Area -->
      @if (originalArtifact() && editedArtifact()) {
        <div class="relative w-full overflow-hidden bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center p-3 min-h-[420px]">
          <!-- Split Slider Mode -->
          @if (viewMode() === 'split') {
            <div
              #sliderContainer
              (mousemove)="onSliderMove($event)"
              (touchmove)="onTouchMove($event)"
              class="relative inline-block max-w-full max-h-[500px] overflow-hidden select-none cursor-ew-resize rounded-lg border border-slate-800"
            >
              <!-- Edited (After) Base Image -->
              <img
                [src]="editedArtifact()?.path"
                alt="Edited After"
                class="block max-w-full max-h-[500px] object-contain select-none pointer-events-none"
              />

              <!-- Original (Before) Clipped Layer -->
              <div
                class="absolute inset-0 overflow-hidden select-none pointer-events-none"
                [style.width.%]="sliderPosition()"
              >
                <img
                  [src]="originalArtifact()?.path"
                  alt="Original Before"
                  class="absolute top-0 left-0 max-w-none h-full object-contain select-none"
                  [style.width.px]="getContainerWidth()"
                />
              </div>

              <!-- Draggable Divider Line -->
              <div
                class="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)] pointer-events-none"
                [style.left.%]="sliderPosition()"
              >
                <div class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-cyan-500 border-2 border-slate-900 text-[10px] text-white flex items-center justify-center font-bold shadow-lg">
                  ↔
                </div>
              </div>

              <!-- Badge labels -->
              <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-900/80 text-cyan-300 text-[10px] font-mono border border-cyan-500/30">
                BEFORE (Original)
              </span>
              <span class="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-900/80 text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                AFTER (Edited)
              </span>
            </div>
          }

          <!-- Side-by-Side Mode -->
          @if (viewMode() === 'side-by-side') {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <!-- Before -->
              <div class="bg-slate-900/50 p-2 rounded-xl border border-slate-800 text-center">
                <span class="text-xs font-semibold text-cyan-300 block mb-2">Original (Before)</span>
                <div class="relative overflow-hidden rounded-lg bg-black/40 flex items-center justify-center max-h-[360px]">
                  <img
                    [src]="originalArtifact()?.path"
                    alt="Original Image"
                    class="max-h-[360px] object-contain rounded"
                  />
                </div>
                <div class="mt-2 text-[10px] text-slate-400">
                  {{ originalArtifact()?.width }} × {{ originalArtifact()?.height }} px • {{ originalArtifact()?.format }}
                </div>
              </div>

              <!-- After -->
              <div class="bg-slate-900/50 p-2 rounded-xl border border-slate-800 text-center">
                <span class="text-xs font-semibold text-indigo-300 block mb-2">Edited (After)</span>
                <div class="relative overflow-hidden rounded-lg bg-black/40 flex items-center justify-center max-h-[360px]">
                  <img
                    [src]="editedArtifact()?.path"
                    alt="Edited Image"
                    class="max-h-[360px] object-contain rounded"
                  />
                </div>
                <div class="mt-2 text-[10px] text-slate-400">
                  {{ editedArtifact()?.width }} × {{ editedArtifact()?.height }} px • {{ editedArtifact()?.format }}
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Technical Difference Evidence Metrics Panel -->
        @if (differenceEvidence() || lineageRecord()?.difference_evidence) {
          @let diff = differenceEvidence() || lineageRecord()?.difference_evidence;
          <div class="mt-4 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span>🔬 Technical Verification Evidence</span>
              </span>
              <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Verified Lineage
              </span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div class="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span class="text-[10px] text-slate-500 block">Changed Pixels</span>
                <span class="font-mono text-slate-200 font-semibold">
                  {{ diff?.changed_pixel_count?.toLocaleString() }} px
                </span>
              </div>
              <div class="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span class="text-[10px] text-slate-500 block">Changed Ratio</span>
                <span class="font-mono text-cyan-300 font-semibold">
                  {{ ((diff?.changed_pixel_ratio || 0) * 100).toFixed(2) }}%
                </span>
              </div>
              <div class="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span class="text-[10px] text-slate-500 block">Canvas Evolution</span>
                <span class="font-mono text-slate-300 font-semibold">
                  {{ diff?.source_dimensions?.[0] }}×{{ diff?.source_dimensions?.[1] }} → {{ diff?.output_dimensions?.[0] }}×{{ diff?.output_dimensions?.[1] }}
                </span>
              </div>
              <div class="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span class="text-[10px] text-slate-500 block">Mask Overlap</span>
                <span class="font-mono text-emerald-400 font-semibold">
                  {{ diff?.mask_overlap_ratio !== null ? (((diff?.mask_overlap_ratio || 0) * 100).toFixed(1) + '%') : 'N/A' }}
                </span>
              </div>
            </div>
          </div>
        }
      } @else {
        <div class="text-center py-12 text-slate-500 text-sm">
          <span class="text-3xl block mb-2">⚖️</span>
          <span>Select an original artifact and perform an edit to inspect before/after differences</span>
        </div>
      }
    </div>
  `,
})
export class ImageDiffViewerComponent {
  originalArtifact = input<MediaArtifactDTO | null>(null);
  editedArtifact = input<MediaArtifactDTO | null>(null);
  differenceEvidence = input<EditDifferenceEvidenceDTO | null>(null);
  lineageRecord = input<ArtifactLineageRecordDTO | null>(null);

  viewMode = signal<'split' | 'side-by-side'>('split');
  sliderPosition = signal<number>(50);

  onSliderMove(e: MouseEvent): void {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    this.sliderPosition.set(pct);
  }

  onTouchMove(e: TouchEvent): void {
    if (e.touches.length === 0) return;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    this.sliderPosition.set(pct);
  }

  getContainerWidth(): number {
    return 500;
  }
}
