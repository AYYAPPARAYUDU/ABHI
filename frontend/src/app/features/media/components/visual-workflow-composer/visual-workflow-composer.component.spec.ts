import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VisualWorkflowComposerComponent } from './visual-workflow-composer.component';
import { MediaService } from '../../services/media.service';
import { of } from 'rxjs';

describe('VisualWorkflowComposerComponent', () => {
  let component: VisualWorkflowComposerComponent;
  let fixture: ComponentFixture<VisualWorkflowComposerComponent>;
  let mediaService: MediaService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisualWorkflowComposerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(VisualWorkflowComposerComponent);
    component = fixture.componentInstance;
    mediaService = TestBed.inject(MediaService);
  });

  it('should create visual workflow composer component', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle palette visibility', () => {
    expect(component.showPalette()).toBe(false);
    component.togglePalette();
    expect(component.showPalette()).toBe(true);
    component.togglePalette();
    expect(component.showPalette()).toBe(false);
  });

  it('should add a node when addNode is called', () => {
    expect(component.nodesList().length).toBe(0);
    component.addNode({
      skill_id: 'media.image.generate',
      label: 'Image Synthesis',
      icon: '🎨',
    });
    expect(component.nodesList().length).toBe(1);
    expect(component.nodesList()[0].skill_id).toBe('media.image.generate');
  });

  it('should remove a node by ID', () => {
    component.addNode({
      skill_id: 'media.image.generate',
      label: 'Image Synthesis',
      icon: '🎨',
    });
    const nid = component.nodesList()[0].node_id;
    component.removeNode(nid);
    expect(component.nodesList().length).toBe(0);
  });

  it('should construct valid workflow with sequential edges', () => {
    component.addNode({
      skill_id: 'media.image.generate',
      label: 'Image Synthesis',
      icon: '🎨',
    });
    component.addNode({
      skill_id: 'media.video.generate',
      label: 'Video Generation',
      icon: '🎬',
    });

    const wf = component.buildWorkflow();
    expect(wf.title).toBe(component.workflowTitle);
    expect(wf.edges.length).toBe(1);
    expect(wf.edges[0].source_node_id).toBe(component.nodesList()[0].node_id);
    expect(wf.edges[0].target_node_id).toBe(component.nodesList()[1].node_id);
  });

  it('should call mediaService simulateWorkflow on onSimulate', () => {
    const spy = vi.spyOn(mediaService, 'simulateWorkflow').mockReturnValue(of({} as any));
    component.addNode({
      skill_id: 'media.image.generate',
      label: 'Image Synthesis',
      icon: '🎨',
    });
    component.onSimulate();
    expect(spy).toHaveBeenCalled();
  });

  it('should call mediaService executeWorkflow on onExecute', () => {
    const spy = vi.spyOn(mediaService, 'executeWorkflow').mockReturnValue(of({} as any));
    component.addNode({
      skill_id: 'media.image.generate',
      label: 'Image Synthesis',
      icon: '🎨',
    });
    component.onExecute();
    expect(spy).toHaveBeenCalled();
  });

  it('should load template into composer nodes and title', () => {
    const mockTmpl = {
      template_id: 'creative.narrated_clip@1.0.0',
      title: 'Narrated Clip Production',
      description: 'Generates voiceover and combines with image to video',
      version: '1.0.0',
      nodes: [
        {
          node_id: 'n_img',
          title: 'Generate Base Image',
          skill_id: 'media.image.generate',
          parameters: { prompt: 'Cosmic station' },
          status: 'PENDING' as const,
        },
        {
          node_id: 'n_tts',
          title: 'Generate Narration',
          skill_id: 'audio.tts',
          parameters: { text: 'Welcome aboard the station.' },
          status: 'PENDING' as const,
        },
      ],
      edges: [],
    };

    component.loadTemplate(mockTmpl);
    expect(component.workflowTitle).toBe('Narrated Clip Production');
    expect(component.workflowGoal).toBe('Generates voiceover and combines with image to video');
    expect(component.nodesList().length).toBe(2);
  });

  it('should assign correct default parameters for TTS, video generation and composition', () => {
    component.addNode({ skill_id: 'audio.tts', label: 'Audio Speech Synthesis', icon: '🎙️' });
    component.addNode({ skill_id: 'media.video.generate', label: 'Video Generation', icon: '🎬' });
    component.addNode({ skill_id: 'media.video.compose', label: 'Multimodal Video Mux', icon: '🎞️' });

    const nodes = component.nodesList();
    expect(nodes[0].parameters['text']).toBeDefined();
    expect(nodes[1].parameters['duration_seconds']).toBe(2.0);
    expect(nodes[2].parameters['profile']).toBe('VIDEO_PLUS_AUDIO');
  });

  it('should handle port type mappings for audio and video in sequential edge generation', () => {
    component.addNode({ skill_id: 'audio.tts', label: 'Audio Speech Synthesis', icon: '🎙️' });
    component.addNode({ skill_id: 'media.video.compose', label: 'Multimodal Video Mux', icon: '🎞️' });

    const wf = component.buildWorkflow();
    expect(wf.edges.length).toBe(1);
    expect(wf.edges[0].port_type).toBe('AUDIO');
  });

  it('should ignore loadTemplate when template has no nodes', () => {
    const initialLen = component.nodesList().length;
    component.loadTemplate(null);
    expect(component.nodesList().length).toBe(initialLen);
    component.loadTemplate({} as any);
    expect(component.nodesList().length).toBe(initialLen);
  });
});
