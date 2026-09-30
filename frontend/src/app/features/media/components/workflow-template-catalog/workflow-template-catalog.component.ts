import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaWorkflowTemplate } from '../../models/media.model';
import { MediaService } from '../../services/media.service';

@Component({
  selector: 'app-workflow-template-catalog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-slate-900/85 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
          <h3 class="text-sm font-semibold text-slate-100 tracking-wide">
            Workflow Template Catalog
          </h3>
        </div>
        <span class="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono">
          {{ templates().length }} Templates
        </span>
      </div>

      <!-- Catalog Grid -->
      @if (templates().length === 0) {
        <div class="text-center py-8 text-slate-400 text-xs">
          No workflow templates available. Fetching catalog...
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          @for (tmpl of templates(); track tmpl.template_id) {
            <div
              class="bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/50 transition-all duration-200 rounded-xl p-4 flex flex-col justify-between group hover:shadow-lg hover:shadow-cyan-950/30 cursor-pointer"
              (click)="onSelect(tmpl)"
            >
              <div>
                <div class="flex items-start justify-between gap-2 mb-2">
                  <h4 class="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                    {{ tmpl.title }}
                  </h4>
                  <span class="text-[9px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                    v{{ tmpl.version }}
                  </span>
                </div>
                <p class="text-[11px] text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                  {{ tmpl.description }}
                </p>

                <!-- Tags / Badges -->
                <div class="flex flex-wrap gap-1.5 mb-3">
                  <span class="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                    {{ tmpl.category }}
                  </span>
                  <span class="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                    {{ getNodeCount(tmpl) }} Steps
                  </span>
                  @if (tmpl.is_builtin) {
                    <span class="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                      Verified
                    </span>
                  }
                </div>
              </div>

              <!-- Action Bar -->
              <div class="flex items-center justify-between pt-2.5 border-t border-slate-800/60 mt-auto">
                <span class="text-[10px] text-slate-400 font-mono">
                  {{ tmpl.template_id }}
                </span>
                <button
                  type="button"
                  class="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-cyan-600/20 hover:bg-cyan-600 text-cyan-200 hover:text-white border border-cyan-500/40 transition-all flex items-center gap-1"
                  (click)="$event.stopPropagation(); onSelect(tmpl)"
                >
                  <span>Load</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class WorkflowTemplateCatalogComponent {
  mediaService = inject(MediaService);
  templates = input<MediaWorkflowTemplate[]>([]);
  templateSelected = output<MediaWorkflowTemplate>();

  onSelect(template: MediaWorkflowTemplate): void {
    this.templateSelected.emit(template);
  }

  getNodeCount(template: MediaWorkflowTemplate): number {
    if (!template.nodes) return 0;
    return Array.isArray(template.nodes) ? template.nodes.length : Object.keys(template.nodes).length;
  }
}
