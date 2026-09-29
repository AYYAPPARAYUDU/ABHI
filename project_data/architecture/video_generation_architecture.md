# Phase 8 Stage 8.2 — Local Video Generation Runtime & Media Pipeline Architecture

## 1. Executive Subsystem Overview

The Local Video Generation subsystem extends ABHI's local-first personal AI computer automation platform with a temporal video diffusion runtime. It introduces deterministic, resource-bounded video generation designed to operate within the 8 GB VRAM envelope of the host hardware (NVIDIA GeForce RTX 5050 Laptop GPU, 6,501 MB usable VRAM, 24 GB host RAM).

```
                             USER
                               │
                               ▼
                        ┌──────────────┐
                        │  SUPERVISOR  │
                        └──────┬───────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ MEDIA INTENT │
                        └──────┬───────┘
                               │
                               ▼
                        ┌──────────────┐
                        │VIDEO PLANNER │
                        └──────┬───────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ POLICY / RISK│
                        └──────┬───────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ SKILL RUNTIME│
                        └──────┬───────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  RESOURCE    │
                        │  MANAGER     │
                        └──────┬───────┘
                               │
                    ┌──────────┴───────────┐
                    ▼                      ▼
              MODEL REGISTRY          DEVICE SELECTOR
                    │                      │
                    └──────────┬───────────┘
                               ▼
                        ┌──────────────┐
                        │ VIDEO RUNTIME│
                        └──────┬───────┘
                               │
                       ┌───────┴────────┐
                       ▼                ▼
                   SEGMENT 1          SEGMENT N
                       │                │
                       └───────┬────────┘
                               ▼
                       TEMPORAL STITCH
                               │
                               ▼
                          ENCODER
                               │
                               ▼
                         VALIDATION
                               │
                               ▼
                         SHA-256 HASH
                               │
                               ▼
                        ARTIFACT STORE
                               │
                   ┌───────────┴──────────┐
                   ▼                      ▼
                MEMORY                 FRONTEND
                   │                      │
                   ▼                      ▼
              PROCEDURES              VIDEO STUDIO
```

---

## 2. Core Architectural Components

### 2.1 Video Domain Contracts (`backend/app/media/video_models.py`)
- **`VideoGenerationRequest`**: Validated contract specifying prompt, negative prompt, model ID, resolution (divisible by 64), FPS (12, 16, 24, 30), duration (1.0–6.0s), steps, seed, output format (MP4/WEBM), and chunk duration (2.0s).
- **`VideoArtifact`**: Canonical record capturing artifact ID, relative filesystem path, SHA-256 checksum, poster thumbnail path, dimensions, duration, FPS, frame count, size, and model provenance (`ACTUAL`).
- **`VideoSegmentCheckpoint`**: Checkpoint tracking segment index, frame range, sha256 hash, and verification status for resumable chunked generation.
- **`VideoModelDefinition`**: Metadata specification registering base VRAM, per-second temporal VRAM, quantization (FP16/INT8), supported resolutions/FPS, and production vs candidate lifecycle status.

### 2.2 Resource Admission & Hardware Protection (`backend/app/media/video_admission.py`)
- **VRAM Budgeting**: Computes dynamic VRAM scaling:
  $$\text{VRAM}_{\text{req}} = \text{base\_vram\_mb} + (\text{scale} \times \text{frames\_per\_chunk} \times 15.0\text{ MB}) + (\text{steps} \times 2.5\text{ MB})$$
- Strictly capped at $\le 6,400$ MB to preserve safe headroom under the 6,501 MB usable limit.
- **Automatic CPU Fallback**: Automatically shifts memory allocation to RAM when GPU VRAM is under contention or user explicitly requests CPU execution.
- **Time-Bounded Leases**: Integrated with `CentralResourceManager` and `ResourceLedger` with automatic release upon job completion or cancellation.

### 2.3 Chunked Temporal Video Runtime (`backend/app/media/video_runtime.py`)
- **Chunked Temporal Generation**: Splits generation requests into bounded temporal segments (e.g. 2-second chunks of 24–48 frames).
- **Cross-Segment Continuity**: Maintains continuous phase dynamics, motion trajectories, and harmonious gradient noise across segment boundaries.
- **Controlled Video Encoder (`VideoEncoder`)**: Sandboxed OpenCV `VideoWriter` wrapper using fixed, allowlisted codecs (`mp4v`, `avc1`, `vp09`). No arbitrary shell or FFmpeg strings are exposed to the LLM.
- **Poster Thumbnail Extraction**: Generates a representative poster JPEG frame for seamless frontend gallery previews.

### 2.4 Storage Governance & 6-Step Integrity Validation (`backend/app/media/video_storage.py`)
- **Canonical Storage Hierarchy**:
  - Videos: `media/videos/YYYY/MM/vid_<job_id>.<format>`
  - Thumbnails: `media/thumbnails/YYYY/MM/thumb_<job_id>.jpg`
  - Temp Workspace: `media/temp/job_<job_id>/` (automatically purged upon job completion/failure)
- **6-Step Validation Engine**:
  1. Output file exists on disk
  2. Byte size $> 0$
  3. Video container successfully decoded via `cv2.VideoCapture`
  4. Frame count matches expected duration $\times$ FPS
  5. Resolution dimensions match requested width $\times$ height
  6. Cryptographic SHA-256 calculated before registration

### 2.5 Video Coordinator Orchestrator (`backend/app/media/video_coordinator.py`)
- Coordinates model registry synchronization, prompt safety gating, hardware lease acquisition, chunked runtime execution, output validation, cancellation events, and temporary workspace cleanup.

### 2.6 Skill Ecosystem Integration (`backend/app/services/skills/builtin_video_skills.py`)
- Exposes `media.video.generate@1.0.0` registered in `SkillRegistry` with input/output schemas and `ARTIFACT_EXISTS_AND_VALIDATED` verification policy for DAG workflows.

---

## 3. Registered Local Video Models

| Model ID | Name | Quantization | Base VRAM | Usable FPS | Max Duration | Role |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `svd-xt-local` | Stable Video Diffusion XT Local | FP16 | 4,200 MB | 12, 16, 24 | 4.0s | Production |
| `animatediff-lightning-local` | AnimateDiff Lightning 8-Step | FP16 | 3,600 MB | 12, 16, 24, 30 | 3.0s | Production |
| `cogvideox-candidate` | CogVideoX 2B (Candidate) | INT8 | 5,600 MB | 12, 16, 24 | 6.0s | Candidate |
