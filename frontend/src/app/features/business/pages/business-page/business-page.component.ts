import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BusinessService } from '../../services/business.service';
import { ThreeSceneManagerService } from '../../../../shared/3d/three-scene-manager.service';
import {
  BusinessApproval,
  BusinessOpportunity,
  BusinessProject,
  BusinessSector,
} from '../../models/business.model';

@Component({
  selector: 'app-business-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="business-workspace">
      <!-- Workspace Header -->
      <header class="workspace-header">
        <div class="header-left">
          <div class="workspace-title-group">
            <span class="workspace-pill">WORKSPACE FOUR</span>
            <h1 class="workspace-title">Autonomous Business Sectors</h1>
          </div>
          <p class="workspace-subtitle">
            Local agent-driven opportunity discovery, deliverable creation & evidence-backed project execution.
          </p>
        </div>

        <div class="header-actions">
          <button class="action-btn secondary" (click)="showNewOppModal.set(true)">
            <span>+ Score Opportunity</span>
          </button>
          <button class="action-btn primary" (click)="showNewProjModal.set(true)">
            <span>+ New Project</span>
          </button>
        </div>
      </header>

      <!-- Honest Financial Integrity Banner (Reference 4 & Requirement 15) -->
      <section class="financial-observatory-card">
        <div class="fin-header">
          <div class="fin-title-group">
            <span class="fin-title">REVENUE & LEDGER OBSERVATORY</span>
            <span class="fin-provenance-tag">
              PROVENANCE: {{ businessService.financials()?.revenue_provenance || 'ESTIMATED / NOT_CONNECTED' }}
            </span>
          </div>
          <span class="fin-disclaimer-text">
            {{ businessService.financials()?.disclaimer || 'Forecast only — not actual earnings. No verified external banking connected.' }}
          </span>
        </div>

        <div class="fin-metrics-row">
          <div class="fin-metric-box">
            <span class="fin-label">ACTUAL RECEIVED</span>
            <span class="fin-val highlight">$ {{ (businessService.financials()?.actual_revenue_received_usd || 0).toFixed(2) }}</span>
            <span class="fin-sub">Confirmed in bank</span>
          </div>
          <div class="fin-metric-box">
            <span class="fin-label">OPERATING EXPENSES</span>
            <span class="fin-val exp">$ {{ (businessService.financials()?.operating_expenses_usd || 0).toFixed(2) }}</span>
            <span class="fin-sub">Compute & local lease</span>
          </div>
          <div class="fin-metric-box">
            <span class="fin-label">NET RESULT</span>
            <span class="fin-val" [class.negative]="(businessService.financials()?.net_result_usd || 0) < 0">
              $ {{ (businessService.financials()?.net_result_usd || 0).toFixed(2) }}
            </span>
            <span class="fin-sub">Actual - Expenses</span>
          </div>
          <div class="fin-metric-box">
            <span class="fin-label">PENDING PAYMENTS</span>
            <span class="fin-val">$ {{ (businessService.financials()?.pending_payments_usd || 0).toFixed(2) }}</span>
            <span class="fin-sub">Invoiced / unverified</span>
          </div>
          <div class="fin-metric-box">
            <span class="fin-label">FORECAST REVENUE</span>
            <span class="fin-val forecast">$ {{ (businessService.financials()?.forecast_revenue_usd || 0).toFixed(2) }}</span>
            <span class="fin-sub">Estimated projection</span>
          </div>
        </div>
      </section>

      <!-- 6 Spatial Sectors Selector Bar -->
      <section class="sectors-ribbon">
        @for (sec of businessService.sectors(); track sec.id) {
          <div
            class="sector-tab"
            [class.active]="selectedSectorId() === sec.id"
            (click)="selectSector(sec.id)"
            [attr.tabindex]="0"
            role="button"
          >
            <div class="sector-color-dot" [style.background-color]="sec.color"></div>
            <div class="sector-tab-info">
              <span class="sector-tab-name">{{ sec.name }}</span>
              <span class="sector-tab-count">{{ sec.active_projects_count }} active projects</span>
            </div>
          </div>
        }
      </section>

      <!-- Main Business Operations Grid -->
      <div class="business-grid">
        <!-- Projects Column -->
        <div class="projects-column">
          <div class="column-header">
            <h2 class="column-title">Persisted Projects</h2>
            <span class="column-badge">{{ filteredProjects().length }} projects</span>
          </div>

          <div class="projects-list">
            @for (proj of filteredProjects(); track proj.id) {
              <div
                class="project-card"
                [class.selected]="businessService.selectedProject()?.id === proj.id"
                (click)="businessService.selectedProject.set(proj)"
                [attr.tabindex]="0"
                role="button"
              >
                <div class="proj-top">
                  <span class="proj-sector-badge">{{ proj.sector_id }}</span>
                  <span class="status-pill" [attr.data-status]="proj.status">{{ proj.status }}</span>
                </div>
                <h3 class="proj-name">{{ proj.name }}</h3>
                <p class="proj-objective">{{ proj.objective }}</p>

                <div class="proj-meta-row">
                  <span class="autonomy-tag">LEVEL {{ proj.autonomy_level }}</span>
                  <span class="budget-tag">Spent: \${{ proj.spent_usd.toFixed(2) }} / \${{ proj.budget_limit_usd.toFixed(2) }}</span>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Project Detail & Autonomy Execution Inspector -->
        <div class="detail-column">
          @if (businessService.selectedProject(); as proj) {
            <div class="detail-panel">
              <div class="detail-header">
                <div>
                  <span class="detail-sec">{{ proj.sector_id }}</span>
                  <h2 class="detail-title">{{ proj.name }}</h2>
                </div>
                <div class="detail-controls">
                  <span class="status-pill large" [attr.data-status]="proj.status">{{ proj.status }}</span>
                  <button
                    class="execute-step-btn"
                    (click)="executeNextStep(proj.id)"
                    [disabled]="isExecuting()"
                  >
                    @if (isExecuting()) {
                      <span>Executing...</span>
                    } @else {
                      <span>▶ Execute Next Step</span>
                    }
                  </button>
                </div>
              </div>

              <!-- Autonomy & Governance Settings -->
              <div class="governance-card">
                <div class="gov-col">
                  <span class="gov-label">AUTONOMY LEVEL</span>
                  <span class="gov-val">LEVEL {{ proj.autonomy_level }}</span>
                  <span class="gov-desc">
                    {{ getAutonomyDescription(proj.autonomy_level) }}
                  </span>
                </div>
                <div class="gov-col">
                  <span class="gov-label">AUTOPILOT PROFILE</span>
                  <span class="gov-val highlight">{{ proj.autopilot_mode }}</span>
                  <span class="gov-desc">Strict stop-conditions on budget and missing capabilities</span>
                </div>
                <div class="gov-col">
                  <span class="gov-label">BUDGET BOUNDARY</span>
                  <span class="gov-val">$ {{ proj.spent_usd.toFixed(2) }} / $ {{ proj.budget_limit_usd.toFixed(2) }}</span>
                  <div class="budget-bar">
                    <div class="budget-fill" [style.width.%]="(proj.spent_usd / proj.budget_limit_usd) * 100"></div>
                  </div>
                </div>
              </div>

              <!-- Pending Approvals (Level 5 Policy Gates) -->
              @if (proj.approvals && proj.approvals.length > 0) {
                <div class="approvals-section">
                  <label class="section-label">POLICY APPROVAL REQUESTS</label>
                  @for (app of proj.approvals; track app.id) {
                    <div class="approval-card" [class.pending]="app.status === 'PENDING'">
                      <div class="app-info">
                        <span class="app-desc">{{ app.action_description }}</span>
                        <span class="app-tier">{{ app.risk_tier }} · {{ app.required_permission }}</span>
                      </div>
                      @if (app.status === 'PENDING') {
                        <div class="app-actions">
                          <button class="app-btn approve" (click)="resolveApproval(proj.id, app.id, true)">Authorize</button>
                          <button class="app-btn reject" (click)="resolveApproval(proj.id, app.id, false)">Reject</button>
                        </div>
                      } @else {
                        <span class="app-resolved-badge" [attr.data-status]="app.status">{{ app.status }}</span>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Milestones & Deliverables -->
              <div class="milestones-section">
                <label class="section-label">MILESTONES & VERIFIED DELIVERABLES</label>
                <div class="milestones-list">
                  @for (m of proj.milestones; track m.id) {
                    <div class="milestone-item" [class.done]="m.status === 'COMPLETED'">
                      <div class="ms-marker">
                        @if (m.status === 'COMPLETED') {
                          <span>✓</span>
                        } @else if (m.status === 'IN_PROGRESS') {
                          <span>▶</span>
                        } @else {
                          <span>○</span>
                        }
                      </div>
                      <div class="ms-body">
                        <div class="ms-top">
                          <span class="ms-title">{{ m.title }}</span>
                          <span class="ms-status-badge" [attr.data-status]="m.status">{{ m.status }}</span>
                        </div>
                        <p class="ms-desc">{{ m.description }}</p>
                        @if (m.deliverable_ref) {
                          <div class="ms-deliverable">
                            <span class="deliv-label">Deliverable:</span>
                            <span class="deliv-ref">{{ m.deliverable_ref }}</span>
                            @if (m.verified) {
                              <span class="verified-tag">VERIFIED</span>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Evidence Ledger -->
              <div class="evidences-section">
                <label class="section-label">EVIDENCE LEDGER</label>
                <div class="evidences-list">
                  @for (ev of proj.evidences; track ev.id) {
                    <div class="evidence-item">
                      <span class="ev-tag" [attr.data-prov]="ev.provenance_type">{{ ev.provenance_type }}</span>
                      <span class="ev-claim">{{ ev.claim }}</span>
                      <span class="ev-source">Source: {{ ev.source }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          } @else {
            <div class="detail-empty">
              <span>Select a project from the left to inspect milestones, autonomy, and ledger.</span>
            </div>
          }
        </div>
      </div>

      <!-- Opportunities Gallery & Scored Concepts -->
      <section class="opportunities-section">
        <div class="section-header-flex">
          <h2 class="section-heading">Researched Opportunities & Scored Concepts</h2>
          <span class="section-sublabel">Multi-Dimensional Evaluation & Grounded Formula</span>
        </div>

        <div class="opps-grid">
          @for (opp of businessService.opportunities(); track opp.id) {
            <div class="opp-card">
              <div class="opp-header">
                <div>
                  <span class="opp-sector">{{ opp.sector_id }}</span>
                  <h3 class="opp-title">{{ opp.title }}</h3>
                </div>
                <div class="score-circle">
                  <span class="score-num">{{ opp.total_score }}</span>
                  <span class="score-sub">/100</span>
                </div>
              </div>

              <p class="opp-summary">{{ opp.summary }}</p>

              <div class="dimensions-list">
                @for (dim of opp.dimensions; track dim.dimension) {
                  <div class="dim-row">
                    <span class="dim-name">{{ dim.dimension }}</span>
                    <span class="dim-prov-badge">{{ dim.provenance }}</span>
                    <span class="dim-score">{{ dim.score.toFixed(0) }}%</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </section>

      <!-- New Project Modal -->
      @if (showNewProjModal()) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <h2 class="modal-title">Initiate New Business Project</h2>
            <div class="form-group">
              <label>Sector</label>
              <select [(ngModel)]="newProjSector" class="form-select">
                @for (sec of businessService.sectors(); track sec.id) {
                  <option [value]="sec.id">{{ sec.name }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Project Name</label>
              <input type="text" [(ngModel)]="newProjName" placeholder="e.g. Local Code Review CLI" class="form-input"/>
            </div>
            <div class="form-group">
              <label>Objective</label>
              <textarea [(ngModel)]="newProjObjective" rows="3" placeholder="Define the business goal and deliverable..." class="form-textarea"></textarea>
            </div>
            <div class="form-group">
              <label>Autonomy Level</label>
              <select [(ngModel)]="newProjAutonomy" class="form-select">
                <option [value]="1">Level 1 — Research Only</option>
                <option [value]="2">Level 2 — Plan Only</option>
                <option [value]="3">Level 3 — Build & Test Locally</option>
                <option [value]="4">Level 4 — Execute Approved Internal Work</option>
                <option [value]="5">Level 5 — External Action (Requires Approval)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Budget Limit (USD)</label>
              <input type="number" [(ngModel)]="newProjBudget" class="form-input"/>
            </div>
            <div class="modal-actions">
              <button class="action-btn secondary" (click)="showNewProjModal.set(false)">Cancel</button>
              <button class="action-btn primary" (click)="createProject()">Create Project</button>
            </div>
          </div>
        </div>
      }

      <!-- New Opportunity Scoring Modal -->
      @if (showNewOppModal()) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <h2 class="modal-title">Score New Business Opportunity</h2>
            <div class="form-group">
              <label>Sector</label>
              <select [(ngModel)]="newOppSector" class="form-select">
                @for (sec of businessService.sectors(); track sec.id) {
                  <option [value]="sec.id">{{ sec.name }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label>Concept Title</label>
              <input type="text" [(ngModel)]="newOppTitle" placeholder="e.g. Local Social Video Dubber" class="form-input"/>
            </div>
            <div class="form-group">
              <label>Description & Value Proposition</label>
              <textarea [(ngModel)]="newOppDesc" rows="3" placeholder="Describe the market need and capability required..." class="form-textarea"></textarea>
            </div>
            <div class="form-group">
              <label>Target Pricing (USD)</label>
              <input type="number" [(ngModel)]="newOppPrice" class="form-input"/>
            </div>
            <div class="modal-actions">
              <button class="action-btn secondary" (click)="showNewOppModal.set(false)">Cancel</button>
              <button class="action-btn primary" (click)="scoreOpportunity()">Evaluate & Score</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .business-workspace {
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
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
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
      gap: 10px;
    }

    .action-btn {
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .action-btn.primary {
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
    }

    .action-btn.secondary {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
    }

    .action-btn:hover {
      transform: translateY(-2px);
    }

    /* Financial Observatory Card */
    .financial-observatory-card {
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .fin-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .fin-title-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .fin-title {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.06em;
    }

    .fin-provenance-tag {
      font-size: 10px;
      font-family: monospace;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }

    .fin-disclaimer-text {
      font-size: 11px;
      color: #64748b;
      font-style: italic;
    }

    .fin-metrics-row {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
    }

    .fin-metric-box {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .fin-label {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      letter-spacing: 0.05em;
    }

    .fin-val {
      font-size: 16px;
      font-weight: 700;
      font-family: monospace;
      color: #f1f5f9;
    }

    .fin-val.highlight { color: #10b981; }
    .fin-val.exp { color: #f87171; }
    .fin-val.negative { color: #ef4444; }
    .fin-val.forecast { color: #38bdf8; }

    .fin-sub {
      font-size: 10px;
      color: #64748b;
    }

    /* 6 Sectors Ribbon */
    .sectors-ribbon {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
    }

    .sector-tab {
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .sector-tab:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(56, 189, 248, 0.3);
      transform: translateY(-2px);
    }

    .sector-tab.active {
      border-color: #38bdf8;
      background: rgba(56, 189, 248, 0.08);
    }

    .sector-color-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .sector-tab-info {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .sector-tab-name {
      font-size: 11px;
      font-weight: 600;
      color: #f1f5f9;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .sector-tab-count {
      font-size: 10px;
      color: #64748b;
    }

    /* Business Operations Grid */
    .business-grid {
      display: grid;
      grid-template-columns: 380px 1fr;
      gap: 20px;
    }

    .projects-column {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .column-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .column-title {
      font-size: 13px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0;
    }

    .column-badge {
      font-size: 11px;
      color: #64748b;
    }

    .projects-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .project-card {
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 14px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .project-card:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(56, 189, 248, 0.3);
      transform: translateY(-2px);
    }

    .project-card.selected {
      border-color: #38bdf8;
      background: rgba(56, 189, 248, 0.06);
      box-shadow: 0 0 15px rgba(56, 189, 248, 0.15);
    }

    .proj-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .proj-sector-badge {
      font-size: 10px;
      font-family: monospace;
      color: #64748b;
    }

    .status-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .status-pill[data-status="ACTIVE"] { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .status-pill[data-status="PLANNING"] { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
    .status-pill[data-status="PAUSED_APPROVAL"] { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
    .status-pill[data-status="BLOCKED"] { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

    .proj-name {
      font-size: 14px;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0;
    }

    .proj-objective {
      font-size: 12px;
      color: #94a3b8;
      margin: 0;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .proj-meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 4px;
      font-size: 11px;
    }

    .autonomy-tag {
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.04);
      color: #cbd5e1;
    }

    .budget-tag {
      color: #64748b;
      font-family: monospace;
    }

    /* Detail Column */
    .detail-panel {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .detail-sec {
      font-size: 11px;
      font-family: monospace;
      color: #64748b;
      text-transform: uppercase;
    }

    .detail-title {
      font-size: 18px;
      font-weight: 700;
      color: #f1f5f9;
      margin: 2px 0 0 0;
    }

    .detail-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .execute-step-btn {
      padding: 8px 14px;
      border-radius: 8px;
      background: linear-gradient(135deg, #10b981, #059669);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #ffffff;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
      transition: all 0.2s;
    }

    .execute-step-btn:hover:not(:disabled) {
      transform: translateY(-2px);
    }

    .governance-card {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 12px;
    }

    .gov-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .gov-label {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
    }

    .gov-val {
      font-size: 13px;
      font-weight: 700;
      color: #f1f5f9;
    }

    .gov-val.highlight { color: #38bdf8; }

    .gov-desc {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.3;
    }

    .budget-bar {
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      margin-top: 4px;
      overflow: hidden;
    }

    .budget-fill {
      height: 100%;
      background: #38bdf8;
    }

    .section-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 8px;
      display: block;
    }

    /* Approvals */
    .approvals-section {
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.25);
      border-radius: 12px;
      padding: 12px;
    }

    .approval-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .app-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .app-desc {
      font-size: 12px;
      color: #f1f5f9;
      font-weight: 500;
    }

    .app-tier {
      font-size: 10px;
      color: #f59e0b;
    }

    .app-actions {
      display: flex;
      gap: 6px;
    }

    .app-btn {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }

    .app-btn.approve {
      background: #10b981;
      border: none;
      color: white;
    }

    .app-btn.reject {
      background: transparent;
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
    }

    /* Milestones */
    .milestones-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .milestone-item {
      display: flex;
      gap: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 10px 12px;
    }

    .milestone-item.done {
      border-color: rgba(16, 185, 129, 0.3);
      background: rgba(16, 185, 129, 0.03);
    }

    .ms-marker {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.04);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: #38bdf8;
      flex-shrink: 0;
    }

    .milestone-item.done .ms-marker {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .ms-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .ms-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .ms-title {
      font-size: 13px;
      font-weight: 600;
      color: #f1f5f9;
    }

    .ms-status-badge {
      font-size: 9px;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.05);
      color: #94a3b8;
    }

    .ms-desc {
      font-size: 12px;
      color: #94a3b8;
      margin: 2px 0 0 0;
    }

    .ms-deliverable {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      font-size: 11px;
    }

    .deliv-label { color: #64748b; }
    .deliv-ref { color: #38bdf8; font-family: monospace; }
    .verified-tag {
      font-size: 9px;
      font-weight: 700;
      color: #10b981;
      background: rgba(16, 185, 129, 0.15);
      padding: 1px 4px;
      border-radius: 4px;
    }

    /* Evidences */
    .evidences-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .evidence-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #cbd5e1;
    }

    .ev-tag {
      font-size: 9px;
      font-family: monospace;
      padding: 2px 5px;
      border-radius: 4px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
    }

    .ev-source {
      margin-left: auto;
      font-size: 10px;
      color: #64748b;
    }

    .detail-empty {
      padding: 40px 20px;
      background: rgba(15, 23, 42, 0.4);
      border: 1px dashed rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      text-align: center;
      font-size: 13px;
      color: #64748b;
    }

    /* Opportunities Gallery */
    .opportunities-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .opps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 14px;
    }

    .opp-card {
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 14px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .opp-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .opp-sector {
      font-size: 10px;
      font-family: monospace;
      color: #64748b;
      text-transform: uppercase;
    }

    .opp-title {
      font-size: 14px;
      font-weight: 600;
      color: #f1f5f9;
      margin: 2px 0 0 0;
    }

    .score-circle {
      display: flex;
      align-items: baseline;
      padding: 4px 8px;
      border-radius: 8px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .score-num {
      font-size: 16px;
      font-weight: 700;
      font-family: monospace;
      color: #10b981;
    }

    .score-sub {
      font-size: 10px;
      color: #64748b;
    }

    .opp-summary {
      font-size: 12px;
      color: #94a3b8;
      margin: 0;
      line-height: 1.4;
    }

    .dimensions-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.04);
    }

    .dim-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }

    .dim-name { color: #cbd5e1; }
    .dim-prov-badge { font-size: 9px; color: #64748b; font-family: monospace; }
    .dim-score { font-family: monospace; color: #38bdf8; font-weight: 600; }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .modal-card {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 24px;
      width: 100%;
      max-width: 480px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
    }

    .modal-title {
      font-size: 16px;
      font-weight: 700;
      color: #f1f5f9;
      margin: 0;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .form-group label {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
    }

    .form-input, .form-select, .form-textarea {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 8px 12px;
      color: #f1f5f9;
      font-size: 13px;
      outline: none;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }

    @media (max-width: 1024px) {
      .sectors-ribbon { grid-template-columns: repeat(3, 1fr); }
      .business-grid { grid-template-columns: 1fr; }
      .fin-metrics-row { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class BusinessPageComponent implements OnInit {
  readonly businessService = inject(BusinessService);
  private readonly threeScene = inject(ThreeSceneManagerService);

  readonly selectedSectorId = signal<string | null>(null);
  readonly isExecuting = signal<boolean>(false);
  readonly showNewProjModal = signal<boolean>(false);
  readonly showNewOppModal = signal<boolean>(false);

  // New Project Form
  newProjSector = 'software_tools';
  newProjName = '';
  newProjObjective = '';
  newProjAutonomy = 3;
  newProjBudget = 50.0;

  // New Opportunity Form
  newOppSector = 'media_studio';
  newOppTitle = '';
  newOppDesc = '';
  newOppPrice = 29.0;

  ngOnInit(): void {
    this.threeScene.setMode('BUSINESS');
    this.businessService.fetchSectors().subscribe();
    this.businessService.fetchProjects().subscribe();
    this.businessService.fetchOpportunities().subscribe();
    this.businessService.fetchFinancials().subscribe();
  }

  selectSector(sectorId: string): void {
    if (this.selectedSectorId() === sectorId) {
      this.selectedSectorId.set(null);
      this.businessService.fetchProjects().subscribe();
    } else {
      this.selectedSectorId.set(sectorId);
      this.businessService.fetchProjects(sectorId).subscribe();
    }
  }

  filteredProjects(): BusinessProject[] {
    const all = this.businessService.projects();
    const sec = this.selectedSectorId();
    if (!sec) return all;
    return all.filter((p) => p.sector_id === sec);
  }

  executeNextStep(projectId: string): void {
    this.isExecuting.set(true);
    this.businessService.executeNextStep(projectId).subscribe({
      next: () => this.isExecuting.set(false),
      error: () => this.isExecuting.set(false),
    });
  }

  resolveApproval(projectId: string, approvalId: string, approve: boolean): void {
    this.businessService.resolveApproval(projectId, approvalId, approve).subscribe();
  }

  createProject(): void {
    if (!this.newProjName || !this.newProjObjective) return;
    this.businessService
      .createProject({
        sector_id: this.newProjSector,
        name: this.newProjName,
        objective: this.newProjObjective,
        autonomy_level: Number(this.newProjAutonomy),
        budget_limit_usd: Number(this.newProjBudget),
      })
      .subscribe(() => {
        this.showNewProjModal.set(false);
        this.newProjName = '';
        this.newProjObjective = '';
      });
  }

  scoreOpportunity(): void {
    if (!this.newOppTitle || !this.newOppDesc) return;
    this.businessService
      .evaluateOpportunity({
        sector_id: this.newOppSector,
        title: this.newOppTitle,
        concept_description: this.newOppDesc,
        target_pricing_usd: Number(this.newOppPrice),
      })
      .subscribe(() => {
        this.showNewOppModal.set(false);
        this.newOppTitle = '';
        this.newOppDesc = '';
      });
  }

  getAutonomyDescription(level: number): string {
    switch (level) {
      case 0: return 'Level 0 — Observe Only (No automated action)';
      case 1: return 'Level 1 — Research & synthesis';
      case 2: return 'Level 2 — Planning & design specification';
      case 3: return 'Level 3 — Local build & verification';
      case 4: return 'Level 4 — Execute approved internal work';
      case 5: return 'Level 5 — External action requiring explicit approval';
      default: return `Level ${level}`;
    }
  }
}
