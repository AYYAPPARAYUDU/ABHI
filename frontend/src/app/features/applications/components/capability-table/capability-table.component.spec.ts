import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CapabilityTableComponent } from './capability-table.component';
import { CapabilityItem } from '../../models/application.model';

describe('CapabilityTableComponent', () => {
  let component: CapabilityTableComponent;
  let fixture: ComponentFixture<CapabilityTableComponent>;

  const mockCaps: CapabilityItem[] = [
    {
      capability_name: 'open',
      skill_id: 'app.notepad.open',
      risk_level: 'LOW',
      description: 'Launch Notepad',
      verification_policy: 'WINDOW_EXISTS'
    },
    {
      capability_name: 'read_text',
      skill_id: 'app.notepad.read_text',
      risk_level: 'READ_ONLY',
      description: 'Read document text',
      verification_policy: 'TEXT_EXTRACTED'
    },
    {
      capability_name: 'type_text',
      risk_level: 'MEDIUM',
      skill_id: 'app.notepad.type_text',
      description: 'Type text into document',
      verification_policy: 'DOCUMENT_CONTENT_MATCH'
    },
    {
      capability_name: 'close_unsaved',
      risk_level: 'HIGH',
      skill_id: 'app.notepad.close',
      description: 'Close without saving',
      verification_policy: 'WINDOW_CLOSED'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CapabilityTableComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CapabilityTableComponent);
    component = fixture.componentInstance;
    component.capabilities = mockCaps;
    fixture.detectChanges();
  });

  it('should create capability table component', () => {
    expect(component).toBeTruthy();
  });

  it('should render all capability rows', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('app.notepad.open');
    expect(compiled.textContent).toContain('app.notepad.read_text');
    expect(compiled.textContent).toContain('app.notepad.type_text');
    expect(compiled.textContent).toContain('app.notepad.close');
  });

  it('should format risk badges correctly', () => {
    expect(component.getRiskBadgeClass('READ_ONLY')).toContain('text-info');
    expect(component.getRiskBadgeClass('LOW')).toContain('text-success');
    expect(component.getRiskBadgeClass('MEDIUM')).toContain('text-warning');
    expect(component.getRiskBadgeClass('HIGH')).toContain('text-danger');
    expect(component.getRiskBadgeClass('CRITICAL')).toContain('text-danger');
  });
});
