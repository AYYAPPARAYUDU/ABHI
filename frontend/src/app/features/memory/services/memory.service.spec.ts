import { TestBed } from '@angular/core/testing';
import { MemoryService } from './memory.service';
import { TaskApiService } from '../../../core/api/task-api.service';

describe('MemoryService', () => {
  let service: MemoryService;
  let apiServiceMock: Partial<TaskApiService>;

  beforeEach(() => {
    apiServiceMock = {
      listMemories: vi.fn().mockResolvedValue({
        memories: [
          {
            memory_id: 'mem_1',
            memory_type: 'PREFERENCE',
            title: 'Preferred Editor',
            summary: 'User preferred editor is VS Code',
            category: 'editor',
            confidence: 1.0,
            privacy_class: 'user_provided',
            privacy_classification: 'PERSONAL',
            status: 'ACTIVE',
            source: 'USER_EXPLICIT',
            tags: ['editor', 'vscode']
          }
        ],
        total: 1,
        categories: ['general', 'editor']
      }),
      listProcedures: vi.fn().mockResolvedValue({
        procedures: [
          {
            procedure_id: 'proc_1',
            name: 'Python Setup',
            description: 'Setup python venv',
            trigger_conditions: ['python'],
            required_skills: ['terminal_run'],
            parameters: [],
            steps: [],
            metrics: {
              invocation_count: 3,
              success_count: 3,
              failure_count: 0,
              success_rate: 1.0,
              average_duration_ms: 1500,
              recovery_rate: 0.0,
              replan_rate: 0.0
            },
            version: '1.0.0',
            confidence: 0.95,
            status: 'ACTIVE'
          }
        ],
        total: 1
      }),
      listMemoryConflicts: vi.fn().mockResolvedValue([
        {
          conflict_id: 'conf_1',
          memory_id_a: 'mem_1',
          memory_id_b: 'mem_2',
          key: 'editor',
          candidate_a: { memory_id: 'mem_1', value: 'VS Code', source: 'USER_EXPLICIT', confidence: 1.0 },
          candidate_b: { memory_id: 'mem_2', value: 'Neovim', source: 'SYSTEM_OBSERVED', confidence: 0.8 },
          status: 'UNRESOLVED'
        }
      ]),
      listUserProfiles: vi.fn().mockResolvedValue([
        { key: 'theme', value: { mode: 'dark' } }
      ]),
      getMemoryDetail: vi.fn().mockResolvedValue({
        memory_id: 'mem_1',
        memory_type: 'PREFERENCE',
        title: 'Preferred Editor',
        summary: 'User preferred editor is VS Code'
      }),
      confirmMemory: vi.fn().mockResolvedValue({ status: 'confirmed' }),
      rejectMemory: vi.fn().mockResolvedValue({ status: 'rejected' }),
      forgetMemory: vi.fn().mockResolvedValue({ status: 'deleted' }),
      resolveMemoryConflict: vi.fn().mockResolvedValue({ status: 'resolved' }),
      promoteProcedure: vi.fn().mockResolvedValue({ status: 'promoted' }),
      deprecateProcedure: vi.fn().mockResolvedValue({ status: 'deprecated' })
    };

    TestBed.configureTestingModule({
      providers: [
        MemoryService,
        { provide: TaskApiService, useValue: apiServiceMock }
      ]
    });

    service = TestBed.inject(MemoryService);
  });

  it('should be created and load initial memory, procedures, and conflicts', () => {
    expect(service).toBeTruthy();
    expect(apiServiceMock.listMemories).toHaveBeenCalled();
    expect(apiServiceMock.listProcedures).toHaveBeenCalled();
    expect(apiServiceMock.listMemoryConflicts).toHaveBeenCalled();
  });

  it('should switch tabs and reload active domain data', () => {
    service.setTab('procedures');
    expect(service.activeTab()).toBe('procedures');
    expect(apiServiceMock.listProcedures).toHaveBeenCalled();

    service.setTab('conflicts');
    expect(service.activeTab()).toBe('conflicts');
    expect(apiServiceMock.listMemoryConflicts).toHaveBeenCalled();
  });

  it('should confirm memory and trigger refresh', async () => {
    const success = await service.confirmMemory('mem_1');
    expect(success).toBe(true);
    expect(apiServiceMock.confirmMemory).toHaveBeenCalledWith('mem_1');
  });

  it('should resolve conflict and trigger refresh', async () => {
    const success = await service.resolveConflict('conf_1', 'A', 'Approved');
    expect(success).toBe(true);
    expect(apiServiceMock.resolveMemoryConflict).toHaveBeenCalledWith('conf_1', 'A', 'Approved');
  });

  it('should promote procedure and trigger refresh', async () => {
    const success = await service.promoteProcedure('proc_1', 'Verified');
    expect(success).toBe(true);
    expect(apiServiceMock.promoteProcedure).toHaveBeenCalledWith('proc_1', 'Verified');
  });
});
