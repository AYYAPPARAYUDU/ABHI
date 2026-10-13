import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AgentNetworkService } from '../../services/agent-network.service';
import { ThreeSceneManagerService } from '../../../../shared/3d/three-scene-manager.service';
import { AgentNode } from '../../models/network.model';

@Component({
  selector: 'app-network-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './network-page.component.html',
  styleUrl: './network-page.component.css'
})
export class NetworkPageComponent implements OnInit {
  readonly networkService = inject(AgentNetworkService);
  private readonly threeScene = inject(ThreeSceneManagerService);

  readonly categories = ['ALL', 'Coordination', 'Knowledge', 'Memory', 'Execution', 'Automation', 'Creative', 'Perception', 'Evaluation'];

  ngOnInit(): void {
    this.threeScene.setMode('NETWORK');
    this.networkService.fetchNetworkGraph().subscribe();
  }

  refreshNetwork(): void {
    this.networkService.fetchNetworkGraph().subscribe();
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.networkService.setSearchQuery(val);
  }

  filteredNodes(): AgentNode[] {
    const data = this.networkService.networkData();
    if (!data) return [];
    let nodes = data.nodes;

    const cat = this.networkService.filterCategory();
    if (cat !== 'ALL') {
      nodes = nodes.filter((n) => n.category.toLowerCase() === cat.toLowerCase());
    }

    const query = this.networkService.searchQuery().toLowerCase().trim();
    if (query) {
      nodes = nodes.filter(
        (n) =>
          n.name.toLowerCase().includes(query) ||
          n.role.toLowerCase().includes(query) ||
          n.capabilities.some((c) => c.toLowerCase().includes(query))
      );
    }

    return nodes;
  }
}
