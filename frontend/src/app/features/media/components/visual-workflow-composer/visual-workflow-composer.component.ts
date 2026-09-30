import { Component, input, output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MediaWorkflow,
  MediaWorkflowNode,
  MediaWorkflowEdge,
  WorkflowNodeStatus,
  WorkflowMediaPortType,
} from '../../models/media.model';
import { MediaService } from '../../services/media.service';

@Component({
  selector: 'app-visual-workflow-composer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
      <!-- Top Action Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-slate-800/80 pb-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></span>
            <h3 class="text-base font-bold text-slate-100 tracking-wide">
              Visual Workflow Composer
            </h3>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono">
              DAG Mode (Max 20 Nodes)
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">
            Compose and orchestrate verified multimodal media synthesis pipelines
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <!-- Add Step Dropdown -->
          <div class="relative">
            <button
              type="button"
              class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
              (click)="togglePalette()"
            >
              <span>+ Add Step</span>
              <span>▼</span>
            </button>
            @if (showPalette()) {
              <div class="absolute right-0 mt-1 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-30 backdrop-blur-xl">
                @for (cap of availableCapabilities; track cap.skill_id) {
                  <button
                    type="button"
                    class="w-full px-3 py-2 text-left text-xs hover:bg-cyan-950/60 hover:text-cyan-300 flex items-center justify-between transition-colors border-b border-slate-800/40 last:border-0"
                    (click)="addNode(cap)"
                  >
                    <div>
                      <span class="font-medium block text-slate-200">{{ cap.label }}</span>
                      <span class="text-[10px] text-slate-400 font-mono">{{ cap.skill_id }}</span>
                    </div>
                    <span class="text-xs">{{ cap.icon }}</span>
                  </button>
                }
              </div>
            }
          </div>

          <!-- Simulate Button -->
          <button
            type="button"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 transition-all flex items-center gap-1 shadow-sm disabled:opacity-50"
            [disabled]="nodesList().length === 0 || mediaService.isWorkflowLoading()"
            (click)="onSimulate()"
          >
            <span>🔍 Simulate</span>
          </button>

          <!-- Execute Button -->
          <button
            type="button"
            class="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
            [disabled]="nodesList().length === 0 || mediaService.isWorkflowLoading()"
            (click)="onExecute()"
          >
            <span>⚡ Execute Workflow</span>
          </button>
        </div>
      </div>

      <!-- Workflow Metadata Inputs -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        <div>
          <label class="block text-[11px] font-medium text-slate-400 mb-1">Workflow Title</label>
          <input
            type="text"
            class="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none transition-colors"
            [(ngModel)]="workflowTitle"
            placeholder="e.g., Cyberpunk City Animated Intro"
          />
        </div>
        <div>
          <label class="block text-[11px] font-medium text-slate-400 mb-1">Workflow Goal / Description</label>
          <input
            type="text"
            class="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none transition-colors"
            [(ngModel)]="workflowGoal"
            placeholder="e.g., Generate image, outpaint background, animate to video and narrate"
          />
        </div>
      </div>

      <!-- DAG Canvas / Node List -->
      @if (nodesList().length === 0) {
        <div class="border-2 border-dashed border-slate-800 rounded-2xl p-10 text-center space-y-2">
          <div class="text-3xl">🧩</div>
          <h4 class="text-xs font-bold text-slate-300">Your Workflow is Empty</h4>
          <p class="text-[11px] text-slate-500 max-w-sm mx-auto">
            Add processing steps using "+ Add Step" or load a built-in template from the catalog below.
          </p>
        </div>
      } @else {
        <div class="space-y-3">
          @for (node of nodesList(); track node.node_id; let idx = $index) {
            <div
              class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 transition-all relative overflow-hidden group"
              [ngClass]="{
                'border-cyan-500/50 shadow-md shadow-cyan-950/20': node.status === 'COMPLETED',
                'border-rose-500/50': node.status === 'FAILED',
                'border-indigo-500/50 animate-pulse': node.status === 'EXECUTING'
              }"
            >
              <!-- Node Header -->
              <div class="flex items-center justify-between gap-2 mb-3">
                <div class="flex items-center gap-2">
                  <span class="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-mono text-cyan-300 font-bold">
                    {{ idx + 1 }}
                  </span>
                  <input
                    type="text"
                    class="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-500 px-1 py-0.5 text-xs font-bold text-slate-200 outline-none"
                    [(ngModel)]="node.title"
                  />
                  <span class="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                    {{ node.skill_id }}
                  </span>
                </div>

                <div class="flex items-center gap-2">
                  <!-- Status Badge -->
                  <span
                    class="text-[9px] px-2 py-0.5 rounded-full font-mono font-semibold"
                    [ngClass]="{
                      'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30': node.status === 'COMPLETED',
                      'bg-rose-500/10 text-rose-300 border border-rose-500/30': node.status === 'FAILED',
                      'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30': node.status === 'EXECUTING',
                      'bg-slate-800 text-slate-400': !node.status || node.status === 'PENDING'
                    }"
                  >
                    {{ node.status || 'PENDING' }}
                  </span>

                  <!-- Delete Node -->
                  <button
                    type="button"
                    class="text-slate-500 hover:text-rose-400 text-xs px-1.5 py-0.5 rounded hover:bg-rose-950/30 transition-colors"
                    (click)="removeNode(node.node_id)"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <!-- Parameter Inputs -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                @if (node.skill_id.includes('image.generate') || node.skill_id.includes('image.edit') || node.skill_id.includes('image.outpaint')) {
                  <div class="sm:col-span-2">
                    <label class="block text-[10px] text-slate-400 mb-0.5">Prompt</label>
                    <input
                      type="text"
                      class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500"
                      [(ngModel)]="node.parameters['prompt']"
                      placeholder="Prompt description..."
                    />
                  </div>
                }

                @if (node.skill_id.includes('tts')) {
                  <div class="sm:col-span-2">
                    <label class="block text-[10px] text-slate-400 mb-0.5">Narration Text</label>
                    <input
                      type="text"
                      class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500"
                      [(ngModel)]="node.parameters['text']"
                      placeholder="Text to speak..."
                    />
                  </div>
                }

                @if (node.skill_id.includes('video.generate')) {
                  <div>
                    <label class="block text-[10px] text-slate-400 mb-0.5">Duration (Seconds)</label>
                    <input
                      type="number"
                      class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500"
                      [(ngModel)]="node.parameters['duration_seconds']"
                      placeholder="2.0"
                    />
                  </div>
                }

                @if (node.skill_id.includes('video.compose')) {
                  <div>
                    <label class="block text-[10px] text-slate-400 mb-0.5">Composition Profile</label>
                    <select
                      class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-cyan-500"
                      [(ngModel)]="node.parameters['profile']"
                    >
                      <option value="VIDEO_PLUS_AUDIO">VIDEO_PLUS_AUDIO</option>
                      <option value="VIDEO_ONLY">VIDEO_ONLY</option>
                      <option value="VIDEO_PLUS_AUDIO_SUBTITLES">VIDEO_PLUS_AUDIO_SUBTITLES</option>
                    </select>
                  </div>
                }

                @if (node.output_artifact_id) {
                  <div class="sm:col-span-2 mt-1 text-[10px] text-emerald-400 font-mono bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/40">
                    Output: {{ node.output_artifact_id }}
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class VisualWorkflowComposerComponent {
  mediaService = inject(MediaService);
  workflowChanged = output<MediaWorkflow>();

  workflowTitle = 'Creative Multimodal Workflow';
  workflowGoal = 'End-to-end multimodal generation and composition';
  nodesList = signal<MediaWorkflowNode[]>([]);
  showPalette = signal<boolean>(false);

  availableCapabilities = [
    { skill_id: 'media.image.generate', label: 'Image Synthesis', icon: '🎨' },
    { skill_id: 'media.image.outpaint', label: 'Image Outpaint', icon: '🖼️' },
    { skill_id: 'media.image.inpaint', label: 'Image Inpaint', icon: '🖌️' },
    { skill_id: 'media.video.generate', label: 'Video Generation', icon: '🎬' },
    { skill_id: 'audio.tts', label: 'Audio Speech Synthesis', icon: '🎙️' },
    { skill_id: 'media.video.compose', label: 'Multimodal Video Mux', icon: '🎞️' },
  ];

  togglePalette(): void {
    this.showPalette.update((v) => !v);
  }

  addNode(cap: { skill_id: string; label: string; icon: string }): void {
    const nextIdx = this.nodesList().length + 1;
    const nodeId = `node_${nextIdx}_${cap.skill_id.split('.').pop()}`;
    const newNode: MediaWorkflowNode = {
      node_id: nodeId,
      title: cap.label,
      skill_id: cap.skill_id,
      skill_version: '1.0.0',
      parameters: {
        prompt: cap.skill_id.includes('image') ? 'Cinematic artwork' : undefined,
        text: cap.skill_id.includes('tts') ? 'Voice narration content.' : undefined,
        duration_seconds: cap.skill_id.includes('video.generate') ? 2.0 : undefined,
        profile: cap.skill_id.includes('video.compose') ? 'VIDEO_PLUS_AUDIO' : undefined,
      },
      status: 'PENDING',
    };

    this.nodesList.update((nodes) => [...nodes, newNode]);
    this.showPalette.set(false);
  }

  removeNode(nodeId: string): void {
    this.nodesList.update((nodes) => nodes.filter((n) => n.node_id !== nodeId));
  }

  loadTemplate(template: any): void {
    if (!template || !template.nodes) return;
    const rawNodes = template.nodes;
    const nodeList: MediaWorkflowNode[] = Array.isArray(rawNodes)
      ? rawNodes
      : Object.values(rawNodes);

    this.workflowTitle = template.title || 'Templated Workflow';
    this.workflowGoal = template.description || 'Instantiated from template';
    this.nodesList.set(nodeList);
  }

  buildWorkflow(): MediaWorkflow {
    const nodes = this.nodesList();
    const edges: MediaWorkflowEdge[] = [];

    // Auto-chain sequential nodes if dependencies are linear
    for (let i = 0; i < nodes.length - 1; i++) {
      const src = nodes[i];
      const dst = nodes[i + 1];
      const pType: WorkflowMediaPortType = src.skill_id.includes('image')
        ? 'IMAGE'
        : src.skill_id.includes('video')
        ? 'VIDEO'
        : src.skill_id.includes('audio')
        ? 'AUDIO'
        : 'ANY';

      edges.push({
        source_node_id: src.node_id,
        source_output_key: 'artifact_id',
        target_node_id: dst.node_id,
        target_input_key: 'source_artifact_id',
        port_type: pType,
      });
    }

    return {
      workflow_id: `wf_${Date.now()}`,
      title: this.workflowTitle,
      goal: this.workflowGoal,
      nodes: nodes,
      edges: edges,
    };
  }

  onSimulate(): void {
    const wf = this.buildWorkflow();
    this.mediaService.simulateWorkflow(wf).subscribe();
  }

  onExecute(): void {
    const wf = this.buildWorkflow();
    this.mediaService.executeWorkflow(wf).subscribe();
  }
}
