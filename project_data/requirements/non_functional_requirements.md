# Non-Functional Requirements (NFR) Specification

## 1. Local-First & Privacy Guarantees
* **NFR-01 Total Data Locality:** 100% of user data, documents, embeddings, camera streams, audio recordings, screen captures, logs, and memory databases MUST reside and execute locally on the user's laptop.
* **NFR-02 Zero Mandatory Cloud Tethering:** The core system MUST function completely offline without internet connectivity (except when user explicitly requests browser automation on external websites).
* **NFR-03 Strict Telemetry & Privacy Isolation:** No background tracking, external data harvesting, or unconfirmed cloud API calls are permitted.

---

## 2. Performance & Hardware Efficiency
* **NFR-04 GPU VRAM Budgeting & OOM Immunity:**
  * Active peak VRAM consumption must remain under **7.5 GB** (within the 8 GB physical ceiling of the RTX 5050 GPU).
  * System must implement automated dynamic model offloading/eviction (LRU) before launching heavy diffusion/generation tasks.
* **NFR-05 Latency Targets:**
  * Voice Activity Detection (VAD) response latency: < 50 ms.
  * Speech-to-Text (STT) inference latency: < 300 ms per utterance chunk.
  * Local LLM First-Token Latency (Time to First Token - TTFT): < 400 ms on Qwen 8B Q4.
  * Gesture & Face Landmark Tracking: >= 30 FPS at < 15 ms frame latency on CPU/iGPU.
  * Three.js Rendering: Smooth 60 FPS under normal interaction; adaptive frame throttling (15 FPS or idle sleep) when window is minimized or unfocused.
* **NFR-06 Low Idle Resource Footprint:**
  * Idle CPU consumption: < 3% aggregate.
  * Idle RAM consumption: < 1.5 GB for background daemon and IPC services.
  * Zero memory leaks: Long-running agent daemons must pass 24-hour leak audit benchmarks.

---

## 3. Reliability, Resilience & Verifiability
* **NFR-07 Deterministic Execution & State Recovery:**
  * Agent execution state must be persisted after every action in the DAG.
  * System must support clean resume and graceful rollback upon application crashes or unexpected OS window changes.
* **NFR-08 Fail-Safe Automation Interlocks:**
  * Global Emergency Stop ("Panic Button" / Global Hotkey, e.g. `Ctrl + Shift + Esc` or `F12`) instantly aborts all active mouse/keyboard automation, browser actions, and running processes.
* **NFR-09 Safe Verification Interceptors:**
  * Irreversible actions (file deletion, permanent overwrite, command execution with sudo/admin elevation, financial checkout in browser) MUST pause and require explicit user consent.

---

## 4. Code Quality, Maintainability & Architecture
* **NFR-10 Modular Extensibility:** Subagents, vision processors, and automation drivers must be decoupled via clean typed interfaces (Pydantic / TypeScript contracts).
* **NFR-11 Production Standards:** Zero hardcoded secrets, strict input validation, comprehensive structured JSON logging with correlation IDs, and automated unit/integration test suites with > 80% coverage on critical automation pathways.
