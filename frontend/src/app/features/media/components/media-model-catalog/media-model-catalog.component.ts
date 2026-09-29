import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImageModelDefinitionDTO } from '../../models/media.model';

@Component({
  selector: 'app-media-model-catalog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-base font-semibold text-white flex items-center gap-2">
            <span>Registered Image Models</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {{ models().length }}
            </span>
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">Local image diffusion models and resource profiles</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        @for (model of models(); track model.model_id) {
          <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all flex flex-col justify-between">
            <div>
              <div class="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h4 class="text-xs font-semibold text-white">{{ model.name }}</h4>
                  <span class="text-[10px] text-slate-500 font-mono">{{ model.model_id }}</span>
                </div>
                @if (model.is_production) {
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Production
                  </span>
                } @else {
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    Candidate
                  </span>
                }
              </div>

              <div class="space-y-1 text-[11px] text-slate-300 py-1">
                <div class="flex justify-between">
                  <span class="text-slate-500">Quantization:</span>
                  <span class="font-mono text-cyan-400">{{ model.quantization }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Base VRAM:</span>
                  <span class="font-mono text-slate-200">{{ model.base_vram_mb }} MB</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Base RAM (CPU):</span>
                  <span class="font-mono text-slate-200">{{ model.base_ram_mb }} MB</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500">Max Batch:</span>
                  <span class="font-mono text-slate-200">{{ model.max_batch }}</span>
                </div>
              </div>
            </div>

            <div class="pt-2.5 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
              <span class="text-slate-500 font-mono">{{ model.digest.substring(0, 14) }}...</span>
              <span class="text-slate-400">{{ model.status }}</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class MediaModelCatalogComponent {
  models = input<ImageModelDefinitionDTO[]>([]);
}
