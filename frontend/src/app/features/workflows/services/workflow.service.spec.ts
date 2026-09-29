import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkflowService } from './workflow.service';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WorkflowService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(WorkflowService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created with initial demo state and computed properties', () => {
    expect(service).toBeTruthy();
    expect(service.activeWorkflow()).toBeTruthy();
    expect(service.currentPlanNodes().length).toBe(3);
    expect(service.progressPercentage()).toBe(33.3);
    expect(service.hasPendingHandoff()).toBe(false);
    expect(service.pendingHandoff()).toBeNull();
  });

  it('should submit a new goal and load the returned task', async () => {
    const submitPromise = service.submitGoal('Extract invoices from Downloads and summarize', 'LEVEL_3');

    const reqSubmit = httpMock.expectOne('http://127.0.0.1:8000/api/v1/workflows/submit');
    expect(reqSubmit.request.method).toBe('POST');
    expect(reqSubmit.request.body).toEqual({
      goal: 'Extract invoices from Downloads and summarize',
      autonomy_level: 'LEVEL_3'
    });

    reqSubmit.flush({
      task_id: 'task_new_999',
      goal_id: 'g_new_999',
      plan_id: 'p_new_999_v1',
      version: 1,
      estimated_cost: 3.0
    });

    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));

    const reqLoad = httpMock.expectOne('http://127.0.0.1:8000/api/v1/workflows/task_new_999');
    expect(reqLoad.request.method).toBe('GET');
    reqLoad.flush({
      task_id: 'task_new_999',
      is_paused: false,
      goal: {
        goal_id: 'g_new_999',
        original_request: 'Extract invoices from Downloads and summarize',
        normalized_goal: 'Extract invoices from Downloads and summarize',
        constraints: [],
        required_outcome: 'Completed',
        prohibited_actions: [],
        success_criteria: ['Done'],
        risk_level: 'LOW',
        autonomy_level: 'LEVEL_3',
        created_at_ts: Date.now()
      },
      active_plan: {
        plan_id: 'p_new_999_v1',
        goal_id: 'g_new_999',
        version: 1,
        is_active: true,
        risk_summary: 'LOW',
        estimated_cost: 3.0,
        estimated_duration_ms: 5000,
        created_at_ts: Date.now(),
        milestones: [],
        nodes: {}
      },
      plan_history: [],
      world_state: { last_updated_ts: Date.now(), freshness_threshold_ms: 30000, facts: {} },
      evaluation: {
        status: 'READY',
        completed_milestones: [],
        completed_nodes_count: 0,
        total_nodes_count: 1,
        progress_percentage: 0.0,
        replan_needed: false,
        explanation: 'Ready to start'
      },
      handoff_requests: []
    });

    const taskId = await submitPromise;
    expect(taskId).toBe('task_new_999');
    expect(service.activeWorkflow()?.task_id).toBe('task_new_999');
  });

  it('should start workflow execution', async () => {
    const startPromise = service.startWorkflow('wf_demo_01');
    const req = httpMock.expectOne('http://127.0.0.1:8000/api/v1/workflows/wf_demo_01/start');
    expect(req.request.method).toBe('POST');
    req.flush({
      status: 'COMPLETED',
      completed_milestones: ['Discover Documents', 'Read & Synthesize'],
      completed_nodes_count: 3,
      total_nodes_count: 3,
      progress_percentage: 100.0,
      replan_needed: false,
      explanation: 'Workflow completed successfully.'
    });

    await startPromise;
    expect(service.activeWorkflow()?.evaluation?.status).toBe('COMPLETED');
    expect(service.activeWorkflow()?.evaluation?.progress_percentage).toBe(100.0);
  });

  it('should pause and resume workflow', async () => {
    const pausePromise = service.pauseWorkflow('wf_demo_01');
    const reqPause = httpMock.expectOne('http://127.0.0.1:8000/api/v1/workflows/wf_demo_01/pause');
    reqPause.flush({ status: 'PAUSED' });
    await pausePromise;
    expect(service.activeWorkflow()?.is_paused).toBe(true);

    const resumePromise = service.resumeWorkflow('wf_demo_01');
    const reqResume = httpMock.expectOne('http://127.0.0.1:8000/api/v1/workflows/wf_demo_01/resume');
    reqResume.flush({ status: 'RESUMED' });
    await resumePromise;
    expect(service.activeWorkflow()?.is_paused).toBe(false);
  });

  it('should cancel workflow and resolve handoff requests', async () => {
    // Set a handoff request
    service.activeWorkflow.update((wf) =>
      wf
        ? {
            ...wf,
            handoff_requests: [
              {
                handoff_id: 'ho_01',
                task_id: 'wf_demo_01',
                goal_id: 'g_demo_01',
                plan_id: 'p1',
                node_id: 'step_2',
                reason: 'AUTHENTICATION_REQUIRED',
                message: 'Authentication required to proceed',
                description: 'Please sign in to bank account',
                required_action: 'Complete MFA',
                completed_steps: 1,
                total_steps: 3,
                next_action_description: 'Continue extraction',
                resolved: false,
                created_at_ts: Date.now()
              }
            ]
          }
        : null
    );
    expect(service.hasPendingHandoff()).toBe(true);
    expect(service.pendingHandoff()?.handoff_id).toBe('ho_01');

    const resolvePromise = service.resolveHandoff('wf_demo_01', 'ho_01', 'Operator signed in manually');
    const reqHandoff = httpMock.expectOne('http://127.0.0.1:8000/api/v1/workflows/wf_demo_01/resolve-handoff');
    expect(reqHandoff.request.method).toBe('POST');
    reqHandoff.flush({ status: 'RESOLVED' });
    await resolvePromise;

    expect(service.hasPendingHandoff()).toBe(false);
    expect(service.activeWorkflow()?.handoff_requests[0].resolved).toBe(true);
  });
});
