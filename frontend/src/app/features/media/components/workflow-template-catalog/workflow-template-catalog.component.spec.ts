import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkflowTemplateCatalogComponent } from './workflow-template-catalog.component';
import { MediaWorkflowTemplate } from '../../models/media.model';

describe('WorkflowTemplateCatalogComponent', () => {
  let component: WorkflowTemplateCatalogComponent;
  let fixture: ComponentFixture<WorkflowTemplateCatalogComponent>;

  const mockTemplates: MediaWorkflowTemplate[] = [
    {
      template_id: 'creative.text_to_image@1.0.0',
      title: 'Text to Local Image',
      description: 'Generates high fidelity local artwork from prompt',
      version: '1.0.0',
      category: 'creative',
      tags: ['text2img', 'image'],
      nodes: {
        node_1: {
          node_id: 'node_1',
          title: 'Generate Image',
          skill_id: 'media.image.generate',
          parameters: { prompt: 'Cosmic vista' },
        },
      },
      edges: [],
      is_builtin: true,
    },
    {
      template_id: 'creative.image_to_video@1.0.0',
      title: 'Image to Video Animation',
      description: 'Animates still images into temporal videos',
      version: '1.0.0',
      category: 'video',
      tags: ['animation', 'video'],
      nodes: {
        node_1: {
          node_id: 'node_1',
          title: 'Generate Image',
          skill_id: 'media.image.generate',
          parameters: {},
        },
        node_2: {
          node_id: 'node_2',
          title: 'Animate Video',
          skill_id: 'media.video.generate',
          parameters: {},
        },
      },
      edges: [],
      is_builtin: true,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowTemplateCatalogComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowTemplateCatalogComponent);
    component = fixture.componentInstance;
  });

  it('should create template catalog component', () => {
    expect(component).toBeTruthy();
  });

  it('should calculate correct node count for templates', () => {
    expect(component.getNodeCount(mockTemplates[0])).toBe(1);
    expect(component.getNodeCount(mockTemplates[1])).toBe(2);
  });

  it('should emit templateSelected when onSelect is called', () => {
    let selected: MediaWorkflowTemplate | null = null;
    component.templateSelected.subscribe((tmpl) => (selected = tmpl));

    component.onSelect(mockTemplates[0]);
    expect(selected).toEqual(mockTemplates[0]);
  });

  it('should return 0 node count for template without nodes', () => {
    expect(component.getNodeCount({} as any)).toBe(0);
    expect(component.getNodeCount({ nodes: null } as any)).toBe(0);
  });

  it('should calculate node count correctly when nodes is an array', () => {
    const arrayTmpl: MediaWorkflowTemplate = {
      template_id: 'tmpl_array',
      title: 'Array Template',
      description: 'Array format',
      version: '1.0.0',
      category: 'testing',
      nodes: [
        { node_id: 'n1', title: 'Step 1', skill_id: 'media.image.generate', parameters: {} },
        { node_id: 'n2', title: 'Step 2', skill_id: 'media.video.generate', parameters: {} },
        { node_id: 'n3', title: 'Step 3', skill_id: 'media.video.compose', parameters: {} },
      ] as any,
      edges: [],
      is_builtin: false,
    };
    expect(component.getNodeCount(arrayTmpl)).toBe(3);
  });

  it('should render template cards when input signal changes', () => {
    fixture.componentRef.setInput('templates', mockTemplates);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Text to Local Image');
    expect(compiled.textContent).toContain('Image to Video Animation');
  });
});
