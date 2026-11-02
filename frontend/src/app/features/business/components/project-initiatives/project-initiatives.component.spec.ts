import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectInitiativesComponent } from './project-initiatives.component';
import { BusinessProject } from '../../models/business.model';

describe('ProjectInitiativesComponent', () => {
  let component: ProjectInitiativesComponent;
  let fixture: ComponentFixture<ProjectInitiativesComponent>;

  const mockProject: BusinessProject = {
    id: 'proj_test',
    sector_id: 'software_tools',
    name: 'Test Project',
    objective: 'Test objective for initiatives',
    autonomy_level: 3,
    autopilot_mode: 'LOCAL_BUILD_AUTOPILOT',
    status: 'ACTIVE',
    budget_limit_usd: 100,
    spent_usd: 20,
    milestones: [
      {
        id: 'm1',
        project_id: 'proj_test',
        title: 'Milestone 1',
        description: 'First milestone',
        status: 'COMPLETED',
        deliverable_ref: 'docs/test.md',
        verified: true,
        created_at: '2026-01-01',
      },
    ],
    tasks: [],
    evidences: [],
    expenses: [],
    revenue_records: [],
    approvals: [],
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectInitiativesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectInitiativesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('projects', [mockProject]);
    fixture.componentRef.setInput('selectedProject', mockProject);
    fixture.detectChanges();
  });

  it('should create project initiatives component', () => {
    expect(component).toBeTruthy();
  });

  it('should render project details and milestones', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('PROJECT INITIATIVES');
    expect(compiled.textContent).toContain('Test Project');
    expect(compiled.textContent).toContain('Milestone 1');
    expect(compiled.textContent).toContain('PHYSICALLY VERIFIED');
  });

  it('should emit step execution event', () => {
    let executedId = '';
    component.executeStep.subscribe((id) => (executedId = id));
    component.onExecuteStep('proj_test');
    expect(executedId).toBe('proj_test');
  });

  it('should return correct autonomy descriptions', () => {
    expect(component.getAutonomyDescription(0)).toContain('Level 0 — Observe Only');
    expect(component.getAutonomyDescription(3)).toContain('Level 3 — Local build');
  });
});
