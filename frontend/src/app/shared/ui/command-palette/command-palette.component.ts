import { Component, HostListener, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OperatorStateService } from '../../../core/services/operator-state.service';
import { CommandPaletteAction } from '../../../core/models/agent-experience.model';

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.css'
})
export class CommandPaletteComponent {
  private router = inject(Router);
  private stateService = inject(OperatorStateService);

  searchQuery = '';
  isOpen = this.stateService.commandPaletteOpen;

  private allActions: CommandPaletteAction[] = [
    {
      id: 'cmd_home',
      title: 'Home — 3D Intelligence Core',
      subtitle: 'Central AI Space & Arc Reactor Core',
      icon: '🌐',
      category: 'NAVIGATION',
      shortcut: 'G H',
      handler: () => this.router.navigate(['/home']),
    },
    {
      id: 'cmd_decision_pipeline',
      title: 'Decision Pipeline',
      subtitle: 'Cybernetic decision DAG, confidence stream & 12 use cases',
      icon: '⚡',
      category: 'NAVIGATION',
      shortcut: 'G D',
      handler: () => this.router.navigate(['/decision-pipeline']),
    },
    {
      id: 'cmd_business',
      title: 'Autonomous Business Sectors',
      subtitle: 'Ayyappa Rayudu projects, opportunities & revenue observatory',
      icon: '⛃',
      category: 'NAVIGATION',
      shortcut: 'G B',
      handler: () => this.router.navigate(['/business']),
    },
    {
      id: 'cmd_intelligence',
      title: 'Intelligence Lab & Neural Attention',
      subtitle: 'Self-attention heatmaps, token logits & model evaluation',
      icon: '🧠',
      category: 'NAVIGATION',
      shortcut: 'G I',
      handler: () => this.router.navigate(['/intelligence']),
    },
    {
      id: 'cmd_apps',
      title: 'Native Windows OS Applications',
      subtitle: 'Launch Calculator, Notepad, Explorer, Terminal',
      icon: '💻',
      category: 'APPS',
      shortcut: 'G A',
      handler: () => this.router.navigate(['/applications']),
    },
    {
      id: 'cmd_media',
      title: 'Creative Media Studio',
      subtitle: 'YouTube automation, Whisper STT subtitles & ffmpeg composition',
      icon: '✦',
      category: 'MEDIA',
      shortcut: 'G M',
      handler: () => this.router.navigate(['/media']),
    },
    {
      id: 'cmd_media_lib',
      title: 'Multimodal Media Library & Search',
      subtitle: 'OCR transcription, scene indexing & GPU asset reuse engine',
      icon: '🔍',
      category: 'MEDIA',
      shortcut: 'G L',
      handler: () => this.router.navigate(['/media-library']),
    },
    {
      id: 'cmd_tasks',
      title: 'Tasks & Autonomous Goals',
      subtitle: 'Active, queued and completed workflows',
      icon: '◈',
      category: 'ACTIONS',
      shortcut: 'G T',
      handler: () => this.router.navigate(['/tasks']),
    },
    {
      id: 'cmd_network',
      title: 'Specialist Agent Network',
      subtitle: 'Interactive 3D graph of 9 specialist agent nodes',
      icon: '☊',
      category: 'NAVIGATION',
      shortcut: 'G N',
      handler: () => this.router.navigate(['/network']),
    },
    {
      id: 'cmd_system',
      title: 'System Diagnostics & Telemetry',
      subtitle: 'GPU 100% VRAM, Ollama 32k context & health checks',
      icon: '⚙',
      category: 'SYSTEM',
      shortcut: 'G S',
      handler: () => this.router.navigate(['/system']),
    },
    {
      id: 'cmd_browser',
      title: 'AI Browser Automation',
      subtitle: 'Controlled web automation & search skills',
      icon: '🌍',
      category: 'APPS',
      shortcut: 'G W',
      handler: () => this.router.navigate(['/browser']),
    },
    {
      id: 'cmd_memory',
      title: 'Memory & Procedural Knowledge',
      subtitle: 'Personal procedural memory & LanceDB vector RAG',
      icon: '◌',
      category: 'NAVIGATION',
      shortcut: 'G K',
      handler: () => this.router.navigate(['/memory']),
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
