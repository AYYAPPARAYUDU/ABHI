import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MaskCanvasEditorComponent } from './mask-canvas-editor.component';
import { MediaArtifactDTO } from '../../models/media.model';

describe('MaskCanvasEditorComponent', () => {
  let component: MaskCanvasEditorComponent;
  let fixture: ComponentFixture<MaskCanvasEditorComponent>;

  const mockArtifact: MediaArtifactDTO = {
    artifact_id: 'art_source_test_01',
    job_id: 'job_gen_01',
    media_type: 'IMAGE',
    path: '/media/images/2026/09/source.png',
    filename: 'source.png',
    format: 'PNG',
    width: 512,
    height: 512,
    size_bytes: 250000,
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    created_at: Date.now(),
    model_id: 'sd-turbo-local',
    model_version: '1.0',
    generation_parameters_hash: 'hash123',
    prompt_preview: 'A peaceful forest landscape',
    provenance: 'ACTUAL',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaskCanvasEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MaskCanvasEditorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('sourceArtifact', mockArtifact);
    fixture.detectChanges();
  });

  it('should create the mask canvas editor', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle tools between brush and eraser', () => {
    expect(component.currentTool()).toBe('brush');
    component.setTool('eraser');
    expect(component.currentTool()).toBe('eraser');
    component.setTool('brush');
    expect(component.currentTool()).toBe('brush');
  });

  it('should allow modifying brush size and overlay opacity', () => {
    component.brushSize.set(50);
    expect(component.brushSize()).toBe(50);
    component.overlayOpacity.set(0.9);
    expect(component.overlayOpacity()).toBe(0.9);
  });

  it('should clear canvas and reset mask stats', () => {
    component.clearMask();
    expect(component.isMaskEmpty()).toBe(true);
    expect(component.editAreaRatio()).toBe('0.0');
  });

  it('should invert mask pixels', () => {
    component.invertMask();
    // After inverting from empty, entire mask is filled
    expect(component.isMaskEmpty()).toBe(false);
  });

  it('should emit base64 mask when applied', async () => {
    component.invertMask(); // produce non-empty mask
    const emitPromise = new Promise<string>((resolve) => {
      component.maskApplied.subscribe((base64: string) => {
        resolve(base64);
      });
    });
    component.emitMaskApplied();
    const result = await emitPromise;
    expect(result).toContain('data:image/png;base64');
  });
});
