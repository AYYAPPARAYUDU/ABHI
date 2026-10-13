import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { DecisionPipelinePageComponent } from './decision-pipeline-page.component';
import { DecisionPipelineService } from '../../../../core/services/decision-pipeline.service';
import { ThemeService } from '../../../../core/services/theme.service';

describe('DecisionPipelinePageComponent', () => {
  let component: DecisionPipelinePageComponent;
  let fixture: ComponentFixture<DecisionPipelinePageComponent>;
  let pipelineService: DecisionPipelineService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DecisionPipelinePageComponent],
      providers: [
        provideHttpClient(),
        DecisionPipelineService,
        ThemeService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DecisionPipelinePageComponent);
    component = fixture.componentInstance;
    pipelineService = TestBed.inject(DecisionPipelineService);
    fixture.detectChanges();
  });

  it('should create decision pipeline page component', () => {
    expect(component).toBeTruthy();
  });

  it('should have 12 production use cases loaded in service', () => {
    const cases = component.useCases();
    expect(cases.length).toBe(12);
    const ids = cases.map((c) => c.id);
    expect(ids).toContain('email');
    expect(ids).toContain('trading');
    expect(ids).toContain('agents');
    expect(ids).toContain('leads');
    expect(ids).toContain('youtube');
  });

  it('should have active use case with nodes and connections', () => {
    const active = component.activeCase();
    expect(active).toBeTruthy();
    expect(active?.nodes.length).toBeGreaterThan(0);
    expect(active?.connections.length).toBeGreaterThan(0);
  });

  it('should switch active use case when selectUseCase is called', () => {
    const tradingCase = component.useCases().find((u) => u.id === 'trading');
    expect(tradingCase).toBeTruthy();
    component.selectUseCase(tradingCase!);
    expect(component.activeCase()?.id).toBe('trading');

    const contractsCase = component.useCases().find((u) => u.id === 'contracts');
    expect(contractsCase).toBeTruthy();
    component.selectUseCase(contractsCase!);
    expect(component.activeCase()?.id).toBe('contracts');
  });

  it('should switch phase tabs (STATE, ASK, GATE, CODE)', () => {
    expect(component.selectedTab()).toBe('JEV');
    component.setTab('ASK');
    expect(component.selectedTab()).toBe('ASK');
    component.setTab('GATE');
    expect(component.selectedTab()).toBe('GATE');
    component.setTab('CODE');
    expect(component.selectedTab()).toBe('CODE');
  });

  it('should select and deselect a node in the inspector drawer', () => {
    const activeCase = component.activeCase();
    expect(activeCase).toBeTruthy();
    const firstNode = activeCase!.nodes[0];

    component.onNodeClick(firstNode);
    expect(component.selectedNode()).toEqual(firstNode);

    component.closeNodeInspector();
    expect(component.selectedNode()).toBeNull();
  });

  it('should trigger decision evaluation successfully', async () => {
    await component.runLiveEvaluation(false);
    const newTrace = component.lastTrace();
    expect(newTrace).toBeTruthy();
    expect(newTrace?.confidence).toBeGreaterThan(0.5);
    expect(['APPROVED', 'CONSENT_REQUIRED', 'REJECTED']).toContain(newTrace?.decision_verdict);
  });

  it('should render oscilloscope waveform canvas in DOM', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const canvas = compiled.querySelector('canvas.scope-canvas');
    expect(canvas).toBeTruthy();
  });

  it('should render DAG SVG container with conduits and nodes', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const svg = compiled.querySelector('svg.pipeline-svg-canvas');
    expect(svg).toBeTruthy();
    const paths = compiled.querySelectorAll('svg.pipeline-svg-canvas path');
    expect(paths.length).toBeGreaterThan(0);
    const nodeGroups = compiled.querySelectorAll('svg.pipeline-svg-canvas g.dag-node-group');
    expect(nodeGroups.length).toBeGreaterThan(0);
  });
});
