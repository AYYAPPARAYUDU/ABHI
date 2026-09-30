import { Injectable, inject, signal, computed } from '@angular/core';
import { AgentApiService, BackendAttentionItem } from '../api/agent-api.service';
import { TaskApiService } from '../api/task-api.service';

@Injectable({
  providedIn: 'root'
})
export class AgentAttentionService {
  private readonly agentApi = inject(AgentApiService);
  private readonly taskApi = inject(TaskApiService);

  readonly attentionItems = signal<BackendAttentionItem[]>([]);
  readonly isPolling = signal<boolean>(false);

  readonly unreadCount = computed(() => this.attentionItems().length);
  readonly hasApprovals = computed(() => this.attentionItems().some((i) => i.type === 'APPROVAL'));
  readonly activeApprovals = computed(() => this.attentionItems().filter((i) => i.type === 'APPROVAL'));

  constructor() {
    this.refreshAttention();
  }

  async refreshAttention(): Promise<void> {
    try {
      const items = await this.agentApi.getAttentionItems();
      this.attentionItems.set(items);
    } catch {
      // keep existing
    }
  }

  dismissItem(itemId: string): void {
    this.attentionItems.update((items) => items.filter((i) => i.item_id !== itemId));
  }

  async handleConsent(taskId: string, approved: boolean): Promise<boolean> {
    try {
      await this.taskApi.provideConsent(taskId, approved, 'root_node');
      this.dismissItem(`attn_consent_${taskId}`);
      await this.refreshAttention();
      return true;
    } catch {
      return false;
    }
  }
}
