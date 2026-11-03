html_path = 'frontend/src/app/features/home/pages/home-page/home-page.component.html'
with open(html_path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update placeholder to inputPlaceholder()
text = text.replace('[placeholder]="inputPlaceholder"', '[placeholder]="inputPlaceholder()"')

# 2. Add language selector inside dock-controls-group
target = '''              <!-- Controls: Voice Mic, Submit & Three Dots for Actions -->
              <div class="dock-controls-group">'''

lang_dock_html = '''              <!-- Controls: Language, Voice Mic, Submit & Three Dots for Actions -->
              <div class="dock-controls-group">
                <!-- Quick Language Selector in Command Dock -->
                <div class="dock-lang-wrapper">
                  <button
                    type="button"
                    class="dock-control-btn lang-dock-btn"
                    appAnimeInteractive
                    [appAnimeType]="'button'"
                    [class.active]="showDockLangMenu()"
                    (click)="toggleDockLangMenu($event)"
                    [title]="'Language: ' + speechVoice.selectedLanguage().toUpperCase() + ' (Click to change)'"
                    aria-label="Select Language"
                  >
                    <span class="lang-dock-code font-monospace">{{ speechVoice.selectedLanguage().toUpperCase() }}</span>
                  </button>
                  @if (showDockLangMenu()) {
                    <div class="dock-lang-popover" (click)="$event.stopPropagation()">
                      <button
                        type="button"
                        class="dock-lang-opt"
                        [class.active]="speechVoice.selectedLanguage() === 'auto'"
                        (click)="selectDockLanguage('auto', $event)"
                      >
                        <span class="opt-flag">🌐</span>
                        <span class="opt-label">Auto</span>
                      </button>
                      <button
                        type="button"
                        class="dock-lang-opt"
                        [class.active]="speechVoice.selectedLanguage() === 'en'"
                        (click)="selectDockLanguage('en', $event)"
                      >
                        <span class="opt-flag">🇬🇧</span>
                        <span class="opt-label">EN</span>
                      </button>
                      <button
                        type="button"
                        class="dock-lang-opt"
                        [class.active]="speechVoice.selectedLanguage() === 'te'"
                        (click)="selectDockLanguage('te', $event)"
                      >
                        <span class="opt-flag">🇮🇳</span>
                        <span class="opt-label">తెలుగు</span>
                      </button>
                      <button
                        type="button"
                        class="dock-lang-opt"
                        [class.active]="speechVoice.selectedLanguage() === 'hi'"
                        (click)="selectDockLanguage('hi', $event)"
                      >
                        <span class="opt-flag">🇮🇳</span>
                        <span class="opt-label">हिंदी</span>
                      </button>
                      <button
                        type="button"
                        class="dock-lang-opt"
                        [class.active]="speechVoice.selectedLanguage() === 'ta'"
                        (click)="selectDockLanguage('ta', $event)"
                      >
                        <span class="opt-flag">🇮🇳</span>
                        <span class="opt-label">தமிழ்</span>
                      </button>
                    </div>
                  }
                </div>'''

assert target in text, 'Target not found in home-page.component.html'
text = text.replace(target, lang_dock_html, 1)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated home-page.component.html!')

