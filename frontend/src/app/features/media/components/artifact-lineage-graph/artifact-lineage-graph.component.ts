import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MediaArtifactDTO,
  ArtifactLineageRecordDTO,
} from '../../models/media.model';

@Component({
  selector: 'app-artifact-lineage-graph',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-slate-900/85 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse"></span>
          <h3 class="text-sm font-semibold text-slate-100 tracking-wide">
            Artifact Provenance & Lineage Tree
          </h3>
        </div>
        <span class="text-[10px] px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-mono">
          Non-Destructive Lineage
        </span>
      </div>

      <!-- Lineage Tree Body -->
      @if (selectedArtifact()) {
        <div class="space-y-4">
          <!-- Root Ancestor Node -->
          <div class="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 text-xs font-bold">
                ROOT
              </div>
              <div>
                <span class="text-xs font-semibold text-slate-200 block">
                  {{ lineageRecord() ? lineageRecord()?.parent_artifact_id : selectedArtifact()?.artifact_id }}
                </span>
                <span class="text-[10px] text-slate-400">
                  Original Source Media Artifact • Immutable
                </span>
              </div>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              v1 (Base)
            </span>
          </div>

          <!-- Connecting Edge / Transformation Job -->
          @if (lineageRecord()) {
            <div class="relative pl-6 my-2 border-l-2 border-dashed border-indigo-500/40 ml-4 space-y-2">
              <div class="bg-indigo-950/40 p-3 rounded-xl border border-indigo-800/40 text-xs">
                <div class="flex items-center justify-between mb-1.5">
                  <span class="font-semibold text-indigo-300 flex items-center gap-1.5">
                    <span>⚙️ {{ lineageRecord()?.operation }}</span>
                  </span>
                  <span class="text-[10px] text-slate-400 font-mono">
                    Model: {{ lineageRecord()?.model_id }}
                  </span>
                </div>
                <p class="text-[11px] text-slate-300 italic mb-2">
                  "{{ lineageRecord()?.prompt }}"
                </p>
                <div class="flex flex-wrap gap-2 text-[10px] text-slate-400">
                  <span class="bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Job: {{ lineageRecord()?.job_id }}
                  </span>
                  <span class="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-mono">
                    Hash: {{ lineageRecord()?.parameters_hash?.slice(0, 8) }}...
                  </span>
                </div>
              </div>
            </div>

            <!-- Derived Child Artifact Node -->
            <div class="bg-slate-950/70 p-3.5 rounded-xl border border-emerald-800/40 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xs font-bold">
                  EDIT
                </div>
                <div>
                  <span class="text-xs font-semibold text-emerald-300 block">
                    {{ lineageRecord()?.child_artifact_id }}
                  </span>
                  <span class="text-[10px] text-slate-400">
                    Derived Result • Lineage ID: {{ lineageRecord()?.lineage_id }}
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                  v2 (Verified)
                </span>
              </div>
            </div>
          } @else {
            <div class="text-center py-6 bg-slate-950/40 rounded-xl border border-slate-800/60 text-xs text-slate-400">
              <span>This artifact is an unedited primary source (v1). Perform an edit to generate a child lineage node.</span>
            </div>
          }
        </div>
      } @else {
        <div class="text-center py-8 text-slate-500 text-xs">
          <span>Select an artifact to inspect its cryptographic lineage graph</span>
        </div>
      }
    </div>
  `,
})
export class ArtifactLineageGraphComponent {
  selectedArtifact = input<MediaArtifactDTO | null>(null);
  lineageRecord = input<ArtifactLineageRecordDTO | null>(null);

  selectSource = output<string>();
}
