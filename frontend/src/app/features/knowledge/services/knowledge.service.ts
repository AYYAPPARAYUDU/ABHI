import { Injectable, signal, inject } from '@angular/core';
import { TaskApiService } from '../../../core/api/task-api.service';
import {
  KnowledgeChunkItem,
  KnowledgeSearchResult,
  KnowledgeSourcesResponse,
  RetrievalContextItem
} from '../models/knowledge.model';

@Injectable({
  providedIn: 'root'
})
export class KnowledgeService {
  private readonly apiService = inject(TaskApiService);

  // State signals
  readonly searchResults = signal<KnowledgeSearchResult[]>([]);
  readonly totalSearchResults = signal<number>(0);
  readonly activeQuery = signal<string>('');
  readonly sourcesInfo = signal<KnowledgeSourcesResponse | null>(null);
  readonly indexedChunks = signal<KnowledgeChunkItem[]>([]);
  readonly retrievalContext = signal<RetrievalContextItem[]>([]);
  readonly selectedChunk = signal<KnowledgeSearchResult | KnowledgeChunkItem | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isSearching = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.loadSources();
    this.loadIndexedChunks();
  }

  async loadSources(): Promise<void> {
    try {
      const res = await this.apiService.listKnowledgeSources();
      this.sourcesInfo.set(res);
    } catch (err) {
      console.warn('Failed to load knowledge sources:', err);
    }
  }

  async loadIndexedChunks(limit: number = 30, offset: number = 0): Promise<void> {
    this.isLoading.set(true);
    try {
      const res = await this.apiService.getKnowledgeChunks(limit, offset);
      this.indexedChunks.set(res.chunks || []);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Failed to load knowledge chunks');
    } finally {
      this.isLoading.set(false);
    }
  }

  async executeSearch(query: string, topK: number = 6, sourceFilter?: string): Promise<void> {
    if (!query || !query.trim()) {
      this.searchResults.set([]);
      this.totalSearchResults.set(0);
      this.activeQuery.set('');
      return;
    }

    this.isSearching.set(true);
    this.activeQuery.set(query.trim());
    this.errorMessage.set(null);
    try {
      const res = await this.apiService.searchKnowledge(query.trim(), topK, sourceFilter);
      this.searchResults.set(res.results || []);
      this.totalSearchResults.set(res.total_results || 0);

      // Also query retrieval context for planning preview
      const ctx = await this.apiService.getRetrievalContext(query.trim(), 3);
      this.retrievalContext.set(ctx.retrieved_context || []);
    } catch (err: any) {
      this.errorMessage.set(err.message || 'Knowledge search failed');
    } finally {
      this.isSearching.set(false);
    }
  }

  selectChunk(chunk: KnowledgeSearchResult | KnowledgeChunkItem | null): void {
    this.selectedChunk.set(chunk);
  }

  clearSearch(): void {
    this.activeQuery.set('');
    this.searchResults.set([]);
    this.totalSearchResults.set(0);
    this.retrievalContext.set([]);
  }
}
