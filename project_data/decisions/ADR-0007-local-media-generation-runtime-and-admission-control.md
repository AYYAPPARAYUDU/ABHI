# ADR-0007: Local Media Generation Runtime and Admission Control

## Status
Accepted (Phase 8 Stage 8.1)

## Context
The ABHI system requires local, privacy-first image and media synthesis capabilities to allow autonomous workflows and the operator to generate visual assets without relying on external cloud APIs (e.g. OpenAI DALL-E, Stability API, Replicate). However, running diffusion pipelines on personal workstation hardware (AMD Ryzen 7 260, RTX 5050 8GB VRAM, 24GB RAM) alongside resident LLMs and computer perception models creates significant contention and risk of out-of-memory driver crashes.

## Decision
1. **Generic Media Domain Contract**: Establish `MediaJob`, `MediaArtifact`, `MediaModel`, and `MediaPipeline` with `MediaType` (`IMAGE`, `VIDEO`, `AUDIO`) and `MediaOperation` (`GENERATE`, `EDIT`, `VARIATION`, `UPSCALE`) ensuring clean future extension into Stage 8.2 (Video) without architectural rewrites.
2. **Central Resource Admission**: Image jobs must request time-bounded `ResourceLease` allocations from `CentralResourceManager` prior to model loading or generation.
3. **Graceful CPU Fallback**: If GPU VRAM is occupied by high-priority LLMs, memory requirements automatically shift to system RAM (`VRAM=0.0MB, RAM += VRAM`) rather than throwing an unhandled OOM error.
4. **Prompt / Task Separation & Injection Neutralization**: Prompts are strictly data inputs for the synthesis engine and never code or instructions for the shell, filesystem, or supervisor.
5. **Multi-Step Post-Generation Verification**: Generation success requires physical file existence, positive byte size, valid OpenCV header/dimension decoding, and registered SHA-256 cryptographic hashing.

## Consequences
- **Positive**: Zero cloud dependencies, complete privacy, deterministic seed reproducibility, guaranteed host stability via strict usable VRAM/RAM budgeting, and seamless workflow integration via `media.image.generate@1.0.0`.
- **Negative**: High-resolution generations (e.g. 1024x1024) under heavy batch sizes are throttled or shifted to CPU if VRAM headroom is constrained.
