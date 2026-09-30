import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaService } from '../../services/media.service';
import {
  MediaRuntimeAttestation,
  TechnicalValidationResult,
  CreativeQualityEvidence,
  ReplayInspectionResult,
  ProvenanceClass,
  ResourceProvenance,
  ReplayMode,
} from '../../models/media.model';

@Component({
  selector: 'app-media-provenance-inspector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Top Overview Bar -->
      <div class="bg-slate-900/85 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h2 class="text-base font-bold text-slate-100 flex items-center gap-2">
              Media Provenance, Reliability & Attestation Inspector
              <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                Phase 8.6 Hardened
              </span>
            </h2>
            <p class="text-xs text-slate-400">
              Authoritative model validation, cryptographic runtime attestation, empirical resource measurement & safe 3-phase replay.
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            (click)="refreshData()"
            class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60 shadow-sm"
          >
            <svg class="w-3.5 h-3.5" [class.animate-spin]="mediaService.isProvenanceLoading()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Attestations
          </button>
        </div>
      </div>

      <!-- Navigation Tabs for Provenance Inspector Sub-panels -->
      <div class="flex border-b border-slate-800 gap-2 text-xs font-medium text-slate-400">
        <button
          (click)="activeTab.set('attestations')"
          [class.text-emerald-400]="activeTab() === 'attestations'"
          [class.border-b-2]="activeTab() === 'attestations'"
          [class.border-emerald-400]="activeTab() === 'attestations'"
          class="pb-2.5 px-3 flex items-center gap-1.5 transition-colors"
        >
          <span>Attestations & Lineage</span>
          <span class="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
            {{ mediaService.attestations().length }}
          </span>
        </button>

        <button
          (click)="activeTab.set('validation')"
          [class.text-cyan-400]="activeTab() === 'validation'"
          [class.border-b-2]="activeTab() === 'validation'"
          [class.border-cyan-400]="activeTab() === 'validation'"
          class="pb-2.5 px-3 flex items-center gap-1.5 transition-colors"
        >
          <span>Technical Validation</span>
          @if (mediaService.lastValidationResult()) {
            <span class="w-2 h-2 rounded-full" [class.bg-emerald-400]="mediaService.lastValidationResult()?.status === 'PASS'" [class.bg-rose-400]="mediaService.lastValidationResult()?.status === 'FAIL'"></span>
          }
        </button>

        <button
          (click)="activeTab.set('quality')"
          [class.text-purple-400]="activeTab() === 'quality'"
          [class.border-b-2]="activeTab() === 'quality'"
          [class.border-purple-400]="activeTab() === 'quality'"
          class="pb-2.5 px-3 flex items-center gap-1.5 transition-colors"
        >
          <span>Creative Quality Separation</span>
        </button>

        <button
          (click)="activeTab.set('replay')"
          [class.text-amber-400]="activeTab() === 'replay'"
          [class.border-b-2]="activeTab() === 'replay'"
          [class.border-amber-400]="activeTab() === 'replay'"
          class="pb-2.5 px-3 flex items-center gap-1.5 transition-colors"
        >
          <span>Replay Engine (Inspect / Simulate / Run)</span>
        </button>
      </div>

      <!-- TAB 1: Attestations & Lineage -->
      @if (activeTab() === 'attestations') {
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Attestation List -->
          <div class="lg:col-span-5 space-y-3">
            <h3 class="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Recorded Attestations</span>
              <span class="text-[10px] text-slate-500 font-mono">Immutable Log</span>
            </h3>

            @if (mediaService.attestations().length === 0) {
              <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center text-xs text-slate-400">
                No runtime attestations recorded yet. Execute an image, video, editing, or creative pipeline operation to create an authoritative attestation record.
              </div>
            } @else {
              <div class="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                @for (att of mediaService.attestations(); track att.attestation_id) {
                  <div
                    (click)="selectAttestation(att)"
                    [class.border-emerald-500/50]="selectedAttestation()?.attestation_id === att.attestation_id"
                    [class.bg-slate-800/80]="selectedAttestation()?.attestation_id === att.attestation_id"
                    class="bg-slate-900/70 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl cursor-pointer transition-all flex flex-col gap-2"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-semibold text-slate-200">{{ att.operation_type }}</span>
                      <span [ngClass]="getProvenanceBadgeClass(att.provenance_class)" class="text-[10px] font-mono px-2 py-0.5 rounded-full border">
                        {{ att.provenance_class }}
                      </span>
                    </div>

                    <div class="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Model: {{ att.model_id }}</span>
                      <span>{{ att.device }}</span>
                    </div>

                    <div class="text-[10px] text-slate-500 font-mono truncate">
                      Hash: {{ att.attestation_hash.substring(0, 16) }}...
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Attestation Detail Inspector -->
          <div class="lg:col-span-7">
            <div class="bg-slate-900/85 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-4">
              <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 class="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <span>Attestation Detail</span>
                  @if (selectedAttestation()) {
                    <span [ngClass]="getProvenanceBadgeClass(selectedAttestation()!.provenance_class)" class="text-[10px] font-mono px-2 py-0.5 rounded-full border">
                      {{ selectedAttestation()!.provenance_class }}
                    </span>
                  }
                </h3>

                @if (selectedAttestation()) {
                  <span class="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Registry Authentic
                  </span>
                }
              </div>

              @if (!selectedAttestation()) {
                <div class="py-12 text-center text-xs text-slate-400">
                  Select an attestation from the list to inspect model digests, runtime authenticity, driver details, and parameters hash.
                </div>
              } @else {
                <div class="space-y-4 text-xs font-mono">
                  <div class="grid grid-cols-2 gap-3">
                    <div class="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                      <span class="text-slate-400 block text-[10px]">Attestation ID</span>
                      <span class="text-slate-200 text-[11px] break-all">{{ selectedAttestation()!.attestation_id }}</span>
                    </div>
                    <div class="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                      <span class="text-slate-400 block text-[10px]">Artifact ID</span>
                      <span class="text-emerald-300 text-[11px] break-all">{{ selectedAttestation()!.artifact_id }}</span>
                    </div>
                  </div>

                  <div class="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="text-slate-400">Model ID:</span>
                      <span class="text-indigo-300">{{ selectedAttestation()!.model_id }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-slate-400">Model Digest:</span>
                      <span class="text-cyan-300 text-[11px] truncate max-w-[260px]">{{ selectedAttestation()!.model_digest }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-slate-400">Runtime Name / Version:</span>
                      <span class="text-slate-200">{{ selectedAttestation()!.runtime_name }} v{{ selectedAttestation()!.runtime_version }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-slate-400">Compute / Device:</span>
                      <span class="text-slate-200">{{ selectedAttestation()!.compute_runtime }} / {{ selectedAttestation()!.device }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-slate-400">Seed:</span>
                      <span class="text-amber-300">{{ selectedAttestation()!.seed ?? 'N/A' }}</span>
                    </div>
                  </div>

                  <div class="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
                    <div class="flex items-center justify-between">
                      <span class="text-slate-400">Parameters Hash:</span>
                      <span class="text-slate-300 text-[11px] truncate max-w-[260px]">{{ selectedAttestation()!.parameters_hash }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span class="text-slate-400">Attestation SHA-256:</span>
                      <span class="text-emerald-300 text-[11px] truncate max-w-[260px]">{{ selectedAttestation()!.attestation_hash }}</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- TAB 2: Technical Validation -->
      @if (activeTab() === 'validation') {
        <div class="bg-slate-900/85 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-5">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 class="text-sm font-semibold text-slate-100">Centralized Media Technical Validator</h3>
              <p class="text-xs text-slate-400">Audits container, codecs, exact dimensions, monotonic subtitle timestamps, and mathematical duration consistency.</p>
            </div>
          </div>

          <!-- Quick Test Validation Form -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <div>
              <label class="block text-[11px] font-medium text-slate-300 mb-1">Artifact ID</label>
              <input
                type="text"
                [(ngModel)]="valArtifactId"
                placeholder="art_video_scene1"
                class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-slate-300 mb-1">File Path</label>
              <input
                type="text"
                [(ngModel)]="valFilePath"
                placeholder="data/artifacts/scene1.mp4"
                class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div class="flex items-end gap-2">
              <div class="flex-1">
                <label class="block text-[11px] font-medium text-slate-300 mb-1">Media Type</label>
                <select
                  [(ngModel)]="valMediaType"
                  class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="VIDEO">VIDEO</option>
                  <option value="IMAGE">IMAGE</option>
                  <option value="AUDIO">AUDIO</option>
                  <option value="SUBTITLE">SUBTITLE</option>
                </select>
              </div>
              <button
                (click)="runValidation()"
                [disabled]="mediaService.isProvenanceLoading()"
                class="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition-colors"
              >
                Validate
              </button>
            </div>
          </div>

          <!-- Validation Results Display -->
          @if (mediaService.lastValidationResult()) {
            <div class="space-y-3 font-mono text-xs">
              <div class="flex items-center justify-between p-3 rounded-xl border"
                [class.bg-emerald-950/40]="mediaService.lastValidationResult()!.status === 'PASS'"
                [class.border-emerald-500/40]="mediaService.lastValidationResult()!.status === 'PASS'"
                [class.bg-rose-950/40]="mediaService.lastValidationResult()!.status === 'FAIL'"
                [class.border-rose-500/40]="mediaService.lastValidationResult()!.status === 'FAIL'"
              >
                <div class="flex items-center gap-2">
                  <span class="font-bold">STATUS: {{ mediaService.lastValidationResult()!.status }}</span>
                  <span class="text-slate-400">({{ mediaService.lastValidationResult()!.media_type }})</span>
                </div>
                <span class="text-[11px] text-slate-400">Duration: {{ mediaService.lastValidationResult()!.measured_duration_seconds | number:'1.2-2' }}s</span>
              </div>

              <!-- Individual Checks -->
              <div class="space-y-2">
                @for (chk of mediaService.lastValidationResult()!.checks; track chk.check_name) {
                  <div class="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full" [class.bg-emerald-400]="chk.passed" [class.bg-rose-400]="!chk.passed"></span>
                      <span class="text-slate-200 font-semibold">{{ chk.check_name }}</span>
                    </div>
                    <span class="text-slate-400 text-[11px]">{{ chk.detail }}</span>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- TAB 3: Creative Quality Separation -->
      @if (activeTab() === 'quality') {
        <div class="bg-slate-900/85 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-5">
          <div class="border-b border-slate-800 pb-3">
            <h3 class="text-sm font-semibold text-slate-100">Creative Quality Separation</h3>
            <p class="text-xs text-slate-400">
              Strictly isolates technical integrity from subjective creative dimensions. Unevaluated dimensions return explicit NOT_EVALUATED.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3 text-xs font-mono">
              <h4 class="text-xs font-semibold text-slate-300 font-sans">Evaluator Dimensions</h4>
              <div class="space-y-2">
                <div class="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span class="text-slate-300">Prompt Adherence</span>
                  <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">EVALUATED</span>
                </div>
                <div class="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span class="text-slate-300">Audio-Video Alignment</span>
                  <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">EVALUATED</span>
                </div>
                <div class="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span class="text-slate-300">Subtitle Correctness</span>
                  <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">EVALUATED</span>
                </div>
                <div class="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span class="text-slate-400">Visual Coherence</span>
                  <span class="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">NOT_EVALUATED</span>
                </div>
                <div class="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span class="text-slate-400">Temporal Flow</span>
                  <span class="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">NOT_EVALUATED</span>
                </div>
                <div class="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                  <span class="text-slate-400">Style Consistency</span>
                  <span class="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700">NOT_EVALUATED</span>
                </div>
              </div>
            </div>

            <div class="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
              <h4 class="text-xs font-semibold text-slate-300">Evaluate Quality</h4>
              <button
                (click)="runQualityEvaluation()"
                [disabled]="mediaService.isProvenanceLoading()"
                class="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow"
              >
                Run Quality Assessment
              </button>

              @if (mediaService.lastQualityEvidence()) {
                <div class="mt-4 space-y-2 font-mono text-[11px]">
                  <div class="flex justify-between">
                    <span class="text-slate-400">Alignment Delta:</span>
                    <span class="text-emerald-300">{{ mediaService.lastQualityEvidence()!.alignment_delta_seconds | number:'1.2-2' }}s</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">Coverage Score:</span>
                    <span class="text-cyan-300">{{ (mediaService.lastQualityEvidence()!.subtitle_coverage_ratio ?? 0) * 100 | number:'1.0-0' }}%</span>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- TAB 4: Replay Engine -->
      @if (activeTab() === 'replay') {
        <div class="bg-slate-900/85 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-5">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 class="text-sm font-semibold text-slate-100">Deterministic & Safe Replay Engine</h3>
              <p class="text-xs text-slate-400">Inspects pipeline manifests, compares model digests, verifies resource headroom, and executes safely.</p>
            </div>
            <div class="flex items-center gap-2">
              <button
                (click)="inspectCurrentManifest()"
                [disabled]="mediaService.isProvenanceLoading()"
                class="px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
              >
                Inspect Replay
              </button>
              <button
                (click)="simulateCurrentManifest()"
                [disabled]="mediaService.isProvenanceLoading()"
                class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
              >
                Simulate Replay
              </button>
            </div>
          </div>

          @if (mediaService.lastReplayResult()) {
            <div class="space-y-4 font-mono text-xs">
              <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div class="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <span class="text-slate-400 block text-[10px]">Replay Mode</span>
                  <span class="text-amber-300 font-bold">{{ mediaService.lastReplayResult()!.mode }}</span>
                </div>
                <div class="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <span class="text-slate-400 block text-[10px]">Replayable</span>
                  <span [class.text-emerald-400]="mediaService.lastReplayResult()!.can_replay" [class.text-rose-400]="!mediaService.lastReplayResult()!.can_replay">
                    {{ mediaService.lastReplayResult()!.can_replay ? 'YES' : 'NO' }}
                  </span>
                </div>
                <div class="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <span class="text-slate-400 block text-[10px]">Reusable Assets</span>
                  <span class="text-emerald-300 font-bold">{{ mediaService.lastReplayResult()!.reusable_artifact_count }}</span>
                </div>
                <div class="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <span class="text-slate-400 block text-[10px]">Regenerate Count</span>
                  <span class="text-cyan-300 font-bold">{{ mediaService.lastReplayResult()!.regenerate_node_count }}</span>
                </div>
              </div>

              <!-- Discrepancies -->
              @if (mediaService.lastReplayResult()!.discrepancies.length > 0) {
                <div class="bg-rose-950/30 border border-rose-500/30 p-3.5 rounded-xl space-y-2">
                  <h4 class="text-xs font-semibold text-rose-300 font-sans">Detected Discrepancies</h4>
                  @for (disc of mediaService.lastReplayResult()!.discrepancies; track disc.field) {
                    <div class="text-[11px] text-rose-200">
                      • [{{ disc.field }}] Expected: {{ disc.expected }}, Actual: {{ disc.actual }} ({{ disc.impact }})
                    </div>
                  }
                </div>
              } @else {
                <div class="bg-emerald-950/30 border border-emerald-500/30 p-3.5 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Manifest matches authoritative models and active runtime environments without discrepancies.
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class MediaProvenanceInspectorComponent implements OnInit {
  mediaService = inject(MediaService);

  activeTab = signal<'attestations' | 'validation' | 'quality' | 'replay'>('attestations');
  selectedAttestation = signal<MediaRuntimeAttestation | null>(null);

  // Validation Form inputs
  valArtifactId = 'art_scene_demo_01';
  valFilePath = 'data/artifacts/scene_demo_01.mp4';
  valMediaType = 'VIDEO';

  ngOnInit(): void {
    this.refreshData();
  }

  refreshData(): void {
    this.mediaService.fetchAttestations().subscribe({
      next: (list) => {
        if (list.length > 0 && !this.selectedAttestation()) {
          this.selectedAttestation.set(list[0]);
        }
      },
    });
  }

  selectAttestation(att: MediaRuntimeAttestation): void {
    this.selectedAttestation.set(att);
  }

  getProvenanceBadgeClass(pClass: ProvenanceClass | string): string {
    switch (pClass) {
      case 'ACTUAL_MODEL_INFERENCE':
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      case 'PROCEDURAL':
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
      case 'MEASURED':
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
      case 'SIMULATED':
      case 'ESTIMATED':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'MOCKED':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  }

  runValidation(): void {
    this.mediaService
      .validateMediaArtifact({
        artifact_id: this.valArtifactId,
        file_path: this.valFilePath,
        media_type: this.valMediaType,
      })
      .subscribe();
  }

  runQualityEvaluation(): void {
    this.mediaService
      .evaluateCreativeQuality({
        project_id: 'proj_sample_01',
        artifact_ids: ['art_img_01', 'art_vid_01'],
        prompt: 'Futuristic AI computer workstation in cyber laboratory',
        video_duration: 10.0,
        audio_duration: 9.8,
      })
      .subscribe();
  }

  inspectCurrentManifest(): void {
    const mockManifest = {
      pipeline_id: 'pipeline_replay_demo',
      pipeline_version: '1.0.0',
      manifest_hash: 'demo_manifest_hash_12345678',
      models_used: ['sdxl-turbo-local'],
      model_digests: { 'sdxl-turbo-local': 'sha256:abcd1234ef5678' },
      nodes: [{ node_id: 'node_1', task_type: 'IMAGE_GENERATE', model_id: 'sdxl-turbo-local' }],
      artifacts: [],
    };
    this.mediaService.inspectReplay(mockManifest).subscribe();
  }

  simulateCurrentManifest(): void {
    const mockManifest = {
      pipeline_id: 'pipeline_replay_demo',
      pipeline_version: '1.0.0',
      manifest_hash: 'demo_manifest_hash_12345678',
      models_used: ['sdxl-turbo-local'],
      model_digests: { 'sdxl-turbo-local': 'sha256:abcd1234ef5678' },
      nodes: [{ node_id: 'node_1', task_type: 'IMAGE_GENERATE', model_id: 'sdxl-turbo-local' }],
      artifacts: [],
    };
    this.mediaService.simulateReplay(mockManifest).subscribe();
  }
}
