import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AgentCommandCenterComponent } from '../../../../shared/ui/agent-command-center/agent-command-center.component';
import { AgentAttentionService } from '../../../../core/services/agent-attention.service';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { AgentApiService } from '../../../../core/api/agent-api.service';

@Component({
  selector: 'app-ask-workspace-page',
  standalone: true,
  imports: [CommonModule, RouterModule, AgentCommandCenterComponent],
  template: `
    <div class="ask-workspace-container" role="main" aria-label="ABHI Autonomous Agent Workspace">
      <!-- Attention / Approval Alert Strip (when items need operator action) -->
      @if (attentionService.hasApprovals()) {
        <div class="attention-banner" role="alert">
          <div class="attention-info">
            <span class="pulse-icon">⚠️</span>
            <div class="attention-text">
              <span class="attention-title">Action Approval Required</span>
              <span class="attention-desc">
                {{ attentionService.activeApprovals().length }} pending high-tier actions require operator consent.
              </span>
            </div>
          </div>
          <div class="attention-actions">
            @for (item of attentionService.activeApprovals(); track item.item_id) {
              @if (item.target_id) {
                <button
                  type="button"
                  class="btn-approve"
                  (click)="handleApprove(item.target_id)"
                  title="Approve action"
                >
                  Approve #{{ item.target_id }}
                </button>
                <button
                  type="button"
                  class="btn-reject"
                  (click)="handleReject(item.target_id)"
                  title="Reject action"
                >
                  Cancel
                </button>
              }
            }
          </div>
        </div>
      }

      <!-- Header Workspace Info -->
      <header class="workspace-header">
        <div class="header-titles">
          <span class="workspace-tag">AUTONOMOUS WORKSPACE</span>
          <h1 class="workspace-title">What should ABHI do for you?</h1>
          <p class="workspace-subtitle">
            Speak or type in natural language, ask follow-up instructions, or automate local computer workflows.
          </p>
        </div>
        <div class="header-meta">
          <div class="mode-pill" [attr.data-mode]="operatorState.userMode()">
            <span class="mode-dot"></span>
            {{ operatorState.userMode() }} MODE
          </div>
        </div>
      </header>

      <!-- Central Command Center Surface -->
      <section class="command-surface">
        <app-agent-command-center></app-agent-command-center>
      </section>

      <!-- Quick Action Gateway Cards -->
      <section class="quick-gateways">
        <h2 class="section-title">Autonomous Capabilities</h2>
        <div class="gateway-grid">
          <div class="gateway-card" (click)="presetCommand('Open Calculator and calculate 125 * 48')">
            <div class="card-icon">🧮</div>
            <div class="card-content">
              <span class="card-name">Quick Math & Apps</span>
              <span class="card-desc">Calculate expressions or launch Windows applications</span>
            </div>
          </div>

          <div class="gateway-card" (click)="presetCommand('Find my cyberpunk generative images')">
            <div class="card-icon">🎨</div>
            <div class="card-content">
              <span class="card-name">Multimodal Media</span>
              <span class="card-desc">Search, index, and generate generative media assets</span>
            </div>
          </div>

          <div class="gateway-card" (click)="presetCommand('Show current GPU and RAM status')">
            <div class="card-icon">⚡</div>
            <div class="card-content">
              <span class="card-name">System Telemetry</span>
              <span class="card-desc">Inspect local hardware, memory, and cognitive workers</span>
            </div>
          </div>

          <div class="gateway-card" (click)="presetCommand('క్యాలిక్యులేటర్ తెరవండి')">
            <div class="card-icon">🌐</div>
            <div class="card-content">
              <span class="card-name">Multilingual Voice & Text</span>
              <span class="card-desc">English, తెలుగు, हिंदी, தமிழ் natural language automation</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-height: 100vh;
      padding: 40px 24px;
      box-sizing: border-box;
    }

    .ask-workspace-container {
      max-width: 1040px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .attention-banner {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      backdrop-filter: blur(16px);
      border-radius: 16px;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      box-shadow: 0 10px 30px rgba(245, 158, 11, 0.1);
      animation: fadeIn 0.3s ease;
    }

    .attention-info {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .pulse-icon {
      font-size: 20px;
      animation: pulseAlert 2s infinite;
    }

    @keyframes pulseAlert {
      0% { transform: scale(1); }
      50% { transform: scale(1.15); }
      100% { transform: scale(1); }
    }

    .attention-text {
      display: flex;
      flex-direction: column;
    }

    .attention-title {
      font-size: 14px;
      font-weight: 700;
      color: #fbbf24;
    }

    .attention-desc {
      font-size: 12px;
      color: #cbd5e1;
    }

    .attention-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-approve {
      background: #10b981;
      color: #ffffff;
      border: none;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-approve:hover {
      background: #059669;
    }

    .btn-reject {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .workspace-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 20px;
    }

    .workspace-tag {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      padding: 4px 10px;
      border-radius: 20px;
      border: 1px solid rgba(56, 189, 248, 0.2);
      display: inline-block;
      margin-bottom: 8px;
    }

    .workspace-title {
      font-size: 28px;
      font-weight: 800;
      color: #f8fafc;
      margin: 0 0 8px 0;
      letter-spacing: -0.02em;
    }

    .workspace-subtitle {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;
      line-height: 1.5;
    }

    .mode-pill {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 20px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
    }

    .mode-pill[data-mode="USER"] .mode-dot { background: #10b981; box-shadow: 0 0 8px #10b981; }
    .mode-pill[data-mode="ADVANCED"] .mode-dot { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
    .mode-pill[data-mode="DEVELOPER"] .mode-dot { background: #ec4899; box-shadow: 0 0 8px #ec4899; }

    .mode-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .command-surface {
      width: 100%;
    }

    .quick-gateways {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 8px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #cbd5e1;
      margin: 0;
    }

    .gateway-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 14px;
    }

    .gateway-card {
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .gateway-card:hover {
      background: rgba(30, 41, 59, 0.7);
      border-color: rgba(56, 189, 248, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), 0 0 15px rgba(56, 189, 248, 0.1);
    }

    .card-icon {
      font-size: 24px;
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .card-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .card-name {
      font-size: 13px;
      font-weight: 700;
      color: #f1f5f9;
    }

    .card-desc {
      font-size: 11px;
      color: #64748b;
      line-height: 1.3;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 768px) {
      :host {
        padding: 20px 12px 90px 12px;
      }
      .workspace-header {
        flex-direction: column;
      }
      .gateway-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AskWorkspacePageComponent implements OnInit {
  readonly attentionService = inject(AgentAttentionService);
  readonly operatorState = inject(OperatorStateService);
  private readonly agentApi = inject(AgentApiService);

  ngOnInit(): void {
    this.attentionService.refreshAttention();
  }

  async handleApprove(taskId: string): Promise<void> {
    await this.attentionService.handleConsent(taskId, true);
  }

  async handleReject(taskId: string): Promise<void> {
    await this.attentionService.handleConsent(taskId, false);
  }

  presetCommand(commandText: string): void {
    // Dispatch via DOM input event or component bridge
    const inputEl = document.querySelector<HTMLInputElement>('.command-input');
    if (inputEl) {
      inputEl.value = commandText;
      inputEl.dispatchEvent(new Event('input'));
      inputEl.focus();
    }
  }
}
