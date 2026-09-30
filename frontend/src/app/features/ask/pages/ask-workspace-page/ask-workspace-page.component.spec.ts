import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AskWorkspacePageComponent } from './ask-workspace-page.component';
import { AgentAttentionService } from '../../../../core/services/agent-attention.service';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { AgentApiService, BackendAttentionItem } from '../../../../core/api/agent-api.service';

describe('AskWorkspacePageComponent', () => {
  let component: AskWorkspacePageComponent;
  let fixture: ComponentFixture<AskWorkspacePageComponent>;
  let mockAttentionService: any;
  let mockAgentApi: Partial<AgentApiService>;
  const approvalsSignal = signal<BackendAttentionItem[]>([]);

  beforeEach(async () => {
    approvalsSignal.set([]);
    mockAttentionService = {
      attentionItems: signal<BackendAttentionItem[]>([]),
      hasApprovals: signal<boolean>(false),
      activeApprovals: approvalsSignal,
      refreshAttention: vi.fn().mockResolvedValue(undefined),
      handleConsent: vi.fn().mockResolvedValue(true)
    };

    mockAgentApi = {
      submitCommand: vi.fn().mockResolvedValue({
        command_id: 'cmd_1',
        status: 'COMPLETED',
        accepted: true,
        message: 'Done',
        created_at: Date.now()
      })
    };

    await TestBed.configureTestingModule({
      imports: [AskWorkspacePageComponent],
      providers: [
        provideRouter([]),
        { provide: AgentAttentionService, useValue: mockAttentionService },
        { provide: AgentApiService, useValue: mockAgentApi },
        OperatorStateService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AskWorkspacePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the ask workspace page', () => {
    expect(component).toBeTruthy();
  });

  it('should render the autonomous workspace header title', () => {
    const el = fixture.nativeElement as HTMLElement;
    const title = el.querySelector('.workspace-title');
    expect(title?.textContent).toContain('What should ABHI do for you?');
  });

  it('should render quick autonomous gateway cards', () => {
    const el = fixture.nativeElement as HTMLElement;
    const cards = el.querySelectorAll('.gateway-card');
    expect(cards.length).toBe(4);
  });

  it('should call handleConsent on approve button click', async () => {
    approvalsSignal.set([
      {
        item_id: 'attn_1',
        type: 'APPROVAL',
        title: 'Consent needed',
        message: 'Test task approval',
        target_id: 'task_123',
        timestamp: Date.now(),
        priority: 3
      }
    ]);
    mockAttentionService.hasApprovals = signal(true);
    fixture.detectChanges();

    await component.handleApprove('task_123');
    expect(mockAttentionService.handleConsent).toHaveBeenCalledWith('task_123', true);
  });
});
