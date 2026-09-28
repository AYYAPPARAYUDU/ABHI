# Frontend Architecture Governance & Directory Contract

## 1. Governance Overview

This document defines the mandatory architectural contracts, folder hierarchies, ownership rules, and dependency boundaries for the Angular 22 frontend of the Local-First Personal AI Computer Automation System (`ABHI`).

---

## 2. Directory Structure Contract

```text
frontend/
├── angular.json
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── public/
└── src/
    ├── index.html
    ├── main.ts
    ├── styles.css
    └── app/
        ├── app.ts
        ├── app.html
        ├── app.css
        ├── app.config.ts
        ├── app.routes.ts
        │
        ├── core/
        │   ├── api/
        │   ├── services/
        │   ├── websocket/
        │   ├── guards/
        │   ├── interceptors/
        │   ├── models/
        │   ├── constants/
        │   └── utils/
        │
        ├── shared/
        │   ├── components/
        │   ├── directives/
        │   ├── pipes/
        │   ├── models/
        │   └── utils/
        │
        ├── features/
        │   ├── operator-console/
        │   │   ├── components/
        │   │   │   ├── status-bar/
        │   │   │   ├── safety-panel/
        │   │   │   ├── visual-grounding-panel/
        │   │   │   ├── execution-timeline/
        │   │   │   ├── telemetry-panel/
        │   │   │   └── consent-modal/
        │   │   ├── pages/
        │   │   ├── models/
        │   │   └── services/
        │   │
        │   ├── avatar/
        │   │   ├── components/
        │   │   │   └── avatar-viewport/
        │   │   ├── models/
        │   │   └── services/
        │   │
        │   ├── tasks/
        │   │   ├── components/
        │   │   │   └── task-panel/
        │   │   ├── models/
        │   │   └── services/
        │   │
        │   ├── perception/
        │   │   ├── components/
        │   │   ├── models/
        │   │   └── services/
        │   │
        │   └── system/
        │       ├── components/
        │       ├── models/
        │       └── services/
        │
        └── layout/
            ├── components/
            └── models/
```

---

## 3. Ownership & Responsibility Rules

### `src/app/` (Application Shell)
- Responsible exclusively for application bootstrap, root composition, global state initialization, and root routing.
- Must **NOT** contain domain-specific logic, feature workflows, or heavy inline styling.

### `src/app/core/` (Application-Wide Infrastructure)
- Houses singleton infrastructure: REST API clients (`core/api/`), authoritative state stores (`core/services/`), WebSocket transports (`core/websocket/`), HTTP interceptors, route guards, and contract models.
- **Rule:** Core contains infrastructure only; no UI presentation components or domain-specific views may live in `core`.

### `src/app/shared/` (Reusable UI & Utilities)
- Contains genuinely reusable UI components (e.g. custom buttons, status chips, modal wrappers), pipes, directives, and utility functions.
- **Rule:** A component belongs in `shared` only when multiple independent features reuse it. Feature-specific code must not reside in `shared`.

### `src/app/features/` (Domain Features)
All business and domain functionality is organized into feature folders:
1. **`operator-console`**: Operator status bar, safety and lease governance panel, visual grounding & dual-state verification panel, live execution timeline, telemetry streaming panel, and consent authorization modal.
2. **`avatar`**: Three.js WebGL procedural cognitive core rendering, decoupled from Angular change detection. Presentation-only.
3. **`tasks`**: Task submission, goal specification, execution state tracking, cancel/retry triggers.
4. **`perception`**: Vision, speech, VAD, gesture, and audio telemetry presentation.
5. **`system`**: System health, worker diagnostics, connectivity indicators.

### `src/app/layout/` (Structural Layout)
- Contains global layout wrappers, headers, sidebars, and footers.

---

## 4. Component Conventions

1. **One Component = One Directory**:
   Each component directory must contain:
   ```text
   component-name/
   ├── component-name.component.ts
   ├── component-name.component.html
   ├── component-name.component.css
   └── component-name.component.spec.ts
   ```
2. **File Naming**: Kebab-case naming convention (`status-bar.component.ts`, `task-panel.component.html`).
3. **Colocated Tests**: Every component and service must have a colocated `.spec.ts` test verifying its lifecycle and behavior.
4. **Standalone Components**: All components are Angular standalone components using signal-based reactivity.

---

## 5. Import & Dependency Boundaries

```text
app
 ↓
features
 ↓
shared / core
```

- **Strict Boundary Direction:** Features may import from `core` and `shared`. Features must **never** import internal implementation files of sibling features directly.
- **No Circular Imports:** Unidirectional dependency flow must be maintained.
- **No Execution Authority:** The frontend communicates strictly via approved REST and WebSocket endpoints. Direct OS shell execution, worker process spawning, pywinauto, or Playwright imports are strictly forbidden.

---

## 6. Reactive State & WebSocket Architecture

1. **Single Authoritative Connection:** One authoritative `TelemetryService` manages the WebSocket connection with automatic exponential-backoff reconnection and a bounded buffer.
2. **Unified State Store:** `OperatorStateService` bridges REST API snapshots and live WebSocket events into Angular Signals (`health`, `safety`, `grounding`, `verification`, `timeline`, `currentTask`, `avatarState`).
3. **Direct Signal Consumption:** UI components bind directly to signals from `OperatorStateService` with zero intermediate polling loops.
