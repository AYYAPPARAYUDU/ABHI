import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelLifecycleCardComponent } from './model-lifecycle-card.component';
import { ModelInstanceRecordDTO } from '../../models/resource.model';

describe('ModelLifecycleCardComponent', () => {
  let component: ModelLifecycleCardComponent;
  let fixture: ComponentFixture<ModelLifecycleCardComponent>;

  const mockModel: ModelInstanceRecordDTO = {
    instance_id: 'inst_1',
    model_id: 'qwen3:8b',
    model_tag: 'abhi:latest',
    model_digest: 'sha256:500a1',
    format: 'GGUF',
    quantization: 'Q4_K_M',
    parameter_count: '8B',
    context_length: 8192,
    runtime: 'Ollama-Local',
    state: 'REGISTERED',
    health: 'HEALTHY',
    device: 'GPU',
    use_count: 0,
    estimated_memory_mb: 5200.0,
    prompt_tokens_processed: 0,
    generated_tokens_produced: 0,
    estimated_kv_cache_mb: 0.0,
    is_production: true,
    is_candidate: false,
    is_warm: false,
    failure_count: 0,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModelLifecycleCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ModelLifecycleCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('model', mockModel);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should emit load event when clicking load', () => {
    const loadSpy = vi.spyOn(component.load, 'emit');
    component.onLoad();
    expect(loadSpy).toHaveBeenCalledWith('qwen3:8b');
  });

  it('should identify whether model is loaded', () => {
    expect(component.isLoaded()).toBe(false);
  });

  it('should emit unload event when clicking unload', () => {
    const unloadSpy = vi.spyOn(component.unload, 'emit');
    component.onUnload();
    expect(unloadSpy).toHaveBeenCalledWith({ modelId: 'qwen3:8b', force: false });
  });

  it('should return true for isLoaded when state is LOADED or IN_USE', () => {
    fixture.componentRef.setInput('model', { ...mockModel, state: 'LOADED' });
    fixture.detectChanges();
    expect(component.isLoaded()).toBe(true);

    fixture.componentRef.setInput('model', { ...mockModel, state: 'IN_USE' });
    fixture.detectChanges();
    expect(component.isLoaded()).toBe(true);
  });
});
