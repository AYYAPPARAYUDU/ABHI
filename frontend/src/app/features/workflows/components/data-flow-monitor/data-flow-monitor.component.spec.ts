import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DataFlowMonitorComponent } from './data-flow-monitor.component';

describe('DataFlowMonitorComponent', () => {
  let component: DataFlowMonitorComponent;
  let fixture: ComponentFixture<DataFlowMonitorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataFlowMonitorComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DataFlowMonitorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and format policy badges', () => {
    expect(component).toBeTruthy();
    expect(component.getPolicyBadgeClass('ALLOWED')).toBe('policy-allowed');
    expect(component.getPolicyBadgeClass('DENIED')).toBe('policy-denied');
    expect(component.getPolicyBadgeClass('CONSENT_REQUIRED')).toBe('policy-consent');
    expect(component.getPolicyBadgeClass('PENDING')).toBe('policy-pending');
  });

  it('should handle dataFlows input properly', () => {
    fixture.componentRef.setInput('dataFlows', [
      {
        transfer_id: 'tf_1',
        task_id: 't_1',
        source_application: 'Notepad',
        source_object: 'note.txt',
        data_classification: 'LOCAL_FILE',
        destination_application: 'Browser',
        transfer_reason: 'Upload note',
        policy_decision: 'ALLOWED',
        timestamp: 1000
      }
    ]);
    fixture.detectChanges();
    expect(component.dataFlows().length).toBe(1);
    expect(component.dataFlows()[0].source_application).toBe('Notepad');
  });
});
