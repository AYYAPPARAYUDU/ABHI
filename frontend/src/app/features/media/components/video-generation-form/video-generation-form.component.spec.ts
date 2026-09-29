import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VideoGenerationFormComponent } from './video-generation-form.component';
import { VideoModelDefinitionDTO } from '../../models/media.model';

describe('VideoGenerationFormComponent', () => {
  let component: VideoGenerationFormComponent;
  let fixture: ComponentFixture<VideoGenerationFormComponent>;

  const mockModels: VideoModelDefinitionDTO[] = [
    {
      model_id: 'svd-xt-local',
      name: 'Stable Video Diffusion XT Local',
      version: '1.1.0',
      digest: 'sha256:7e3d1a9b4c8f205e',
      runtime: 'Local-Video-Diffusion-Engine',
      format: 'Diffusers-Video',
      quantization: 'FP16',
      supported_devices: ['GPU', 'CPU'],
      base_vram_mb: 4200.0,
      per_second_vram_mb: 280.0,
      base_ram_mb: 3072.0,
      gpu_compute_percent: 75.0,
      supported_resolutions: [[512, 512], [768, 432]],
      supported_fps: [12, 16, 24],
      max_duration_seconds: 4.0,
      supported_operations: ['TEXT_TO_VIDEO'],
      capabilities: ['text-to-video'],
      license_metadata: 'Open-RAIL',
      source: 'local',
      status: 'AVAILABLE',
      is_production: true,
      is_candidate: false,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoGenerationFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VideoGenerationFormComponent);
    component = fixture.componentInstance;
    component.models = mockModels;
    fixture.detectChanges();
  });

  it('should create the video generation form component', () => {
    expect(component).toBeTruthy();
  });

  it('should not emit generate event if prompt is empty', () => {
    vi.spyOn(component.generate, 'emit');
    component.prompt = '   ';
    component.onSubmit();
    expect(component.generate.emit).not.toHaveBeenCalled();
  });

  it('should emit parsed video generation request when form is submitted', () => {
    vi.spyOn(component.generate, 'emit');
    component.prompt = 'A running stallion in the snow';
    component.selectedResolution = '768x432';
    component.fps = 24;
    component.durationSeconds = 3.0;
    component.steps = 30;
    component.seed = 1234;
    component.outputFormat = 'MP4';

    component.onSubmit();

    expect(component.generate.emit).toHaveBeenCalledWith({
      prompt: 'A running stallion in the snow',
      negative_prompt: null,
      model_id: 'svd-xt-local',
      width: 768,
      height: 432,
      fps: 24,
      duration_seconds: 3.0,
      steps: 30,
      seed: 1234,
      output_format: 'MP4',
      chunk_duration_seconds: 2.0,
    });
  });

  it('should handle custom negative prompt when provided', () => {
    vi.spyOn(component.generate, 'emit');
    component.prompt = 'Ocean waves';
    component.negativePrompt = 'blur, static';
    component.onSubmit();

    expect(component.generate.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'Ocean waves',
        negative_prompt: 'blur, static',
      })
    );
  });

  it('should initialize with standard default values', () => {
    expect(component.selectedModelId).toBe('svd-xt-local');
    expect(component.selectedResolution).toBe('512x512');
    expect(component.fps).toBe(24);
    expect(component.durationSeconds).toBe(2.0);
    expect(component.steps).toBe(25);
    expect(component.outputFormat).toBe('MP4');
  });

  it('should parse 768x768 resolution correctly', () => {
    vi.spyOn(component.generate, 'emit');
    component.prompt = 'Mountain peak';
    component.selectedResolution = '768x768';
    component.onSubmit();

    expect(component.generate.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 768,
        height: 768,
      })
    );
  });

  it('should fallback to 512x512 if resolution string is malformed', () => {
    vi.spyOn(component.generate, 'emit');
    component.prompt = 'Mountain peak';
    component.selectedResolution = 'invalid';
    component.onSubmit();

    expect(component.generate.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        width: 512,
        height: 512,
      })
    );
  });

  it('should support WEBM output format selection', () => {
    vi.spyOn(component.generate, 'emit');
    component.prompt = 'Sun flare animation';
    component.outputFormat = 'WEBM';
    component.onSubmit();

    expect(component.generate.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        output_format: 'WEBM',
      })
    );
  });
});
