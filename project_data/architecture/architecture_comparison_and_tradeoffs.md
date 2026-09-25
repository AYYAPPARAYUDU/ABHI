# Architecture Research & Tradeoffs Analysis for Local Laptop

## 1. Architectural Patterns Evaluated

### Pattern 1: Distributed Microservices (Docker Compose / Podman)
* **Description:** Deploying 10–15 independent containers (Ollama container, Whisper container, Vision container, Redis, PostgreSQL, Supervisor API, Angular Nginx container, Playwright container).
* **Pros:** Strict process boundary and independent dependency isolation.
* **Cons on Single Laptop:**
  - Consumes 4.0–6.5 GB idle RAM purely for container runtimes and duplicated base images.
  - High container startup and cold-boot latency (30–60 seconds).
  - Complicated GPU passthrough on Windows Subsystem for Linux (WSL2) with added memory translation overhead.
* **Verdict:** **REJECTED** as overly complex and resource-wasteful for a single local laptop environment.

### Pattern 2: Single Monolithic Process (Single Thread/Asyncio)
* **Description:** Running UI server, LLM orchestration, MediaPipe, Audio VAD, and PyAutoGUI in one single Python runtime.
* **Pros:** Trivial setup, zero IPC complexity.
* **Cons:**
  - Python Global Interpreter Lock (GIL) blocks CPU-intensive vision/audio tasks from serving the UI.
  - Any crash or unhandled exception in an experimental tool crashes the entire AI system and user session.
  - Inability to independently reload or throttle background workers.
* **Verdict:** **REJECTED** as fragile and non-production grade.

### Pattern 3: Multi-Process Modular Hybrid Architecture (Selected)
* **Description:** A streamlined, multi-process topology with a central FastAPI/Asyncio Gateway orchestrating lightweight specialized worker subprocesses (Audio Daemon, Vision Daemon, Task Executor) communicating via local asynchronous IPC and shared SQLite/Redis state.
* **Pros:**
  - Complete crash isolation: A crash in a browser/vision task does not bring down the supervisor or UI.
  - Sub-millisecond local IPC via loopback WebSockets and shared memory buffers.
  - Lean memory footprint: ~1.2 GB idle RAM total.
  - Native Windows OS access: PyWin32 and Playwright run with native system privileges without container virtualization friction.
* **Verdict:** **SELECTED & RECOMMENDED** as the optimal architecture for local-first execution.
