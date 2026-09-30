import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SpatialCardStatus = 'SUCCESS' | 'WARNING' | 'ERROR' | 'ACTIVE' | 'INFO' | 'WORKING' | 'COMPLETED';

@Component({
  selector: 'app-spatial-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="spatial-card-frame"
      [class.interactive]="interactive"
      [attr.data-variant]="variant"
      [attr.data-status]="status"
      [style.transform]="transformStyle()"
      (mousemove)="onMouseMove($event)"
      (mouseleave)="onMouseLeave()"
    >
      <!-- Top Subtle Aura Line -->
      <div class="aura-line"></div>

      <!-- Card Header -->
      @if (title || headerAction || icon || statusText || statusBadge) {
        <div class="card-header">
          <div class="header-left">
            @if (icon) {
              <span class="header-icon">{{ icon }}</span>
            }
            <div class="header-titles">
              @if (title) {
                <h3 class="card-title">{{ title }}</h3>
              }
              @if (subtitle) {
                <p class="card-subtitle">{{ subtitle }}</p>
              }
            </div>
          </div>

          @if (effectiveBadge()) {
            <div class="header-right">
              <span class="status-badge" [attr.data-badge-type]="effectiveBadge()">
                {{ effectiveBadge() }}
              </span>
            </div>
          }
        </div>
      }

      <!-- Main Body Content Slot -->
      <div class="card-body" [attr.data-padding]="padding">
        <ng-content></ng-content>
      </div>

      <!-- Loading State Overlay -->
      @if (loading) {
        <div class="loading-overlay">
          <div class="spinner">🌀</div>
          <span class="loading-text">Processing...</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      perspective: 1000px;
    }

    .spatial-card-frame {
      position: relative;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease;
      transform-style: preserve-3d;
    }

    .spatial-card-frame:hover {
      border-color: rgba(255, 255, 255, 0.15);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(6, 182, 212, 0.08);
    }

    .spatial-card-frame.interactive {
      cursor: pointer;
    }

    .spatial-card-frame.interactive:active {
      transform: scale(0.99);
    }

    /* Variant styles */
    .spatial-card-frame[data-variant="solid"] {
      background: rgba(10, 15, 30, 0.9);
    }

    .spatial-card-frame[data-variant="elevated"] {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
    }

    /* Status border accents */
    .spatial-card-frame[data-status="SUCCESS"],
    .spatial-card-frame[data-status="COMPLETED"] {
      border-color: rgba(16, 185, 129, 0.3);
    }

    .spatial-card-frame[data-status="WARNING"] {
      border-color: rgba(245, 158, 11, 0.3);
    }

    .spatial-card-frame[data-status="ERROR"] {
      border-color: rgba(239, 68, 68, 0.3);
    }

    .spatial-card-frame[data-status="ACTIVE"],
    .spatial-card-frame[data-status="WORKING"] {
      border-color: rgba(56, 189, 248, 0.3);
    }

    .aura-line {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 18px 0 18px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .header-icon {
      font-size: 16px;
      padding: 6px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .header-titles {
      min-width: 0;
    }

    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0;
      letter-spacing: -0.01em;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .card-subtitle {
      font-size: 11px;
      color: #94a3b8;
      margin: 2px 0 0 0;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    .status-badge {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
    }

    .status-badge[data-badge-type="HEALTHY"],
    .status-badge[data-badge-type="SUCCESS"],
    .status-badge[data-badge-type="COMPLETED"] {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    .status-badge[data-badge-type="ACTIVE"],
    .status-badge[data-badge-type="WORKING"],
    .status-badge[data-badge-type="RUNNING"] {
      background: rgba(56, 189, 248, 0.15);
      border-color: rgba(56, 189, 248, 0.3);
      color: #38bdf8;
    }

    .status-badge[data-badge-type="WARNING"],
    .status-badge[data-badge-type="WAITING"] {
      background: rgba(245, 158, 11, 0.15);
      border-color: rgba(245, 158, 11, 0.3);
      color: #fbbf24;
    }

    .status-badge[data-badge-type="FAILED"],
    .status-badge[data-badge-type="ERROR"] {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.3);
      color: #f87171;
    }

    .card-body {
      padding: 16px 18px;
    }

    .card-body[data-padding="compact"] {
      padding: 10px 14px;
    }

    .card-body[data-padding="spacious"] {
      padding: 22px;
    }

    .loading-overlay {
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      z-index: 10;
    }

    .spinner {
      animation: spin 1s linear infinite;
    }

    .loading-text {
      font-size: 12px;
      color: #cbd5e1;
      font-weight: 500;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
  `]
})
export class SpatialCardComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() icon?: string;
  @Input() variant: 'glass' | 'solid' | 'elevated' = 'glass';
  @Input() padding: 'compact' | 'normal' | 'spacious' = 'normal';
  @Input() status?: SpatialCardStatus;
  @Input() statusBadge?: string;
  @Input() statusText?: string;
  @Input() elevation = 1;
  @Input() interactive = false;
  @Input() loading = false;
  @Input() headerAction = false;

  readonly transformStyle = signal<string>('perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)');

  effectiveBadge(): string | undefined {
    return this.statusText || this.statusBadge || (this.status && this.status !== 'INFO' ? this.status : undefined);
  }

  onMouseMove(e: MouseEvent): void {
    if (!this.interactive) return;
    const target = e.currentTarget as HTMLElement;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotX = -(y / (rect.height / 2)) * 4;
    const rotY = (x / (rect.width / 2)) * 4;
    this.transformStyle.set(`perspective(1000px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) translateZ(4px)`);
  }

  onMouseLeave(): void {
    this.transformStyle.set('perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)');
  }
}
