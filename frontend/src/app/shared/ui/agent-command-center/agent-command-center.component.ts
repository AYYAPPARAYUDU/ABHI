import { Component, inject, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentCommandService } from '../../../core/services/agent-command.service';
import { OperatorStateService } from '../../../core/services/operator-state.service';
import { UniversalResultSheetComponent } from '../result-sheet/result-sheet.component';
import { AgentTaskCardComponent } from '../agent-task-card/agent-task-card.component';

@Component({
  selector: 'app-agent-command-center',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    UniversalResultSheetComponent,
    AgentTaskCardComponent
  ],
  template: `
    <div class="agent-command-center" [class.compact]="compact">
      <!-- Central Ambient Aura & Focus Ring -->
      <div class="command-box-wrap" [class.focused]="isFocused" [class.working]="commandService.isWorking()">
        <form class="command-form" (ngSubmit)="onSubmit()">
          <div class="command-input-row">
            <!-- Left Command / AI Icon -->
            <span class="command-brand-icon" [class.pulse]="commandService.isWorking()">
              @if (commandService.isWorking()) {
                <span class="working-spinner">🌀</span>
              } @else {
                <span class="ai-symbol">✦</span>
              }
            </span>

            <!-- Main Input Field -->
            <input
              type="text"
              class="command-input"
              [(ngModel)]="inputText"
              name="commandInput"
              [placeholder]="placeholderText()"
              autocomplete="off"
              (focus)="isFocused = true"
              (blur)="isFocused = false"
              [disabled]="commandService.isProcessing()"
            />

            <!-- Actions: Language Selector, Voice, Submit -->
            <div class="command-actions-wrap">
              <!-- Selected Language Badge -->
              <div class="lang-selector-wrap">
                <button
                  type="button"
                  class="lang-pill-btn"
                  (click)="toggleLangMenu()"
                  title="Command Language"
                >
                  {{ currentLangLabel() }}
                  <span class="caret">▾</span>
                </button>

                @if (showLangMenu()) {
                  <div class="lang-dropdown">
                    <button type="button" class="lang-opt" (click)="setLang('auto')">Auto Detect</button>
                    <button type="button" class="lang-opt" (click)="setLang('en')">English (EN)</button>
                    <button type="button" class="lang-opt" (click)="setLang('te')">తెలుగు (Telugu)</button>
                    <button type="button" class="lang-opt" (click)="setLang('hi')">हिंदी (Hindi)</button>
                    <button type="button" class="lang-opt" (click)="setLang('ta')">தமிழ் (Tamil)</button>
                  </div>
                }
              </div>

              <!-- Voice Input Button -->
              <button
                type="button"
                class="voice-toggle-btn"
                [class.listening]="isListening()"
                (click)="toggleVoice()"
                title="Voice Input (English, Telugu, Hindi, Tamil)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
              </button>

              <!-- Submit Button -->
              <button
                type="submit"
                class="submit-action-btn"
                [disabled]="!inputText.trim() || commandService.isProcessing()"
                title="Execute Command"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </form>
      </div>

      <!-- Quick Suggestion / Multilingual Pills -->
      @if (!compact && !commandService.activeResult() && !operatorState.isBusy()) {
        <div class="suggestions-row">
          <span class="sug-label">Try:</span>
          @for (sug of activeSuggestions(); track sug.text) {
            <button
              type="button"
              class="sug-pill"
              (click)="applySuggestion(sug.text, sug.lang)"
            >
              @if (sug.lang !== 'en') {
                <span class="sug-lang-badge">{{ sug.lang.toUpperCase() }}</span>
              }
              {{ sug.text }}
            </button>
          }
        </div>
      }

      <!-- Embedded Active Task Card (When Working or Running) -->
      @if (operatorState.currentTask() && operatorState.isBusy() && !commandService.activeResult()) {
        <div class="active-task-container">
          <app-agent-task-card
            [task]="operatorState.currentTask()"
            (onCancel)="operatorState.cancelActiveTask()"
          ></app-agent-task-card>
        </div>
      }

      <!-- Embedded Universal Result Sheet (When Result is Active) -->
      @if (commandService.activeResult()) {
        <div class="active-result-container">
          <app-result-sheet
            [result]="commandService.activeResult()"
            (onDismiss)="commandService.dismissResult()"
            (onAction)="handleResultAction($event)"
          ></app-result-sheet>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .agent-command-center {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      max-width: 780px;
      margin: 0 auto;
    }

    .command-box-wrap {
      position: relative;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 6px 10px 6px 16px;
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.04);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .command-box-wrap.focused {
      border-color: rgba(56, 189, 248, 0.6);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 25px rgba(6, 182, 212, 0.3);
      transform: translateY(-1px);
    }

    .command-box-wrap.working {
      border-color: rgba(16, 185, 129, 0.5);
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 25px rgba(16, 185, 129, 0.25);
    }

    .command-input-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .command-brand-icon {
      font-size: 16px;
      color: #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }

    .working-spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .command-input {
      flex: 1;
      background: transparent;
      border: none;
      color: #f1f5f9;
      font-size: 15px;
      font-weight: 400;
      outline: none;
      min-width: 0;
    }

    .command-input::placeholder {
      color: #64748b;
    }

    .command-actions-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .lang-selector-wrap {
      position: relative;
    }

    .lang-pill-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      transition: all 0.15s;
    }

    .lang-pill-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #f1f5f9;
    }

    .caret {
      font-size: 9px;
      color: #64748b;
    }

    .lang-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      padding: 4px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 140px;
      z-index: 50;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
    }

    .lang-opt {
      background: transparent;
      border: none;
      color: #cbd5e1;
      font-size: 11px;
      padding: 6px 10px;
      border-radius: 6px;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s;
    }

    .lang-opt:hover {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
    }

    .voice-toggle-btn, .submit-action-btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .voice-toggle-btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
    }

    .voice-toggle-btn:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #f1f5f9;
    }

    .voice-toggle-btn.listening {
      background: rgba(239, 68, 68, 0.2);
      border-color: #ef4444;
      color: #ef4444;
      animation: pulse-mic 1.2s infinite;
    }

    @keyframes pulse-mic {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }

    .submit-action-btn {
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(6, 182, 212, 0.35);
    }

    .submit-action-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(6, 182, 212, 0.5);
    }

    .submit-action-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    /* Suggestions Row */
    .suggestions-row {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 6px;
      padding: 0 10px;
    }

    .sug-label {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
    }

    .sug-pill {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #94a3b8;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }

    .sug-pill:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(56, 189, 248, 0.3);
      color: #38bdf8;
      transform: translateY(-1px);
    }

    .sug-lang-badge {
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 4px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      font-weight: 700;
    }

    .active-task-container, .active-result-container {
      width: 100%;
      animation: fadeIn 0.3s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class AgentCommandCenterComponent {
  @Input() compact = false;

  readonly commandService = inject(AgentCommandService);
  readonly operatorState = inject(OperatorStateService);

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
