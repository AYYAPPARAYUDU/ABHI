import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkflowPageComponent } from './workflow-page.component';
import { WorkflowService } from '../../services/workflow.service';

describe('WorkflowPageComponent', () => {
  let component: WorkflowPageComponent;
  let fixture: ComponentFixture<WorkflowPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkflowPageComponent],
      providers: [
        WorkflowService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render header', () => {
    expect(component).toBeTruthy();
    expect(component.selectedAutonomy).toBe('LEVEL_3');
  });

  it('should submit new goal when text is present', async () => {
    const service = TestBed.inject(WorkflowService);
    const spy = vi.spyOn(service, 'submitGoal').mockResolvedValue('task_mock_123');

    component.newGoalText = 'Extract text and save';
    await component.onSubmitGoal();

    expect(spy).toHaveBeenCalledWith('Extract text and save', 'LEVEL_3');
    expect(component.newGoalText).toBe('');
  });
});
