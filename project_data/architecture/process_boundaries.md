# Process Boundaries & Runtime Isolation Specifications

**Status:** RECONCILED & AUDITED (Phase 2 Baseline)

## 1. Process Boundary Matrix

Every execution boundary is justified strictly on technical grounds (Fault Isolation, GIL Bypass, GPU Memory Arbitration, or Native OS Access):

| Process / Boundary | Runtime & Language | Execution Model | Why Process Isolation is Mandatory | Resource Profile (Idle / Peak) |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend UI Process** | Node.js / Chromium (Browser or Electron) | Single-threaded Event Loop | **UI Responsiveness:** Browser rendering & Three.js 60 FPS loop must never stutter when backend processes heavy data. | 180 MB RAM / 450 MB RAM, < 3% GPU (Idle) |
| **Central Gateway & Cognitive Core** | Python 3.14.6 (Isolated `.venv`) | Asyncio Event Loop (`uvicorn`) | **System Orchestrator:** Manages API contracts, Supervisor state machine, SQLite ACID writes, and LLM streaming without worker crashes affecting connectivity. | 350 MB RAM / 800 MB RAM, 0% GPU |
| **Multimodal Perception Worker (Zone 3A)** | Python Subprocess | High-Frequency Real-Time Loop | **GIL Bypass & Hardware Capture:** Continuously samples webcam DirectShow frames (MediaPipe @ 30 FPS) and microphone WASAPI audio (Silero VAD) without blocking the Gateway asyncio loop. | 320 MB RAM / 650 MB RAM, ~4% CPU (DirectML) |
| **OS & Browser Automation Worker (Zone 3B)** | Python / Node Subprocess | Isolated Task Runner | **Safety & Task Interruption:** The Supervisor must be able to dispatch, pause, timeout, cancel, force-kill (`SIGKILL` / `TerminateProcess`), or restart automation tasks without destabilizing the Gateway or UI telemetry. | 120 MB RAM / 450 MB RAM, 0% GPU |
| **Heavy Media Generation Worker (Zone 3C)** | Python Subprocess (Transient Lifecycle) | Dedicated CUDA Process | **GPU VRAM Swap & Crash Protection:** PyTorch Diffusers / SDXL-Turbo models require explicit VRAM allocation (~5-7 GB). Running in an on-demand worker allows total VRAM deallocation on process exit. | 0 MB (Idle / Terminated) / 6.5 GB VRAM (Peak) |
| **Ollama Local LLM Service** | Native Windows Service / C++ | Multithreaded CUDA / GGUF Server | **Dedicated Model Server:** Hardware-optimized GGUF inference (`qwen3:8b`) with native C++ Tensor Core kernel execution. | 250 MB RAM (Idle) / 5.2 GB VRAM (Active) |

---

## 2. In-Process Modules vs. Separate Processes

* **In-Process Python Modules (Same Process as Gateway):**
  - Central Supervisor State Machine
  - Planner Engine & DAG Scheduler
  - Memory Manager & SQLite Relational Repository
  - LanceDB Serverless Vector Retrieval Engine
  - Verification & Safety Gate Interceptors
  - *Rationale:* These components require ultra-low latency (< 1 ms), share in-memory Pydantic schemas, and perform non-blocking asynchronous database operations. Wrapping them in separate microservice containers would add pure latency and serialization overhead without benefit.

* **Subprocess Isolation Rationale for Zone 3B Automation:**
  - If a browser tab hangs or a native Windows application locks during a UI automation click, the Supervisor can terminate only that worker process and record a verified failure without dropping the active WebSocket connection with the user.
