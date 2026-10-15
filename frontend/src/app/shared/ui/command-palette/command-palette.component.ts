import { Component, HostListener, inject, computed, ElementRef, effect, signal, Input, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OperatorStateService } from '../../../core/services/operator-state.service';
import { AgentCommandService } from '../../../core/services/agent-command.service';
import { SpeechVoiceService } from '../../../core/services/speech-voice.service';
import { CommandPaletteAction } from '../../../core/models/agent-experience.model';
import { AnimeAnimationService } from '../../../core/services/anime-animation.service';
import { AnimeInteractiveDirective } from '../../directives/anime-interactive.directive';
import { UniversalResultSheetComponent } from '../result-sheet/result-sheet.component';
import { AgentTaskCardComponent } from '../agent-task-card/agent-task-card.component';

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AnimeInteractiveDirective,
    UniversalResultSheetComponent,
    AgentTaskCardComponent
  ],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.css'
})
export class CommandPaletteComponent implements AfterViewInit {
  @Input() embedded = false;
  @Input() compact = false;

  readonly router = inject(Router);
  readonly stateService = inject(OperatorStateService);
  readonly operatorState = inject(OperatorStateService);
  readonly commandService = inject(AgentCommandService);
  readonly voiceService = inject(SpeechVoiceService);
  readonly animService = inject(AnimeAnimationService);
  private hostEl = inject(ElementRef);

  inputText = '';
  isFocused = false;
  isListening = signal<boolean>(false);
  showLangMenu = signal<boolean>(false);
  selectedLanguage = signal<'en' | 'te' | 'hi' | 'ta' | 'auto'>('auto');
  selectedIndex = signal<number>(0);

  isOpen = this.stateService.commandPaletteOpen;

  readonly activeSuggestions = signal<Array<{ text: string; lang: 'en' | 'te' | 'hi' | 'ta' }>>([
    { text: 'Open Calculator and calculate 125 times 48', lang: 'en' },
    { text: 'Open Notepad and write today\'s plan', lang: 'en' },
    { text: 'Find my cyberpunk images', lang: 'en' },
    { text: 'క్యాలిక్యులేటర్ తెరవండి', lang: 'te' },
    { text: 'कैलकुलेटर खोलें', lang: 'hi' },
    { text: 'கால்குலேட்டரைத் திறக்கவும்', lang: 'ta' }
  ]);

  constructor() {
    effect(() => {
      if (!this.embedded && this.isOpen()) {
        setTimeout(() => {
          const root = this.hostEl.nativeElement;
          const backdrop = root.querySelector('.command-palette-backdrop');
          const modal = root.querySelector('.command-palette-modal');
          if (modal && backdrop) {
            this.animService.popInModal(modal, backdrop);
          }
          const inputEl = root.querySelector('.command-master-input') as HTMLInputElement;
          inputEl?.focus();
        }, 20);
      }
    });
  }

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
    const q = this.inputText.trim().toLowerCase();
    if (!q) return this.allActions.slice(0, 8);
    return this.allActions.filter(
      (a) => a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
    );
  });

  get searchQuery(): string {
    return this.inputText;
  }

  set searchQuery(val: string) {
    this.inputText = val;
  }

  ngAfterViewInit(): void {
    const root = this.hostEl.nativeElement;
    if (!root) return;
    const chips = root.querySelectorAll('.sug-pill');
    if (chips.length > 0) {
      this.animService.staggerEnter({
        targets: chips,
        translateY: [8, 0],
        opacity: [0, 1],
        duration: 400,
        delay: 25
      });
    }
  }

  placeholderText(): string {
    const lang = this.selectedLanguage();
    if (lang === 'te') return 'ABHI ఏమి చేయాలి? (ఉదా: క్యాలిక్యులేటర్ తెరవండి)';
    if (lang === 'hi') return 'ABHI आपके लिए क्या करे? (उदा: कैलकुलेटर खोलें)';
    if (lang === 'ta') return 'ABHI என்ன செய்ய வேண்டும்?';
    return 'Ask ABHI or search actions (e.g. "Open Calculator and calculate 125 * 48")...';
  }

  currentLangLabel(): string {
    const l = this.selectedLanguage();
    if (l === 'auto') return 'Auto';
    if (l === 'te') return 'తెలుగు';
    if (l === 'hi') return 'हिंदी';
    if (l === 'ta') return 'தமிழ்';
    return 'EN';
  }

  toggleLangMenu(): void {
    this.showLangMenu.set(!this.showLangMenu());
  }

  setLang(lang: 'en' | 'te' | 'hi' | 'ta' | 'auto'): void {
    this.selectedLanguage.set(lang);
    this.showLangMenu.set(false);
  }

  applySuggestion(text: string, lang: 'en' | 'te' | 'hi' | 'ta'): void {
    this.inputText = text;
    this.selectedLanguage.set(lang);
    this.onSubmit();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.stateService.toggleCommandPalette();
    } else if (event.key === 'Escape' && this.isOpen() && !this.embedded) {
      this.stateService.toggleCommandPalette(false);
    }
  }

  closeOnBackdrop(event: MouseEvent): void {
    this.stateService.toggleCommandPalette(false);
  }

  executeAction(act: CommandPaletteAction): void {
    if (!this.embedded) {
      this.stateService.toggleCommandPalette(false);
    }
    this.inputText = '';
    act.handler();
  }

  async onSubmit(): Promise<void> {
    const text = this.inputText.trim();
    if (!text || this.commandService.isProcessing()) return;

    // Check if the query exactly matches one of our command palette actions
    const matched = this.allActions.find(a => a.title.toLowerCase() === text.toLowerCase());
    if (matched) {
      this.executeAction(matched);
      return;
    }

    this.inputText = '';
    await this.commandService.submitCommand(
      text,
      'TEXT',
      this.selectedLanguage()
    );

    // Keep modal open so user sees the result sheet outcome, or let them dismiss
  }

  toggleVoice(): void {
    if (this.isListening()) {
      this.voiceService.stopVoiceListening();
      this.isListening.set(false);
    } else {
      const started = this.voiceService.startVoiceListening(
        (transcript: string) => {
          this.inputText = transcript;
          this.isListening.set(false);
          this.onSubmit();
        },
        () => {
          this.isListening.set(false);
        }
      );
      this.isListening.set(started);
    }
  }

  handleResultAction(action: any): void {
    if (action?.actionType === 'RETRY') {
      this.commandService.retryLastCommand();
    } else if (typeof action === 'string' && action.startsWith('open:')) {
      const target = action.replace('open:', '');
      this.router.navigate([`/${target}`]);
      if (!this.embedded) this.stateService.toggleCommandPalette(false);
    }
  }
}
