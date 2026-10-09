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
  template: `
    <div class="network-workspace">
      <!-- Workspace Header -->
      <header class="workspace-header">
        <div class="header-left">
          <div class="workspace-title-group">
            <span class="workspace-pill">WORKSPACE TWO</span>
            <h1 class="workspace-title">Multi-Agent Spatial Network</h1>
          </div>
          <p class="workspace-subtitle">
            Authoritative topology of registered specialist capabilities, active workflows & dependencies.
          </p>
        </div>

        <div class="header-actions">
          <div class="system-health-pill">
            <span class="pulse-dot"></span>
            <span>NETWORK: {{ networkService.networkData()?.system_status || 'OPERATIONAL' }}</span>
          </div>
          <button class="refresh-btn" (click)="refreshNetwork()" [disabled]="networkService.isLoading()" title="Refresh Network Topology">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </header>

      <!-- Network Filter & Search Bar -->
      <section class="network-toolbar">
        <div class="search-box">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="text"
            placeholder="Search agents or capabilities..."
            [value]="networkService.searchQuery()"
            (input)="onSearchInput($event)"
            class="search-input"
          />
        </div>

        <div class="category-filters">
          @for (cat of categories; track cat) {
            <button
              class="filter-chip"
              [class.active]="networkService.filterCategory() === cat"
              (click)="networkService.setFilterCategory(cat)"
            >
              {{ cat }}
            </button>
          }
        </div>
      </section>

      <!-- Main Layout: Spatial Node Grid + Inspector Panel -->
      <div class="network-content-grid">
        <!-- 3D / Spatial Agent Nodes Matrix -->
        <div class="spatial-nodes-canvas">
          <div class="nodes-grid">
            @for (node of filteredNodes(); track node.id) {
              <div
                class="agent-node-card"
                [class.selected]="networkService.selectedNode()?.id === node.id"
                [class.supervisor]="node.is_supervisor"
                (click)="networkService.selectNode(node)"
                [attr.tabindex]="0"
                role="button"
              >
                <div class="node-header">
                  <div class="node-icon-wrapper" [attr.data-cat]="node.category">
                    @if (node.is_supervisor) {
                      <span>👑</span>
                    } @else {
                      <span>✦</span>
                    }
                  </div>
                  <span class="status-badge" [attr.data-status]="node.status">{{ node.status }}</span>
                </div>

                <div class="node-body">
                  <h3 class="node-name">{{ node.name }}</h3>
                  <span class="node-category">{{ node.category }} · {{ node.risk_tier }}</span>
                  <p class="node-role">{{ node.role }}</p>
                </div>

                <div class="node-footer">
                  <div class="capabilities-pill">
                    <span>{{ node.capabilities.length }} capabilities</span>
                  </div>
                  @if (node.active_task_id) {
                    <span class="active-task-indicator">Working on Task</span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Selected Agent Inspector Drawer -->
        <aside class="node-inspector-drawer">
          @if (networkService.selectedNode(); as sel) {
            <div class="inspector-card">
              <div class="inspector-header">
                <div>
                  <span class="inspector-category">{{ sel.category }}</span>
                  <h2 class="inspector-title">{{ sel.name }}</h2>
                </div>
                <span class="status-badge large" [attr.data-status]="sel.status">{{ sel.status }}</span>
              </div>

              <div class="inspector-section">
                <label class="section-label">RESPONSIBILITY & ROLE</label>
                <p class="inspector-desc">{{ sel.role }}</p>
              </div>

              <div class="inspector-section">
                <label class="section-label">REGISTERED CAPABILITIES</label>
                <div class="capabilities-list">
                  @for (cap of sel.capabilities; track cap) {
                    <span class="cap-tag">{{ cap }}</span>
                  }
                </div>
              </div>

              <div class="inspector-section">
                <label class="section-label">RESOURCE NEEDS & SAFETY</label>
                <div class="resource-pill-row">
                  <div class="res-box">
                    <span class="res-label">RISK TIER</span>
                    <span class="res-val">{{ sel.risk_tier }}</span>
                  </div>
                  <div class="res-box">
                    <span class="res-label">RAM ALLOC</span>
                    <span class="res-val">{{ sel.resource_needs?.ram_mb || 150 }} MB</span>
                  </div>
                  <div class="res-box">
                    <span class="res-label">VRAM LEASE</span>
                    <span class="res-val">{{ sel.resource_needs?.vram_mb || 0 }} MB</span>
                  </div>
                </div>
              </div>

              <div class="inspector-section">
                <label class="section-label">RECENT VERIFIED OUTCOMES</label>
                <div class="outcomes-list">
                  @for (outcome of sel.recent_outcomes; track outcome) {
                    <div class="outcome-item">
                      <span class="check-icon">✓</span>
                      <span>{{ outcome }}</span>
                    </div>
                  }
                </div>
              </div>

              @if (sel.errors_requiring_attention && sel.errors_requiring_attention.length > 0) {
                <div class="inspector-section error-section">
                  <label class="section-label">ERRORS REQUIRING ATTENTION</label>
                  @for (err of sel.errors_requiring_attention; track err) {
                    <div class="error-item">⚠ {{ err }}</div>
                  }
                </div>
              }
            </div>
          } @else {
            <div class="inspector-empty">
              <span>Select an agent node to inspect its runtime state.</span>
            </div>
          }
        </aside>
      </div>
    </div>
  `,
  styles: [`
    .network-workspace {
      display: flex;
      flex-direction: column;
      gap: 24px;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
      animation: fadeIn 0.4s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .workspace-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 16px 20px;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
    }

    .workspace-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .workspace-pill {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    .workspace-title {
      font-size: 20px;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0;
    }

    .workspace-subtitle {
      font-size: 13px;
      color: #94a3b8;
      margin: 4px 0 0 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .system-health-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-family: monospace;
      padding: 6px 12px;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.1);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.25);
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }

    .refresh-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .refresh-btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      color: #f1f5f9;
    }

    /* Toolbar */
    .network-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 6px 12px;
      min-width: 280px;
    }

    .search-icon {
      color: #64748b;
    }

    .search-input {
      background: transparent;
      border: none;
      outline: none;
      color: #f1f5f9;
      font-size: 13px;
      width: 100%;
    }

    .category-filters {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .filter-chip {
      padding: 5px 10px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      color: #94a3b8;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .filter-chip:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #f1f5f9;
    }

    .filter-chip.active {
      background: rgba(56, 189, 248, 0.15);
      border-color: rgba(56, 189, 248, 0.35);
      color: #38bdf8;
      font-weight: 600;
    }

    /* Content Grid */
    .network-content-grid {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 20px;
    }

    .spatial-nodes-canvas {
      display: flex;
      flex-direction: column;
    }

    .nodes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
    }

    .agent-node-card {
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 14px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .agent-node-card:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(56, 189, 248, 0.3);
      transform: translateY(-2px);
    }

    .agent-node-card.selected {
      border-color: #38bdf8;
      box-shadow: 0 0 20px rgba(56, 189, 248, 0.2);
      background: rgba(56, 189, 248, 0.05);
    }

    .agent-node-card.supervisor {
      border-color: rgba(245, 158, 11, 0.4);
      background: rgba(245, 158, 11, 0.04);
    }

    .node-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .node-icon-wrapper {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }

    .status-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 2px 6px;
      border-radius: 6px;
    }

    .status-badge[data-status="READY"] { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .status-badge[data-status="ACTIVE"] { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
    .status-badge[data-status="IDLE"] { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }
    .status-badge[data-status="FAILED"] { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

    .node-body {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .node-name {
      font-size: 14px;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0;
    }

    .node-category {
      font-size: 11px;
      color: #64748b;
      font-family: monospace;
    }

    .node-role {
      font-size: 12px;
      color: #94a3b8;
      margin: 4px 0 0 0;
      line-height: 1.4;
    }

    .node-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
    }

    .capabilities-pill {
      font-size: 11px;
      color: #64748b;
    }

    .active-task-indicator {
      font-size: 10px;
      color: #38bdf8;
      animation: pulse 1.5s infinite;
    }

    /* Inspector Drawer */
    .node-inspector-drawer {
      display: flex;
      flex-direction: column;
    }

    .inspector-card {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      position: sticky;
      top: 20px;
    }

    .inspector-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .inspector-category {
      font-size: 11px;
      font-family: monospace;
      color: #64748b;
      text-transform: uppercase;
    }

    .inspector-title {
      font-size: 16px;
      font-weight: 700;
      color: #f1f5f9;
      margin: 2px 0 0 0;
    }

    .status-badge.large {
      padding: 4px 8px;
      font-size: 11px;
    }

    .inspector-section {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .section-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #64748b;
      text-transform: uppercase;
    }

    .inspector-desc {
      font-size: 13px;
      color: #cbd5e1;
      margin: 0;
      line-height: 1.4;
    }

    .capabilities-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .cap-tag {
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 11px;
      font-family: monospace;
      color: #38bdf8;
    }

    .resource-pill-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .res-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      text-align: center;
    }

    .res-label {
      font-size: 9px;
      color: #64748b;
      font-weight: 600;
    }

    .res-val {
      font-size: 11px;
      color: #f1f5f9;
      font-family: monospace;
      font-weight: 600;
    }

    .outcomes-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .outcome-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #cbd5e1;
    }

    .check-icon {
      color: #10b981;
      font-weight: bold;
    }

    .error-section {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      padding: 10px;
    }

    .error-item {
      font-size: 12px;
      color: #f87171;
    }

    .inspector-empty {
      padding: 40px 20px;
      background: rgba(15, 23, 42, 0.4);
      border: 1px dashed rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      text-align: center;
      font-size: 13px;
      color: #64748b;
    }

    @media (max-width: 1024px) {
      .network-content-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
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
