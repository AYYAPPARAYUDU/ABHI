# State Verification & Grounding Architecture

## 1. Dual-State Disambiguation: Model Claim vs. Ground Truth

In autonomous computer automation, an LLM claiming an action was successful is merely a hypothesis. The **Verification Architecture** enforces that every action is physically validated before the Supervisor transitions the DAG state to `COMPLETED`:

```
                       [Agent Action Executed]
                                  │
                                  ▼
                     [State Verification Dispatcher]
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
[OS / Window Inspector]   [Browser DOM Inspector]   [File System Inspector]
 • Query active HWND       • Query Playwright DOM    • Check file existence
 • Check window title      • Verify element visible  • Validate size / sha256
 • Inspect UIA tree node   • Check page URL/status   • Parse file syntax
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  ▼
                     [Physical State Validator]
                                  │
                   ┌──────────────┴──────────────┐
                   ▼                             ▼
         [State Matches Plan]          [State Mismatch / Error]
                   │                             │
                   ▼                             ▼
        [Step Marked COMPLETED]       [Trigger Self-Correction]
        [Supervisor Proceeds]         • Retry with alternate selector
                                      • Fallback to visual OCR click
                                      • Max 3 attempts -> Alert User
```

---

## 2. Verification Strategies by Domain

| Domain | Verification Technique | Expected Outcome Check | Fallback if Verification Fails |
| :--- | :--- | :--- | :--- |
| **App Launching** | Query Win32 process list & active `HWND` window handle. | Target process is running and main window handle is foregrounded. | Wait 2s; retry launch with explicit executable path; alert user if blocked. |
| **UI Element Click** | Query Windows UIA accessibility tree or RapidOCR screen crop. | Target button/checkbox state changes (e.g. `ToggleState=On`, dialog closes). | Re-ground element with visual bounding box coordinates. |
| **Browser Navigation** | Query Playwright page load state & URL match. | `page.wait_for_load_state('networkidle')` returns 200 OK and target URL. | Inspect error code; reload with cache clear; retry once. |
| **File Operations** | Read filesystem path, calculate sha256 hash, parse syntax. | File exists on disk, size > 0, AST syntax is valid. | Roll back to `.bak` pre-edit snapshot; report file error. |
| **Media Generation** | Inspect output file header, image dimensions, and format validity via Pillow/FFmpeg. | Valid PNG/MP4 header, matching resolution, valid duration. | Re-run generation with adjusted seed or alert VRAM shortage. |
