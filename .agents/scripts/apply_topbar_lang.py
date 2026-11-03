import os

html_path = 'frontend/src/app/layout/components/contextual-topbar/contextual-topbar.component.html'
with open(html_path, 'r', encoding='utf-8') as f:
    text = f.read()

target = '''      <!-- Voice Audio Speech Synthesis Toggle -->
      <button
        type="button"
        class="topbar-tool-btn voice-audio-btn"'''

lang_html = '''      <!-- Universal Language Selector Dropdown -->
      <div class="lang-selector-container">
        <button
          type="button"
          class="topbar-tool-btn lang-select-btn"
          appAnimeInteractive
          [appAnimeType]="'button'"
          [class.active]="isLangDropdownOpen()"
          (click)="toggleLangDropdown($event)"
          [title]="'Active Language: ' + getLanguageLabel(speechVoice.selectedLanguage()) + ' (Click to change)'"
        >
          <span class="btn-icon">{{ getLanguageFlag(speechVoice.selectedLanguage()) }}</span>
          <span class="btn-text font-monospace">{{ getLanguageShort(speechVoice.selectedLanguage()) }}</span>
          <span class="dropdown-arrow">▾</span>
        </button>
        @if (isLangDropdownOpen()) {
          <div class="lang-dropdown-menu" (click)="$event.stopPropagation()">
            <div class="lang-dropdown-header">SELECT LANGUAGE / భాష / भाषा</div>
            <button
              type="button"
              class="lang-item-btn"
              [class.selected]="speechVoice.selectedLanguage() === 'auto'"
              (click)="selectLanguage('auto', $event)"
            >
              <span class="lang-flag">🌐</span>
              <div class="lang-meta">
                <span class="lang-name">Auto Detect</span>
                <span class="lang-desc">Multi-lingual recognition</span>
              </div>
              @if (speechVoice.selectedLanguage() === 'auto') {
                <span class="lang-check">✓</span>
              }
            </button>
            <button
              type="button"
              class="lang-item-btn"
              [class.selected]="speechVoice.selectedLanguage() === 'en'"
              (click)="selectLanguage('en', $event)"
            >
              <span class="lang-flag">🇬🇧</span>
              <div class="lang-meta">
                <span class="lang-name">English</span>
                <span class="lang-desc">UK / US Natural Voice</span>
              </div>
              @if (speechVoice.selectedLanguage() === 'en') {
                <span class="lang-check">✓</span>
              }
            </button>
            <button
              type="button"
              class="lang-item-btn"
              [class.selected]="speechVoice.selectedLanguage() === 'te'"
              (click)="selectLanguage('te', $event)"
            >
              <span class="lang-flag">🇮🇳</span>
              <div class="lang-meta">
                <span class="lang-name">తెలుగు (Telugu)</span>
                <span class="lang-desc">మోహన్ / శ్రుతి సహజ వాయిస్</span>
              </div>
              @if (speechVoice.selectedLanguage() === 'te') {
                <span class="lang-check">✓</span>
              }
            </button>
            <button
              type="button"
              class="lang-item-btn"
              [class.selected]="speechVoice.selectedLanguage() === 'hi'"
              (click)="selectLanguage('hi', $event)"
            >
              <span class="lang-flag">🇮🇳</span>
              <div class="lang-meta">
                <span class="lang-name">हिंदी (Hindi)</span>
                <span class="lang-desc">मधुर / स्वरा नेचुरल वॉइस</span>
              </div>
              @if (speechVoice.selectedLanguage() === 'hi') {
                <span class="lang-check">✓</span>
              }
            </button>
            <button
              type="button"
              class="lang-item-btn"
              [class.selected]="speechVoice.selectedLanguage() === 'ta'"
              (click)="selectLanguage('ta', $event)"
            >
              <span class="lang-flag">🇮🇳</span>
              <div class="lang-meta">
                <span class="lang-name">தமிழ் (Tamil)</span>
                <span class="lang-desc">வள்ளுவர் / பல்லவி வாய்ஸ்</span>
              </div>
              @if (speechVoice.selectedLanguage() === 'ta') {
                <span class="lang-check">✓</span>
              }
            </button>
          </div>
        }
      </div>

'''

assert target in text, 'Target not found in topbar html'
text = text.replace(target, lang_html + target, 1)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated contextual-topbar.component.html!')

