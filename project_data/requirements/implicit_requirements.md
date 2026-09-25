# Implicit Requirements & Technical Dependencies

1. **Inter-Process Communication (IPC) Protocol:**
   * The Angular frontend (Node/Browser context) and Python AI Core (native machine context) must communicate in real time with bidirectional streaming. Requires a robust, low-latency WebSocket + REST / SSE architecture with structured JSON message protocols.

2. **Windows Desktop Isolation & Input Contention:**
   * Autonomous mouse and keyboard automation directly controls the physical Windows cursor and focus. While the agent moves the mouse, user input may collide. The system implicitly requires:
     - Input event arbitration (pausing automation if human mouse movement is detected).
     - Non-intrusive headless or secondary virtual desktop / background API automation where feasible.

3. **Audio Subsystem Management:**
   * Multi-channel microphone capture, acoustic echo cancellation (preventing AI's own TTS output from triggering STT speech detection), and low-latency audio playback buffer management on Windows WASAPI.

4. **Webcam Device Handshake & Video Frame Buffer:**
   * Efficient zero-copy or shared-memory video frame pipeline (e.g. OpenCV / DirectShow) to feed both Angular/Three.js visual feedback and MediaPipe / VLM vision engines without duplicating memory.

5. **Windows Accessibility API (UIA) Hierarchy Complexity:**
   * Windows UI Automation trees can be sluggish when deeply nested (e.g., in Chromium or Electron apps). The system implicitly requires caching element trees, bounding box coordinate translation, and fallback to fast visual OCR/VLM grounding when UIA nodes are obscured.

6. **Python Virtual Environment & Dependency Isolation:**
   * Python 3.14.6 is installed globally, but PyTorch and specialized C++ AI packages (CTranslate2, llama.cpp, onnxruntime-gpu) have the highest stability on Python 3.11 / 3.12. An isolated, dedicated virtual environment managed with modern reproducible dependency tooling (`uv` or `venv`) is implicitly required.

7. **Database Concurrency & Persistence Engine:**
   * Simultaneous read/write from Supervisor, Memory Agent, and Logging subsystems requires ACID compliance with Write-Ahead Logging (SQLite WAL mode) and in-memory Redis caching to eliminate disk I/O bottlenecks.
