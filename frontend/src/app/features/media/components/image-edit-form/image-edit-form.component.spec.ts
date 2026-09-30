import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImageEditFormComponent } from './image-edit-form.component';
import {
  MediaArtifactDTO,
  ImageEditModelDefinitionDTO,
  ImageEditRequestDTO,
} from '../../models/media.model';

describe('ImageEditFormComponent', () => {
  let component: ImageEditFormComponent;
  let fixture: ComponentFixture<ImageEditFormComponent>;

  const mockArtifact: MediaArtifactDTO = {
    artifact_id: 'art_source_edit_test',
    job_id: 'job_gen_02',
    media_type: 'IMAGE',
    path: '/media/images/2026/09/input.png',
    filename: 'input.png',
    format: 'PNG',
    width: 512,
    height: 512,
    size_bytes: 310000,
    sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    created_at: Date.now(),
    model_id: 'sd-turbo-local',
    model_version: '1.0',
    generation_parameters_hash: 'hash456',
    prompt_preview: 'A modern cybernetic workstation',
    provenance: 'ACTUAL',
  };

  const mockEditModels: ImageEditModelDefinitionDTO[] = [
    {
      model_id: 'instruct-pix2pix-local',
      name: 'InstructPix2Pix Local',
      version: '1.0',
      digest: 'sha256:abcd',
      runtime: 'diffusers',
      format: 'safetensors',
      quantization: 'fp16',
      supported_devices: ['GPU', 'CPU'],
      base_vram_mb: 3200,
      base_ram_mb: 4000,
      gpu_compute_percent: 65,
      supported_resolutions: [[512, 512]],
      supported_operations: ['IMAGE_TO_IMAGE'],
      max_expansion_pixels: 512,
      capabilities: ['image_editing'],
      license_metadata: 'CreativeML',
      source: 'local',
      status: 'AVAILABLE',
      is_production: true,
      is_candidate: false,
    },
    {
      model_id: 'sdxl-inpainting-local',
      name: 'SDXL Inpainting Local',
      version: '1.0',
      digest: 'sha256:efgh',
      runtime: 'diffusers',
      format: 'safetensors',
      quantization: 'fp16',
      supported_devices: ['GPU', 'CPU'],
      base_vram_mb: 4800,
      base_ram_mb: 6000,
      gpu_compute_percent: 75,
      supported_resolutions: [[512, 512]],
      supported_operations: ['INPAINTING'],
      max_expansion_pixels: 512,
      capabilities: ['inpainting'],
      license_metadata: 'OpenRAIL',
      source: 'local',
      status: 'AVAILABLE',
      is_production: true,
      is_candidate: false,
    },
    {
      model_id: 'kandinsky-outpainting-candidate',
      name: 'Kandinsky Outpainting Candidate',
      version: '2.2',
      digest: 'sha256:ijkl',
      runtime: 'diffusers',
      format: 'safetensors',
      quantization: 'fp16',
      supported_devices: ['GPU', 'CPU'],
      base_vram_mb: 4200,
      base_ram_mb: 5000,
      gpu_compute_percent: 70,
      supported_resolutions: [[512, 512]],
      supported_operations: ['OUTPAINTING'],
      max_expansion_pixels: 512,
      capabilities: ['outpainting'],
      license_metadata: 'Apache-2.0',
      source: 'local',
      status: 'AVAILABLE',
      is_production: false,
      is_candidate: true,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageEditFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageEditFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('sourceArtifact', mockArtifact);
    fixture.componentRef.setInput('editModels', mockEditModels);
    fixture.detectChanges();
  });

  it('should create the edit form', () => {
    expect(component).toBeTruthy();
  });

  it('should switch edit operations and filter compatible models', () => {
    component.setOperation('INPAINTING');
    expect(component.operation()).toBe('INPAINTING');
    expect(component.selectedModelId()).toBe('sdxl-inpainting-local');

    component.setOperation('OUTPAINTING');
    expect(component.operation()).toBe('OUTPAINTING');
    expect(component.selectedModelId()).toBe('kandinsky-outpainting-candidate');

    component.setOperation('IMAGE_TO_IMAGE');
    expect(component.operation()).toBe('IMAGE_TO_IMAGE');
    expect(component.selectedModelId()).toBe('instruct-pix2pix-local');
  });

  it('should disable submit when prompt is empty or source is missing', () => {
    component.prompt.set('');
    expect(component.isSubmitDisabled()).toBe(true);

    component.prompt.set('Change color to emerald green');
    expect(component.isSubmitDisabled()).toBe(false);

    fixture.componentRef.setInput('sourceArtifact', null);
    expect(component.isSubmitDisabled()).toBe(true);
  });

  it('should require mask for inpainting before submit is enabled', () => {
    component.setOperation('INPAINTING');
    component.prompt.set('Add sunglasses on subject');
    fixture.componentRef.setInput('maskBase64', null);
    expect(component.isSubmitDisabled()).toBe(true);

    fixture.componentRef.setInput('maskBase64', 'data:image/png;base64,mockMask');
    expect(component.isSubmitDisabled()).toBe(false);
  });

  it('should emit ImageEditRequestDTO on valid submit', async () => {
    component.prompt.set('Make it oil painting style');
    component.strength.set(0.65);
    component.steps.set(25);

    const emitPromise = new Promise<ImageEditRequestDTO>((resolve) => {
      component.editSubmitted.subscribe((req: ImageEditRequestDTO) => {
        resolve(req);
      });
    });

    component.onSubmit();
    const req = await emitPromise;
    expect(req.source_artifact_id).toBe('art_source_edit_test');
    expect(req.operation).toBe('IMAGE_TO_IMAGE');
    expect(req.prompt).toBe('Make it oil painting style');
    expect(req.strength).toBe(0.65);
    expect(req.steps).toBe(25);
  });
});
