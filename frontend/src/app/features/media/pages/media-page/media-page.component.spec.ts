import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MediaPageComponent } from './media-page.component';
import { MediaService } from '../../services/media.service';
import { of } from 'rxjs';

describe('MediaPageComponent', () => {
  let component: MediaPageComponent;
  let fixture: ComponentFixture<MediaPageComponent>;
  let mediaService: MediaService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaPageComponent, HttpClientTestingModule],
      providers: [MediaService],
    }).compileComponents();

    mediaService = TestBed.inject(MediaService);
    vi.spyOn(mediaService, 'refreshAll').mockImplementation(() => {});

    fixture = TestBed.createComponent(MediaPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the media page component', () => {
    expect(component).toBeTruthy();
  });

  it('should call refreshAll on initialization', () => {
    expect(mediaService.refreshAll).toHaveBeenCalled();
  });

  it('should switch between composer, edit, video and image studio tabs', () => {
    expect(component.activeTab()).toBe('composer');
    component.activeTab.set('edit');
    expect(component.activeTab()).toBe('edit');
    component.activeTab.set('video');
    expect(component.activeTab()).toBe('video');
    component.activeTab.set('image');
    expect(component.activeTab()).toBe('image');
    component.activeTab.set('composer');
    expect(component.activeTab()).toBe('composer');
  });

  it('should handle onTemplateSelected by delegating to workflowComposer if present', () => {
    const mockTmpl = {
      template_id: 'creative.text_to_image@1.0.0',
      title: 'Text to Image',
      version: '1.0.0',
      description: 'Generates image',
      category: 'CREATIVE',
      is_builtin: true,
      nodes: [],
      edges: [],
      default_parameters: {},
    };
    component.workflowComposer = {
      loadTemplate: vi.fn(),
    } as any;
    component.onTemplateSelected(mockTmpl as any);
    expect(component.workflowComposer?.loadTemplate).toHaveBeenCalledWith(mockTmpl);
  });

  it('should delegate edit and inpainting calls to service', () => {
    const editSpy = vi.spyOn(mediaService, 'editImage').mockReturnValue(of({} as any));
    const inpaintSpy = vi.spyOn(mediaService, 'inpaintImage').mockReturnValue(of({} as any));
    const outpaintSpy = vi.spyOn(mediaService, 'outpaintImage').mockReturnValue(of({} as any));

    component.onEditSubmitted({
      source_artifact_id: 'art_123',
      operation: 'IMAGE_TO_IMAGE',
      prompt: 'Make it sunset',
      model_id: 'instruct-pix2pix-local',
    });
    expect(editSpy).toHaveBeenCalled();

    component.onEditSubmitted({
      source_artifact_id: 'art_123',
      operation: 'INPAINTING',
      prompt: 'Add crown',
      model_id: 'sdxl-inpainting-local',
      mask_base64: 'data:image/png;base64,mock',
    });
    expect(inpaintSpy).toHaveBeenCalled();

    component.onEditSubmitted({
      source_artifact_id: 'art_123',
      operation: 'OUTPAINTING',
      prompt: 'Extend hills',
      model_id: 'kandinsky-outpainting-candidate',
      outpaint_bounds: { top: 0, bottom: 0, left: 128, right: 128 },
    });
    expect(outpaintSpy).toHaveBeenCalled();
  });

  it('should delegate video generation and deletion calls to service', () => {
    const generateSpy = vi.spyOn(mediaService, 'generateVideo').mockReturnValue(of({} as any));
    const cancelSpy = vi.spyOn(mediaService, 'cancelVideoJob').mockReturnValue(of({} as any));
    const deleteSpy = vi.spyOn(mediaService, 'deleteVideoArtifact').mockReturnValue(of({} as any));

    component.onGenerateVideo({
      prompt: 'A flying dragon',
      model_id: 'svd-xt-local',
      width: 512,
      height: 512,
      fps: 24,
      duration_seconds: 2.0,
      steps: 25,
      output_format: 'MP4',
    });
    expect(generateSpy).toHaveBeenCalled();

    component.onCancelVideoJob('job_123');
    expect(cancelSpy).toHaveBeenCalledWith('job_123');

    component.onDeleteVideoArtifact('art_123');
    expect(deleteSpy).toHaveBeenCalledWith('art_123');
  });

  it('should clear error messages when requested', () => {
    mediaService.errorMessage.set('Test image error');
    mediaService.videoErrorMessage.set('Test video error');
    mediaService.editErrorMessage.set('Test edit error');

    component.clearErrors();

    expect(mediaService.errorMessage()).toBeNull();
    expect(mediaService.videoErrorMessage()).toBeNull();
    expect(mediaService.editErrorMessage()).toBeNull();
  });

  it('should initialize activeTab with composer default', () => {
    expect(component.activeTab()).toBe('composer');
  });

  it('should handle video generation error state without crashing', () => {
    mediaService.videoErrorMessage.set('Generation failed: Out of VRAM');
    fixture.detectChanges();
    expect(mediaService.videoErrorMessage()).toBe('Generation failed: Out of VRAM');
  });

  it('should trigger image generation and cancellation handlers', () => {
    const genSpy = vi.spyOn(mediaService, 'generateImage').mockReturnValue(of({} as any));
    const cancelSpy = vi.spyOn(mediaService, 'cancelJob').mockReturnValue(of({} as any));
    const delSpy = vi.spyOn(mediaService, 'deleteArtifact').mockReturnValue(of({} as any));

    component.onGenerateImage({
      prompt: 'A sunset landscape',
      model_id: 'sd-turbo-local',
      width: 512,
      height: 512,
      steps: 20,
      output_format: 'PNG',
    });
    expect(genSpy).toHaveBeenCalled();

    component.onCancelImageJob('job_img_1');
    expect(cancelSpy).toHaveBeenCalledWith('job_img_1');

    component.onDeleteImageArtifact('art_img_1');
    expect(delSpy).toHaveBeenCalledWith('art_img_1');
  });

  it('should compute vramFreeMB and activeJobsCount via service signals', () => {
    expect(mediaService.vramFreeMB()).toBeDefined();
    expect(mediaService.activeJobsCount()).toBe(0);
  });
});
