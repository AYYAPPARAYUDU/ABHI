# Open Decisions & Questions Requiring User Feedback

## 1. Open Architectural Decisions

1. **Frontend Packaging Model:**
   * *Option A (Recommended):* Standalone Angular Web Application communicating over local `localhost:8000` WebSocket/REST with the Python AI background daemon. (Cleanest separation, fast development).
   * *Option B:* Electron or Tauri desktop wrapper packaging Angular and Python backend into a single `.exe` bundle.

2. **Visual AI Core Theme & 3D Model Preference:**
   * *Option A (Recommended):* Procedural Cybernetic Neural Core / Morphing Energy Orb with reactive particle fields and custom GLSL shaders (lightweight, zero asset loading latency, 100% reactive to audio and face tracking).
   * *Option B:* 3D Humanoid / Robotic Avatar (GLTF model with skeletal blendshapes and facial rigging).

3. **Primary Text-to-Speech Engine Preference:**
   * *Option A (Recommended):* **Kokoro-82M / Piper ONNX** (Ultra-low latency, highly natural conversational voices, zero cloud requirement).
   * *Option B:* Windows Native SAPI 5 / WinRT voices (Instant zero-RAM baseline, but mechanical tone).

---

## 2. Technical Inquiries for Future Phases

* What specific custom Windows applications (e.g. specialized CAD, proprietary internal office software) should be prioritized for deep accessibility mapping beyond standard browsers, Office apps, and development environments?
* Should the system maintain persistent multi-monitor window coordination or focus primarily on the primary active display?
