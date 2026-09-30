import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { AgentCommandService } from '../../../../core/services/agent-command.service';
import { AgentCommandCenterComponent } from '../../../../shared/ui/agent-command-center/agent-command-center.component';
import { RecentActivityItem } from '../../../../core/models/agent-experience.model';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterModule, AgentCommandCenterComponent],
  template: `
    <div class="home-workspace">
      <!-- Central Hero Experience -->
      <section class="hero-core-section">
        <!-- AI Core Identity & Ambient Aura -->
        <div class="core-identity">
          <div class="core-avatar-orb" [attr.data-status]="stateService.avatarState()">
            <div class="orb-ring-outer"></div>
            <div class="orb-ring-inner"></div>
            <div class="orb-glow-core"></div>
            <span class="orb-icon">✦</span>
          </div>

          <div class="core-text">
            <h1 class="core-headline">
              <span class="greeting">Hello, Operator</span>
              <span class="subtext">ABHI Agentic Automation Core is active in your local environment</span>
            </h1>
          </div>
        </div>

        <!-- Master Agent Command Center -->
        <div class="command-center-slot">
          <app-agent-command-center></app-agent-command-center>
        </div>
      </section>

      <!-- Grid: Quick Workspaces & Recent Activities -->
      <section class="dashboard-grid">
        <!-- Quick Workspaces Cards -->
        <div class="grid-column">
          <h2 class="section-heading">Quick Workspaces</h2>

          <div class="workspace-cards-grid">
            @for (ws of workspaces; track ws.title) {
              <div
                class="workspace-app-card"
                (click)="navigateTo(ws.route)"
                [attr.tabindex]="0"
                role="button"
              >
                <div class="ws-icon" [innerHTML]="ws.icon"></div>
                <div class="ws-info">
                  <span class="ws-title">{{ ws.title }}</span>
                  <span class="ws-desc">{{ ws.desc }}</span>
                </div>
                <span class="ws-arrow">→</span>
              </div>
            }
          </div>
        </div>

        <!-- Recent Activity Stream -->
        <div class="grid-column">
          <div class="section-header-flex">
            <h2 class="section-heading">Recent Work & Outcomes</h2>
            <span class="activity-count">{{ stateService.recentActivities().length }} items</span>
          </div>

          <div class="activity-stream">
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
              </div>
            }
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .home-workspace {
      display: flex;
      flex-direction: column;
      gap: 32px;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
      animation: fadeIn 0.4s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Hero Core Section */
    .hero-core-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 30px 20px 10px 20px;
      gap: 24px;
    }

    .core-identity {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .core-avatar-orb {
      position: relative;
      width: 68px;
      height: 68px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 35% 35%, #06b6d4, #3b82f6 60%, #1e1b4b);
      box-shadow: 0 0 35px rgba(6, 182, 212, 0.4);
    }

    .orb-ring-outer {
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      border: 1px dashed rgba(56, 189, 248, 0.4);
      animation: rotate-ring 12s linear infinite;
    }

    .orb-ring-inner {
      position: absolute;
      inset: -2px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .orb-icon {
      font-size: 24px;
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
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: linear-gradient(135deg, #ffffff 40%, #93c5fd 80%, #38bdf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .subtext {
      font-size: 14px;
      color: #94a3b8;
      font-weight: 400;
    }

    .command-center-slot {
      width: 100%;
    }

    /* Dashboard Grid */
    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .section-heading {
      font-size: 14px;
      font-weight: 600;
      color: #94a3b8;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin: 0 0 14px 0;
    }

    .section-header-flex {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }

    .activity-count {
      font-size: 11px;
      color: #64748b;
    }

    /* Workspace App Cards */
    .workspace-cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .workspace-app-card {
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      padding: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .workspace-app-card:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(56, 189, 248, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
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
      flex-shrink: 0;
    }

    .ws-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow: hidden;
    }

    .ws-title {
      font-size: 13px;
      font-weight: 600;
      color: #f1f5f9;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .ws-desc {
      font-size: 11px;
      color: #64748b;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .ws-arrow {
      color: #64748b;
      font-size: 14px;
      transition: transform 0.2s;
    }

    .workspace-app-card:hover .ws-arrow {
      color: #38bdf8;
      transform: translateX(3px);
    }

    /* Activity Stream */
    .activity-stream {
      display: flex;
      flex-direction: column;
      gap: 8px;
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

    .act-type-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .type-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 6px #38bdf8;
    }

    .act-type-indicator[data-type="APP"] .type-dot { background: #10b981; box-shadow: 0 0 6px #10b981; }
    .act-type-indicator[data-type="MEDIA"] .type-dot { background: #8b5cf6; box-shadow: 0 0 6px #8b5cf6; }
    .act-type-indicator[data-type="TASK"] .type-dot { background: #38bdf8; box-shadow: 0 0 6px #38bdf8; }

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

    @media (max-width: 900px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }

      .workspace-cards-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class HomePageComponent {
  readonly stateService = inject(OperatorStateService);
  readonly commandService = inject(AgentCommandService);
  private readonly router = inject(Router);

  readonly workspaces = [
    {
      title: 'Agent Tasks',
      desc: 'Orchestrate & monitor multi-step automated workflows',
      route: '/tasks',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>'
    },
    {
      title: 'App Launcher',
      desc: 'Control local Windows desktop applications',
      route: '/applications',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>'
    },
    {
      title: 'Media Creative Studio',
      desc: 'Generate, compose & edit generative images & videos',
      route: '/media',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>'
    },
    {
      title: 'Multimodal Media Library',
      desc: 'Semantic vector search & multimodal asset indexing',
      route: '/media-library',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 8 7 4-7 4V8Z"/></svg>'
    },
    {
      title: 'AI Browser Workspace',
      desc: 'Automated web exploration & extraction',
      route: '/browser',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
    },
    {
      title: 'Personal Memory',
      desc: 'Browse indexed procedural & episodic memories',
      route: '/memory',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="M2 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M12 22v-4"/><path d="m19.07 19.07-2.83-2.83"/><path d="M22 12h-4"/><path d="m19.07 4.93-2.83 2.83"/></svg>'
    }
  ];

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
