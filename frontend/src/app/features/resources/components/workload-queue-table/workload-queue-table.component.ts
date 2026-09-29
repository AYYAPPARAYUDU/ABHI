import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceLeaseDTO } from '../../models/resource.model';

@Component({
  selector: 'app-workload-queue-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-sm font-semibold text-slate-100">Active Resource Leases & Workload Queue</h3>
          <p class="text-xs text-slate-400">Deterministic bounded resource allocations across tasks, models, and workers</p>
        </div>
        <span class="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
          {{ leases().length }} Active Leases
        </span>
      </div>

      @if (leases().length === 0) {
        <div class="text-center py-8 text-xs text-slate-500 bg-slate-950/40 rounded-lg border border-dashed border-slate-800">
          No active resource leases currently allocated. System running in baseline idle state.
        </div>
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/60 border-b border-slate-800">
              <tr>
                <th class="py-2.5 px-3">Lease ID</th>
                <th class="py-2.5 px-3">Owner</th>
                <th class="py-2.5 px-3">Resource</th>
                <th class="py-2.5 px-3">Amount</th>
                <th class="py-2.5 px-3">Priority</th>
                <th class="py-2.5 px-3">State</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60 text-slate-300">
              @for (lease of leases(); track lease.lease_id) {
                <tr class="hover:bg-slate-800/30 transition-colors">
                  <td class="py-2 px-3 font-mono text-slate-400">{{ lease.lease_id }}</td>
                  <td class="py-2 px-3">
                    <span class="font-medium text-slate-200">{{ lease.owner_type }}</span>
                    <span class="text-slate-500 block text-[10px] font-mono">{{ lease.owner_id }}</span>
                  </td>
                  <td class="py-2 px-3 font-semibold text-slate-200">{{ lease.resource_type }}</td>
                  <td class="py-2 px-3 font-mono text-emerald-400 font-medium">
                    {{ lease.granted_amount | number:'1.0-1' }}
                  </td>
                  <td class="py-2 px-3">
                    <span class="font-mono text-xs text-slate-300">{{ getPriorityLabel(lease.priority) }}</span>
                  </td>
                  <td class="py-2 px-3">
                    <span
                      class="px-2 py-0.5 rounded text-[10px] font-semibold border"
                      [ngClass]="getLeaseStateClass(lease.state)"
                    >
                      {{ lease.state }}
                    </span>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `
})
export class WorkloadQueueTableComponent {
  leases = input<ResourceLeaseDTO[]>([]);

  getPriorityLabel(priority: number): string {
    if (priority >= 100) return 'P0 Safety';
    if (priority >= 90) return 'P1 Interactive';
    if (priority >= 80) return 'P2 Task';
    if (priority >= 70) return 'P3 Perception';
    if (priority >= 50) return 'P4 Indexing';
    if (priority >= 40) return 'P5 Eval';
    if (priority >= 30) return 'P6 Candidate';
    return 'P7 Maint';
  }

  getLeaseStateClass(state: string): string {
    switch (state) {
      case 'GRANTED':
      case 'ACTIVE':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'RENEWED':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      case 'PREEMPTED':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  }
}
