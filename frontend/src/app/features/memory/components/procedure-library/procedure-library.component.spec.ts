import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProcedureLibraryComponent } from './procedure-library.component';
import { ProcedureModel } from '../../models/memory.model';

describe('ProcedureLibraryComponent', () => {
  let component: ProcedureLibraryComponent;
  let fixture: ComponentFixture<ProcedureLibraryComponent>;

  const mockProcedure: ProcedureModel = {
    procedure_id: 'proc_test_01',
    name: 'Test Workflow',
    description: 'A test procedure',
    trigger_conditions: ['test'],
    required_skills: ['file_create'],
    parameters: [],
    steps: [
      {
        step_index: 1,
        skill_id: 'file_create',
        action_name: 'create',
        parameters: {},
        timeout_seconds: 30
      }
    ],
    metrics: {
      invocation_count: 5,
      success_count: 5,
      failure_count: 0,
      success_rate: 1.0,
      average_duration_ms: 1200,
      recovery_rate: 0.0,
      replan_rate: 0.0
    },
    version: '1.0.0',
    confidence: 0.95,
    status: 'ACTIVE'
  };

  const mockCandidate: ProcedureModel = {
    ...mockProcedure,
    procedure_id: 'proc_cand_02',
    name: 'Candidate Workflow',
    status: 'CANDIDATE'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcedureLibraryComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ProcedureLibraryComponent);
    component = fixture.componentInstance;
    component.procedures = [mockProcedure, mockCandidate];
    fixture.detectChanges();
  });

  it('should create procedure library component', () => {
    expect(component).toBeTruthy();
  });

  it('should render procedure card and metrics', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Test Workflow');
    expect(compiled.textContent).toContain('100%');
    expect(compiled.textContent).toContain('v1.0.0');
  });

  it('should emit procedureSelected when clicked', () => {
    let selectedId: string | null = null;
    component.procedureSelected.subscribe((id) => (selectedId = id));

    const card = fixture.nativeElement.querySelector('.procedure-card') as HTMLElement;
    card.click();

    expect(selectedId).toBe('proc_test_01');
  });

  it('should emit promoteProcedure when promote button is clicked on candidate', () => {
    let promotedId: string | null = null;
    component.promoteProcedure.subscribe((id) => (promotedId = id));

    component.onPromote(new MouseEvent('click'), 'proc_cand_02');
    expect(promotedId).toBe('proc_cand_02');
  });

  it('should emit deprecateProcedure when deprecate is confirmed', () => {
    let deprecatedPayload: any = null;
    component.deprecateProcedure.subscribe((p) => (deprecatedPayload = p));

    vi.spyOn(window, 'prompt').mockReturnValue('Obsolete tool');
    component.onDeprecate(new MouseEvent('click'), 'proc_test_01');

    expect(deprecatedPayload).toEqual({ id: 'proc_test_01', reason: 'Obsolete tool' });
  });

  it('should return correct status badge class', () => {
    expect(component.getStatusBadgeClass('ACTIVE')).toContain('text-success');
    expect(component.getStatusBadgeClass('CANDIDATE')).toContain('text-warning');
    expect(component.getStatusBadgeClass('DEPRECATED')).toContain('text-danger');
    expect(component.getStatusBadgeClass('UNKNOWN')).toContain('text-muted');
  });

  it('should show empty placeholder when procedures list is empty', () => {
    fixture.componentRef.setInput('procedures', []);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No Procedures Available');
  });
});
