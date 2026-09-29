import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HardwareInventoryDTO, ResourceLedgerEntryDTO } from '../../models/resource.model';

@Component({
  selector: 'app-hardware-gauge-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- CPU Gauge -->
      <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Processor (CPU)</span>
          <span class="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
            {{ inventory()?.cpu_logical_cores || 16 }}T / {{ inventory()?.cpu_physical_cores || 8 }}C
          </span>
        </div>
        <div class="my-2">
          <div class="text-2xl font-bold font-mono text-slate-100">
            {{ inventory()?.cpu_utilization_percent || 0 | number:'1.0-1' }}%
          </div>
          <div class="text-xs text-slate-400 truncate mt-1" [title]="inventory()?.cpu_model || ''">
            {{ inventory()?.cpu_model || 'AMD Ryzen 7 260' }}
          </div>
        </div>
        <div class="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
          <div
            class="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            [style.width.%]="inventory()?.cpu_utilization_percent || 5"
          ></div>
        </div>
      </div>

      <!-- System RAM Gauge -->
      <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">System Memory (RAM)</span>
          <span class="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
            {{ (inventory()?.ram_total_mb || 24425) / 1024 | number:'1.1-1' }} GB Total
          </span>
        </div>
        <div class="my-2">
          <div class="text-2xl font-bold font-mono text-slate-100">
            {{ (inventory()?.ram_used_mb || 8425) / 1024 | number:'1.1-1' }} <span class="text-sm font-normal text-slate-400">/ {{ (inventory()?.ram_total_mb || 24425) / 1024 | number:'1.1-1' }} GB</span>
          </div>
          <div class="text-xs text-slate-400 mt-1">
            Free: {{ (inventory()?.ram_available_mb || 16000) / 1024 | number:'1.1-1' }} GB (Reserved: 4.0 GB)
          </div>
        </div>
        <div class="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
          <div
            class="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
            [style.width.%]="ramUsagePercent()"
          ></div>
        </div>
      </div>

      <!-- GPU & VRAM Gauge -->
      <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Discrete GPU & VRAM</span>
          <span class="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            CUDA {{ inventory()?.gpu_cuda_version || '13.1' }}
          </span>
        </div>
        <div class="my-2">
          <div class="text-2xl font-bold font-mono text-slate-100">
            {{ (inventory()?.gpu_vram_used_mb || 1200) / 1024 | number:'1.1-1' }} <span class="text-sm font-normal text-slate-400">/ {{ (inventory()?.gpu_vram_total_mb || 8151) / 1024 | number:'1.1-1' }} GB</span>
          </div>
          <div class="text-xs text-slate-400 truncate mt-1">
            {{ inventory()?.gpu_model || 'NVIDIA RTX 5050' }} ({{ inventory()?.gpu_temperature_c || 48 }}°C)
          </div>
        </div>
        <div class="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
          <div
            class="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
            [style.width.%]="vramUsagePercent()"
          ></div>
        </div>
      </div>

      <!-- NPU & Storage Status -->
      <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">NPU & Storage</span>
          <span
            class="text-xs font-mono px-2 py-0.5 rounded border"
            [ngClass]="inventory()?.npu_status === 'USABLE' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-700/40 text-slate-400 border-slate-700'"
          >
            NPU: {{ inventory()?.npu_status || 'UNSUPPORTED' }}
          </span>
        </div>
        <div class="my-2">
          <div class="text-2xl font-bold font-mono text-slate-100">
            {{ (inventory()?.storage_primary_free_mb || 326450) / 1024 | number:'1.0-0' }} GB Free
          </div>
          <div class="text-xs text-slate-400 mt-1">
            Primary SSD Headroom (C: drive)
          </div>
        </div>
        <div class="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
          <div class="bg-cyan-500 h-1.5 rounded-full" style="width: 70%"></div>
        </div>
      </div>
    </div>
  `
})
export class HardwareGaugePanelComponent {
  inventory = input<HardwareInventoryDTO | null>(null);
  ramUsagePercent = input<number>(35);
  vramUsagePercent = input<number>(20);
}
