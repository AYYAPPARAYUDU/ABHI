# ADR-0014: 3D Agentic Desktop Application Shell & Experience Projection

## Status
Accepted

## Date
2026-09-30

## Context
ABHI previously utilized a traditional web dashboard shell with large headers, extensive navigation links, and administrative tables. To evolve ABHI into a personal AI computer automation system, the interface required transformation into a spatial, native-feeling desktop experience with compact dock navigation, ambient 3D depth, outcome-first agent communication, and keyboard-driven command center controls.

## Decision
1. **Three.js Outside Angular Zone**: Instantiate WebGL scenes and animation loops strictly via `ngZone.runOutsideAngular` to decouple rendering from Angular change detection.
2. **Floating Dock Navigation**: Replace heavy top headers with a floating, rounded, semi-transparent left application rail dock (collapsible to 68px, expandable to 220px) and bottom dock on mobile viewports.
3. **Three-Tier User Experience Projection**:
   - `USER MODE`: Outcome-first status messages ("Working…", "Completed").
   - `ADVANCED MODE`: Workflow DAGs, resource meters, artifact lineage.
   - `DEVELOPER MODE`: Low-level telemetry logs, worker leases, grounding metrics.
4. **Command Palette (`Ctrl+K`)**: Implement a global modal search palette for immediate keyboard-driven actions and navigation.
5. **2D Fallback & Reduced Motion**: Automatically fallback to 2D CSS gradients when WebGL is unavailable and honor `prefers-reduced-motion`.

## Consequences
- **Positive**: High visual fidelity, 60 FPS performance, outcome-first UX, no UI change detection thrashing, full accessibility preserved.
- **Negative**: Increased initial bundle size by ~169KB for Three.js geometry/engine chunks (mitigated via code splitting and tree shaking).
