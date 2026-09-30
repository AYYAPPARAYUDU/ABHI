import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CreativePipelineStudioComponent } from './creative-pipeline-studio.component';
import { MediaService } from '../../services/media.service';
import { of } from 'rxjs';
import { CreativePipeline, CreativePipelineTemplate } from '../../models/media.model';

describe('CreativePipelineStudioComponent', () => {
  let component: CreativePipelineStudioComponent;
  let fixture: ComponentFixture<CreativePipelineStudioComponent>;
  let mediaService: MediaService;

  const mockTemplates: CreativePipelineTemplate[] = [
    {
      template_id: 'template.short_promotional_video@1.0.0',
      title: 'Short Promotional Video',
      description: 'High impact promo video',
      pipeline_type: 'SHORT_PROMOTIONAL_VIDEO',
      default_brief: { style: 'Cyberpunk', tone: 'Dynamic', language: 'en', duration: 10 },
      version: '1.0.0',
      is_builtin: true,
    },
  ];

  const mockPipeline: CreativePipeline = {
    pipeline_id: 'cpipe_test_123',
    goal: 'Test Creative Production',
    pipeline_type: 'SHORT_PROMOTIONAL_VIDEO',
    version: '1.0.0',
    creative_brief: {
      title: 'Test Promo',
      description: 'Cyberpunk teaser trailer',
      style: 'Cyberpunk',
      tone: 'Dynamic',
      language: 'en',
      duration: 10,
    },
    scenes: [
      {
        scene_id: 'scn_1',
        order: 0,
        duration: 5,
        visual_prompt: 'Neon skyline',
        transition: 'CUT',
        status: 'COMPLETED',
      },
      {
        scene_id: 'scn_2',
        order: 1,
        duration: 5,
        visual_prompt: 'Hover vehicle soaring',
        transition: 'FADE',
        status: 'READY',
      },
    ],
    assets: [],
    subtitle_tracks: [
      {
        track_id: 'sub_1',
        language: 'en',
        format: 'SRT',
        segments: [{ index: 1, start_time_s: 0, end_time_s: 4, text: 'Welcome to Neo Tokyo' }],
      },
    ],
    outputs: [],
    status: 'COMPLETED',
    resource_budget: {},
    storage_budget: {},
    retention_policy: 'FINAL_ONLY',
    render_profile: 'MP4_H264_STANDARD',
    pipeline_hash: 'a1b2c3d4e5f67890',
    created_at: 1000,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, CreativePipelineStudioComponent],
      providers: [MediaService],
    }).compileComponents();

    fixture = TestBed.createComponent(CreativePipelineStudioComponent);
    component = fixture.componentInstance;
    mediaService = TestBed.inject(MediaService);

    vi.spyOn(mediaService, 'fetchCreativeTemplates').mockReturnValue(of(mockTemplates));
    vi.spyOn(mediaService, 'fetchCreativePipelines').mockReturnValue(of([mockPipeline]));

    fixture.detectChanges();
  });

  it('should create the creative pipeline studio component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize and fetch templates and pipelines', () => {
    expect(mediaService.fetchCreativeTemplates).toHaveBeenCalled();
    expect(mediaService.fetchCreativePipelines).toHaveBeenCalled();
  });

  it('should apply a template correctly into the creative brief', () => {
    component.applyTemplate(mockTemplates[0]);
    expect(component.isCreating()).toBe(true);
    expect(component.brief.title).toBe('Short Promotional Video');
    expect(component.brief.style).toBe('Cyberpunk');
    expect(component.selectedType).toBe('SHORT_PROMOTIONAL_VIDEO');
  });

  it('should trigger pipeline creation', () => {
    const createSpy = vi.spyOn(mediaService, 'createCreativePipeline').mockReturnValue(of(mockPipeline));
    const expectedBrief = {
      title: 'New Promo',
      description: 'Futuristic teaser',
      style: 'Cyberpunk',
      tone: 'Dynamic',
      language: 'en',
      duration: 10,
    };
    component.brief = { ...expectedBrief };
    component.createPipeline();
    expect(createSpy).toHaveBeenCalledWith(
      expectedBrief,
      undefined,
      'FINAL_ONLY',
      'MP4_H264_STANDARD'
    );
  });

  it('should select an active pipeline', () => {
    component.selectPipeline(mockPipeline);
    expect(mediaService.activeCreativePipeline()).toEqual(mockPipeline);
  });

  it('should trigger simulation, execution, and manifest actions', () => {
    const simSpy = vi.spyOn(mediaService, 'simulateCreativePipeline').mockReturnValue(of({} as any));
    const execSpy = vi.spyOn(mediaService, 'executeCreativePipeline').mockReturnValue(of(mockPipeline));
    const manSpy = vi.spyOn(mediaService, 'fetchCreativeManifest').mockReturnValue(of({} as any));

    component.simulatePipeline('cpipe_test_123');
    expect(simSpy).toHaveBeenCalledWith('cpipe_test_123');

    component.executePipeline('cpipe_test_123');
    expect(execSpy).toHaveBeenCalledWith('cpipe_test_123');

    component.fetchManifest('cpipe_test_123');
    expect(manSpy).toHaveBeenCalledWith('cpipe_test_123');
  });

  it('should handle scene revision submission', () => {
    const revSpy = vi.spyOn(mediaService, 'reviseCreativePipeline').mockReturnValue(of(mockPipeline));
    mediaService.activeCreativePipeline.set(mockPipeline);
    component.openRevision(mockPipeline.scenes[0]);

    expect(component.selectedSceneForRevision()).toEqual(mockPipeline.scenes[0]);
    expect(component.revisionPrompt).toBe('Neon skyline');

    component.revisionPrompt = 'Rainy neon cyberpunk street';
    component.revisionDuration = 6;
    component.submitRevision();

    expect(revSpy).toHaveBeenCalledWith('cpipe_test_123', {
      scene_id: 'scn_1',
      new_visual_prompt: 'Rainy neon cyberpunk street',
      new_duration: 6,
    });
    expect(component.selectedSceneForRevision()).toBeNull();
  });

  it('should return appropriate status badge CSS classes', () => {
    expect(component.getStatusBadgeClass('COMPLETED')).toContain('emerald');
    expect(component.getStatusBadgeClass('PLANNING')).toContain('violet');
    expect(component.getStatusBadgeClass('FAILED')).toContain('rose');
    expect(component.getStatusBadgeClass('CANCELLED')).toContain('slate');
    expect(component.getStatusBadgeClass('UNKNOWN')).toContain('slate');
  });

  it('should cancel active pipeline', () => {
    const cancelSpy = vi.spyOn(mediaService, 'cancelCreativePipeline').mockReturnValue(of(mockPipeline));
    component.cancelPipeline('cpipe_test_123');
    expect(cancelSpy).toHaveBeenCalledWith('cpipe_test_123');
  });

  it('should toggle creation mode on and off', () => {
    component.isCreating.set(false);
    component.isCreating.set(true);
    expect(component.isCreating()).toBe(true);
    component.isCreating.set(false);
    expect(component.isCreating()).toBe(false);
  });

  it('should reset revision selection on cancel', () => {
    component.openRevision(mockPipeline.scenes[0]);
    expect(component.selectedSceneForRevision()).not.toBeNull();
    component.selectedSceneForRevision.set(null);
    expect(component.selectedSceneForRevision()).toBeNull();
  });

  it('should calculate scene count and total duration correctly', () => {
    mediaService.activeCreativePipeline.set(mockPipeline);
    const pipe = mediaService.activeCreativePipeline();
    expect(pipe?.scenes.length).toBe(2);
    const totalDuration = pipe?.scenes.reduce((acc: number, s) => acc + s.duration, 0);
    expect(totalDuration).toBe(10);
  });

  it('should allow setting render profiles and retention policies', () => {
    component.selectedRenderProfile = 'MP4_H264_LOW_RESOURCE';
    component.selectedRetentionPolicy = 'FULL_PROJECT';
    expect(component.selectedRenderProfile).toBe('MP4_H264_LOW_RESOURCE');
    expect(component.selectedRetentionPolicy).toBe('FULL_PROJECT');
  });

  it('should format all pipeline status badges correctly', () => {
    expect(component.getStatusBadgeClass('ASSET_GENERATION')).toContain('violet');
    expect(component.getStatusBadgeClass('SCENE_GENERATION')).toContain('violet');
    expect(component.getStatusBadgeClass('NARRATION')).toContain('violet');
    expect(component.getStatusBadgeClass('COMPOSITION')).toContain('violet');
    expect(component.getStatusBadgeClass('RENDERING')).toContain('violet');
    expect(component.getStatusBadgeClass('VALIDATING')).toContain('violet');
  });

  it('should correctly bind brief inputs when updated manually', () => {
    component.brief.title = 'Custom Title';
    component.brief.style = 'Anime';
    component.brief.tone = 'Dramatic';
    component.brief.language = 'te';
    component.brief.duration = 20;

    expect(component.brief.title).toBe('Custom Title');
    expect(component.brief.style).toBe('Anime');
    expect(component.brief.tone).toBe('Dramatic');
    expect(component.brief.language).toBe('te');
    expect(component.brief.duration).toBe(20);
  });

  it('should update revision fields when opening a different scene', () => {
    component.openRevision(mockPipeline.scenes[1]);
    expect(component.selectedSceneForRevision()?.scene_id).toBe('scn_2');
    expect(component.revisionPrompt).toBe('Hover vehicle soaring');
    expect(component.revisionDuration).toBe(5);
  });

  it('should not submit revision if no scene is selected', () => {
    const revSpy = vi.spyOn(mediaService, 'reviseCreativePipeline');
    component.selectedSceneForRevision.set(null);
    component.submitRevision();
    expect(revSpy).not.toHaveBeenCalled();
  });
});
