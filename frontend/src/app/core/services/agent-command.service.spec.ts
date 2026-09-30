import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AgentCommandService } from './agent-command.service';
import { OperatorStateService } from './operator-state.service';
import { TaskApiService } from '../api/task-api.service';

describe('AgentCommandService', () => {
  let service: AgentCommandService;
  let apiService: TaskApiService;
  let operatorState: OperatorStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([]),
        AgentCommandService,
        OperatorStateService,
        TaskApiService
      ]
    });
    service = TestBed.inject(AgentCommandService);
    apiService = TestBed.inject(TaskApiService);
    operatorState = TestBed.inject(OperatorStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should evaluate mathematical intent instantly', async () => {
    const result = await service.submitCommand('calculate 125 times 48');
    expect(result).toBeTruthy();
    expect(result?.type).toBe('NUMBER_RESULT');
    expect(result?.numberValue).toBe(6000);
    expect(result?.title).toBe('Calculation Completed');
  });

  it('should evaluate expression with plus and minus correctly', async () => {
    const result = await service.submitCommand('what is 250 - 50 + 25');
    expect(result).toBeTruthy();
    expect(result?.type).toBe('NUMBER_RESULT');
    expect(result?.numberValue).toBe(225);
  });

  it('should route media search intents to search result projection', async () => {
    const result = await service.submitCommand('find my cyberpunk images');
    expect(result).toBeTruthy();
    expect(result?.type).toBe('SEARCH_RESULTS');
    expect(result?.searchResults?.length).toBeGreaterThan(0);
  });

  it('should dispatch general goals to Authoritative Backend Supervisor', async () => {
    vi.spyOn(apiService, 'submitTask').mockResolvedValue({
      task_id: 'task_calc_123',
      goal: 'Open Calculator',
      state: 'PLANNING'
    } as any);

    const result = await service.submitCommand('Open Calculator');
    expect(apiService.submitTask).toHaveBeenCalledWith('Open Calculator');
    expect(result?.taskId).toBe('task_calc_123');
    expect(result?.type).toBe('APPLICATION_RESULT');
  });

  it('should filter out sensitive commands from history', async () => {
    await service.submitCommand('My secret password is 123456');
    const history = service.commandHistory();
    const hasSecret = history.some(h => h.text.includes('password'));
    expect(hasSecret).toBe(false);
  });

  it('should dismiss active result cleanly', async () => {
    await service.submitCommand('calculate 10 + 20');
    expect(service.activeResult()).toBeTruthy();
    service.dismissResult();
    expect(service.activeResult()).toBeNull();
  });
});
