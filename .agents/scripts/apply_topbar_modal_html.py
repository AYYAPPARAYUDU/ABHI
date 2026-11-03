from pathlib import Path

target_file = Path("frontend/src/app/layout/components/contextual-topbar/contextual-topbar.component.html")
content = target_file.read_text(encoding="utf-8")

old_code = '''      <!-- Optical Face ID Biometric Trigger & Badge -->
      <button
        type="button"
        class="biometric-hud-btn"
        (click)="stateService.verifyBiometrics()"'''

new_code = '''      <!-- Optical Face ID Biometric Trigger & Badge -->
      <button
        type="button"
        class="biometric-hud-btn"
        (click)="showScannerModal.set(true)"'''

old_norm = old_code.replace("\r\n", "\n")
content_norm = content.replace("\r\n", "\n")

if old_norm in content_norm:
    content_norm = content_norm.replace(old_norm, new_code.replace("\r\n", "\n"), 1)
    
    # Also add the modal markup before </header>
    modal_markup = '''
  <!-- Interactive 3D Biometric Face Scanner Modal Overlay -->
  @if (showScannerModal()) {
    <div class="biometric-modal-backdrop" (click)="showScannerModal.set(false)">
      <div class="biometric-modal-card" (click)="$event.stopPropagation()">
        <app-biometric-face-scanner
          [isModal]="true"
          (closeRequested)="showScannerModal.set(false)"
        ></app-biometric-face-scanner>
      </div>
    </div>
  }
</header>'''
    content_norm = content_norm.replace("</header>", modal_markup, 1)
    target_file.write_text(content_norm, encoding="utf-8")
    print("SUCCESS: contextual-topbar.component.html updated with modal trigger!")
else:
    print("ERROR: old_code not found in contextual-topbar.component.html!")
