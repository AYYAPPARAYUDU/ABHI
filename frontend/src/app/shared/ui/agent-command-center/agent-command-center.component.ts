import { Component, inject, signal, Input, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentCommandService } from '../../../core/services/agent-command.service';
import { OperatorStateService } from '../../../core/services/operator-state.service';
import { UniversalResultSheetComponent } from '../result-sheet/result-sheet.component';
import { AgentTaskCardComponent } from '../agent-task-card/agent-task-card.component';
import { AnimeAnimationService } from '../../../core/services/anime-animation.service';
import { AnimeInteractiveDirective } from '../../directives/anime-interactive.directive';

@Component({
  selector: 'app-agent-command-center',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UniversalResultSheetComponent,
    AgentTaskCardComponent,
    AnimeInteractiveDirective
  ],
  templateUrl: './agent-command-center.component.html',
  styleUrl: './agent-command-center.component.css'
})
export class AgentCommandCenterComponent implements AfterViewInit {
  @Input() compact = false;

  readonly commandService = inject(AgentCommandService);
  readonly operatorState = inject(OperatorStateService);
  readonly animService = inject(AnimeAnimationService);
  private hostEl = inject(ElementRef);

  inputText = '';
  isFocused = false;
  isListening = signal<boolean>(false);
  showLangMenu = signal<boolean>(false);
  selectedLanguage = signal<'en' | 'te' | 'hi' | 'ta' | 'auto'>('auto');

  readonly activeSuggestions = signal<Array<{ text: string; lang: 'en' | 'te' | 'hi' | 'ta' }>>([
    { text: 'Open Calculator and calculate 125 times 48', lang: 'en' },
    { text: 'Open Notepad and write today\'s plan', lang: 'en' },
    { text: 'Find my cyberpunk images', lang: 'en' },
    { text: 'క్యాలిక్యులేటర్ తెరవండి', lang: 'te' },
    { text: 'कैलकुलेटर खोलें', lang: 'hi' },
    { text: 'கால்குலேட்டரைத் திறக்கவும்', lang: 'ta' }
  ]);

  placeholderText(): string {
    const lang = this.selectedLanguage();
    if (lang === 'te') return 'ABHI ఏమి చేయాలి? (ఉదా: క్యాలిక్యులేటర్ తెరవండి)';
    if (lang === 'hi') return 'ABHI आपके लिए क्या करे? (उदा: कैलकुलेटर खोलें)';
    if (lang === 'ta') return 'ABHI என்ன செய்ய வேண்டும்?';
    return 'What should ABHI do for you? (e.g., "Open Calculator and calculate 125 * 48")';
  }

  currentLangLabel(): string {
    const l = this.selectedLanguage();
    if (l === 'auto') return 'Auto';
    if (l === 'te') return 'తెలుగు';
    if (l === 'hi') return 'हिंदी';
    if (l === 'ta') return 'தமிழ்';
    return 'EN';
  }

  ngAfterViewInit(): void {
    const root = this.hostEl.nativeElement;
    if (!root) return;
    const chips = root.querySelectorAll('.suggestion-chip, .action-btn');
    if (chips.length > 0) {
      this.animService.staggerEnter({
        targets: chips,
        translateY: [10, 0],
        opacity: [0, 1],
        duration: 450,
        delay: 30
      });
    }
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

  async onSubmit(): Promise<void> {
    const text = this.inputText.trim();
    if (!text || this.commandService.isProcessing()) return;

    this.inputText = '';
    await this.commandService.submitCommand(
      text,
      'TEXT',
      this.selectedLanguage()
    );
  }

  toggleVoice(): void {
    this.isListening.set(!this.isListening());
    if (this.isListening()) {
      // Mock VAD & STT transition
      setTimeout(() => {
        if (this.isListening()) {
          this.inputText = 'Open Calculator and calculate 25 * 19';
          this.isListening.set(false);
          this.onSubmit();
        }
      }, 2500);
    }
  }

  handleResultAction(action: any): void {
    if (action.actionType === 'RETRY') {
      this.commandService.retryLastCommand();
    }
  }
}
