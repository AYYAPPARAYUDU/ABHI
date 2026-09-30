import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaWorkflowManifest } from '../../models/media.model';

@Component({
  selector: 'app-workflow-manifest-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-slate-900/85 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse"></span>
          <h3 class="text-sm font-semibold text-slate-100 tracking-wide">
            Cryptographic Workflow Manifest & Artifact Lineage
          </h3>
        </div>
        @if (manifest()) {
          <span class="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono">
            SHA-256 Verified
          </span>
        }
      </div>

      @if (!manifest()) {
        <div class="text-center py-6 text-slate-400 text-xs">
          No signed manifest available. Complete workflow execution to generate an immutable cryptographic manifest.
        </div>
      } @else {
        <!-- Manifest Overview -->
        <div class="space-y-3 mb-4 text-xs">
          <div class="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5 font-mono">
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Workflow Hash:</span>
              <span class="text-cyan-300 text-[11px] truncate max-w-[280px]">
                {{ manifest()?.workflow_hash }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Primary Output:</span>
              <span class="text-emerald-300 text-[11px]">
                {{ manifest()?.primary_artifact_id || 'None' }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Nodes Executed:</span>
              <span class="text-indigo-300 text-[11px]">
                {{ (manifest()?.nodes_executed || []).join(', ') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Artifacts List -->
        <div class="space-y-2">
          <h4 class="text-xs font-semibold text-slate-300 mb-2">
            Registered Artifacts ({{ (manifest()?.artifacts || []).length }})
          </h4>

          @for (art of manifest()?.artifacts || []; track art.artifact_id) {
            <div class="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">
                  {{ art.media_type }}
                </div>
                <div>
                  <span class="font-semibold text-slate-200 block">{{ art.filename }}</span>
                  <span class="text-[10px] text-slate-400 font-mono">
                    ID: {{ art.artifact_id }} • SHA-256: {{ art.sha256.substring(0, 12) }}...
                  </span>
                </div>
              </div>
              <div class="text-right font-mono text-[10px] text-slate-400">
                <span class="block text-slate-300">{{ (art.size_bytes / 1024) | number : '1.1-1' }} KB</span>
                <span>{{ art.model_id }}</span>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class WorkflowManifestViewerComponent {
  manifest = input<MediaWorkflowManifest | null>(null);
}
