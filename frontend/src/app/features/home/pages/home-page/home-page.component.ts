import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { AgentCommandService } from '../../../../core/services/agent-command.service';
import { AgentCommandCenterComponent } from '../../../../shared/ui/agent-command-center/agent-command-center.component';
import { ThreeSceneManagerService } from '../../../../shared/3d/three-scene-manager.service';
import { RecentActivityItem } from '../../../../core/models/agent-experience.model';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterModule, AgentCommandCenterComponent],
  template: `
    <div class="main-agent-workspace">
      <!-- Top Operational Metrics Bar (Reference 1: Dense, Controlled Telemetry) -->
      <section class="observatory-metrics-bar" aria-label="Operational Telemetry">
        <div class="metric-pill">
          <span class="metric-dot live"></span>
          <span class="metric-label">MAIN AGENT</span>
          <span class="metric-value">ONLINE</span>
        </div>
        <div class="metric-pill">
          <span class="metric-label">VOICE STACK</span>
          <span class="metric-value highlight">ACTUAL_VOICE</span>
        </div>
        <div class="metric-pill">
          <span class="metric-label">HARDWARE</span>
          <span class="metric-value">CUDA / RTX</span>
        </div>
        <div class="metric-pill">
          <span class="metric-label">ACTIVE TASKS</span>
          <span class="metric-value">{{ stateService.currentTask() ? 1 : 0 }}</span>
        </div>
        <div class="metric-pill">
          <span class="metric-label">SAFETY POLICY</span>
          <span class="metric-value success">ENFORCED</span>
        </div>
      </section>

      <!-- Central Hero Experience: 3D Core Aura + Voice-First Input -->
      <section class="hero-core-section">
        <!-- AI Core Identity: Clean Cinematic HUD Headline -->
        <div class="core-identity">
          <div class="core-text">
            <h1 class="core-headline">
              <span class="greeting">ABHI — Central Intelligence</span>
              <span class="subtext">Voice-First Spatial AI Operating System</span>
            </h1>
          </div>
        </div>

        <!-- Master Agent Command Center Slot -->
        <div class="command-center-slot">
          <app-agent-command-center></app-agent-command-center>
        </div>
      </section>

      <!-- 4 Primary Workspace Portals -->
      <section class="workspace-portals-section">
        <div class="section-header-flex">
          <h2 class="section-heading">Connected Operating Workspaces</h2>
          <span class="section-sublabel">Spatial AI Operating System · Local First</span>
        </div>

        <div class="workspace-cards-grid">
          @for (ws of primaryWorkspaces; track ws.route) {
            <div
              class="workspace-card"
              (click)="navigateTo(ws.route)"
              [attr.tabindex]="0"
              role="button"
            >
              <div class="ws-header">
                <div class="ws-icon" [innerHTML]="ws.icon"></div>
                <span class="ws-badge">{{ ws.badge }}</span>
              </div>
              <div class="ws-info">
                <span class="ws-title">{{ ws.title }}</span>
                <span class="ws-desc">{{ ws.desc }}</span>
              </div>
              <div class="ws-footer">
                <span class="ws-action">Open Workspace</span>
                <span class="ws-arrow">→</span>
              </div>
            </div>
          }
        </div>
      </section>

      <!-- Recent Verified Results Stream -->
      <section class="activity-section">
        <div class="section-header-flex">
          <h2 class="section-heading">Recent Verified Work & Outcomes</h2>
          <span class="activity-count">{{ stateService.recentActivities().length }} verified items</span>
        </div>

        <div class="activity-stream">
          @if (stateService.recentActivities().length === 0) {
            <div class="empty-stream-card">
              <span class="empty-icon">✓</span>
              <span>All agent tasks verified and synced. Say a command or select a workspace above to begin.</span>
            </div>
          }
          @for (act of stateService.recentActivities(); track act.id) {
            <div class="activity-card" (click)="onActivityClick(act)">
              <div class="act-type-indicator" [attr.data-type]="act.type">
                <span class="type-dot"></span>
              </div>
              <div class="act-details">
                <div class="act-top">
                  <span class="act-title">{{ act.title }}</span>
                  <span class="act-time">{{ formatTime(act.timestamp) }}</span>
                </div>
                <div class="act-desc">{{ act.description }}</div>
              </div>
              <span class="act-arrow">→</span>
            </div>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .main-agent-workspace {
      display: flex;
      flex-direction: column;
      gap: 28px;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
      animation: fadeIn 0.4s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Reference 1: Dense Technical Observability Metrics Bar */
    .observatory-metrics-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: center;
      padding: 6px 12px;
      background: rgba(15, 23, 42, 0.5);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
    }

    .metric-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      font-size: 11px;
      font-family: monospace;
      color: #94a3b8;
    }

    .metric-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 6px #10b981;
    }

    .metric-dot.live {
      animation: pulse-dot 2s infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.6; }
    }

    .metric-label {
      color: #64748b;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .metric-value {
      color: #f1f5f9;
      font-weight: 600;
    }

    .metric-value.highlight {
      color: #38bdf8;
    }

    .metric-value.success {
      color: #10b981;
    }

    /* Hero Core Section */
    .hero-core-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 20px 20px 6px 20px;
      gap: 20px;
    }

    .core-identity {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }

    .core-avatar-orb {
      position: relative;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 35% 35%, #06b6d4, #3b82f6 60%, #1e1b4b);
      box-shadow: 0 0 30px rgba(6, 182, 212, 0.45);
    }

    .orb-ring-outer {
      position: absolute;
      inset: -5px;
      border-radius: 50%;
      border: 1px dashed rgba(56, 189, 248, 0.45);
      animation: rotate-ring 14s linear infinite;
    }

    .orb-ring-inner {
      position: absolute;
      inset: -2px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.35);
    }

    .orb-icon {
      font-size: 22px;
      color: #ffffff;
      text-shadow: 0 0 12px #38bdf8;
    }

    @keyframes rotate-ring {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .core-headline {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin: 0;
    }

    .greeting {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #ffffff 40%, #93c5fd 80%, #38bdf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .subtext {
      font-size: 13px;
      color: #94a3b8;
      font-weight: 400;
      max-width: 600px;
    }

    .command-center-slot {
      width: 100%;
    }

    /* Section Headings */
    .section-heading {
      font-size: 13px;
      font-weight: 600;
      color: #94a3b8;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin: 0;
    }

    .section-header-flex {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }

    .section-sublabel, .activity-count {
      font-size: 11px;
      color: #64748b;
    }

    /* 4 Primary Workspaces Grid */
    .workspace-cards-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
    }

    .workspace-card {
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 14px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      cursor: pointer;
      transition: all 0.25s ease;
      position: relative;
    }

    .workspace-card:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(56, 189, 248, 0.35);
      transform: translateY(-3px);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
    }

    .ws-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .ws-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #38bdf8;
    }

    .ws-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 6px;
      background: rgba(56, 189, 248, 0.12);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.25);
    }

    .ws-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .ws-title {
      font-size: 14px;
      font-weight: 600;
      color: #f1f5f9;
    }

    .ws-desc {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.4;
    }

    .ws-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
    }

    .ws-action {
      font-size: 11px;
      font-weight: 500;
      color: #64748b;
    }

    .ws-arrow {
      color: #64748b;
      font-size: 14px;
      transition: transform 0.2s;
    }

    .workspace-card:hover .ws-arrow {
      color: #38bdf8;
      transform: translateX(3px);
    }

    .workspace-card:hover .ws-action {
      color: #38bdf8;
    }

    /* Activity Stream */
    .activity-stream {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .empty-stream-card {
      padding: 20px;
      background: rgba(15, 23, 42, 0.4);
      border: 1px dashed rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      text-align: center;
      font-size: 13px;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .empty-icon {
      color: #10b981;
      font-weight: bold;
    }

    .activity-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 12px 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .activity-card:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(56, 189, 248, 0.25);
      transform: translateX(3px);
    }

    .type-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 6px #38bdf8;
    }

    .act-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .act-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .act-title {
      font-size: 13px;
      font-weight: 500;
      color: #f1f5f9;
    }

    .act-time {
      font-size: 11px;
      color: #64748b;
    }

    .act-desc {
      font-size: 11px;
      color: #94a3b8;
    }

    .act-arrow {
      color: #64748b;
      font-size: 14px;
    }

    .activity-card:hover .act-arrow {
      color: #38bdf8;
    }

    @media (max-width: 1024px) {
      .workspace-cards-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 600px) {
      .workspace-cards-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class HomePageComponent implements OnInit {
  readonly stateService = inject(OperatorStateService);
  readonly commandService = inject(AgentCommandService);
  private readonly router = inject(Router);
  private readonly threeScene = inject(ThreeSceneManagerService);

  readonly primaryWorkspaces = [
    {
      title: 'Agent Network',
      desc: 'Interactive 3D graph of registered specialist agents, dependencies & workflows.',
      route: '/network',
      badge: '9 Agents',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="19" cy="6" r="2"/><circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><line x1="12" y1="9" x2="12" y2="3"/><line x1="12" y1="15" x2="12" y2="21"/><line x1="9.5" y1="10.5" x2="6.5" y2="7.5"/><line x1="14.5" y1="13.5" x2="17.5" y2="16.5"/></svg>'
    },
    {
      title: 'Intelligence Lab',
      desc: 'Model observatory, category benchmarks, candidate experiments & telemetry.',
      route: '/intelligence',
      badge: 'Evaluation Ready',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>'
    },
    {
      title: 'Business Sectors',
      desc: 'Autonomous business opportunities, project milestones & honest financial tracking.',
      route: '/business',
      badge: '6 Sectors',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>'
    },
    {
      title: 'Media Creative Studio',
      desc: 'Local generative video reels, image editing & cryptographic provenance attestations.',
      route: '/media',
      badge: 'Phase 8 Stack',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>'
    }
  ];

  ngOnInit(): void {
    this.threeScene.setMode('MAIN_AGENT');
  }

  navigateTo(route: string): void {
    this.router.navigateByUrl(route);
  }

  onActivityClick(act: RecentActivityItem): void {
    if (act.routeLink) {
      this.router.navigateByUrl(act.routeLink);
    }
  }

  formatTime(ts: number): string {
    const diffMin = Math.round((Date.now() - ts) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.round(diffHours / 24)}d ago`;
  }
}
