import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AgentCommandService } from './agent-command.service';
import { OperatorStateService } from './operator-state.service';
import { AgentApiService } from '../api/agent-api.service';

describe('AgentCommandService', () => {
  let service: AgentCommandService;
  let agentApi: AgentApiService;
  let operatorState: OperatorStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([]),
        AgentCommandService,
        OperatorStateService,
        AgentApiService
      ]
    });
    service = TestBed.inject(AgentCommandService);
    agentApi = TestBed.inject(AgentApiService);
    operatorState = TestBed.inject(OperatorStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should map mathematical backend response correctly', async () => {
    vi.spyOn(agentApi, 'submitCommand').mockResolvedValue({
      command_id: 'cmd_math_1',
      status: 'COMPLETED',
      accepted: true,
      message: 'Result: 6000',
      result: {
        result_type: 'NUMBER_RESULT',
        title: 'Calculation Complete',
        summary: '125 * 48 = 6000',
        data: { expression: '125 * 48', value: 6000 }
      },
      created_at: Date.now()
    });

    const result = await service.submitCommand('calculate 125 * 48');
    expect(result).toBeTruthy();
    expect(result?.type).toBe('NUMBER_RESULT');
    expect(result?.numberValue).toBe(6000);
    expect(result?.title).toBe('Calculation Complete');
  });

  it('should dispatch general goals to Authoritative Backend Gateway', async () => {
    vi.spyOn(agentApi, 'submitCommand').mockResolvedValue({
      command_id: 'cmd_task_1',
      task_id: 'task_calc_123',
      status: 'PLANNING',
      accepted: true,
      message: 'Goal accepted: Open Calculator',
      result: {
        result_type: 'APPLICATION_RESULT',
        title: 'Open Calculator',
        summary: 'ABHI is planning and dispatching the task.',
        data: { task_id: 'task_calc_123' }
      },
      created_at: Date.now()
    });

    const result = await service.submitCommand('Open Calculator');
    expect(agentApi.submitCommand).toHaveBeenCalled();
    expect(result?.taskId).toBe('task_calc_123');
    expect(result?.type).toBe('APPLICATION_RESULT');
  });

  it('should filter out sensitive commands from history', async () => {
    vi.spyOn(agentApi, 'submitCommand').mockResolvedValue({
      command_id: 'cmd_sec_1',
      status: 'COMPLETED',
      accepted: true,
      message: 'Done',
      created_at: Date.now()
    });

    await service.submitCommand('My secret password is 123456');
    const history = service.commandHistory();
    const hasSecret = history.some(h => h.text.includes('password'));
    expect(hasSecret).toBe(false);
  });

  it('should dismiss active result cleanly', async () => {
    vi.spyOn(agentApi, 'submitCommand').mockResolvedValue({
      command_id: 'cmd_1',
      status: 'COMPLETED',
      accepted: true,
      message: 'Result: 30',
      result: {
        result_type: 'NUMBER_RESULT',
        title: 'Calculation Complete',
        summary: '10 + 20 = 30',
        data: { expression: '10 + 20', value: 30 }
      },
      created_at: Date.now()
    });

    await service.submitCommand('calculate 10 + 20');
    expect(service.activeResult()).toBeTruthy();
    service.dismissResult();
    expect(service.activeResult()).toBeNull();
  });
});
