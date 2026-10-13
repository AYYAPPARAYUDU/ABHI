import { Component, inject, OnInit, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AgentNetworkService } from '../../services/agent-network.service';
import { ThreeSceneManagerService } from '../../../../shared/3d/three-scene-manager.service';
import { AnimeAnimationService } from '../../../../core/services/anime-animation.service';
import { AnimeInteractiveDirective } from '../../../../shared/directives/anime-interactive.directive';
import { AgentNode } from '../../models/network.model';

@Component({
  selector: 'app-network-page',
  standalone: true,
  imports: [CommonModule, RouterModule, AnimeInteractiveDirective],
  templateUrl: './network-page.component.html',
  styleUrl: './network-page.component.css'
})
export class NetworkPageComponent implements OnInit, AfterViewInit {
  readonly networkService = inject(AgentNetworkService);
  readonly animService = inject(AnimeAnimationService);
  private readonly threeScene = inject(ThreeSceneManagerService);
  private readonly hostEl = inject(ElementRef);

  readonly categories = ['ALL', 'Coordination', 'Knowledge', 'Memory', 'Execution', 'Automation', 'Creative', 'Perception', 'Evaluation'];

  ngOnInit(): void {
    this.threeScene.setMode('NETWORK');
    this.networkService.fetchNetworkGraph().subscribe(() => this.animateCards());
  }

  ngAfterViewInit(): void {
    this.animateCards();
  }

  animateCards(): void {
    const root = this.hostEl.nativeElement;
    if (!root) return;

    const cards = root.querySelectorAll('.agent-node-card');
    if (cards.length > 0) {
      this.animService.staggerEnter({
        targets: cards,
        translateY: [15, 0],
        opacity: [0, 1],
        duration: 550,
        delay: 30
      });
    }
  }

  refreshNetwork(event?: MouseEvent): void {
    if (event?.currentTarget) {
      this.animService.tactileClick(event.currentTarget as HTMLElement);
    }
    this.networkService.fetchNetworkGraph().subscribe(() => this.animateCards());
  }

  onCategorySelect(cat: string, event?: MouseEvent): void {
    if (event?.currentTarget) {
      this.animService.tactileClick(event.currentTarget as HTMLElement);
    }
    this.networkService.setFilterCategory(cat);
    setTimeout(() => this.animateCards(), 50);
  }

  onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.networkService.setSearchQuery(val);
    setTimeout(() => this.animateCards(), 50);
  }

  onNodeSelect(node: AgentNode, event?: MouseEvent): void {
    if (event?.currentTarget) {
      this.animService.tactileClick(event.currentTarget as HTMLElement);
    }
    this.networkService.selectNode(node);
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
