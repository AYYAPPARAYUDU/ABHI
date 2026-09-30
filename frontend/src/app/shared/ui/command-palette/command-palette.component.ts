import { Component, HostListener, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OperatorStateService } from '../../../core/services/operator-state.service';
import { CommandPaletteAction } from '../../../core/models/agent-experience.model';

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div
      *ngIf="isOpen()"
      class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-start justify-center pt-24 p-4 animate-fade-in"
      (click)="closeOnBackdrop($event)"
    >
      <div
        class="command-palette-modal bg-slate-900/95 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden backdrop-blur-xl animate-scale-up"
        (click)="$event.stopPropagation()"
      >
        <!-- Search Bar Header -->
        <div class="relative border-b border-slate-800 p-4 flex items-center gap-3">
          <span class="text-xl text-cyan-400">⚡</span>
          <input
            #commandInput
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Type a command or search ABHI (e.g., 'Open Calculator', 'Find cyberpunk video', 'System health')..."
            class="w-full bg-transparent text-white text-sm placeholder-slate-500 focus:outline-none"
            autofocus
          />
          <kbd class="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-mono rounded border border-slate-700">ESC</kbd>
        </div>

        <!-- Action Categories & Search Results -->
        <div class="max-h-80 overflow-y-auto p-2 space-y-1">
          <div *ngIf="filteredActions().length === 0" class="p-6 text-center text-slate-500 text-xs">
            No matching commands or actions found. Try asking ABHI on Home.
          </div>

          <div
            *ngFor="let act of filteredActions(); let i = index"
            (click)="executeAction(act)"
            class="p-3 rounded-xl hover:bg-slate-800/80 cursor-pointer flex items-center justify-between transition-all duration-150 group"
          >
            <div class="flex items-center gap-3 min-w-0">
              <span class="text-base p-1.5 bg-slate-800 rounded-lg group-hover:bg-cyan-500/10 group-hover:text-cyan-400 transition-all">{{ act.icon }}</span>
              <div class="min-w-0">
                <div class="text-sm font-semibold text-white truncate group-hover:text-cyan-300">{{ act.title }}</div>
                <div class="text-xs text-slate-400 truncate">{{ act.subtitle }}</div>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-shrink-0">
              <span class="px-1.5 py-0.5 bg-slate-800 text-slate-400 text-[9px] font-bold uppercase rounded border border-slate-700/60">{{ act.category }}</span>
              <span *ngIf="act.shortcut" class="text-xs text-slate-500 font-mono">{{ act.shortcut }}</span>
            </div>
          </div>
        </div>

        <!-- Footer Shortcuts -->
        <div class="p-3 bg-slate-950/60 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
          <div class="flex items-center gap-2">
            <span>Navigate <kbd class="px-1 bg-slate-800 rounded text-[10px]">↑</kbd> <kbd class="px-1 bg-slate-800 rounded text-[10px]">↓</kbd></span>
            <span>Select <kbd class="px-1 bg-slate-800 rounded text-[10px]">↵</kbd></span>
          </div>
          <span class="text-cyan-400/80 font-mono">ABHI COMMAND CENTER</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleUp {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .animate-fade-in { animation: fadeIn 0.15s ease-out; }
    .animate-scale-up { animation: scaleUp 0.15s ease-out; }
  `]
})
export class CommandPaletteComponent {
  private router = inject(Router);
  private stateService = inject(OperatorStateService);

  searchQuery = '';
  isOpen = this.stateService.commandPaletteOpen;

  private allActions: CommandPaletteAction[] = [
    {
      id: 'cmd_home',
      title: 'Go to Home Workspace',
      subtitle: 'Central AI Space & quick command entry',
      icon: '⌂',
      category: 'NAVIGATION',
      shortcut: 'G H',
      handler: () => this.router.navigate(['/home']),
    },
    {
      id: 'cmd_tasks',
      title: 'Open Tasks & Automation',
      subtitle: 'Active, queued and completed workflows',
      icon: '◈',
      category: 'NAVIGATION',
      shortcut: 'G T',
      handler: () => this.router.navigate(['/tasks']),
    },
    {
      id: 'cmd_apps',
      title: 'Open Application Launcher',
      subtitle: 'Launch Notepad, Calculator, Explorer, Terminal',
      icon: '▦',
      category: 'APPS',
      shortcut: 'G A',
      handler: () => this.router.navigate(['/applications']),
    },
    {
      id: 'cmd_media_lib',
      title: 'Open 3D Media Library',
      subtitle: 'Semantic search, OCR, video scenes & asset reuse',
      icon: '🔍',
      category: 'MEDIA',
      shortcut: 'G L',
      handler: () => this.router.navigate(['/media-library']),
    },
    {
      id: 'cmd_media_studio',
      title: 'Open Creative Media Studio',
      subtitle: 'Image generation, video composition & inpainting',
      icon: '◉',
      category: 'MEDIA',
      shortcut: 'G M',
      handler: () => this.router.navigate(['/media']),
    },
    {
      id: 'cmd_browser',
      title: 'Open AI Browser Workspace',
      subtitle: 'Controlled web automation & search skills',
      icon: '🌐',
      category: 'NAVIGATION',
      shortcut: 'G B',
      handler: () => this.router.navigate(['/browser']),
    },
    {
      id: 'cmd_memory',
      title: 'Open Memory & Knowledge',
      subtitle: 'Personal procedural memory & LanceDB vector RAG',
      icon: '◌',
      category: 'NAVIGATION',
      shortcut: 'G K',
      handler: () => this.router.navigate(['/memory']),
    },
    {
      id: 'cmd_avatar',
      title: 'Open 3D Avatar Core',
      subtitle: 'Interactive real-time 3D presentation stage',
      icon: '🤖',
      category: 'NAVIGATION',
      handler: () => this.router.navigate(['/avatar']),
    },
    {
      id: 'cmd_perception',
      title: 'Open Perception Cockpit',
      subtitle: 'Presence detection, gestures & attention telemetry',
      icon: '◇',
      category: 'NAVIGATION',
      handler: () => this.router.navigate(['/perception']),
    },
    {
      id: 'cmd_system',
      title: 'Open System Diagnostics',
      subtitle: 'GPU, VRAM, hardware gauges & model registry',
      icon: '◎',
      category: 'SYSTEM',
      shortcut: 'G S',
      handler: () => this.router.navigate(['/system']),
    },
  ];

  filteredActions = computed(() => {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.allActions;
    return this.allActions.filter(
      (a) => a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
    );
  });

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.stateService.toggleCommandPalette();
    } else if (event.key === 'Escape' && this.isOpen()) {
      this.stateService.toggleCommandPalette(false);
    }
  }

  closeOnBackdrop(event: MouseEvent): void {
    this.stateService.toggleCommandPalette(false);
  }

  executeAction(act: CommandPaletteAction): void {
    this.stateService.toggleCommandPalette(false);
    this.searchQuery = '';
    act.handler();
  }
}
