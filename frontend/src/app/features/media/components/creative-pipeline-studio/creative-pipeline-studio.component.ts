import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MediaService } from '../../services/media.service';
import {
  CreativeBrief,
  CreativePipeline,
  CreativePipelineTemplate,
  CreativePipelineType,
  RenderProfile,
  PipelineRetentionPolicy,
  Scene,
  CreativeRevisionRequest,
} from '../../models/media.model';

@Component({
  selector: 'app-creative-pipeline-studio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Studio Header & Template Selector -->
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-violet-400 animate-pulse"></span>
              <h2 class="text-lg font-bold text-slate-100 tracking-wide">
                Creative Production Studio
              </h2>
              <span class="text-[10px] px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/30 font-mono">
                Phase 8.5 Local-First Orchestration
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-1">
              Transform high-level creative briefs into complete multimodal productions (Storyboards, DAGs, Assets, Narration, Subtitles, Final Render).
            </p>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5"
              (click)="refreshPipelines()"
            >
              <span>🔄 Refresh</span>
            </button>
            <button
              type="button"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30 transition-all flex items-center gap-1.5"
              (click)="isCreating.set(!isCreating())"
            >
              <span>{{ isCreating() ? '✕ Close Brief' : '✨ New Creative Brief' }}</span>
            </button>
          </div>
        </div>

        <!-- Template Fast-Pick Chips -->
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <span class="text-xs font-semibold text-slate-400">Quick Templates:</span>
          @for (tmpl of mediaService.creativeTemplates(); track tmpl.template_id) {
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-violet-950/60 hover:text-violet-300 hover:border-violet-600/50 text-slate-300 border border-slate-700/60 transition-colors"
              (click)="applyTemplate(tmpl)"
            >
              {{ tmpl.title }}
            </button>
          }
        </div>
      </div>

      <!-- Brief Creation / Editor Form -->
      @if (isCreating()) {
        <div class="bg-slate-900/90 border border-violet-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
          <h3 class="text-sm font-bold text-violet-300 uppercase tracking-wider flex items-center gap-2">
            <span>📝</span> Creative Brief Configuration
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Production Title</label>
              <input
                type="text"
                [(ngModel)]="brief.title"
                placeholder="e.g. Cyberpunk 2099 Trailer"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Pipeline Type</label>
              <select
                [(ngModel)]="selectedType"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
              >
                <option value="SHORT_PROMOTIONAL_VIDEO">Short Promotional Video (10s)</option>
                <option value="NARRATED_IMAGE_STORY">Narrated Image Story</option>
                <option value="SOCIAL_MEDIA_CLIP">Social Media Clip</option>
                <option value="PRESENTATION_VISUAL">Presentation Visual</option>
                <option value="CINEMATIC_SCENE">Cinematic Scene Sequence</option>
                <option value="PHOTO_TO_VIDEO">Photo to Animated Video</option>
                <option value="CUSTOM">Custom Multimodal Pipeline</option>
              </select>
            </div>

            <div class="md:col-span-2">
              <label class="block text-xs font-medium text-slate-300 mb-1">Creative Description & Narrative Goal</label>
              <textarea
                [(ngModel)]="brief.description"
                rows="3"
                placeholder="Describe the mood, storytelling sequence, character actions, and final vision..."
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Visual Style</label>
              <input
                type="text"
                [(ngModel)]="brief.style"
                placeholder="e.g. Cyberpunk Neon Cinematic, Photorealistic"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Tone / Mood</label>
              <input
                type="text"
                [(ngModel)]="brief.tone"
                placeholder="e.g. High-energy, Dramatic, Futuristic"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Language (Multilingual Narration/Subtitles)</label>
              <select
                [(ngModel)]="brief.language"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
              >
                <option value="en">English (en)</option>
                <option value="te">Telugu (te)</option>
                <option value="hi">Hindi (hi)</option>
                <option value="ta">Tamil (ta)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Target Duration (Seconds)</label>
              <input
                type="number"
                [(ngModel)]="brief.duration"
                min="3"
                max="60"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Render Profile</label>
              <select
                [(ngModel)]="selectedRenderProfile"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
              >
                <option value="MP4_H264_STANDARD">MP4 H.264 Standard (High Quality)</option>
                <option value="MP4_H264_LOW_RESOURCE">MP4 H.264 Low Resource</option>
                <option value="WEBM_STANDARD">WebM VP9 Standard</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-medium text-slate-300 mb-1">Retention Policy</label>
              <select
                [(ngModel)]="selectedRetentionPolicy"
                class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
              >
                <option value="FINAL_ONLY">Final Render Only (Auto-clean temps)</option>
                <option value="FINAL_PLUS_SOURCES">Final + Primary Sources</option>
                <option value="FULL_PROJECT">Full Project Package</option>
              </select>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
              (click)="isCreating.set(false)"
            >
              Cancel
            </button>
            <button
              type="button"
              class="px-5 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30 transition-all flex items-center gap-2"
              [disabled]="!brief.title || !brief.description || mediaService.isCreativeLoading()"
              (click)="createPipeline()"
            >
              <span>🚀 Synthesize Production Pipeline</span>
            </button>
          </div>
        </div>
      }

      <!-- Main Studio Workspace -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left: Pipeline List & Overview -->
        <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 class="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Productions ({{ mediaService.creativePipelines().length }})
            </h3>
            <span class="text-[10px] text-slate-400 font-mono">SQLite WAL Backed</span>
          </div>

          <div class="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
            @for (pipe of mediaService.creativePipelines(); track pipe.pipeline_id) {
              <div
                class="p-3 rounded-xl border transition-all cursor-pointer"
                [ngClass]="{
                  'bg-violet-950/40 border-violet-500/50 shadow-md shadow-violet-950/50':
                    mediaService.activeCreativePipeline()?.pipeline_id === pipe.pipeline_id,
                  'bg-slate-950/60 border-slate-800/80 hover:border-slate-700':
                    mediaService.activeCreativePipeline()?.pipeline_id !== pipe.pipeline_id
                }"
                (click)="selectPipeline(pipe)"
              >
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <h4 class="text-xs font-bold text-slate-100">{{ pipe.creative_brief.title }}</h4>
                    <p class="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{{ pipe.goal }}</p>
                  </div>
                  <span
                    class="text-[9px] px-2 py-0.5 rounded-full font-mono font-semibold"
                    [ngClass]="getStatusBadgeClass(pipe.status)"
                  >
                    {{ pipe.status }}
                  </span>
                </div>

                <div class="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 font-mono">
                  <span>{{ pipe.scenes.length }} scenes • {{ pipe.creative_brief.language || 'en' }}</span>
                  <span class="text-violet-400">{{ pipe.pipeline_type }}</span>
                </div>
              </div>
            } @empty {
              <div class="text-center py-8 text-slate-500 text-xs">
                No creative pipelines created yet.<br />Click "+ New Creative Brief" to begin.
              </div>
            }
          </div>
        </div>

        <!-- Right: Active Pipeline Inspector & Orchestration Studio -->
        <div class="lg:col-span-2 space-y-6">
          @if (mediaService.activeCreativePipeline(); as activePipe) {
            <!-- Active Pipeline Control Card -->
            <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="text-base font-bold text-slate-100">{{ activePipe.creative_brief.title }}</h3>
                    <span class="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold" [ngClass]="getStatusBadgeClass(activePipe.status)">
                      {{ activePipe.status }}
                    </span>
                  </div>
                  <div class="text-[11px] text-slate-400 font-mono mt-1 flex flex-wrap items-center gap-3">
                    <span>ID: {{ activePipe.pipeline_id }}</span>
                    <span>• Hash: {{ activePipe.pipeline_hash | slice:0:10 }}...</span>
                    <span>• Duration: {{ activePipe.creative_brief.duration || 10 }}s</span>
                    <span>• Profile: {{ activePipe.render_profile }}</span>
                  </div>
                </div>

                <!-- Execution Actions -->
                <div class="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1"
                    [disabled]="mediaService.isCreativeLoading()"
                    (click)="simulatePipeline(activePipe.pipeline_id)"
                  >
                    <span>⚡ Simulate</span>
                  </button>

                  <button
                    type="button"
                    class="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5"
                    [disabled]="mediaService.isCreativeLoading() || activePipe.status === 'COMPLETED'"
                    (click)="executePipeline(activePipe.pipeline_id)"
                  >
                    <span>▶ Execute Pipeline</span>
                  </button>

                  @if (activePipe.status !== 'COMPLETED' && activePipe.status !== 'CANCELLED') {
                    <button
                      type="button"
                      class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-700/50 transition-all"
                      (click)="cancelPipeline(activePipe.pipeline_id)"
                    >
                      Cancel
                    </button>
                  }

                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                    (click)="fetchManifest(activePipe.pipeline_id)"
                  >
                    Manifest
                  </button>
                </div>
              </div>

              <!-- Simulation Result Alert -->
              @if (mediaService.creativeSimulationResult(); as sim) {
                <div
                  class="p-3.5 rounded-xl border text-xs"
                  [ngClass]="{
                    'bg-emerald-950/30 border-emerald-500/40 text-emerald-200': sim.feasible,
                    'bg-amber-950/30 border-amber-500/40 text-amber-200': !sim.feasible
                  }"
                >
                  <div class="flex items-center justify-between font-semibold">
                    <span>⚡ Resource Feasibility Simulation: {{ sim.feasible ? 'Admitted & Safe' : 'Denied / Warning' }}</span>
                    <span>Peak VRAM: {{ sim.peak_vram_mb }} MB • RAM: {{ sim.peak_ram_mb }} MB</span>
                  </div>
                  <p class="text-[11px] text-slate-300 mt-1">{{ sim.warnings.length ? sim.warnings.join(', ') : 'Workflow estimated duration: ' + sim.estimated_duration_sec + 's. Feasible on local hardware.' }}</p>
                </div>
              }

              <!-- Storyboard & Scene Blocks -->
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🎬</span> Storyboard Scenes ({{ activePipe.scenes.length }})
                  </h4>
                  <span class="text-[10px] text-slate-400">Click a scene to revise prompt or duration</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  @for (scene of activePipe.scenes; track scene.scene_id) {
                    <div
                      class="p-3.5 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 hover:border-violet-500/40 transition-colors cursor-pointer"
                      (click)="openRevision(scene)"
                    >
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-violet-300">Scene {{ scene.order + 1 }}</span>
                        <div class="flex items-center gap-1.5">
                          <span class="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {{ scene.duration }}s
                          </span>
                          <span class="text-[10px] px-2 py-0.5 rounded font-mono font-medium" [ngClass]="getStatusBadgeClass(scene.status)">
                            {{ scene.status }}
                          </span>
                        </div>
                      </div>

                      <p class="text-xs text-slate-200 line-clamp-2">{{ scene.visual_prompt }}</p>

                      <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-900">
                        <span>Transition: {{ scene.transition }}</span>
                        @if (scene.image_artifact_id) {
                          <span class="text-emerald-400">✓ Image Ready</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Multi-Track Media Timeline Visualizer -->
              <div class="space-y-2 pt-2 border-t border-slate-800">
                <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>⏱️</span> Multi-Track Production Timeline
                </h4>

                <div class="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3 font-mono text-xs">
                  <!-- Video Track -->
                  <div class="space-y-1">
                    <span class="text-[10px] text-cyan-400 font-semibold uppercase">Video Track:</span>
                    <div class="h-7 bg-slate-900 rounded-lg flex overflow-hidden border border-cyan-500/20">
                      @for (scene of activePipe.scenes; track scene.scene_id) {
                        <div
                          class="h-full bg-cyan-950/60 border-r border-cyan-500/30 flex items-center justify-center text-[10px] text-cyan-300 px-2 truncate"
                          [style.width.%]="(scene.duration / (activePipe.creative_brief.duration || 10)) * 100"
                        >
                          Scene {{ scene.order + 1 }} ({{ scene.duration }}s)
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Audio / TTS Track -->
                  <div class="space-y-1">
                    <span class="text-[10px] text-emerald-400 font-semibold uppercase">Narration & Audio Track:</span>
                    <div class="h-7 bg-slate-900 rounded-lg flex overflow-hidden border border-emerald-500/20">
                      @for (seg of activePipe.script?.narration_segments || []; track seg.segment_id) {
                        <div
                          class="h-full bg-emerald-950/60 border-r border-emerald-500/30 flex items-center justify-center text-[10px] text-emerald-300 px-2 truncate"
                          [style.width.%]="((seg.estimated_duration_s || 3) / (activePipe.creative_brief.duration || 10)) * 100"
                        >
                          Voice ({{ seg.speaker }})
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Subtitle Track -->
                  <div class="space-y-1">
                    <span class="text-[10px] text-amber-400 font-semibold uppercase">Subtitle Track (SRT/VTT):</span>
                    <div class="h-7 bg-slate-900 rounded-lg flex overflow-hidden border border-amber-500/20">
                      @for (sub of activePipe.subtitle_tracks; track sub.track_id) {
                        <div class="h-full w-full bg-amber-950/40 flex items-center justify-center text-[10px] text-amber-300 px-2 truncate">
                          {{ sub.language }} Subtitles ({{ sub.segments.length }} segments)
                        </div>
                      }
                    </div>
                  </div>
                </div>
              </div>

              <!-- Quality Scorecard & Verification Report -->
              @if (activePipe.quality_report; as qr) {
                <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div class="flex items-center justify-between">
                    <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🏆</span> Production Quality Scorecard
                    </h4>
                    <span
                      class="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold"
                      [ngClass]="qr.overall_passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'"
                    >
                      {{ qr.overall_passed ? '✓ PASSED CRITERIA' : '⚠️ REVIEW NEEDED' }}
                    </span>
                  </div>

                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[11px]">
                    <div class="p-2 bg-slate-900 rounded-lg border border-slate-800">
                      <span class="text-slate-400 block">Technical Integrity</span>
                      <span class="font-bold text-slate-100">{{ qr.technical_integrity * 100 | number:'1.0-0' }}%</span>
                    </div>
                    <div class="p-2 bg-slate-900 rounded-lg border border-slate-800">
                      <span class="text-slate-400 block">Resource Efficiency</span>
                      <span class="font-bold text-slate-100">{{ qr.resource_efficiency * 100 | number:'1.0-0' }}%</span>
                    </div>
                    <div class="p-2 bg-slate-900 rounded-lg border border-slate-800">
                      <span class="text-slate-400 block">Workflow Completion</span>
                      <span class="font-bold text-slate-100">{{ qr.workflow_completion * 100 | number:'1.0-0' }}%</span>
                    </div>
                    <div class="p-2 bg-slate-900 rounded-lg border border-slate-800">
                      <span class="text-slate-400 block">Prompt Adherence</span>
                      <span class="font-bold text-slate-100">{{ qr.prompt_adherence * 100 | number:'1.0-0' }}%</span>
                    </div>
                    <div class="p-2 bg-slate-900 rounded-lg border border-slate-800">
                      <span class="text-slate-400 block">Temporal Consistency</span>
                      <span class="font-bold text-slate-100">{{ qr.temporal_consistency * 100 | number:'1.0-0' }}%</span>
                    </div>
                    <div class="p-2 bg-slate-900 rounded-lg border border-slate-800">
                      <span class="text-slate-400 block">Audio/Video Alignment</span>
                      <span class="font-bold text-slate-100">{{ qr.audio_video_alignment * 100 | number:'1.0-0' }}%</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <span class="text-3xl block mb-2">🎬</span>
              <p class="text-sm font-semibold text-slate-200">Select or Create a Creative Pipeline</p>
              <p class="text-xs text-slate-500 mt-1">Choose a production from the left or create a new brief above.</p>
            </div>
          }
        </div>
      </div>

      <!-- Revision Modal -->
      @if (selectedSceneForRevision(); as revScene) {
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="bg-slate-900 border border-violet-500/50 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div class="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 class="text-sm font-bold text-violet-300">
                Revise Scene {{ revScene.order + 1 }} (Selective Dependency Invalidation)
              </h3>
              <button
                type="button"
                class="text-slate-400 hover:text-slate-200"
                (click)="selectedSceneForRevision.set(null)"
              >
                ✕
              </button>
            </div>

            <div class="space-y-3">
              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Visual Prompt</label>
                <textarea
                  [(ngModel)]="revisionPrompt"
                  rows="3"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
                ></textarea>
              </div>

              <div>
                <label class="block text-xs font-medium text-slate-300 mb-1">Duration (Seconds)</label>
                <input
                  type="number"
                  [(ngModel)]="revisionDuration"
                  min="2"
                  max="30"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div class="p-3 bg-violet-950/20 border border-violet-500/20 rounded-xl text-[11px] text-violet-300">
                ℹ️ <strong>Incremental Rebuild:</strong> Only this scene and downstream composition/render nodes will be invalidated. Unrelated scenes remain cached!
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                class="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                (click)="selectedSceneForRevision.set(null)"
              >
                Cancel
              </button>
              <button
                type="button"
                class="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white transition-all"
                (click)="submitRevision()"
              >
                Apply Invalidation & Rebuild
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CreativePipelineStudioComponent implements OnInit {
  mediaService = inject(MediaService);

  isCreating = signal<boolean>(false);
  selectedSceneForRevision = signal<Scene | null>(null);

  selectedType: CreativePipelineType = 'SHORT_PROMOTIONAL_VIDEO';
  selectedRenderProfile: RenderProfile = 'MP4_H264_STANDARD';
  selectedRetentionPolicy: PipelineRetentionPolicy = 'FINAL_ONLY';

  brief: CreativeBrief = {
    title: '',
    description: '',
    style: 'Cyberpunk Neon Cinematic',
    tone: 'Futuristic and Dynamic',
    language: 'en',
    duration: 10,
  };

  revisionPrompt = '';
  revisionDuration = 5;

  ngOnInit(): void {
    this.mediaService.fetchCreativeTemplates().subscribe();
    this.mediaService.fetchCreativePipelines().subscribe();
  }

  refreshPipelines(): void {
    this.mediaService.fetchCreativePipelines().subscribe();
  }

  applyTemplate(template: CreativePipelineTemplate): void {
    this.selectedType = template.pipeline_type;
    this.brief = {
      title: template.title,
      description: template.description,
      style: template.default_brief['style'] || 'Cinematic',
      tone: template.default_brief['tone'] || 'Dynamic',
      language: template.default_brief['language'] || 'en',
      duration: template.default_brief['duration'] || 10,
    };
    this.isCreating.set(true);
  }

  createPipeline(): void {
    this.mediaService
      .createCreativePipeline(
        this.brief,
        undefined,
        this.selectedRetentionPolicy,
        this.selectedRenderProfile
      )
      .subscribe({
        next: () => {
          this.isCreating.set(false);
          this.brief = {
            title: '',
            description: '',
            style: 'Cyberpunk Neon Cinematic',
            tone: 'Futuristic and Dynamic',
            language: 'en',
            duration: 10,
          };
        },
      });
  }

  selectPipeline(pipeline: CreativePipeline): void {
    this.mediaService.activeCreativePipeline.set(pipeline);
  }

  simulatePipeline(pipelineId: string): void {
    this.mediaService.simulateCreativePipeline(pipelineId).subscribe();
  }

  executePipeline(pipelineId: string): void {
    this.mediaService.executeCreativePipeline(pipelineId).subscribe();
  }

  cancelPipeline(pipelineId: string): void {
    this.mediaService.cancelCreativePipeline(pipelineId).subscribe();
  }

  fetchManifest(pipelineId: string): void {
    this.mediaService.fetchCreativeManifest(pipelineId).subscribe();
  }

  openRevision(scene: Scene): void {
    this.selectedSceneForRevision.set(scene);
    this.revisionPrompt = scene.visual_prompt;
    this.revisionDuration = scene.duration;
  }

  submitRevision(): void {
    const scene = this.selectedSceneForRevision();
    const activePipe = this.mediaService.activeCreativePipeline();
    if (!scene || !activePipe) return;

    const rev: CreativeRevisionRequest = {
      scene_id: scene.scene_id,
      new_visual_prompt: this.revisionPrompt,
      new_duration: this.revisionDuration,
    };

    this.mediaService.reviseCreativePipeline(activePipe.pipeline_id, rev).subscribe({
      next: () => {
        this.selectedSceneForRevision.set(null);
      },
    });
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
      case 'PLANNING':
      case 'ASSET_GENERATION':
      case 'SCENE_GENERATION':
      case 'NARRATION':
      case 'COMPOSITION':
      case 'RENDERING':
      case 'VALIDATING':
        return 'bg-violet-500/20 text-violet-300 border border-violet-500/30 animate-pulse';
      case 'FAILED':
        return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
      case 'CANCELLED':
        return 'bg-slate-500/20 text-slate-300 border border-slate-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border border-slate-600';
    }
  }
}
