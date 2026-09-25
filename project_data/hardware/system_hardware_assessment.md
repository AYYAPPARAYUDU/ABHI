# System Hardware Assessment & Workload Feasibility Report

**Date of Measurement:** September 25, 2026  
**Method:** Measured directly via Windows Management Instrumentation (WMI / CIM) & NVIDIA System Management Interface (nvidia-smi)  
**Host Environment:** Windows 11 Home Single Language (Build 10.0.26200)

---

## 1. Measured Physical Hardware Specifications

| Component | Measured Specification | Details / Notes |
| :--- | :--- | :--- |
| **CPU** | AMD Ryzen 7 260 w/ Radeon 780M Graphics | 8 Physical Cores, 16 Logical Processors, Zen 4 Architecture with AVX-512 support |
| **Discrete GPU (dGPU)** | NVIDIA GeForce RTX 5050 Laptop GPU | 8,151 MiB (8 GB) GDDR6/GDDR7 VRAM, Driver 592.82, CUDA 13.1 Compute Support |
| **Integrated GPU (iGPU)** | AMD Radeon 780M Graphics | RDNA 3 architecture, shares system RAM (can be leveraged for lightweight OpenVINO/DirectML/Vulkan inference) |
| **System RAM** | 24,425,460 KB (~24 GB DDR5) | ~4.8 GB free immediately with heavy active desktop apps; up to 16–18 GB allocatable for AI workloads upon cleanup |
| **Primary Storage (C:)** | NVMe SSD: 510.47 GB Total | **318.80 GB Free** available for system, tools, models, dependencies |
| **Secondary Storage (E:)** | NVMe SSD / Partition: 441.99 GB Total | **430.83 GB Free** available for dedicated model storage and project datasets |
| **Total Available Storage** | ~749.63 GB Free across volumes | Target 50 GB database/model storage easily fits without disk exhaustion |

---

## 2. Measured Toolchain & Runtime Baseline

| Tool / Runtime | Measured Version | Status |
| :--- | :--- | :--- |
| **Python** | Python 3.14.6 | Installed. *Caution: PyTorch 2.x and some pre-compiled C-extensions (llama-cpp-python, torchaudio) currently require Python 3.11 or 3.12 virtual environment.* |
| **Node.js** | v26.5.0 (with npm) | Installed. Suitable for modern Angular CLI and frontend build toolchains. |
| **Git** | 2.55.0.windows.5 | Installed. |
| **Ollama Runtime** | Local Service Active | `qwen3:8b` (5.2 GB, Q4_K_M) and `abhi:latest` (5.2 GB) installed and operational. |
| **NVIDIA CUDA** | CUDA 13.1 (Driver 592.82) | Full Tensor Core acceleration available for cuDNN, TensorRT, PyTorch, ONNX Runtime. |

---

## 3. Workload Feasibility Classification (Based on 8GB VRAM & 24GB RAM)

### Category A: Easily Runnable Locally (Simultaneous / Low Footprint)
* **Text Embeddings:** `bge-m3` or `nomic-embed-text` (0.3 GB – 0.6 GB VRAM/RAM).
* **Vision Perception / Landmarks:** Google MediaPipe (Face mesh, Hand landmarks, Pose estimation) running on CPU/DirectML (< 0.5 GB RAM, < 10ms latency).
* **Voice Activity Detection (VAD):** Silero VAD (< 50 MB RAM, near-zero CPU).
* **Speech-to-Text (STT):** `faster-whisper` (Base / Small / Medium quantized to INT8 on CUDA) (0.5 GB – 1.5 GB VRAM).
* **Text-to-Speech (TTS):** Piper TTS / Kokoro-82M ONNX (< 0.4 GB RAM/VRAM, sub-second synthesis).
* **Vector Database:** LanceDB / ChromaDB embedded (< 0.5 GB RAM).
* **Fast State & IPC:** Local Redis / In-Memory Queue (< 0.1 GB RAM).

### Category B: Runnable Locally with Optimization / Dynamic Scheduling
* **Primary LLM:** `qwen3:8b` (4-bit Q4_K_M = ~5.2 GB VRAM). Fits comfortably in 8GB VRAM with 4k-8k context window (uses ~6.2 GB total VRAM with KV cache).
* **Vision-Language Model (VLM):** `Qwen2.5-VL-7B-Instruct-Q4_K_M` (~5.0 GB VRAM) or `Moondream2` / `Florence-2-large` (~0.8 GB – 1.5 GB VRAM).
* **Reranker:** `bge-reranker-v2-m3` (0.6 GB – 1.1 GB VRAM/RAM).

### Category C: Heavy / Requires Model Swapping (Time-Multiplexing)
* **Local Image Generation:** Stable Diffusion 1.5 / SDXL-Turbo / Flux.1-schnell (NF4/Q4). Requires 4.5 GB – 7.5 GB VRAM. *Must pause or offload LLM to CPU/RAM when executing image generation to prevent CUDA Out-Of-Memory (OOM).*
* **Local Video Generation:** AnimatedDiff / LTX-Video / SVD-XT (INT8 / GGUF). Requires 6.5 GB – 8.0 GB VRAM + significant system RAM offloading. Highly compute-intensive (~30–90 seconds per 2-second clip).

### Category D: Impractical Locally
* 70B+ parameter LLMs (require 40GB+ VRAM).
* Full FP16 Video Generation Models (Wan2.1-14B FP16, HunyuanVideo FP16) requiring 24GB–48GB VRAM.
