import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ImageModelDefinitionDTO,
  ImageGenerationRequestDTO,
  ImageFormat,
  QualityProfile,
} from '../../models/media.model';

@Component({
  selector: 'app-image-generation-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            Local Image Synthesis Studio
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">
            Local-first diffusion inference with resource-aware admission
          </p>
        </div>
        <span class="text-xs px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
          RTX 5050 Accelerated
        </span>
      </div>

      <form (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- Prompt Input -->
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1.5 flex justify-between">
            <span>Prompt (English, Telugu, Hindi, Tamil supported)</span>
            <span class="text-slate-500">{{ prompt().length }}/2000</span>
          </label>
          <textarea
            [ngModel]="prompt()"
            (ngModelChange)="prompt.set($event)"
            name="prompt"
            rows="3"
            placeholder="Describe the image you want to generate (e.g., 'A luminous crystal tree on a mountain at twilight')..."
            class="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all resize-none"
            required
          ></textarea>
        </div>

        <!-- Negative Prompt (Collapsible/Optional) -->
        <div>
          <label class="block text-xs font-medium text-slate-400 mb-1">
            Negative Prompt (Optional)
          </label>
          <input
            type="text"
            [ngModel]="negativePrompt()"
            (ngModelChange)="negativePrompt.set($event)"
            name="negativePrompt"
            placeholder="blurry, distorted, artifacts, low quality..."
            class="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-all"
          />
        </div>

        <!-- Model Selection & Device -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1.5">Model Engine</label>
            <select
              [ngModel]="selectedModelId()"
              (ngModelChange)="selectedModelId.set($event)"
              name="selectedModelId"
              class="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              @for (m of models(); track m.model_id) {
                <option [value]="m.model_id">
                  {{ m.name }} ({{ m.quantization }} - {{ m.base_vram_mb }}MB VRAM)
                </option>
              }
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1.5">Execution Device</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                (click)="preferredDevice.set('GPU')"
                [class]="preferredDevice() === 'GPU' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 font-medium' : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-300'"
                class="border rounded-xl px-3 py-2 text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <span>⚡ GPU (RTX 5050)</span>
              </button>
              <button
                type="button"
                (click)="preferredDevice.set('CPU')"
                [class]="preferredDevice() === 'CPU' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 font-medium' : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-300'"
                class="border rounded-xl px-3 py-2 text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <span>⚙️ CPU (RAM)</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Resolution & Quality Presets -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1.5">Resolution</label>
            <div class="grid grid-cols-2 gap-1.5">
              @for (res of standardResolutions; track res.label) {
                <button
                  type="button"
                  (click)="setResolution(res.w, res.h)"
                  [class]="width() === res.w && height() === res.h ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-medium' : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-300'"
                  class="border rounded-lg px-2 py-1.5 text-xs transition-all"
                >
                  {{ res.label }}
                </button>
              }
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1.5">
              Steps ({{ steps() }})
            </label>
            <input
              type="range"
              [ngModel]="steps()"
              (ngModelChange)="steps.set($event)"
              name="steps"
              min="5"
              max="50"
              step="5"
              class="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer mt-2"
            />
            <div class="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Fast (10)</span>
              <span>Balanced (20)</span>
              <span>Ultra (50)</span>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1.5">Format & Seed</label>
            <div class="flex gap-2">
              <select
                [ngModel]="outputFormat()"
                (ngModelChange)="outputFormat.set($event)"
                name="outputFormat"
                class="w-1/2 bg-slate-950/70 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="PNG">PNG</option>
                <option value="JPEG">JPEG</option>
                <option value="WEBP">WEBP</option>
              </select>
              <input
                type="number"
                [ngModel]="seed()"
                (ngModelChange)="seed.set($event)"
                name="seed"
                placeholder="Rand Seed"
                class="w-1/2 bg-slate-950/70 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600"
              />
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="pt-2">
          <button
            type="submit"
            [disabled]="isLoading() || prompt().trim().length === 0"
            class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            @if (isLoading()) {
              <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Admitting & Synthesizing...</span>
            } @else {
              <span>✨ Generate Local Image</span>
            }
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ImageGenerationFormComponent {
  models = input<ImageModelDefinitionDTO[]>([]);
  isLoading = input<boolean>(false);
  generate = output<ImageGenerationRequestDTO>();

  prompt = signal<string>('');
  negativePrompt = signal<string>('');
  selectedModelId = signal<string>('sd-turbo-local');
  width = signal<number>(512);
  height = signal<number>(512);
  steps = signal<number>(20);
  seed = signal<number | null>(null);
  outputFormat = signal<ImageFormat>('PNG');
  preferredDevice = signal<string>('GPU');

  standardResolutions = [
    { label: '512 × 512', w: 512, h: 512 },
    { label: '768 × 768', w: 768, h: 768 },
    { label: '512 × 768', w: 512, h: 768 },
    { label: '768 × 512', w: 768, h: 512 },
  ];

  setResolution(w: number, h: number): void {
    this.width.set(w);
    this.height.set(h);
  }

  onSubmit(): void {
    if (!this.prompt().trim()) return;

    this.generate.emit({
      prompt: this.prompt().trim(),
      negative_prompt: this.negativePrompt().trim() || null,
      model_id: this.selectedModelId(),
      width: this.width(),
      height: this.height(),
      steps: this.steps(),
      seed: this.seed(),
      output_format: this.outputFormat(),
      preferred_device: this.preferredDevice(),
      batch_size: 1,
      quality_profile: 'STANDARD',
    });
  }
}
