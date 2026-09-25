# Phase 2 Architecture Contract & System Topology

**Document ID:** ARCH-CONTRACT-001  
**Status:** RECONCILED & AUDITED (Phase 2 Baseline)  
**Host Environment:** Windows 11 Home Single Language (Build 10.0.26200)  
**Hardware Baseline:** AMD Ryzen 7 260 (8C/16T), NVIDIA GeForce RTX 5050 (8 GB VRAM), 24 GB DDR5 RAM  
**Active Python Runtime:** Python 3.14.6 (Virtualenv `.venv` with FastAPI 0.141.1, SQLAlchemy 2.1.0, Pydantic 2.13.5)  
**Active Frontend Runtime:** Node.js v26.5.0, Angular CLI 22.0.7, Three.js 0.170.0  
**Active LLM Runtime:** Ollama at `http://localhost:11434` with `qwen3:8b` (5.22 GB) & `abhi:latest` (5.22 GB)

---

## 1. Architectural Pattern Evaluation for Single Laptop Host

To establish the simplest, most reliable architecture capable of supporting the long-term multimodal AI system without artificial overhead, 6 patterns were evaluated:

| Architecture Pattern | Process & IPC Complexity | Memory Overhead (Idle) | Crash & Fault Isolation | GPU Resource Arbitration | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Modular Monolith** (Single Python Process) | None (In-process Python calls) | **Minimal (~0.5 GB)** | **Zero (One crash kills entire app, GIL blocks UI)** | Poor (Hard to interrupt long model runs) | **REJECTED** |
| **2. Microservices** (12+ Docker Containers) | Extreme (Network HTTP/gRPC mesh) | **Excessive (~4.5–6.0 GB)** | High | Complex (WSL2 GPU passthrough friction) | **REJECTED** |
| **3. Agent-per-Process** (10+ OS Processes) | Very High (Pipes & IPC per agent) | High (~2.5–3.5 GB) | High | Difficult to arbitrate 8GB VRAM centrally | **REJECTED** |
| **4. Event-Driven Distributed** (Kafka/RabbitMQ) | Very High (Heavy message broker daemon) | High (~2.0 GB broker) | High | Unnecessary message queuing overhead | **REJECTED** |
| **5. Pure Hybrid Cloud/Local** | High (Cloud API tethering) | Moderate | Moderate | Violates Local-First Privacy Mandate | **REJECTED** |
| **6. Multi-Process Modular Hybrid (Engineered Core)** | **Low-Moderate (Gateway + Dedicated Workers)** | **Optimal (~1.2 GB)** | **High (Isolated worker failures, robust gateway)** | **Centralized (Gateway orchestrates VRAM/RAM swaps)** | **SELECTED & IMPLEMENTED** |

---

## 2. Implemented Architecture Topology

The system operates as a **Multi-Process Modular Hybrid System** with 3 distinct execution zones:

```
[ZONE 1: Presentation & 3D Telemetry (Frontend)]
  • Angular 22 Frontend (Standalone Components + Signals)
  • Three.js WebGL/WebGPU 3D Cognitive Avatar Core
  • Bidirectional WebSocket client (/ws/telemetry) + Audio Streamer
                      │
                      │ ws://127.0.0.1:8000/ws/telemetry (Typed JSON-RPC & Audio PCM)
                      │ http://127.0.0.1:8000/api/v1 (REST for static/health/models)
                      ▼
[ZONE 2: Cognitive Core & Async Gateway (Main Python Process)]
  • FastAPI / Asyncio Gateway (Router, Health, Telemetry Hub, CORS, Security)
  • Central Supervisor Agent (State Machine & Permission Guard) [Phase 3 Scope]
  • Planning & Verification Modules (In-process async DAG engine) [Phase 3 Scope]
  • SQLite WAL Persistence (`database/relational/system.db`) & LanceDB Vector Engine
  • Ollama LLM Client (`qwen3:8b` / `Qwen2.5-VL`)
                      │
         ┌────────────┴────────────┬────────────────────────┐
         │ Subprocess JSON-RPC Pipe│ Subprocess JSON-RPC    │ Transient Process
         ▼                         ▼                        ▼
[ZONE 3A: Perception Worker] [ZONE 3B: OS & Browser Worker] [ZONE 3C: Media Worker]
  • Silero VAD + faster-whisper  • Windows UIA / Win32 Driver • Diffusers SDXL-Turbo / Flux
  • Google MediaPipe (Face/Hands)• Playwright Browser Agent   • FFmpeg Composition
  • RapidOCR Screen Reader       • Sandboxed Shell Executor   • Dynamic VRAM Offload
```

---

## 3. Guarantees & Constraints Contract

1. **Zero Global Blocking:** No AI model inference, computer vision loop, audio transcription, or heavy disk I/O may execute on the main FastAPI asyncio event loop or the Angular UI thread.
2. **Centralized VRAM Arbitration:** Only one heavy GPU model (LLM vs. Diffusion Image Gen vs. Video Gen) may claim VRAM priority at any given instant.
3. **Dual-State Separation:** Model completion outputs are never treated as ground truth; the verification layer inspects physical OS / DOM state.
4. **Local Data Isolation:** All user data, embeddings, conversation history, and credentials remain within local filesystem and database roots (`database/`).
5. **No Untrusted Serialization:** All IPC communication strictly uses typed JSON schemas or binary buffers; `pickle` over untrusted boundaries is forbidden.
