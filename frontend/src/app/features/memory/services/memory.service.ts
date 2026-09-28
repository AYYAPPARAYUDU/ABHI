import { Injectable, signal, computed, inject } from '@angular/core';
import { TaskApiService } from '../../../core/api/task-api.service';
import { EpisodicMemory, MemoryFilterOptions, UserProfilePreference } from '../models/memory.model';

@Injectable({
  providedIn: 'root'
})
export class MemoryService {
  private readonly apiService = inject(TaskApiService);

  // State signals
  readonly memories = signal<EpisodicMemory[]>([]);
  readonly totalMemories = signal<number>(0);
  readonly selectedMemory = signal<EpisodicMemory | null>(null);
  readonly userProfiles = signal<UserProfilePreference[]>([]);
  readonly categories = signal<string[]>(['general', 'browser', 'desktop', 'preference', 'workflow', 'system']);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Filters
  readonly filters = signal<MemoryFilterOptions>({
    category: 'all',
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
    this.loadUserProfiles();
  }

  async loadMemories(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const f = this.filters();
      const offset = (f.page - 1) * f.pageSize;
      const res = await this.apiService.listMemories(f.pageSize, offset, f.category, f.query);
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
  }

  async forgetMemory(memoryId: string): Promise<boolean> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      await this.apiService.forgetMemory(memoryId);
      this.successMessage.set(`Memory ${memoryId} forgotten successfully.`);
      if (this.selectedMemory()?.memory_id === memoryId) {
        this.selectedMemory.set(null);
      }
      await this.loadMemories();
      setTimeout(() => this.successMessage.set(null), 4000);
      return true;
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to forget memory');
      return false;
    } finally {
      this.isLoading.set(false);
    }
  }

  setCategoryFilter(category: string): void {
    this.filters.update((f) => ({ ...f, category, page: 1 }));
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
