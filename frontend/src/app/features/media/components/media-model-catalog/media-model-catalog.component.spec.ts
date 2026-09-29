import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { MediaModelCatalogComponent } from './media-model-catalog.component';
import { ImageModelDefinitionDTO } from '../../models/media.model';

describe('MediaModelCatalogComponent', () => {
  let component: MediaModelCatalogComponent;
  let fixture: ComponentFixture<MediaModelCatalogComponent>;

  const mockModels: ImageModelDefinitionDTO[] = [
    {
      model_id: 'sd-turbo-local',
      name: 'SD-Turbo Local',
      version: '1.0.0',
      digest: 'sha256:1234567890abcdef',
      runtime: 'Local-Diffusion-Engine',
      format: 'Diffusers-Local',
      quantization: 'FP16',
      supported_devices: ['GPU', 'CPU'],
      base_vram_mb: 3200.0,
      base_ram_mb: 2048.0,
      gpu_compute_percent: 60.0,
      supported_resolutions: [[512, 512]],
      max_batch: 4,
      capabilities: ['text-to-image'],
      license_metadata: 'Open-RAIL',
      source: 'local-verified',
      status: 'AVAILABLE',
      is_production: true,
      is_candidate: false,
    },
    {
      model_id: 'flux-schnell-candidate',
      name: 'Flux-Schnell (Candidate)',
      version: '0.9.1',
      digest: 'sha256:fedcba0987654321',
      runtime: 'Local-Diffusion-Engine',
      format: 'Diffusers-Local',
      quantization: 'INT8',
      supported_devices: ['GPU', 'CPU'],
      base_vram_mb: 5500.0,
      base_ram_mb: 4096.0,
      gpu_compute_percent: 85.0,
      supported_resolutions: [[1024, 1024]],
      max_batch: 2,
      capabilities: ['text-to-image'],
      license_metadata: 'Apache-2.0',
      source: 'local-candidate',
      status: 'AVAILABLE',
      is_production: false,
      is_candidate: true,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaModelCatalogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MediaModelCatalogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('models', mockModels);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render correct number of models', () => {
    expect(component.models().length).toBe(2);
  });

  it('should display production and candidate badges correctly', () => {
    const prodModel = component.models().find((m) => m.is_production);
    const candModel = component.models().find((m) => m.is_candidate);

    expect(prodModel?.name).toBe('SD-Turbo Local');
    expect(candModel?.name).toBe('Flux-Schnell (Candidate)');
  });
});
