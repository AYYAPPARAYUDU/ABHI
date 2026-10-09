import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { AgentNetworkService } from './agent-network.service';

describe('AgentNetworkService', () => {
  let service: AgentNetworkService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(AgentNetworkService);
  });

  it('should be created with initial signals', () => {
    expect(service).toBeTruthy();
    expect(service.networkData()).toBeNull();
    expect(service.selectedNode()).toBeNull();
    expect(service.filterCategory()).toBe('ALL');
  });

  it('should update selected node', () => {
    const dummyNode = {
      id: 'rag_agent',
      name: 'RAG Knowledge Agent',
      category: 'Knowledge',
      role: 'Retrieval',
      status: 'READY' as const,
      capabilities: ['hybrid_search'],
      risk_tier: 'Tier 1',
      recent_outcomes: [],
      errors_requiring_attention: [],
      position_3d: { x: -4, y: 2, z: 1 },
    };
    service.selectNode(dummyNode);
    expect(service.selectedNode()?.id).toBe('rag_agent');
  });

  it('should update search query', () => {
    service.setSearchQuery('coding');
    expect(service.searchQuery()).toBe('coding');
  });
});
