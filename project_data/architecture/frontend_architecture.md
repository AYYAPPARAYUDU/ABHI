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
  └── shared/                   # Reusable UI controls, icons, badges
  ```

---

## 2. Three.js 3D Interactive Cognitive Core Integration

The Three.js viewport provides a living visual manifestation of the AI system's cognitive state:

```
[Angular Telemetry Service]
            │ (RxJS / Signal Stream: audio frequency spectrum, face yaw/pitch, state enum)
            ▼
[ThreeSceneManager (Encapsulated Engine)]
  • WebGLRenderer / WebGPURenderer (Antialias, Alpha, Tone Mapping)
  • Procedural Cybernetic Core (Morphing Icosahedron Geometry + Custom Shaders)
  • Dynamic Particle Field (InstancedMesh with Vertex Shader Audio Pulse)
  • State Machine Shaders:
      - IDLE: Smooth cyan breathing oscillation (`#00f0ff`)
      - LISTENING: High-frequency green audio ripple (`#00ffa3`)
      - PLANNING: Concentric violet neural orbital rings (`#a855f7`)
      - EXECUTING: Directional amber pulse beam (`#f59e0b`)
      - ALERT: Crimson safety consent halo (`#ef4444`)
```

---

## 3. Strict Frontend Performance & Resource Boundaries

1. **Decoupled 3D Lifecycle:** Three.js runs inside an encapsulated class outside Angular's change detection zone (`NgZone.runOutsideAngular`) to prevent unnecessary UI re-renders.
2. **Adaptive Frame Rate Throttling:**
   * Active interaction: 60 FPS.
   * Background / Window minimized: Render loop stops completely (`0 FPS`, `requestAnimationFrame` paused).
3. **Zero AI Inference in Browser:** All vision, speech, LLM, and automation processing occurs in the Python backend. The frontend is exclusively responsible for rendering and user input.
