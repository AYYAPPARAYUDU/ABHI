import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { TaskApiService } from '../../../core/api/task-api.service';
import { TelemetryService } from '../../../core/websocket/telemetry.service';
import { TaskFilterOptions, TaskSummary } from '../models/task.model';

@Injectable({
  providedIn: 'root'
})
export class TaskHistoryService implements OnDestroy {
  private readonly apiService = inject(TaskApiService);
  private readonly telemetry = inject(TelemetryService);
  private subscription = new Subscription();

  // State signals
  readonly tasks = signal<TaskSummary[]>([]);
  readonly totalTasks = signal<number>(0);
  readonly selectedTask = signal<TaskSummary | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Filters
  readonly filters = signal<TaskFilterOptions>({
    state: 'ALL',
    query: '',
    page: 1,
    pageSize: 15
  });

  // Computed
  readonly totalPages = computed(() => {
    const size = this.filters().pageSize;
    const total = this.totalTasks();
    return Math.max(1, Math.ceil(total / size));
  });

  constructor() {
    // Subscribe to live telemetry events for reactive updates
    this.subscription.add(
      this.telemetry.events$.subscribe((event) => {
        if (
          event.type === 'TASK_CREATED' ||
          event.type === 'TASK_PLANNED' ||
          event.type === 'TASK_COMPLETED' ||
          event.type === 'TASK_FAILED' ||
          event.type === 'TASK_CANCELLED' ||
          event.type === 'TASK_EMERGENCY_STOPPED'
        ) {
          // Re-fetch current page of tasks
          this.loadTasks();
        }
      })
    );

    this.loadTasks();
  }

  async loadTasks(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    try {
      const f = this.filters();
      const offset = (f.page - 1) * f.pageSize;
      const res = await this.apiService.listTasks(f.pageSize, offset, f.state, f.query);
      this.tasks.set(res.tasks || []);
      this.totalTasks.set(res.total || 0);

      // If selected task is present, refresh it from current list
      const currentSelected = this.selectedTask();
      if (currentSelected) {
        const updated = (res.tasks || []).find((t: TaskSummary) => t.task_id === currentSelected.task_id);
        if (updated) {
          this.selectedTask.set(updated);
        }
      }
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to load task history');
    } finally {
      this.isLoading.set(false);
    }
  }

  async selectTask(taskId: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const task = await this.apiService.getTaskStatus(taskId);
      this.selectedTask.set(task);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to retrieve task detail');
    } finally {
      this.isLoading.set(false);
    }
  }

  clearSelection(): void {
    this.selectedTask.set(null);
  }

  setStateFilter(state: string): void {
    this.filters.update((f) => ({ ...f, state, page: 1 }));
    this.loadTasks();
  }

  setSearchQuery(query: string): void {
    this.filters.update((f) => ({ ...f, query, page: 1 }));
    this.loadTasks();
  }

  setPage(page: number): void {
    this.filters.update((f) => ({ ...f, page }));
    this.loadTasks();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
