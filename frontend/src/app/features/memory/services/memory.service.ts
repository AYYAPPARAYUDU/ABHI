import { Injectable, signal, computed, inject } from '@angular/core';
import { TaskApiService } from '../../../core/api/task-api.service';
import {
  MemoryContract,
  MemoryConflict,
  MemoryFilterOptions,
  ProcedureModel,
  UserProfilePreference
} from '../models/memory.model';

@Injectable({
  providedIn: 'root'
})
export class MemoryService {
  private readonly apiService = inject(TaskApiService);

  // Active view tab
  readonly activeTab = signal<'memories' | 'procedures' | 'conflicts'>('memories');

  // State signals
  readonly memories = signal<MemoryContract[]>([]);
  readonly totalMemories = signal<number>(0);
  readonly selectedMemory = signal<MemoryContract | null>(null);

  readonly procedures = signal<ProcedureModel[]>([]);
  readonly totalProcedures = signal<number>(0);
  readonly selectedProcedure = signal<ProcedureModel | null>(null);

  readonly conflicts = signal<MemoryConflict[]>([]);
  readonly userProfiles = signal<UserProfilePreference[]>([]);

  readonly categories = signal<string[]>([
    'general',
    'browser',
    'desktop',
    'preference',
    'workflow',
    'system',
    'editor',
    'filesystem'
  ]);

  readonly memoryTypes = signal<string[]>([
    'ALL',
    'WORKING',
    'EPISODIC',
    'SEMANTIC',
    'PREFERENCE',
    'PROCEDURAL',
    'KNOWLEDGE'
  ]);

  readonly privacyClasses = signal<string[]>([
    'ALL',
    'PUBLIC',
    'PERSONAL',
    'PRIVATE',
    'SENSITIVE',
    'RESTRICTED'
  ]);

  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Filters
  readonly filters = signal<MemoryFilterOptions>({
    category: 'all',
    memoryType: 'ALL',
    privacy: 'ALL',
    status: 'ALL',
    query: '',
    page: 1,
    pageSize: 12
  });

  readonly totalPages = computed(() => {
    const size = this.filters().pageSize;
    const total = this.totalMemories();
    return Math.max(1, Math.ceil(total / size));
  });

  constructor() {
    this.loadMemories();
    this.loadProcedures();
    this.loadConflicts();
    this.loadUserProfiles();
  }

  setTab(tab: 'memories' | 'procedures' | 'conflicts'): void {
    this.activeTab.set(tab);
    if (tab === 'memories') this.loadMemories();
    else if (tab === 'procedures') this.loadProcedures();
    else if (tab === 'conflicts') this.loadConflicts();
  }

  async loadMemories(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const f = this.filters();
      const offset = (f.page - 1) * f.pageSize;
      const res = await this.apiService.listMemories(
        f.pageSize,
        offset,
        f.category,
        f.query,
        f.memoryType,
        f.privacy,
        f.status
      );
      this.memories.set(res.memories || []);
      this.totalMemories.set(res.total || 0);
      if (res.categories && res.categories.length) {
        this.categories.set(res.categories);
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to load memories');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadProcedures(status?: string, skillId?: string, query?: string): Promise<void> {
    try {
      const res = await this.apiService.listProcedures(status, skillId, query);
      this.procedures.set(res.procedures || []);
      this.totalProcedures.set(res.total || 0);
    } catch (err: any) {
      console.warn('Failed to load procedures:', err);
    }
  }

  async loadConflicts(): Promise<void> {
    try {
      const res = await this.apiService.listMemoryConflicts();
      this.conflicts.set(res || []);
    } catch (err: any) {
      console.warn('Failed to load memory conflicts:', err);
    }
  }

  async loadUserProfiles(): Promise<void> {
    try {
      const profiles = await this.apiService.listUserProfiles();
      this.userProfiles.set(profiles || []);
    } catch (err) {
      console.warn('Failed to load user preferences:', err);
    }
  }

  async selectMemory(memoryId: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const mem = await this.apiService.getMemoryDetail(memoryId);
      this.selectedMemory.set(mem);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to load memory details');
    } finally {
      this.isLoading.set(false);
    }
  }

  clearSelection(): void {
    this.selectedMemory.set(null);
    this.selectedProcedure.set(null);
  }

  async confirmMemory(memoryId: string): Promise<boolean> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      await this.apiService.confirmMemory(memoryId);
      this.successMessage.set(`Memory ${memoryId} confirmed successfully.`);
      await this.loadMemories();
      setTimeout(() => this.successMessage.set(null), 4000);
      return true;
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to confirm memory');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async rejectMemory(memoryId: string, reason: string = ''): Promise<boolean> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      await this.apiService.rejectMemory(memoryId, reason);
      this.successMessage.set(`Memory ${memoryId} rejected.`);
      await this.loadMemories();
      setTimeout(() => this.successMessage.set(null), 4000);
      return true;
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to reject memory');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async forgetMemory(memoryId: string, deletionType: string = 'SOFT_DELETE'): Promise<boolean> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      await this.apiService.forgetMemory(memoryId, deletionType);
      this.successMessage.set(`Memory ${memoryId} deleted (${deletionType}).`);
      if (this.selectedMemory()?.memory_id === memoryId) {
        this.selectedMemory.set(null);
      }
      await this.loadMemories();
      setTimeout(() => this.successMessage.set(null), 4000);
      return true;
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to delete memory');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async resolveConflict(conflictId: string, candidate: 'A' | 'B', notes: string = ''): Promise<boolean> {
    this.isLoading.set(true);
    try {
      await this.apiService.resolveMemoryConflict(conflictId, candidate, notes);
      this.successMessage.set(`Conflict ${conflictId} resolved (Declared Candidate ${candidate} winner).`);
      await this.loadConflicts();
      await this.loadMemories();
      setTimeout(() => this.successMessage.set(null), 4000);
      return true;
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to resolve conflict');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async promoteProcedure(procedureId: string, validatorNotes: string = ''): Promise<boolean> {
    this.isLoading.set(true);
    try {
      await this.apiService.promoteProcedure(procedureId, validatorNotes);
      this.successMessage.set(`Procedure ${procedureId} promoted to ACTIVE.`);
      await this.loadProcedures();
      setTimeout(() => this.successMessage.set(null), 4000);
      return true;
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to promote procedure');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  async deprecateProcedure(procedureId: string, reason: string): Promise<boolean> {
    this.isLoading.set(true);
    try {
      await this.apiService.deprecateProcedure(procedureId, reason);
      this.successMessage.set(`Procedure ${procedureId} marked as DEPRECATED.`);
      await this.loadProcedures();
      setTimeout(() => this.successMessage.set(null), 4000);
      return true;
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to deprecate procedure');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  setCategoryFilter(category: string): void {
    this.filters.update((f) => ({ ...f, category, page: 1 }));
    this.loadMemories();
  }

  setTypeFilter(memoryType: string): void {
    this.filters.update((f) => ({ ...f, memoryType, page: 1 }));
    this.loadMemories();
  }

  setPrivacyFilter(privacy: string): void {
    this.filters.update((f) => ({ ...f, privacy, page: 1 }));
    this.loadMemories();
  }

  setStatusFilter(status: string): void {
    this.filters.update((f) => ({ ...f, status, page: 1 }));
    this.loadMemories();
  }

  setSearchQuery(query: string): void {
    this.filters.update((f) => ({ ...f, query, page: 1 }));
    this.loadMemories();
  }

  setPage(page: number): void {
    this.filters.update((f) => ({ ...f, page }));
    this.loadMemories();
  }
}
