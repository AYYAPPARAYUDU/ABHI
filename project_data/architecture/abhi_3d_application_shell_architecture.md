# ABHI 3D Spatial Application Shell Architecture

## Executive Summary
This document defines the architectural specification of the redesigned **ABHI 3D Agentic Desktop Application Shell** (Phase 9 Stage 1). The interface transitions ABHI from a conventional web dashboard into a futuristic local-first personal AI computer operating system, drawing interaction and spatial principles from modern 3D interfaces (such as Scrolltide) while preserving strict local-first autonomy, reliability, and security.

---

## 1. Shell Composition & Hierarchy

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│  3D SPATIAL CANVAS LAYER (Three.js WebGL / Outside Zone / 2D Fallback)          │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌──────────────┐   ┌───────────────────────────────────────────────────────┐  │
│  │ FLOATING     │   │ CONTEXTUAL UTILITY TOPBAR                             │  │
│  │ DOCK         │   │ [Page Context]  [What should ABHI do? ⌘K]  [Mode|Stat]│  │
│  │              │   └───────────────────────────────────────────────────────┘  │
│  │ ⌂ Home       │                                                              │
│  │ ✦ Ask/Agent  │   ┌───────────────────────────────────────────────────────┐  │
│  │ ◈ Tasks      │   │ IMMERSIVE WORKSPACE CONTAINER                         │  │
│  │ ▦ Apps       │   │                                                       │  │
│  │ ◉ Media      │   │ <router-outlet>                                       │  │
│  │ ⊞ Library    │   │                                                       │  │
│  │ ◌ Memory     │   │ [Spatial Cards / Workspaces / Outcome Projections]    │  │
│  │ ◇ Perception │   │                                                       │  │
│  │ ☺ Avatar     │   │                                                       │  │
│  │ ◎ System     │   └───────────────────────────────────────────────────────┘  │
│  │ ⚙ Dev UI     │                                                              │
│  │ ──────────── │                                                              │
│  │ [Mode Pill]  │                                                              │
│  │ [◀ Collapse] │                                                              │
│  └──────────────┘                                                              │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Three.js Spatial Core (`ThreeSceneManagerService`)

### 2.1 Zone Isolation & Lifecycle Discipline
- Rendering executes strictly outside Angular's change detection zone using `ngZone.runOutsideAngular` to guarantee 60 FPS performance without triggering Angular re-renders.
- Uses WebGL availability checks (`canvas.getContext('webgl')`) with graceful fallback to CSS/HTML radial gradients.
- Implements `prefers-reduced-motion` detection, bounding particle movement and animations when active.
- Integrates with the Page Visibility API (`document.visibilitychange`) to pause `requestAnimationFrame` loops when the tab/window is hidden.

### 2.2 Spatial Environment Modes
The background adapts to active application context:
1. `DEFAULT`: Calm orbital cyan particle field with glowing wireframe icosahedron and torus ring.
2. `FOCUS`: Subtle deep particle density for focused interactions.
3. `ACTIVE_TASK`: Emerald green energetic pulse indicating background task execution.
4. `MEDIA`: Rich purple nebula illumination for creative workflows.
5. `SYSTEM`: Amber geometric lattice displaying resource monitoring.

---

## 3. Spatial Component System

### 3.1 `SpatialCardComponent`
- Glassmorphic elevated cards (`backdrop-filter: blur(16px)`, `rgba(15, 23, 42, 0.7)`).
- Subtle 3D pointer tilt calculation with smooth spring-like CSS transforms.
- Top aura illumination line and status-accented borders (`SUCCESS`, `WORKING`, `WARNING`, `ERROR`).
- Built-in loading states and responsive padding modes (`compact`, `normal`, `spacious`).

### 3.2 `CommandPaletteComponent`
- Centralized `Ctrl+K` / `⌘K` search palette accessible globally.
- Categorized action list (`ACTIONS`, `NAVIGATION`, `APPS`, `MEDIA`, `SYSTEM`).
- Complete keyboard navigation (Arrow Up/Down, Enter to execute, Escape to dismiss).

---

## 4. Performance & Memory Governance
- All Three.js geometries, materials, and textures are explicitly traversed and disposed in `ngOnDestroy`.
- WebGL contexts are forced to lose upon component destruction to prevent GPU VRAM leaks.
- Zero polling loops; real-time updates are driven by unified WebSocket telemetry and Angular Signals.
