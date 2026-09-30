import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { SpatialCardComponent } from '../../../../shared/ui/spatial-card/spatial-card.component';
import { RecentActivityItem } from '../../../../core/models/agent-experience.model';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SpatialCardComponent],
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
              <span class="subtext">ABHI is active & ready in your local environment</span>
            </h1>
          </div>
        </div>

        <!-- Central Command Bar -->
        <div class="central-command-box">
          <form class="command-form" (ngSubmit)="submitCommand()">
            <div class="command-input-wrap">
              <span class="command-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input
                type="text"
                class="command-input"
                [(ngModel)]="commandText"
                name="commandInput"
                placeholder="What should ABHI do? (e.g., 'Open Notepad and write today\\'s plan')"
                autocomplete="off"
                [disabled]="isSubmitting()"
              />
              <div class="command-actions">
                <button
                  type="button"
                  class="voice-btn"
                  [class.recording]="isListening()"
                  (click)="toggleVoiceInput()"
                  title="Voice Command"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                  </svg>
                </button>
                <button
                  type="submit"
                  class="submit-btn"
                  [disabled]="!commandText.trim() || isSubmitting()"
                  title="Execute Intent"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </div>
          </form>

          <!-- Suggestion Chips -->
          <div class="suggestion-chips">
            <span class="chips-label">Try:</span>
            @for (sug of suggestions; track sug) {
              <button
                type="button"
                class="chip-btn"
                (click)="applySuggestion(sug)"
              >
                {{ sug }}
              </button>
            }
          </div>
        </div>
      </section>

      <!-- Active Agent Outcome Card (When Busy or Recent Result) -->
      @if (stateService.isBusy() || stateService.currentTask()) {
        <section class="active-agent-section">
          <app-spatial-card
            [title]="stateService.isBusy() ? 'ABHI in Progress' : 'Task Status'"
            [status]="stateService.currentTask()?.isSuccess ? 'COMPLETED' : (stateService.isBusy() ? 'WORKING' : 'INFO')"
            [elevation]="2"
            statusText="Agent Automation"
          >
            <div class="agent-outcome-content">
              <div class="outcome-header">
                <div class="outcome-icon-wrap" [class.spinning]="stateService.isBusy()">
                  @if (stateService.isBusy()) {
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                  } @else {
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  }
                </div>
                <div class="outcome-text">
                  <div class="outcome-title">{{ stateService.currentTask()?.goal }}</div>
                  <div class="outcome-step">{{ stateService.currentTask()?.currentStep || 'Executing actions…' }}</div>
                </div>
                <div class="outcome-controls">
                  @if (stateService.isBusy()) {
                    <button type="button" class="ctrl-btn danger" (click)="stateService.cancelActiveTask()">
                      Cancel
                    </button>
                  }
                  <a routerLink="/tasks" class="ctrl-btn secondary">
                    View Tasks
                  </a>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="progress-track">
                <div
                  class="progress-fill"
                  [style.width.%]="stateService.currentTask()?.progressPercent || (stateService.isBusy() ? 45 : 100)"
                ></div>
              </div>
            </div>
          </app-spatial-card>
        </section>
      }

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
            <h2 class="section-heading">Recent Activity</h2>
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
      padding: 30px 20px 20px 20px;
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

    /* Central Command Box */
    .central-command-box {
      width: 100%;
      max-width: 680px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .command-input-wrap {
      display: flex;
      align-items: center;
      background: rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 6px 10px 6px 18px;
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.05);
      transition: all 0.25s ease;
    }

    .command-input-wrap:focus-within {
      border-color: rgba(56, 189, 248, 0.6);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 24px rgba(6, 182, 212, 0.25);
    }

    .command-icon {
      color: #64748b;
      display: flex;
      align-items: center;
      margin-right: 12px;
    }

    .command-input {
      flex: 1;
      background: transparent;
      border: none;
      color: #f1f5f9;
      font-size: 15px;
      outline: none;
    }

    .command-input::placeholder {
      color: #64748b;
    }

    .command-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .voice-btn, .submit-btn {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .voice-btn {
      background: rgba(255, 255, 255, 0.06);
      color: #94a3b8;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .voice-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #f1f5f9;
    }

    .voice-btn.recording {
      background: rgba(239, 68, 68, 0.2);
      border-color: #ef4444;
      color: #ef4444;
      animation: pulse-dot 1s infinite;
    }

    .submit-btn {
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(6, 182, 212, 0.35);
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(6, 182, 212, 0.5);
    }

    .submit-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* Suggestion Chips */
    .suggestion-chips {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chips-label {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
    }

    .chip-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .chip-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #38bdf8;
      border-color: rgba(56, 189, 248, 0.3);
      transform: translateY(-1px);
    }

    /* Active Agent Section */
    .active-agent-section {
      width: 100%;
    }

    .agent-outcome-content {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .outcome-header {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .outcome-icon-wrap {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.3);
      color: #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .outcome-icon-wrap.spinning svg {
      animation: spin 1.5s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .outcome-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .outcome-title {
      font-size: 15px;
      font-weight: 600;
      color: #f1f5f9;
    }

    .outcome-step {
      font-size: 12px;
      color: #94a3b8;
    }

    .outcome-controls {
      display: flex;
      gap: 8px;
    }

    .ctrl-btn {
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.15s;
    }

    .ctrl-btn.secondary {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
    }

    .ctrl-btn.secondary:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
    }

    .ctrl-btn.danger {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
    }

    .ctrl-btn.danger:hover {
      background: rgba(239, 68, 68, 0.3);
    }

    .progress-track {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #06b6d4, #38bdf8);
      border-radius: 4px;
      transition: width 0.3s ease;
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
  private readonly router = inject(Router);

  commandText = '';
  isSubmitting = signal<boolean>(false);
  isListening = signal<boolean>(false);

  readonly suggestions: string[] = [
    'Open Notepad and write today\'s plan',
    'Create cinematic night city video',
    'Open Calculator',
    'Find cyberpunk images in media library',
    'Inspect system resources'
  ];

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

  applySuggestion(sug: string): void {
    this.commandText = sug;
    this.submitCommand();
  }

  async submitCommand(): Promise<void> {
    const text = this.commandText.trim();
    if (!text || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    try {
      await this.stateService.submitGoal(text);
      this.stateService.addRecentActivity({
        id: `act_${Date.now()}`,
        type: 'TASK',
        title: text.length > 30 ? text.substring(0, 30) + '…' : text,
        description: 'Initiated personal AI automation workflow',
        timestamp: Date.now(),
        status: 'RUNNING',
        routeLink: '/tasks'
      });
      this.commandText = '';
    } finally {
      this.isSubmitting.set(false);
    }
  }

  toggleVoiceInput(): void {
    this.isListening.set(!this.isListening());
    if (this.isListening()) {
      // If voice recognition is available or mock
      setTimeout(() => {
        if (this.isListening()) {
          this.commandText = 'Open Notepad and write today\'s plan';
          this.isListening.set(false);
        }
      }, 3000);
    }
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
