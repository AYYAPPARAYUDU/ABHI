# ABHI Hardware-Aware Multi-Model Scheduler

**Project:** ABHI — Local-First Personal AI Computer Automation System  
**Document:** `ABHI_MULTI_MODEL_SCHEDULER.md`  
**Status:** **AUTHORITATIVE & INTEGRATED**  
**Date:** 2026-11-24  

---

## 1. Hardware Resource Allocation

ABHI operates on local host hardware with strict physical resource awareness:

| Component | Physical Hardware Specification | Software Provider / Runtime |
| :--- | :--- | :--- |
| **GPU** | NVIDIA GeForce RTX 5050 Laptop GPU (8,151 MiB VRAM) | Ollama CUDA Driver 12.x |
| **System RAM** | 24 GB DDR5 System Memory | Windows NT Memory Manager |
| **CPU** | AMD Ryzen AI 7 Processor | Host Operating System / psutil |
| **NPU** | AMD Ryzen AI NPU (`PCI\VEN_1022&DEV_1502`) | DirectML ONNX Runtime Provider |

---

## 2. Resource Exhaustion Protection

Implemented in `backend/app/intelligence/model_scheduler.py`:

- **VRAM Headroom Threshold:**
  A minimum buffer of **800 MB** free VRAM is enforced. If host memory pressure causes free VRAM to drop below 800 MB, high-memory inference requests queue or gracefully fall back to CPU execution.
- **Dynamic Model Selection:**
  - Fast conversational requests route to `abhi:latest` (5.2 GB footprint).
  - Deep code analysis or multi-turn reasoning routes to `qwen3:8b` (5.2 GB footprint).
  - Dense RAG embeddings route to `all-minilm:latest` (120 MB footprint).
- **Graceful Fallback:**
  When an uninstalled or unavailable model is requested, the scheduler transparently redirects the task to `abhi:latest` without throwing unhandled exceptions.
- **NPU Execution Truth:**
  The AMD NPU is hardware-verified in Device Manager, but Ollama currently executes on NVIDIA CUDA. The scheduler explicitly documents `npu_active_in_ollama: False` to maintain strict engineering truth.
