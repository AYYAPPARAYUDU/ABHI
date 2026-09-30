import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AgentCommandResult } from '../../../core/models/agent-experience.model';

@Component({
  selector: 'app-result-sheet',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (result) {
      <div class="result-sheet-container" [attr.data-type]="result.type">
        <!-- Top Glow Accent Line -->
        <div class="sheet-aura-line"></div>

        <!-- Result Header -->
        <div class="sheet-header">
          <div class="header-left">
            <span class="type-icon">
              @switch (result.type) {
                @case ('NUMBER_RESULT') { 🧮 }
                @case ('MEDIA_RESULT') { 🎬 }
                @case ('APPLICATION_RESULT') { 💻 }
                @case ('SEARCH_RESULTS') { 🔍 }
                @case ('ERROR_RESULT') { ⚠️ }
                @case ('APPROVAL_REQUEST') { 🛡️ }
                @default { ✓ }
              }
            </span>
            <div class="header-titles">
              <h4 class="sheet-title">{{ result.title }}</h4>
              <span class="sheet-badge">{{ result.type.replace('_', ' ') }}</span>
            </div>
          </div>

          <button
            type="button"
            class="close-btn"
            (click)="onDismiss.emit()"
            title="Dismiss Result"
          >
            ✕
          </button>
        </div>

        <!-- Result Body Content by Type -->
        <div class="sheet-body">
          <!-- Number / Calculation Result -->
          @if (result.type === 'NUMBER_RESULT' && result.calculationExpression) {
            <div class="calc-display-card">
              <span class="calc-expression">{{ result.calculationExpression }}</span>
              <span class="calc-equal">=</span>
              <span class="calc-value">{{ result.numberValue }}</span>
            </div>
          }

          <!-- Media Result Preview -->
          @if (result.type === 'MEDIA_RESULT') {
            <div class="media-preview-box">
              <div class="media-placeholder">
                <span class="media-icon">🎬</span>
                <span class="media-label">Generative Media Ready</span>
              </div>
              <p class="media-summary">{{ result.summary }}</p>
            </div>
          }

          <!-- Search Results List -->
          @if (result.type === 'SEARCH_RESULTS' && result.searchResults) {
            <div class="search-results-list">
              @for (item of result.searchResults; track item.id) {
                <div class="search-item-card" (click)="navigateItem(item.routeLink)">
                  <span class="item-icon">📄</span>
                  <div class="item-text">
                    <span class="item-title">{{ item.title }}</span>
                    <span class="item-subtitle">{{ item.subtitle }}</span>
                  </div>
                  <span class="item-arrow">→</span>
                </div>
              }
            </div>
          }

          <!-- General Text / Task Summary -->
          @if (result.type !== 'NUMBER_RESULT' && result.type !== 'SEARCH_RESULTS') {
            <p class="result-summary-text">{{ result.summary }}</p>
          }

          <!-- Error Recovery Message -->
          @if (result.type === 'ERROR_RESULT' && result.recoverySuggestion) {
            <div class="recovery-box">
              <span class="recovery-label">Suggestion:</span>
              <span class="recovery-text">{{ result.recoverySuggestion }}</span>
            </div>
          }
        </div>

        <!-- Sheet Footer Actions -->
        @if (result.actions && result.actions.length > 0) {
          <div class="sheet-footer">
            @for (action of result.actions; track action.label) {
              <button
                type="button"
                class="action-btn"
                [class.primary]="action.actionType === 'NAVIGATE' || action.actionType === 'APPROVE'"
                [class.secondary]="action.actionType === 'RETRY'"
                (click)="handleAction(action)"
              >
                {{ action.label }}
              </button>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .result-sheet-container {
      position: relative;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 18px;
      overflow: hidden;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.45);
      animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .sheet-aura-line {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.6), transparent);
    }

    .result-sheet-container[data-type="NUMBER_RESULT"] .sheet-aura-line {
      background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.8), transparent);
    }

    .result-sheet-container[data-type="ERROR_RESULT"] .sheet-aura-line {
      background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.8), transparent);
    }

    .sheet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .type-icon {
      font-size: 18px;
    }

    .header-titles {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sheet-title {
      font-size: 14px;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0;
    }

    .sheet-badge {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 2px 6px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
      color: #94a3b8;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 14px;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .close-btn:hover {
      color: #f1f5f9;
      background: rgba(255, 255, 255, 0.08);
    }

    .sheet-body {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .calc-display-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 12px;
      font-family: monospace;
    }

    .calc-expression {
      font-size: 16px;
      color: #94a3b8;
    }

    .calc-equal {
      font-size: 18px;
      color: #64748b;
    }

    .calc-value {
      font-size: 22px;
      font-weight: 700;
      color: #34d399;
      text-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
    }

    .result-summary-text {
      font-size: 13px;
      color: #cbd5e1;
      margin: 0;
      line-height: 1.5;
    }

    .search-results-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .search-item-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .search-item-card:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(56, 189, 248, 0.3);
      transform: translateX(2px);
    }

    .item-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .item-title {
      font-size: 12px;
      font-weight: 600;
      color: #f1f5f9;
      truncate: true;
    }

    .item-subtitle {
      font-size: 11px;
      color: #94a3b8;
      truncate: true;
    }

    .item-arrow {
      color: #64748b;
      font-size: 12px;
    }

    .recovery-box {
      padding: 8px 12px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.2);
      border-radius: 8px;
      font-size: 12px;
      color: #fbbf24;
      display: flex;
      gap: 6px;
    }

    .recovery-label {
      font-weight: 600;
    }

    .sheet-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding-top: 6px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
    }

    .action-btn {
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .action-btn.primary {
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      color: #ffffff;
      box-shadow: 0 2px 10px rgba(6, 182, 212, 0.3);
    }

    .action-btn.primary:hover {
      box-shadow: 0 4px 14px rgba(6, 182, 212, 0.5);
    }

    .action-btn.secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
    }

    .action-btn.secondary:hover {
      background: rgba(255, 255, 255, 0.14);
      color: #ffffff;
    }
  `]
})
export class UniversalResultSheetComponent {
  @Input() result: AgentCommandResult | null = null;
  @Output() onDismiss = new EventEmitter<void>();
  @Output() onAction = new EventEmitter<any>();

  private readonly router = inject(Router);

  navigateItem(routeLink?: string): void {
    if (routeLink) {
      this.router.navigateByUrl(routeLink);
    }
  }

  handleAction(action: any): void {
    if (action.actionType === 'NAVIGATE' && action.payload) {
      this.router.navigateByUrl(action.payload);
    } else {
      this.onAction.emit(action);
    }
  }
}
