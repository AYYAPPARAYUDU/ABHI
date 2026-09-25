# Hardware Resource Management & VRAM Arbitration Policy

**Status:** RECONCILED & AUDITED (Phase 2 Baseline)

## 1. Physical Hardware Constraints (Measured Baseline)

* **Discrete GPU:** NVIDIA GeForce RTX 5050 Laptop GPU (8,151 MiB / 8.0 GB VRAM, Driver 592.82, CUDA 13.1).
* **System RAM:** 24,425,460 KB (~24 GB DDR5).
* **CPU:** AMD Ryzen 7 260 w/ Radeon 780M Graphics (8 Physical Cores, 16 Logical Processors).

```
                      [TOTAL VRAM BUDGET: 8,151 MiB (8.0 GB)]
┌─────────────────────────────────────────────────────────────┬──────────────┐
│                  DYNAMIC WORKLOAD ZONE                      │ SYSTEM SLACK │
│  (Mode A: 8B LLM ~5.2 GB + STT ~1.1 GB = 6.3 GB)           │   ~1.0 GB    │
│                           OR                                │ (Display/OS) │
│  (Mode B: SDXL-Turbo ~5.5 GB + STT ~1.1 GB = 6.6 GB)       │              │
└─────────────────────────────────────────────────────────────┴──────────────┘
```

---

## 2. VRAM State Discovery & Admission Control Protocol

The Gateway enforces a strict **VRAM Arbiter State Machine** before launching any GPU-intensive worker:

```
[Task Dispatched (e.g. Generate Image / Video)]
                      │
                      ▼
[Step 1: Resource Discovery & Query]
  • Query Ollama `/api/ps` -> Check currently loaded model and VRAM residency.
  • Query Host VRAM status -> Ensure system display headroom > 1.0 GB.
                      │
                      ▼
[Step 2: Admission Control Evaluation]
  • If Required VRAM + Active VRAM > 7.0 GB:
      - Issue unload request to Ollama: `POST /api/generate` with `{"model": "...", "keep_alive": "0s"}`.
      - Poll `/api/ps` until Ollama confirms model VRAM footprint is 0 MB.
                      │
                      ▼
[Step 3: Worker Reservation & Startup]
  • Spawn dedicated Media Worker subprocess with exclusive CUDA context.
  • Execute PyTorch Diffusers pipeline.
                      │
                      ▼
[Step 4: Resource Release & Model Restoration]
  • Worker terminates -> Windows/CUDA automatically reclaims all VRAM.
  • Gateway re-warms primary LLM in Ollama (`keep_alive: "5m"`).
  • Supervisor resumes conversational agent loop.
```

---

## 3. CPU Core Allocation & Memory Management

1. **Async Event Loop Isolation:** The FastAPI gateway and WebSocket hub execute on standard non-blocking asynchronous threads (`asyncio`).
2. **CPU-Intensive Tasks:** Image transformations, format transcoding, and OCR bounding box calculations run in a dedicated `ThreadPoolExecutor` capped at 4 worker threads, ensuring at least 12 logical threads remain unblocked for the OS, Chrome, and UI rendering.
3. **Periodic Garbage Collection:** Python memory compaction (`gc.collect()`) triggers every 10 minutes or immediately following heavy media worker termination.
