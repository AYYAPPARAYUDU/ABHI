import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaWorkflowSimulationResult } from '../../models/media.model';

@Component({
  selector: 'app-workflow-simulation-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-slate-900/85 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full" [ngClass]="simulation()?.feasible ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'"></span>
          <h3 class="text-sm font-semibold text-slate-100 tracking-wide">
            Workflow Simulation & Resource Feasibility
          </h3>
        </div>
        @if (simulation()) {
          <span
            class="text-[10px] px-2.5 py-0.5 rounded-full font-mono border font-semibold"
            [ngClass]="
              simulation()?.feasible
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
            "
          >
            {{ simulation()?.feasible ? 'FEASIBLE' : 'INFEASIBLE' }}
          </span>
        }
      </div>

      @if (!simulation()) {
        <div class="text-center py-6 text-slate-400 text-xs">
          Click "Simulate Workflow" to calculate sequential peak VRAM and dry-run feasibility.
        </div>
      } @else {
        <!-- Metrics Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <!-- Sequential Peak VRAM -->
          <div class="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span class="text-[10px] text-slate-400 block mb-0.5">Sequential Peak VRAM</span>
            <span class="text-sm font-bold font-mono text-indigo-400">
              {{ simulation()?.peak_vram_mb | number : '1.0-0' }} MB
            </span>
          </div>

          <!-- Peak RAM -->
          <div class="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span class="text-[10px] text-slate-400 block mb-0.5">Estimated Host RAM</span>
            <span class="text-sm font-bold font-mono text-cyan-400">
              {{ simulation()?.peak_ram_mb | number : '1.0-0' }} MB
            </span>
          </div>

          <!-- Estimated Duration -->
          <div class="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span class="text-[10px] text-slate-400 block mb-0.5">Estimated Duration</span>
            <span class="text-sm font-bold font-mono text-amber-400">
              {{ simulation()?.estimated_duration_sec | number : '1.1-1' }}s
            </span>
          </div>

          <!-- Node Count -->
          <div class="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span class="text-[10px] text-slate-400 block mb-0.5">DAG Steps</span>
            <span class="text-sm font-bold font-mono text-purple-400">
              {{ simulation()?.node_count }} Nodes
            </span>
          </div>
        </div>

        <!-- Required Skills & Models -->
        <div class="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-3 space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-400">Required Skills:</span>
            <div class="flex flex-wrap gap-1">
              @for (sk of simulation()?.required_skills || []; track sk) {
                <span class="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {{ sk }}
                </span>
              }
            </div>
          </div>
          @if ((simulation()?.required_models || []).length > 0) {
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-400">Required Models:</span>
              <div class="flex flex-wrap gap-1">
                @for (m of simulation()?.required_models || []; track m) {
                  <span class="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50 font-mono">
                    {{ m }}
                  </span>
                }
              </div>
            </div>
          }
        </div>

        <!-- Bottlenecks & Warnings -->
        @if ((simulation()?.bottlenecks || []).length > 0) {
          <div class="bg-rose-950/30 border border-rose-800/40 p-3 rounded-xl text-xs space-y-1">
            <span class="font-semibold text-rose-300 block">Bottlenecks & Rejection Reasons:</span>
            @for (b of simulation()?.bottlenecks || []; track b) {
              <div class="text-[11px] text-rose-200 flex items-start gap-1.5">
                <span>⚠️</span>
                <span>{{ b }}</span>
              </div>
            }
          </div>
        }

        @if ((simulation()?.warnings || []).length > 0) {
          <div class="bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl text-xs space-y-1 mt-2">
            <span class="font-semibold text-amber-300 block">Warnings & Advisories:</span>
            @for (w of simulation()?.warnings || []; track w) {
              <div class="text-[11px] text-amber-200 flex items-start gap-1.5">
                <span>ℹ️</span>
                <span>{{ w }}</span>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
})
export class WorkflowSimulationPanelComponent {
  simulation = input<MediaWorkflowSimulationResult | null>(null);
}
