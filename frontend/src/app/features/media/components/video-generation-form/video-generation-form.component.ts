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
  templateUrl: './video-generation-form.component.html',
  styleUrl: './video-generation-form.component.css',
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
