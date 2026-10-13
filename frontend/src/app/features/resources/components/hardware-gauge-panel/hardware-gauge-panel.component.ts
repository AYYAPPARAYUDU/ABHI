import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HardwareInventoryDTO } from '../../models/resource.model';
import { AnimeInteractiveDirective } from '../../../../shared/directives/anime-interactive.directive';

@Component({
  selector: 'app-hardware-gauge-panel',
  standalone: true,
  imports: [CommonModule, AnimeInteractiveDirective],
  template: `
    <div class="gauges-grid">
      <!-- CPU Gauge -->
      <div class="gauge-card" appAnimeInteractive>
        <div class="gauge-header">
          <span class="gauge-label">Processor (CPU)</span>
          <span class="abhi-badge abhi-badge-cyan">
            {{ inventory()?.cpu_logical_cores || 16 }}T / {{ inventory()?.cpu_physical_cores || 8 }}C
          </span>
        </div>
        <div class="gauge-metric">
          <div class="gauge-value">
            {{ inventory()?.cpu_utilization_percent || 0 | number:'1.0-1' }}%
          </div>
          <div class="gauge-subtext" [title]="inventory()?.cpu_model || ''">
            {{ inventory()?.cpu_model || 'AMD Ryzen 7' }}
          </div>
        </div>
        <div class="progress-track">
          <div
            class="progress-fill fill-cyan"
            [style.width.%]="inventory()?.cpu_utilization_percent || 5"
          ></div>
        </div>
      </div>

      <!-- System RAM Gauge -->
      <div class="gauge-card" appAnimeInteractive>
        <div class="gauge-header">
          <span class="gauge-label">System Memory (RAM)</span>
          <span class="abhi-badge abhi-badge-cyan">
            {{ (inventory()?.ram_total_mb || 24425) / 1024 | number:'1.1-1' }} GB Total
          </span>
        </div>
        <div class="gauge-metric">
          <div class="gauge-value">
            {{ (inventory()?.ram_used_mb || 8425) / 1024 | number:'1.1-1' }} <span class="gauge-unit">/ {{ (inventory()?.ram_total_mb || 24425) / 1024 | number:'1.1-1' }} GB</span>
          </div>
          <div class="gauge-subtext">
            Free: {{ (inventory()?.ram_available_mb || 16000) / 1024 | number:'1.1-1' }} GB
          </div>
        </div>
        <div class="progress-track">
          <div
            class="progress-fill fill-blue"
            [style.width.%]="ramUsagePercent()"
          ></div>
        </div>
      </div>

      <!-- GPU & VRAM Gauge -->
      <div class="gauge-card" appAnimeInteractive>
        <div class="gauge-header">
          <span class="gauge-label">Discrete GPU & VRAM</span>
          <span class="abhi-badge abhi-badge-success">
            CUDA {{ inventory()?.gpu_cuda_version || '13.1' }}
          </span>
        </div>
        <div class="gauge-metric">
          <div class="gauge-value">
            {{ (inventory()?.gpu_vram_used_mb || 1200) / 1024 | number:'1.1-1' }} <span class="gauge-unit">/ {{ (inventory()?.gpu_vram_total_mb || 8151) / 1024 | number:'1.1-1' }} GB</span>
          </div>
          <div class="gauge-subtext">
            {{ inventory()?.gpu_model || 'NVIDIA RTX' }} ({{ inventory()?.gpu_temperature_c || 48 }}°C)
          </div>
        </div>
        <div class="progress-track">
          <div
            class="progress-fill fill-emerald"
            [style.width.%]="vramUsagePercent()"
          ></div>
        </div>
      </div>

      <!-- NPU & Storage Status -->
      <div class="gauge-card" appAnimeInteractive>
        <div class="gauge-header">
          <span class="gauge-label">NPU & Storage</span>
          <span
            class="abhi-badge"
            [ngClass]="inventory()?.npu_status === 'USABLE' ? 'abhi-badge-success' : 'abhi-badge-warning'"
          >
            NPU: {{ inventory()?.npu_status || 'UNSUPPORTED' }}
          </span>
        </div>
        <div class="gauge-metric">
          <div class="gauge-value">
            {{ (inventory()?.storage_primary_free_mb || 326450) / 1024 | number:'1.0-0' }} GB Free
          </div>
          <div class="gauge-subtext">
            Primary SSD Headroom (C: drive)
          </div>
        </div>
        <div class="progress-track">
          <div class="progress-fill fill-cyan" style="width: 70%"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .gauges-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }
    .gauge-card {
      background: var(--abhi-surface-raised, #0e1828);
      border: 1px solid var(--abhi-border, rgba(151, 185, 230, 0.13));
      border-radius: var(--abhi-radius-control, 16px);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: var(--abhi-raised-shadow);
      min-height: 140px;
    }
    .gauge-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }
    .gauge-label {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--abhi-text-secondary, #a7b7cc);
    }
    .gauge-metric {
      margin: 0.4rem 0;
    }
    .gauge-value {
      font-size: 1.4rem;
      font-weight: 800;
      font-family: ui-monospace, monospace;
      color: #ffffff;
    }
    .gauge-unit {
      font-size: 0.82rem;
      font-weight: 400;
      color: var(--abhi-text-muted, #8193ac);
    }
    .gauge-subtext {
      font-size: 0.74rem;
      color: var(--abhi-text-secondary, #a7b7cc);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 0.2rem;
    }
    .progress-track {
      width: 100%;
      height: 6px;
      background: var(--abhi-surface-inset, #080e18);
      border-radius: 9999px;
      box-shadow: var(--abhi-inset-shadow);
      overflow: hidden;
      margin-top: 0.5rem;
    }
    .progress-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.3s ease;
    }
    .fill-cyan { background: var(--abhi-cyan, #38d9ff); box-shadow: 0 0 8px rgba(56, 217, 255, 0.4); }
    .fill-blue { background: var(--abhi-blue, #397bff); box-shadow: 0 0 8px rgba(57, 123, 255, 0.4); }
    .fill-emerald { background: var(--abhi-success, #48dda2); box-shadow: 0 0 8px rgba(72, 221, 162, 0.4); }
  `]
})
export class HardwareGaugePanelComponent {
  inventory = input<HardwareInventoryDTO | null>(null);
  ramUsagePercent = input<number>(35);
  vramUsagePercent = input<number>(20);
}

