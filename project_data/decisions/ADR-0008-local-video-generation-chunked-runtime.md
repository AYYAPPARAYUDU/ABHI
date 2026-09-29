# ADR-0008: Local Video Generation Runtime, Chunked Temporal Budgeting & Controlled Encoders

## Status
**ACCEPTED** (Phase 8 Stage 8.2 — 2026-09-29)

## Context
Phase 8 Stage 8.2 requires introducing a local video generation subsystem to the ABHI platform. The host environment features an NVIDIA GeForce RTX 5050 Laptop GPU with 8 GB VRAM (6,501 MB usable) and 24 GB host RAM. Directly synthesizing full-length, high-resolution uncompressed video tensors in a single GPU pass risks triggering out-of-memory (OOM) faults or exhausting interactive system headroom. Furthermore, exposing raw shell FFmpeg commands to generative planners creates severe security vulnerabilities.

## Decisions

1. **Chunked Temporal Generation**:
   - The video synthesis runtime divides video generation requests into bounded 2.0-second temporal segments (e.g. 24–48 frames per segment).
   - Each segment is generated with deterministic latent continuity, maintaining smooth motion orbits, particle dynamics, and background gradients across chunk boundaries.
   - Resource requirements are budgeted per segment, preventing VRAM spikes beyond 6,400 MB.

2. **Controlled Video Encoding Abstraction**:
   - Do NOT expose generic FFmpeg command-line execution or shell subprocesses to the agentic planner.
   - Implement `VideoEncoder` wrapping OpenCV's `VideoWriter` with allowlisted codec profiles (`mp4v`, `avc1`, `vp09`) and fixed compression parameters.
   - Automatically generate a poster thumbnail image (JPEG) during encoding for efficient UI rendering.

3. **6-Step Post-Generation Artifact Verification**:
   - Every generated video undergoes a 6-step integrity check:
     1. File existence on disk
     2. Non-zero byte size
     3. Container decodability via `cv2.VideoCapture`
     4. Frame count matching expected duration $\times$ FPS
     5. Pixel dimensions matching requested resolution
     6. Cryptographic SHA-256 hash calculation

4. **Segment Checkpointing & Resumable Recovery**:
   - Checkpoints (`VideoSegmentCheckpoint`) are persisted during chunk generation. Verified segments can be reused upon recovery from transient worker interruptions, avoiding unnecessary regeneration.

5. **Integrated Skill Contract**:
   - Register `media.video.generate@1.0.0` with `SkillRegistry` and `SkillExecutionRuntime` enforcing safety policy screening, hardware lease acquisition, and verified artifact return.

## Consequences

- **Positive**:
  - Predictable, bounded VRAM consumption ($\le 6,400$ MB) safely within RTX 5050 8GB limits.
  - Complete immunity against shell injection and arbitrary command execution vulnerabilities.
  - Deterministic artifact reproducibility via random seeds and SHA-256 checksums.
  - Seamless DAG workflow integration for autonomous multimodal pipelines.
- **Trade-offs**:
  - Maximum video duration is bounded to 6.0 seconds per job on current hardware profile.
