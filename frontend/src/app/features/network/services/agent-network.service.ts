import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { AgentNode, NetworkGraphData } from '../models/network.model';

@Injectable({
  providedIn: 'root',
})
export class AgentNetworkService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://127.0.0.1:8000/api/v1/agent/network';

  readonly networkData = signal<NetworkGraphData | null>(null);
  readonly selectedNode = signal<AgentNode | null>(null);
  readonly searchQuery = signal<string>('');
  readonly filterCategory = signal<string>('ALL');
  readonly isLoading = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  fetchNetworkGraph(): Observable<NetworkGraphData | null> {
    this.isLoading.set(true);
    return this.http.get<NetworkGraphData>(this.apiUrl).pipe(
      tap((data) => {
        this.networkData.set(data);
        if (data.nodes.length > 0 && !this.selectedNode()) {
          this.selectedNode.set(data.nodes.find((n) => n.is_supervisor) || data.nodes[0]);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.errorMessage.set(err.message || 'Failed to fetch agent network graph');
        this.isLoading.set(false);
        return of(null);
      })
    );
  }

  selectNode(node: AgentNode): void {
    this.selectedNode.set(node);
  }

  setSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  setFilterCategory(cat: string): void {
    this.filterCategory.set(cat);
  }
}
