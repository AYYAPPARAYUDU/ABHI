# ABHI Voice-First 3D AI Operating System Architecture
**Phase 9 Stage 3 Specification & Technical Documentation**

## 1. Architectural Overview
The ABHI Voice-First 3D AI Operating System transforms the application shell into a unified spatial command environment. Rather than presenting disparate administrative forms, the user interacts primarily via natural voice or focused text commands within a continuous Three.js spatial universe spanning four dedicated workspaces:

1. **Main Agent (`/home` or `/`):** The central orchestrator, revenue observatory, and voice-first interaction portal.
2. **Multi-Agent Network (`/network`):** 3D interactive topology visualizing registered specialist agents, dependencies, and real-time execution states.
3. **Intelligence & Training Lab (`/intelligence`):** Model observatory, daily benchmark scorecards, candidate evolution pipelines, and honest training capability status.
4. **Autonomous Business Sectors (`/business`):** 6 spatial business domains, persisted projects, autonomy level controls (Level 0–5), stop conditions, and strict financial provenance tracking.

---

## 2. Spatial Engine Architecture
The 3D environment is managed by `ThreeSceneManagerService`, which provides:
- **Outside Angular Zone Execution:** Rendering loop executed outside Angular change detection (`NgZone.runOutsideAngular`) to guarantee smooth 60 FPS interactions without triggering CD cycles.
- **Dynamic Mode Transitions:** Context-sensitive scene alterations between `MAIN_AGENT`, `NETWORK`, `INTELLIGENCE`, and `BUSINESS` without reloading the canvas or re-instantiating WebGL contexts.
- **Particle Dynamics & Core Lighting:** A central glowing intelligence sphere surrounded by orbiting rings, connected nodes, and floating spatial sector glyphs.
- **WebGL Fallback & Graceful Degradation:** Automatic 2D CSS glassmorphic fallback when WebGL is unavailable or unaccelerated.
- **Resource Cleanup:** Rigorous disposal of geometries, materials, shaders, and frame request handles upon component destruction.

---

## 3. Voice-First Pipeline
Voice is the primary human-machine interaction path:
```text
Microphone Audio Input
        ↓
Voice Activity Detection (Silero VAD)
        ↓
Local Speech-To-Text (Whisper / Local STT)
        ↓
Multilingual Canonicalizer (English, Telugu, Hindi, Tamil)
        ↓
Authoritative Agent Gateway (/api/v1/agent/command)
        ↓
Authoritative Supervisor Planning & Goal Resolution
        ↓
Workflow Execution & Verification
        ↓
Persistent Results & Audio Feedback (TTS)
```
- **Provenance of Speech:** Explicitly distinguishes `ACTUAL_VOICE`, `SIMULATED_VOICE`, and `CAPABILITY_UNAVAILABLE`.
- **Zero Frontend Authority:** The frontend never parses or executes shell/Python commands locally; all intents route to the authoritative backend Supervisor.
