from pathlib import Path

target_file = Path("frontend/src/app/features/home/pages/home-page/home-page.component.ts")
content = target_file.read_text(encoding="utf-8")

old_code = '''  ngOnInit(): void {
    this.threeScene.setMode('MAIN_AGENT');

    this.speechVoice.greetUserOnLaunch();

    this.thoughtIntervalId = setInterval(() => {'''

new_code = '''  ngOnInit(): void {
    this.threeScene.setMode('MAIN_AGENT');

    this.speechVoice.greetUserOnLaunch();

    // Automatic Optical Face ID Authentication on Launch
    setTimeout(() => {
      this.stateService.verifyBiometrics();
    }, 1500);

    this.thoughtIntervalId = setInterval(() => {'''

old_norm = old_code.replace("\r\n", "\n")
content_norm = content.replace("\r\n", "\n")

if old_norm in content_norm:
    content_norm = content_norm.replace(old_norm, new_code.replace("\r\n", "\n"), 1)
    target_file.write_text(content_norm, encoding="utf-8")
    print("SUCCESS: home-page.component.ts updated with auto-biometrics on launch!")
else:
    print("ERROR: old_code not found in home-page.component.ts!")

