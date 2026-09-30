import { Component, input, output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ImageEditModelDefinitionDTO,
  ImageEditRequestDTO,
  ImageEditType,
  MediaArtifactDTO,
  ImageFormat,
  QualityProfile,
  OutpaintBoundsDTO,
} from '../../models/media.model';

@Component({
  selector: 'app-image-edit-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-slate-900/85 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      <!-- Form Header -->
      <div class="flex items-center justify-between mb-5 border-b border-slate-800/80 pb-4">
        <div>
          <h2 class="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse"></span>
            Local Image Editing & Expansion Studio
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">
            Non-destructive generative image editing, inpainting, and outpainting
          </p>
        </div>
        <span class="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
          Immutable Source Contract
        </span>
      </div>

      <form (ngSubmit)="onSubmit()" class="space-y-4">
        <!-- Operation Selector Tabs -->
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1.5">Edit Mode</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              type="button"
              (click)="setOperation('IMAGE_TO_IMAGE')"
              [class]="operation() === 'IMAGE_TO_IMAGE' ? 'bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/30 border-indigo-500' : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'"
              class="border rounded-xl px-3 py-2.5 text-xs transition-all flex flex-col items-center gap-1"
            >
              <span class="text-sm">🎨</span>
              <span>Image-to-Image</span>
            </button>
            <button
              type="button"
              (click)="setOperation('INPAINTING')"
              [class]="operation() === 'INPAINTING' ? 'bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-600/30 border-emerald-500' : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'"
              class="border rounded-xl px-3 py-2.5 text-xs transition-all flex flex-col items-center gap-1"
            >
              <span class="text-sm">🖌️</span>
              <span>Inpainting</span>
            </button>
            <button
              type="button"
              (click)="setOperation('OUTPAINTING')"
              [class]="operation() === 'OUTPAINTING' ? 'bg-cyan-600 text-white font-semibold shadow-lg shadow-cyan-600/30 border-cyan-500' : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200'"
              class="border rounded-xl px-3 py-2.5 text-xs transition-all flex flex-col items-center gap-1"
            >
              <span class="text-sm">📐</span>
              <span>Outpainting</span>
            </button>
          </div>
        </div>

        <!-- Selected Source Artifact Indicator -->
        <div class="bg-slate-950/50 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-3">
            @if (sourceArtifact()) {
              <img
                [src]="sourceArtifact()?.path"
                alt="Source Thumbnail"
                class="w-10 h-10 object-cover rounded-lg border border-slate-700 shadow-sm"
              />
              <div>
                <span class="text-xs font-semibold text-slate-200 block truncate max-w-[200px]">
                  {{ sourceArtifact()?.filename }}
                </span>
                <span class="text-[10px] text-slate-400">
                  {{ sourceArtifact()?.width }} × {{ sourceArtifact()?.height }} px • {{ sourceArtifact()?.format }}
                </span>
              </div>
            } @else {
              <div class="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                🖼️
              </div>
              <span class="text-xs text-amber-400/90">
                ⚠️ No source artifact selected. Please select an image from the gallery below.
              </span>
            }
          </div>
          @if (sourceArtifact()) {
            <span class="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              Source Locked
            </span>
          }
        </div>

        <!-- Prompt Conditioning -->
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-1.5 flex justify-between">
            <span>Edit Conditioning Prompt</span>
            <span class="text-slate-500">{{ prompt().length }}/2000</span>
          </label>
          <textarea
            [ngModel]="prompt()"
            (ngModelChange)="prompt.set($event)"
            name="prompt"
            rows="2"
            [placeholder]="getPromptPlaceholder()"
            class="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
            required
          ></textarea>
        </div>

        <!-- Negative Prompt -->
        <div>
          <label class="block text-xs font-medium text-slate-400 mb-1">Negative Prompt (Optional)</label>
          <input
            type="text"
            [ngModel]="negativePrompt()"
            (ngModelChange)="negativePrompt.set($event)"
            name="negativePrompt"
            placeholder="blurry, distorted, artifacts, seam lines, seams, bad boundaries..."
            class="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <!-- Model Selection & Device -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1.5">Editing Engine</label>
            <select
              [ngModel]="selectedModelId()"
              (ngModelChange)="selectedModelId.set($event)"
              name="selectedModelId"
              class="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              @for (m of compatibleModels(); track m.model_id) {
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
                [class]="preferredDevice() === 'GPU' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-semibold' : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-300'"
                class="border rounded-xl px-3 py-2 text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <span>⚡ GPU</span>
              </button>
              <button
                type="button"
                (click)="preferredDevice.set('CPU')"
                [class]="preferredDevice() === 'CPU' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-semibold' : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-300'"
                class="border rounded-xl px-3 py-2 text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <span>⚙️ CPU</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Operation Specific Controls -->
        <!-- Strength Control for Img2Img and Inpainting -->
        @if (operation() === 'IMAGE_TO_IMAGE' || operation() === 'INPAINTING') {
          <div class="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
            <div class="flex justify-between items-center mb-1.5">
              <label class="text-xs font-medium text-slate-300">
                Transformation Strength ({{ (strength() * 100).toFixed(0) }}%)
              </label>
              <span class="text-[10px] text-slate-400">
                {{ strength() < 0.4 ? 'Subtle Variation' : strength() < 0.75 ? 'Balanced Transformation' : 'Heavy Redesign' }}
              </span>
            </div>
            <input
              type="range"
              [ngModel]="strength()"
              (ngModelChange)="strength.set($event)"
              name="strength"
              min="0.1"
              max="1.0"
              step="0.05"
              class="w-full accent-indigo-400 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        }

        <!-- Outpaint Directional Expansion Controls -->
        @if (operation() === 'OUTPAINTING') {
          <div class="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800 space-y-3">
            <div class="flex justify-between items-center">
              <label class="text-xs font-semibold text-cyan-300">
                Canvas Expansion Bounds (Max +{{ maxExpansion() }}px)
              </label>
              <span class="text-[10px] text-slate-400">
                Target: {{ getTargetOutpaintDimensions() }}
              </span>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div>
                <span class="text-[10px] text-slate-400 block mb-1">Top (+{{ outpaintTop() }}px)</span>
                <input
                  type="range"
                  [ngModel]="outpaintTop()"
                  (ngModelChange)="outpaintTop.set($event)"
                  name="outpaintTop"
                  min="0"
                  [max]="maxExpansion()"
                  step="32"
                  class="w-full accent-cyan-400 bg-slate-800 rounded cursor-pointer"
                />
              </div>
              <div>
                <span class="text-[10px] text-slate-400 block mb-1">Bottom (+{{ outpaintBottom() }}px)</span>
                <input
                  type="range"
                  [ngModel]="outpaintBottom()"
                  (ngModelChange)="outpaintBottom.set($event)"
                  name="outpaintBottom"
                  min="0"
                  [max]="maxExpansion()"
                  step="32"
                  class="w-full accent-cyan-400 bg-slate-800 rounded cursor-pointer"
                />
              </div>
              <div>
                <span class="text-[10px] text-slate-400 block mb-1">Left (+{{ outpaintLeft() }}px)</span>
                <input
                  type="range"
                  [ngModel]="outpaintLeft()"
                  (ngModelChange)="outpaintLeft.set($event)"
                  name="outpaintLeft"
                  min="0"
                  [max]="maxExpansion()"
                  step="32"
                  class="w-full accent-cyan-400 bg-slate-800 rounded cursor-pointer"
                />
              </div>
              <div>
                <span class="text-[10px] text-slate-400 block mb-1">Right (+{{ outpaintRight() }}px)</span>
                <input
                  type="range"
                  [ngModel]="outpaintRight()"
                  (ngModelChange)="outpaintRight.set($event)"
                  name="outpaintRight"
                  min="0"
                  [max]="maxExpansion()"
                  step="32"
                  class="w-full accent-cyan-400 bg-slate-800 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        }

        <!-- Mask Attachment Status (for Inpainting) -->
        @if (operation() === 'INPAINTING') {
          <div class="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span class="text-slate-300">Inpainting Mask Status:</span>
            @if (maskBase64()) {
              <span class="text-emerald-400 font-semibold flex items-center gap-1">
                <span>✅ Inpainting Mask Attached</span>
              </span>
            } @else {
              <span class="text-amber-400 font-semibold flex items-center gap-1">
                <span>⚠️ Draw and apply a mask in the Mask Studio below</span>
              </span>
            }
          </div>
        }

        <!-- Tuning Parameters: Steps, Guidance, Seed -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
          <div>
            <label class="block font-medium text-slate-300 mb-1">Steps ({{ steps() }})</label>
            <input
              type="range"
              [ngModel]="steps()"
              (ngModelChange)="steps.set($event)"
              name="steps"
              min="5"
              max="50"
              step="5"
              class="w-full accent-indigo-400 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">Guidance ({{ guidance() }})</label>
            <input
              type="range"
              [ngModel]="guidance()"
              (ngModelChange)="guidance.set($event)"
              name="guidance"
              min="1.0"
              max="20.0"
              step="0.5"
              class="w-full accent-indigo-400 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          <div>
            <label class="block font-medium text-slate-300 mb-1">Seed (Optional)</label>
            <input
              type="number"
              [ngModel]="seed()"
              (ngModelChange)="seed.set($event)"
              name="seed"
              placeholder="Random"
              class="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-600"
            />
          </div>
        </div>

        <!-- Submit Button -->
        <div class="pt-2">
          <button
            type="submit"
            [disabled]="isSubmitDisabled()"
            class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            @if (isLoading()) {
              <svg class="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Executing {{ operation() }} Pipeline...</span>
            } @else {
              <span>✨ Execute {{ getOperationButtonText() }}</span>
            }
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ImageEditFormComponent {
  sourceArtifact = input<MediaArtifactDTO | null>(null);
  editModels = input<ImageEditModelDefinitionDTO[]>([]);
  maskBase64 = input<string | null>(null);
  isLoading = input<boolean>(false);

  editSubmitted = output<ImageEditRequestDTO>();

  operation = signal<ImageEditType>('IMAGE_TO_IMAGE');
  prompt = signal<string>('');
  negativePrompt = signal<string>('');
  selectedModelId = signal<string>('instruct-pix2pix-local');
  strength = signal<number>(0.75);
  steps = signal<number>(20);
  guidance = signal<number>(7.5);
  seed = signal<number | null>(null);
  outputFormat = signal<ImageFormat>('PNG');
  preferredDevice = signal<string>('GPU');

  // Outpaint Bounds
  outpaintTop = signal<number>(0);
  outpaintBottom = signal<number>(0);
  outpaintLeft = signal<number>(128);
  outpaintRight = signal<number>(128);
  maxExpansion = signal<number>(512);

  compatibleModels = computed<ImageEditModelDefinitionDTO[]>(() => {
    const op = this.operation();
    const models = this.editModels().filter((m) =>
      m.supported_operations.includes(op)
    );
    return models.length > 0 ? models : this.editModels();
  });

  constructor() {
    effect(() => {
      const models = this.compatibleModels();
      if (models.length > 0 && !models.some((m) => m.model_id === this.selectedModelId())) {
        this.selectedModelId.set(models[0].model_id);
      }
    });
  }

  setOperation(op: ImageEditType): void {
    this.operation.set(op);
    if (op === 'INPAINTING') {
      this.selectedModelId.set('sdxl-inpainting-local');
    } else if (op === 'OUTPAINTING') {
      this.selectedModelId.set('kandinsky-outpainting-candidate');
    } else {
      this.selectedModelId.set('instruct-pix2pix-local');
    }
  }

  getPromptPlaceholder(): string {
    switch (this.operation()) {
      case 'INPAINTING':
        return "Describe what to generate inside the masked region (e.g. 'A gold wristwatch on the table')...";
      case 'OUTPAINTING':
        return "Describe the expanded environment (e.g. 'Extend the background to reveal a futuristic neon city skyline')...";
      case 'IMAGE_TO_IMAGE':
      default:
        return "Describe how to transform the image (e.g. 'Make it look like an oil painting in the style of Van Gogh')...";
    }
  }

  getOperationButtonText(): string {
    switch (this.operation()) {
      case 'INPAINTING':
        return 'Local Inpaint';
      case 'OUTPAINTING':
        return 'Canvas Outpaint';
      case 'IMAGE_TO_IMAGE':
      default:
        return 'Image-to-Image Edit';
    }
  }

  getTargetOutpaintDimensions(): string {
    const art = this.sourceArtifact();
    const baseW = art?.width || 512;
    const baseH = art?.height || 512;
    const w = baseW + this.outpaintLeft() + this.outpaintRight();
    const h = baseH + this.outpaintTop() + this.outpaintBottom();
    return `${w} × ${h} px (+${w * h - baseW * baseH} px)`;
  }

  isSubmitDisabled(): boolean {
    if (this.isLoading()) return true;
    if (!this.sourceArtifact()) return true;
    if (!this.prompt().trim()) return true;
    if (this.operation() === 'INPAINTING' && !this.maskBase64()) return true;
    if (
      this.operation() === 'OUTPAINTING' &&
      this.outpaintTop() === 0 &&
      this.outpaintBottom() === 0 &&
      this.outpaintLeft() === 0 &&
      this.outpaintRight() === 0
    ) {
      return true;
    }
    return false;
  }

  onSubmit(): void {
    const art = this.sourceArtifact();
    if (!art || !this.prompt().trim()) return;

    let bounds: OutpaintBoundsDTO | null = null;
    if (this.operation() === 'OUTPAINTING') {
      bounds = {
        top: this.outpaintTop(),
        bottom: this.outpaintBottom(),
        left: this.outpaintLeft(),
        right: this.outpaintRight(),
      };
    }

    const req: ImageEditRequestDTO = {
      source_artifact_id: art.artifact_id,
      operation: this.operation(),
      prompt: this.prompt().trim(),
      negative_prompt: this.negativePrompt().trim() || null,
      model_id: this.selectedModelId(),
      mask_base64: this.operation() === 'INPAINTING' ? this.maskBase64() : null,
      strength: this.strength(),
      steps: this.steps(),
      guidance: this.guidance(),
      seed: this.seed(),
      output_format: this.outputFormat(),
      quality_profile: 'STANDARD',
      preferred_device: this.preferredDevice(),
      outpaint_bounds: bounds,
    };

    this.editSubmitted.emit(req);
  }
}
