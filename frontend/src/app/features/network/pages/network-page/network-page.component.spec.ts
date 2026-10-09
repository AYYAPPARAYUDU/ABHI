import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { NetworkPageComponent } from './network-page.component';
import { AgentNetworkService } from '../../services/agent-network.service';

describe('NetworkPageComponent', () => {
  let component: NetworkPageComponent;
  let fixture: ComponentFixture<NetworkPageComponent>;
  let networkService: AgentNetworkService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NetworkPageComponent],
      providers: [provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(NetworkPageComponent);
    component = fixture.componentInstance;
    networkService = TestBed.inject(AgentNetworkService);
    fixture.detectChanges();
  });

  it('should create network page component', () => {
    expect(component).toBeTruthy();
  });

  it('should render workspace header and subtitle', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Multi-Agent Spatial Network');
    expect(compiled.textContent).toContain('Authoritative topology');
  });

  it('should filter nodes by category', () => {
    networkService.networkData.set({
      nodes: [
        {
          id: 'supervisor',
          name: 'Authoritative Supervisor',
          category: 'Coordination',
          role: 'Central coordination',
          status: 'READY',
          capabilities: ['goal_resolution'],
          risk_tier: 'Tier 0',
          recent_outcomes: [],
          errors_requiring_attention: [],
          position_3d: { x: 0, y: 0, z: 0 },
          is_supervisor: true,
        },
        {
          id: 'rag_agent',
          name: 'RAG Knowledge Agent',
          category: 'Knowledge',
          role: 'Retrieval',
          status: 'READY',
          capabilities: ['hybrid_search'],
          risk_tier: 'Tier 1',
          recent_outcomes: [],
          errors_requiring_attention: [],
          position_3d: { x: -4, y: 2, z: 1 },
        },
      ],
      edges: [],
      total_agents: 2,
      active_agents: 0,
      system_status: 'OPERATIONAL',
    });

    expect(component.filteredNodes().length).toBe(2);

    networkService.setFilterCategory('Knowledge');
    expect(component.filteredNodes().length).toBe(1);
    expect(component.filteredNodes()[0].id).toBe('rag_agent');
  });
});
