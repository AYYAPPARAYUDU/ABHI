import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModelInstanceRecordDTO } from '../../models/resource.model';

@Component({
  selector: 'app-model-lifecycle-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg transition-all hover:border-slate-700">
      <div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-slate-100">{{ model().model_id }}</span>
              @if (model().is_production) {
                <span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Production
                </span>
              } @else if (model().is_candidate) {
                <span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Candidate
                </span>
              }
            </div>
            <div class="text-xs text-slate-400 font-mono mt-0.5">
              {{ model().format }} • {{ model().quantization }} • {{ model().parameter_count }}
            </div>
          </div>

          <!-- Health / State Badge -->
          <span
            class="text-[11px] font-mono px-2 py-0.5 rounded-full border"
            [ngClass]="getStateBadgeClass()"
          >
            {{ model().state }}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2 my-3 text-xs bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
          <div>
            <span class="text-slate-500 block">Device:</span>
            <span class="font-semibold text-slate-300">{{ model().device }}</span>
          </div>
          <div>
            <span class="text-slate-500 block">Context Tokens:</span>
            <span class="font-semibold text-slate-300">{{ model().context_length | number }}</span>
          </div>
          <div>
            <span class="text-slate-500 block">Memory Footprint:</span>
            <span class="font-semibold text-emerald-400">
              {{ (model().actual_memory_mb || model().estimated_memory_mb) | number:'1.0-0' }} MB
            </span>
          </div>
          <div>
            <span class="text-slate-500 block">Est. KV-Cache:</span>
            <span class="font-semibold text-slate-300">{{ model().estimated_kv_cache_mb | number:'1.0-1' }} MB</span>
          </div>
        </div>

        @if (model().error_message) {
          <div class="text-xs text-red-400 bg-red-950/40 border border-red-900/50 p-2 rounded mb-3">
            {{ model().error_message }}
          </div>
        }
      </div>

      <!-- Action Footer -->
      <div class="flex items-center justify-between pt-2 border-t border-slate-800 mt-2">
        <div class="text-[11px] text-slate-400">
          Uses: <span class="text-slate-300 font-mono">{{ model().use_count }}</span>
        </div>

        <div class="flex items-center gap-2">
          @if (isLoaded()) {
            <button
              type="button"
              (click)="onUnload()"
              class="px-2.5 py-1 text-xs font-medium rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition-all"
            >
              Unload
            </button>
          } @else {
            <button
              type="button"
              (click)="onLoad()"
              class="px-2.5 py-1 text-xs font-medium rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all"
            >
              Load
            </button>
          }
        </div>
      </div>
    </div>
  `
})
export class ModelLifecycleCardComponent {
  model = input.required<ModelInstanceRecordDTO>();

  load = output<string>();
  unload = output<{ modelId: string; force: boolean }>();

  isLoaded(): boolean {
    return ['LOADED', 'WARM', 'IN_USE', 'IDLE'].includes(this.model().state);
  }

  onLoad(): void {
    this.load.emit(this.model().model_id);
  }

  onUnload(): void {
    const isBusy = this.model().state === 'IN_USE';
    this.unload.emit({ modelId: this.model().model_id, force: isBusy });
  }

  getStateBadgeClass(): string {
    switch (this.model().state) {
      case 'IN_USE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse';
      case 'WARM':
      case 'LOADED':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'IDLE':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'QUARANTINED':
      case 'FAILED':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  }
}
