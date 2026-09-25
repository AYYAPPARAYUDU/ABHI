# Research Record: Frontend Architecture & Three.js 3D Visual Experience

## 1. Frontend Technology Stack & Structure

* **Framework:** Angular (Modern Standalone Components, Signal-based reactivity, TypeScript strict mode).
* **Styling:** Bespoke Modern Dark-Themed CSS Design System supplemented by Bootstrap grid / utility classes.
* **3D Visual Engine:** Three.js (WebGL / WebGPU renderer).

---

## 2. Three.js Interactive Cognitive Core Design

Rather than being a static decorative background, the Three.js 3D scene acts as the **Living Visual Representation of the AI System State**:

```
                                [System Telemetry Streams]
                                             │
      ┌────────────────────────┬─────────────┴─────────────┬────────────────────────┐
      ▼                        ▼                           ▼                        ▼
[Face Tracker Feed]   [Voice Audio FFT Stream]     [Supervisor State]       [Screen Cursor Target]
(Yaw, Pitch, Roll)     (Frequency Spectrum)         (IDLE/PLAN/EXEC/VERIFY)   (Normalized (x, y))
      │                        │                           │                        │
      └────────────────────────┼───────────────────────────┴────────────────────────┘
                               ▼
            [Three.js Scene Graph & Shaders]
              • 3D Interactive AI Orb / Morphing Neural Core
              • Real-time Face Tracking (Core rotates towards user's face)
              • Audio Reactive Particle Field (Pulses to voice frequencies)
              • State Morphing (Color / Geometry shifts per agent stage)
```

### Visual State Modes

| Agent State | 3D Visual Dynamics & Shaders | Color Palette |
| :--- | :--- | :--- |
| **Idle / Standby** | Gentle organic breathing wave, slow particle drift | Deep Indigo / Cyan glow (`#00f0ff`) |
| **Listening (VAD Active)** | Reactive audio wave expansion, particle frequency ripple | Neon Emerald / Turquoise (`#00ffa3`) |
| **Thinking / Planning** | Fast concentric neural rings rotation, inner core pulse | Electric Violet / Purple (`#a855f7`) |
| **Executing OS / Browser Action** | Focused orbital stream, directional light beam | Amber / Gold glow (`#f59e0b`) |
| **Verifying State** | Geometric grid scan shader across core surface | Cobalt Blue (`#3b82f6`) |
| **User Confirmation Required / Alert** | Pulsing warning halo, expanded boundary | Coral Red / Crimson (`#ef4444`) |

---

## 3. Performance Optimization & Power Budgeting

To ensure the 3D visual engine never compromises system automation performance:
1. **Adaptive Rendering Loop:**
   - Active interaction / Voice speaking: Full 60 FPS.
   - Passive listening: Throttled to 30 FPS.
   - Background / Window minimized / Tab hidden: Pauses WebGL render loop (`0 FPS`, near-zero CPU/GPU utilization).
2. **Buffer Geometry & Instanced Meshes:**
   - Particle systems use `InstancedMesh` with custom GLSL vertex/fragment shaders for single-draw-call rendering.
3. **Automatic WebGL Context Recovery:**
   - Handles `webglcontextlost` and `webglcontextrestored` events seamlessly without requiring page reload.
