import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkflowSimulationPanelComponent } from './workflow-simulation-panel.component';
import { MediaWorkflowSimulationResult } from '../../models/media.model';

describe('WorkflowSimulationPanelComponent', () => {
  let component: WorkflowSimulationPanelComponent;
  let fixture: ComponentFixture<WorkflowSimulationPanelComponent>;

  const mockSimulation: MediaWorkflowSimulationResult = {
    workflow_id: 'wf_sim_01',
    workflow_hash: 'hash_sim_123',
    node_count: 3,
    estimated_duration_sec: 14.5,
    peak_vram_mb: 4200,
    peak_ram_mb: 6144,
    estimated_storage_mb: 45.0,
    required_skills: ['media.image.generate', 'media.video.generate'],
    required_models: ['sd-turbo-local', 'svd-xt-local'],
    bottlenecks: [],
    feasible: true,
    warnings: [],
    provenance: 'ESTIMATED',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowSimulationPanelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowSimulationPanelComponent);
    component = fixture.componentInstance;
  });

  it('should create simulation panel component', () => {
    expect(component).toBeTruthy();
  });

  it('should render empty state when no simulation result provided', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Click "Simulate Workflow"');
  });

  it('should render simulation metrics when provided', () => {
    fixture.componentRef.setInput('simulation', mockSimulation);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('4,200 MB');
    expect(compiled.textContent).toContain('FEASIBLE');
  });

  it('should render infeasible badge and warnings when workflow is not feasible', () => {
    const infeasibleSim: MediaWorkflowSimulationResult = {
      ...mockSimulation,
      feasible: false,
      bottlenecks: ['Required VRAM (9000 MB) exceeds available headroom (6000 MB)'],
      warnings: ['Host RAM pressure critical'],
    };
    fixture.componentRef.setInput('simulation', infeasibleSim);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('INFEASIBLE');
    expect(compiled.textContent).toContain('Required VRAM (9000 MB) exceeds available headroom');
    expect(compiled.textContent).toContain('Host RAM pressure critical');
  });

  it('should format estimated duration and required skills', () => {
    fixture.componentRef.setInput('simulation', mockSimulation);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('14.5s');
    expect(compiled.textContent).toContain('media.image.generate');
    expect(compiled.textContent).toContain('media.video.generate');
  });
});
