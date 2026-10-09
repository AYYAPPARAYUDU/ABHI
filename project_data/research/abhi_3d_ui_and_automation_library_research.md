# ABHI 3D UI & Automation Library Research
**Phase 9 Stage 3 Specification & Library Evaluation**

## 1. Official Reference Analysis

### A. Three.js & Post-Processing (Official Manual: `https://threejs.org/manual/`)
- **Compatibility:** Three.js `0.182.0` is already integrated directly with Angular 22.
- **Render Loop Architecture:** To maintain 60 FPS performance without triggering Angular change detection storms, all Three.js render loops must execute inside `NgZone.runOutsideAngular()`.
- **Post-Processing & Shaders:** Restrained bloom (`UnrealBloomPass` / custom glow shaders) and depth layering provide the cinematic aesthetic shown in Reference Screenshots 1–4 without excessive GPU overhead.
- **Resource Governance:** Explicit disposal (`geometry.dispose()`, `material.dispose()`, `renderer.dispose()`) on Angular `ngOnDestroy` prevents WebGL context leaks during route transitions.

### B. Angular Performance & Standalone Routing (`https://angular.dev/`)
- **Signal-Based Reactivity:** Leverage Angular Signals (`signal`, `computed`, `effect`) for fine-grained DOM updates.
- **Lazy Chunking:** Workspace modules (`/network`, `/intelligence`, `/business`, `/media`) load lazily on demand, keeping initial bundle transfer under 255 kB gzip.

### C. Native Windows Automation & UIA (`https://pywinauto.readthedocs.io/`)
- **Win32 & UI Automation (UIA):** Windows UIA provides semantic accessibility tree discovery for modern WinUI 3, XAML, and Win32 applications (Notepad, Calculator, File Explorer).
- **Foreground Verification:** `ctypes.windll.user32.GetForegroundWindow()` and `GetWindowTextW()` guarantee fail-closed execution, ensuring input is only dispatched when the intended target window is in focus.

### D. Playwright Browser Automation (`https://playwright.dev/docs/intro`)
- **Sandboxed Execution:** Headless and headed Chromium browser contexts with strict origin whitelisting, download folder sandboxing, and postcondition DOM verification.

---

## 2. Dependency Audit & Policy
- **No Competing 3D Libraries:** Avoid adding React-Three-Fiber (which would require a React bridge) or Babylon.js. Three.js is sufficient and natively integrated.
- **No Unvetted UI Frameworks:** Avoid heavy component libraries that bloat bundle size; utilize modular CSS design tokens and Angular Standalone components.
