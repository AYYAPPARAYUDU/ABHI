import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageGenerationFormComponent } from './image-generation-form.component';

describe('ImageGenerationFormComponent', () => {
  let component: ImageGenerationFormComponent;
  let fixture: ComponentFixture<ImageGenerationFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageGenerationFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ImageGenerationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should update resolution when calling setResolution', () => {
    component.setResolution(768, 768);
    expect(component.width()).toBe(768);
    expect(component.height()).toBe(768);
  });

  it('should not emit generate event when prompt is empty', () => {
    const emitSpy = vi.spyOn(component.generate, 'emit');
    component.prompt.set('   ');
    component.onSubmit();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should emit generate event with valid request parameters', () => {
    const emitSpy = vi.spyOn(component.generate, 'emit');
    component.prompt.set('A mystical glowing cave');
    component.selectedModelId.set('sd-turbo-local');
    component.steps.set(25);
    component.onSubmit();

    expect(emitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'A mystical glowing cave',
        model_id: 'sd-turbo-local',
        steps: 25,
      })
    );
  });
});
