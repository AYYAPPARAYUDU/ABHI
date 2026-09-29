import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  VideoModelDefinitionDTO,
  VideoGenerationRequestDTO,
  VideoFormat,
} from '../../models/media.model';

@Component({
  selector: 'app-video-generation-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card bg-dark border-secondary text-light h-100">
      <div class="card-header border-secondary d-flex justify-content-between align-items-center">
        <h6 class="mb-0 text-info">
          <i class="bi bi-film me-2"></i>Local Video Studio
        </h6>
        <span class="badge bg-primary">RTX 5050 Bounded</span>
      </div>
      <div class="card-body">
        <form (ngSubmit)="onSubmit()">
          <!-- Prompt -->
          <div class="mb-3">
            <label class="form-label text-secondary small fw-bold">Motion & Scene Prompt</label>
            <textarea
              class="form-control bg-black text-light border-secondary"
              rows="3"
              placeholder="e.g., Drone footage of waterfalls cascading into a blue lagoon at sunset, slow motion..."
              [(ngModel)]="prompt"
              name="prompt"
              [disabled]="isGenerating"
              required
            ></textarea>
          </div>

          <!-- Negative Prompt -->
          <div class="mb-3">
            <label class="form-label text-secondary small fw-bold">Negative Prompt (Optional)</label>
            <input
              type="text"
              class="form-control bg-black text-light border-secondary"
              placeholder="e.g., jitter, blur, distortion, static"
              [(ngModel)]="negativePrompt"
              name="negativePrompt"
              [disabled]="isGenerating"
            />
          </div>

          <!-- Model Selection -->
          <div class="mb-3">
            <label class="form-label text-secondary small fw-bold">Video Model</label>
            <select
              class="form-select bg-black text-light border-secondary"
              [(ngModel)]="selectedModelId"
              name="modelId"
              [disabled]="isGenerating"
            >
              <option *ngFor="let model of models" [value]="model.model_id">
                {{ model.name }} ({{ model.quantization }} | {{ model.base_vram_mb }}MB VRAM)
                {{ model.is_candidate ? '[Candidate]' : '[Production]' }}
              </option>
            </select>
          </div>

          <!-- Row: Resolution & FPS -->
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label text-secondary small fw-bold">Resolution</label>
              <select
                class="form-select bg-black text-light border-secondary"
                [(ngModel)]="selectedResolution"
                name="resolution"
                [disabled]="isGenerating"
              >
                <option value="256x256">256 x 256 (Fast Preview)</option>
                <option value="512x512">512 x 512 (Standard HD)</option>
                <option value="768x432">768 x 432 (16:9 Widescreen)</option>
                <option value="768x768">768 x 768 (Square High)</option>
              </select>
            </div>
            <div class="col-6">
              <label class="form-label text-secondary small fw-bold">FPS</label>
              <select
                class="form-select bg-black text-light border-secondary"
                [(ngModel)]="fps"
                name="fps"
                [disabled]="isGenerating"
              >
                <option [ngValue]="12">12 FPS (Smooth Fast)</option>
                <option [ngValue]="16">16 FPS (Balanced)</option>
                <option [ngValue]="24">24 FPS (Cinematic)</option>
                <option [ngValue]="30">30 FPS (High Motion)</option>
              </select>
            </div>
          </div>

          <!-- Row: Duration & Steps -->
          <div class="row g-2 mb-3">
            <div class="col-6">
              <label class="form-label text-secondary small fw-bold">Duration (Seconds)</label>
              <input
                type="number"
                class="form-control bg-black text-light border-secondary"
                [(ngModel)]="durationSeconds"
                name="durationSeconds"
                min="1.0"
                max="6.0"
                step="0.5"
                [disabled]="isGenerating"
              />
            </div>
            <div class="col-6">
              <label class="form-label text-secondary small fw-bold">Sampling Steps (1-50)</label>
              <input
                type="number"
                class="form-control bg-black text-light border-secondary"
                [(ngModel)]="steps"
                name="steps"
                min="1"
                max="50"
                [disabled]="isGenerating"
              />
            </div>
          </div>

          <!-- Row: Seed & Format -->
          <div class="row g-2 mb-4">
            <div class="col-6">
              <label class="form-label text-secondary small fw-bold">Random Seed</label>
              <input
                type="number"
                class="form-control bg-black text-light border-secondary"
                placeholder="Random"
                [(ngModel)]="seed"
                name="seed"
                [disabled]="isGenerating"
              />
            </div>
            <div class="col-6">
              <label class="form-label text-secondary small fw-bold">Output Format</label>
              <select
                class="form-select bg-black text-light border-secondary"
                [(ngModel)]="outputFormat"
                name="outputFormat"
                [disabled]="isGenerating"
              >
                <option value="MP4">MP4 (H.264 / mp4v)</option>
                <option value="WEBM">WEBM (VP9)</option>
              </select>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="d-grid gap-2">
            <button
              type="submit"
              class="btn btn-info text-dark fw-bold py-2"
              [disabled]="isGenerating || !prompt.trim()"
            >
              <span *ngIf="isGenerating" class="spinner-border spinner-border-sm me-2"></span>
              <i *ngIf="!isGenerating" class="bi bi-play-circle-fill me-2"></i>
              {{ isGenerating ? 'Generating Video...' : 'Generate Local Video' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class VideoGenerationFormComponent {
  @Input() models: VideoModelDefinitionDTO[] = [];
  @Input() isGenerating = false;
  @Output() generate = new EventEmitter<VideoGenerationRequestDTO>();

  prompt = '';
  negativePrompt = '';
  selectedModelId = 'svd-xt-local';
  selectedResolution = '512x512';
  fps = 24;
  durationSeconds = 2.0;
  steps = 25;
  seed: number | null = null;
  outputFormat: VideoFormat = 'MP4';

  onSubmit(): void {
    if (!this.prompt.trim()) return;

    const [wStr, hStr] = this.selectedResolution.split('x');
    const width = parseInt(wStr, 10) || 512;
    const height = parseInt(hStr, 10) || 512;

    this.generate.emit({
      prompt: this.prompt.trim(),
      negative_prompt: this.negativePrompt.trim() || null,
      model_id: this.selectedModelId,
      width,
      height,
      fps: this.fps,
      duration_seconds: this.durationSeconds,
      steps: this.steps,
      seed: this.seed,
      output_format: this.outputFormat,
      chunk_duration_seconds: 2.0,
    });
  }
}
