# Phase 2 Architecture Contract & System Topology

**Document ID:** ARCH-CONTRACT-001  
**Status:** Approved for Architecture Planning  
**Target Environment:** Local Windows 11 Laptop (8C/16T CPU, 8GB VRAM RTX 5050, 24GB RAM)

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
| **6. Multi-Process Modular Hybrid (Engineered Core)** | **Low-Moderate (Gateway + Dedicated Workers)** | **Optimal (~1.2 GB)** | **High (Isolated worker failures, robust gateway)** | **Centralized (Gateway orchestrates VRAM/RAM swaps)** | **SELECTED & CONTRACTED** |

---

## 2. Selected Architecture Contract

The system shall operate as a **Multi-Process Modular Hybrid System** with 3 distinct execution zones:

```
[ZONE 1: Presentation & 3D Telemetry (Browser/Node)]
  • Angular 22 Frontend (Standalone Components + Signals)
  • Three.js WebGL/WebGPU 3D Cognitive Avatar Core
  • Bidirectional WebSocket client + Audio Streamer
                      │
                      │ ws://127.0.0.1:8000/ws/telemetry (JSON-RPC & Audio PCM)
                      │ http://127.0.0.1:8000/api/v1 (REST for static/binary)
                      ▼
[ZONE 2: Cognitive Core & Async Gateway (Main Python Process)]
  • FastAPI / Asyncio Gateway (Router, Health, Telemetry Hub)
  • Central Supervisor Agent (State Machine & Permission Guard)
  • Planning & Verification Modules (In-process async DAG engine)
  • SQLite WAL Persistence & LanceDB Vector Engine
  • Ollama LLM Client (qwen3:8b / Qwen2.5-VL)
                      │
         ┌────────────┴────────────┐
         │ Subprocess IPC          │ Subprocess Pipe (On-Demand)
         ▼                         ▼
[ZONE 3A: Audio & Vision Worker]  [ZONE 3B: Heavy Media Generation Worker]
  • Silero VAD + faster-whisper     • Diffusers SDXL-Turbo / Flux NF4
  • Google MediaPipe (Face/Hands)   • FFmpeg Composition Subprocess
  • RapidOCR Screen Reader          • Time-multiplexed GPU allocation
```

---

## 3. Guarantees & Constraints Contract

1. **Zero Global Blocking:** No AI model inference, computer vision loop, audio transcription, or heavy disk I/O may execute on the main FastAPI asyncio event loop or the Angular UI thread.
2. **Centralized VRAM Arbitration:** Only one heavy GPU model (LLM vs. Diffusion Image Gen vs. Video Gen) may claim VRAM priority at any given instant.
3. **Dual-State Separation:** Model completion outputs are never treated as ground truth; the verification layer inspects physical OS / DOM state.
4. **Local Data Isolation:** All user data, embeddings, conversation history, and credentials remain within local filesystem and database roots (`database/`).
