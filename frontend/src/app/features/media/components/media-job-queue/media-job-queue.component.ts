import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaJobDTO } from '../../models/media.model';

@Component({
  selector: 'app-media-job-queue',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-base font-semibold text-white flex items-center gap-2">
            <span>Workload Queue & Pipelines</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
              {{ jobs().length }}
            </span>
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">Live status of media synthesis jobs</p>
        </div>
      </div>

      @if (jobs().length === 0) {
        <div class="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800/80 rounded-xl">
          No media jobs queued or executing.
        </div>
      } @else {
        <div class="space-y-3 max-h-[380px] overflow-y-auto pr-1">
          @for (job of jobs(); track job.job_id) {
            <div class="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700 transition-all">
              <div class="flex items-start justify-between gap-3 mb-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap mb-1">
                    <span class="text-xs font-mono font-medium text-slate-300">{{ job.job_id }}</span>
                    <span [class]="getStatusClass(job.status)" class="text-[10px] font-medium px-2 py-0.5 rounded-full border">
                      {{ job.status }}
                    </span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400">
                      {{ job.device || 'GPU' }}
                    </span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {{ job.model_id }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-300 truncate" [title]="job.prompt">
                    "{{ job.prompt }}"
                  </p>
                </div>

                @if (isCancelable(job.status)) {
                  <button
                    type="button"
                    (click)="cancel.emit(job.job_id)"
                    class="text-[11px] px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-all shrink-0"
                  >
                    Cancel
                  </button>
                }
              </div>

              <!-- Progress Bar -->
              @if (isCancelable(job.status)) {
                <div class="space-y-1 mt-2">
                  <div class="flex justify-between text-[10px] text-slate-400">
                    <span>Phase: {{ job.current_phase }}</span>
                    <span>{{ job.progress }}%</span>
                  </div>
                  <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      class="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300"
                      [style.width.%]="job.progress"
                    ></div>
                  </div>
                </div>
              }

              @if (job.failure_reason) {
                <p class="text-[11px] text-red-400/90 mt-1.5 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg">
                  {{ job.failure_reason }}
                </p>
              }

              @if (job.duration_ms) {
                <div class="text-[10px] text-slate-500 mt-1.5 text-right">
                  Duration: {{ job.duration_ms }}ms • Completed: {{ job.completed_at ? (job.completed_at * 1000 | date:'shortTime') : '' }}
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class MediaJobQueueComponent {
  jobs = input<MediaJobDTO[]>([]);
  cancel = output<string>();

  isCancelable(status: string): boolean {
    return ['QUEUED', 'ADMITTED', 'LOADING_MODEL', 'GENERATING', 'VALIDATING', 'STORING'].includes(status);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'GENERATING':
      case 'ADMITTED':
      case 'LOADING_MODEL':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 animate-pulse';
      case 'CANCELLED':
        return 'bg-slate-500/15 text-slate-400 border-slate-500/30';
      case 'RESOURCE_DENIED':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'FAILED':
      default:
        return 'bg-red-500/15 text-red-400 border-red-500/30';
    }
  }
}
