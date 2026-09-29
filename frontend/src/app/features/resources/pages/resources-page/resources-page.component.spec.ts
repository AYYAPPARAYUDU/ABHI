import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of } from 'rxjs';
import { ResourcesPageComponent } from './resources-page.component';
import { ResourceService } from '../../services/resource.service';

describe('ResourcesPageComponent', () => {
  let component: ResourcesPageComponent;
  let fixture: ComponentFixture<ResourcesPageComponent>;
  let resourceService: ResourceService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResourcesPageComponent, HttpClientTestingModule],
      providers: [ResourceService],
    }).compileComponents();

    resourceService = TestBed.inject(ResourceService);
    vi.spyOn(resourceService, 'fetchSummary').mockReturnValue(of({} as any));
    vi.spyOn(resourceService, 'setOperatingMode').mockReturnValue(of({} as any));
    vi.spyOn(resourceService, 'loadModel').mockReturnValue(of({} as any));
    vi.spyOn(resourceService, 'unloadModel').mockReturnValue(of({} as any));
    vi.spyOn(resourceService, 'reconcileOrphans').mockReturnValue(of({} as any));

    fixture = TestBed.createComponent(ResourcesPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the page component', () => {
    expect(component).toBeTruthy();
  });

  it('should render page title and subtitle', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Resource & Model Lifecycle Manager');
    expect(compiled.textContent).toContain('Local-First deterministic CPU, RAM, GPU, VRAM');
  });

  it('should call service methods on actions', () => {
    component.onModeChange('PERFORMANCE');
    expect(resourceService.setOperatingMode).toHaveBeenCalledWith('PERFORMANCE');

    component.onLoadModel('qwen3:8b');
    expect(resourceService.loadModel).toHaveBeenCalledWith('qwen3:8b');

    component.onUnloadModel({ modelId: 'qwen3:8b', force: false });
    expect(resourceService.unloadModel).toHaveBeenCalledWith('qwen3:8b', false);

    component.onReconcile();
    expect(resourceService.reconcileOrphans).toHaveBeenCalled();
  });
});
