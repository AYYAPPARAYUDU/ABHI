with open('frontend/src/app/features/home/pages/home-page/home-page.component.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. AppLanguage import
text = text.replace(
    "import { SpeechVoiceService } from '../../../../core/services/speech-voice.service';",
    "import { SpeechVoiceService, AppLanguage } from '../../../../core/services/speech-voice.service';"
)

# 2. inputPlaceholder and dock language signals
target = '''  readonly inputPlaceholder =
    "Ask ABHI or command your PC (e.g. 'open notepad', 'calc 125 * 48')...";

  readonly showWorkspaceMenu = signal(false);
  readonly showActionsMenu = signal(false);'''

replacement = '''  readonly inputPlaceholder = computed(() => {
    const lang = this.speechVoice.selectedLanguage();
    if (lang === 'te') {
      return "ABHI ని అడగండి లేదా PC ని ఆదేశించండి (ఉదా: 'నోట్‌ప్యాడ్ తెరువు', 'కాలిక్యులేటర్')...";
    }
    if (lang === 'hi') {
      return "ABHI से पूछें या अपने PC को कमांड दें (उदा: 'notepad खोलो', 'calculator')...";
    }
    if (lang === 'ta') {
      return "ABHI யிடம் கேளுங்கள் அல்லது உங்கள் PC ஐ இயக்கவும் (எ.கா: 'notepad திற')...";
    }
    return "Ask ABHI or command your PC (e.g. 'open notepad', 'calc 125 * 48')...";
  });

  readonly showWorkspaceMenu = signal(false);
  readonly showActionsMenu = signal(false);
  readonly showDockLangMenu = signal(false);

  toggleDockLangMenu(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.showDockLangMenu.update(v => !v);
    if (this.showDockLangMenu()) {
      this.showActionsMenu.set(false);
      this.showWorkspaceMenu.set(false);
    }
  }

  selectDockLanguage(lang: AppLanguage, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.speechVoice.setLanguage(lang);
    this.showDockLangMenu.set(false);
  }'''

assert target in text, 'Target not found in home-page.component.ts'
text = text.replace(target, replacement, 1)

with open('frontend/src/app/features/home/pages/home-page/home-page.component.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated home-page.component.ts!')

