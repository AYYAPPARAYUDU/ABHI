# Frontend Architecture & Three.js 3D Cognitive Core

## 1. Modern Angular Architecture

* **Framework:** Angular 22 (Standalone Components, Signals for fine-grained reactivity, strictly typed TypeScript).
* **Styling:** Bespoke high-contrast dark theme supplemented with Bootstrap grid and utility classes.
* **Component Topology:**
  ```
  src/app/
  ├── core/                     # Singleton services (WebSocket telemetry, Audio, Config)
  │   ├── services/
  │   │   ├── websocket.service.ts
  │   │   ├── audio-capture.service.ts
  │   │   └── telemetry.service.ts
  │   └── models/               # TypeScript interfaces matching backend JSON schemas
  ├── features/
  │   ├── avatar-viewport/      # Three.js 3D Interactive AI Core Canvas
  │   │   ├── avatar-viewport.component.ts
  │   │   └── three-scene-manager.ts
  │   ├── agent-dag-viewer/     # Real-time multi-step task execution tracker
  │   ├── voice-hud/            # Live waveform visualizer & VAD indicator
  │   └── consent-dialog/       # Tier 3 Safety permission prompt modal
  ├── features/interaction/     # Phase 6 Stage 6.3 Multimodal Command Interface
  │   ├── components/
  │   │   ├── command-input/    # Multilingual text input with script chips
  │   │   ├── voice-input/      # Local STT HUD & waveform visualizer
  │   │   ├── gesture-status/   # Spatial gestures & face/head attention HUD
  │   │   ├── command-preview/  # Structured intent validation & confirmation card
  │   │   └── interaction-status/# Live multimodal priority & telemetry log
  │   ├── models/               # MultimodalInput, CommandPreview, InteractionState
  │   ├── services/             # InteractionService (session lifecycle, gesture debouncing)
  │   └── pages/                # InteractionPageComponent (/interaction)
  ├── features/perception/      # Phase 6 Stage 6.4 Perception Experience & HUD
  │   ├── components/
  │   │   ├── voice-state/      # Live VAD / microphone state metrics
  │   │   ├── transcription-view/# Multilingual recognized transcript stream
  │   │   ├── face-state/       # 3D Head pose Euler angles & gaze attention HUD
  │   │   ├── gesture-state/    # Spatial hand gesture stabilization HUD
  │   │   ├── screen-vision-state/# Screen OCR & visual grounding telemetry
  │   │   └── perception-health/# Health matrix for all perception engines
  │   ├── models/               # PerceptionState, VoiceStateInfo, HeadPoseData
  │   ├── services/             # PerceptionService (centralized sensor telemetry)
  │   └── pages/                # PerceptionPageComponent (/perception)
  ├── features/avatar/          # Three.js 3D Avatar presentation & viewport
  │   ├── components/
  │   │   └── avatar-viewport/  # Procedural Holographic Particle Core
  │   └── pages/
  │       └── avatar-page/      # Dedicated Avatar Viewport & telemetry feedback
  └── shared/                   # Reusable UI controls, icons, badges
  ```

---

## 2. Three.js 3D Interactive Cognitive Core Integration

The Three.js viewport provides a living visual manifestation of the AI system's cognitive state:

```
[Angular Telemetry Service / Interaction State]
            │ (RxJS / Signal Stream: audio frequency spectrum, face yaw/pitch, state enum)
            ▼
[ThreeSceneManager (Encapsulated Engine)]
  • WebGLRenderer / WebGPURenderer (Antialias, Alpha, Tone Mapping)
  • Procedural Cybernetic Core (Morphing Icosahedron Geometry + Custom Shaders)
  • Dynamic Particle Field (InstancedMesh with Vertex Shader Audio Pulse)
  • State Machine Shaders:
      - IDLE: Smooth cyan breathing oscillation (`#00f0ff`)
      - LISTENING: High-frequency green audio ripple (`#00ffa3`)
      - PLANNING / UNDERSTANDING: Concentric violet neural orbital rings (`#a855f7`)
      - EXECUTING: Directional amber pulse beam (`#f59e0b`)
      - ALERT / CONSENT: Crimson safety consent halo (`#ef4444`)
      - EMERGENCY_STOP: Pulsing crimson red lockdown (`#dc2626`)
```

---

## 3. Multimodal Event Priority & Lifecycle Management

Signals arriving from disparate modalities are evaluated under a deterministic priority order:

```
EMERGENCY_STOP  (Highest Priority: UI Button / OPEN_PALM 3-frame stabilized)
     ↑
CONSENT         (Safety Gate: THUMBS_UP 3-frame stabilized / UI Click)
     ↑
COMMAND         (Normalized Intent: Voice Local STT / Text Keyboard Submission)
     ↑
PRESENTATION    (Telemetry Display: Face Attention / Gaze / Head Pose)
```

---

## 4. Strict Frontend Performance & Resource Boundaries

1. **Decoupled 3D Lifecycle:** Three.js runs inside an encapsulated class outside Angular's change detection zone (`NgZone.runOutsideAngular`) to prevent unnecessary UI re-renders.
2. **Adaptive Frame Rate Throttling:**
   * Active interaction: 60 FPS.
   * Background / Window minimized: Render loop stops completely (`0 FPS`, `requestAnimationFrame` paused).
3. **Zero AI Inference in Browser:** All vision, speech, LLM, and automation processing occurs in the Python backend. The frontend is exclusively responsible for rendering and user input.
4. **Bounded Subscriptions & Bounded Telemetry:** WebSocket streams and interaction logs enforce circular bounded ring buffers (maximum 50 events) preventing memory leaks during long-running sessions.
