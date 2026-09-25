# Hardware Resource Management & VRAM Arbitration Policy

## 1. Hardware Resource Budget (Based on Measured Specs)

* **Physical Constraints:** 8,151 MiB (8 GB) GDDR6 VRAM, 24 GB DDR5 RAM, 8-Core / 16-Thread AMD CPU.

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

## 2. VRAM Arbitration State Machine

Because simultaneous execution of an 8B LLM and a 1024x1024 Diffusion Image Generator exceeds 8 GB VRAM, the Gateway enforces a **VRAM Arbiter State Machine**:

```
[Normal Conversational / Agent Automation Mode]
  • Ollama LLM (`qwen3:8b`) is RESIDENT in VRAM (~5.2 GB).
  • Perception Models (MediaPipe, Silero VAD) execute on CPU / DirectML.
  • Whisper STT (INT8 quantized) executes on shared GPU/CPU memory (~1.1 GB).
                        │
                        ▼ (User or Agent triggers Image / Video Generation)
[State Transition: VRAM Eviction & Offload]
  1. Supervisor pauses active LLM streaming turns.
  2. Gateway signals Ollama to unload LLM from VRAM (`keep_alive: "0s"`).
  3. PyTorch CUDA cache is flushed (`torch.cuda.empty_cache()`).
                        │
                        ▼
[Media Generation Execution Mode]
  • Dedicated Media Worker loads Diffusion Checkpoint into VRAM (~5.5 GB).
  • Generation completes in ~1.0–2.5 seconds (SDXL-Turbo).
  • Media Worker deallocates weights and flushes CUDA cache.
                        │
                        ▼
[State Transition: LLM Restoration]
  • Gateway re-warms `qwen3:8b` in Ollama; Supervisor resumes task execution.
```

---

## 3. CPU, Threading & Memory Policies

1. **CPU Core Affinity & Async IO:** FastAPI event loop runs on core asynchronous threads (`asyncio`). CPU-bound image transformations and OCR tasks run in `ThreadPoolExecutor` capped at 4 worker threads to leave 12 logical threads free for the OS and UI.
2. **Periodic Memory Trimming:** Background memory cleanup (`gc.collect()`) triggers every 10 minutes or after heavy generation workloads.
