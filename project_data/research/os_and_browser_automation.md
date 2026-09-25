# Research Record: Computer, Windows OS & Browser Automation

## 1. Multi-Layered Windows OS Automation Architecture

No single automation library is sufficient for every Windows desktop scenario. Modern Windows applications vary widely (Win32 legacy, WPF, WinUI 3, Electron, Chromium, Qt, Java Swing, DirectX games). Therefore, a 4-tiered automation strategy is required:

```
                      [Automation Request]
                               │
       ┌───────────────────────┼───────────────────────┐
       ▼                       ▼                       ▼
[Tier 1: Semantic UIA]   [Tier 2: Direct OS API]  [Tier 3: Browser Engine]
(Windows UI Automation)   (Win32 / PowerShell)    (Playwright / CDP)
  • pywinauto / uiautomation • Shell / Subprocess   • DOM / Accessibility Tree
  • Precise control IDs      • Direct Win32 API     • Fast non-intrusive ops
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               │ (If element is non-standard / canvas)
                               ▼
                 [Tier 4: Visual Grounded Fallback]
                 (RapidOCR + VLM Coordinate Clicking)
```

---

## 2. Windows Automation Tools & Libraries

### 2.1 Windows UI Automation (UIA): `pywinauto` & `uiautomation`
* **Official Repository:** https://github.com/pywinauto/pywinauto & https://github.com/yannric/uiautomation
* **License:** BSD 3-Clause / Apache 2.0.
* **Why Selected:** Interacts with Windows native accessibility tree. Retrieves element names, control types (Button, EditBox, TreeItem), handles, and programmatic click/focus invocation without needing mouse cursor hijacking.

### 2.2 Direct OS & Process Automation: Win32 API (`pywin32`) & PowerShell
* **Official Repository:** https://github.com/mhammond/pywin32
* **License:** PSF (Python Software Foundation).
* **Capabilities:** Window handles (`HWND`), process enumeration, window activation (`SetForegroundWindow`), window geometry (`MoveWindow`), system metrics, and secure credential handling via Windows Data Protection API (DPAPI).

### 2.3 Physical Input Fallback: `pyautogui` / `pynput`
* **Official Repository:** https://github.com/asweigart/pyautogui & https://github.com/moses-palmer/pynput
* **Capabilities:** Smooth Bezier-curve mouse movements, precise pixel clicks, key chords, and hotkey listeners.
* **Safety Mechanism:** Built-in fail-safe (moving cursor to corner throws exception; global hotkey listener halts thread).

---

## 3. Browser Automation: Microsoft Playwright & CDP

### 3.1 Microsoft Playwright for Python
* **Official Documentation:** https://playwright.dev/python/
* **Official Repository:** https://github.com/microsoft/playwright-python
* **License:** Apache 2.0.
* **Maintainer:** Microsoft.
* **Why Selected:**
  - Standard in modern web automation.
  - Native support for Chrome, Edge, Firefox, and Chromium.
  - Full Accessibility Tree snapshotting (`aria-snapshot`), auto-waiting, dynamic DOM element locators.
  - Direct CDP (Chrome DevTools Protocol) integration: allows attaching to the user's active existing Chrome/Edge browser sessions via remote debugging port without disrupting logins.
  - Comprehensive network interception, cookie/session management, file downloads/uploads, and screenshot verification.
