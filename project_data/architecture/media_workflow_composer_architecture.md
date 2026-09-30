# Multimodal Media Workflow Composer Architecture (Phase 8 Stage 8.4)

## 1. Executive Summary & Core Purpose
The **Multimodal Media Workflow Composer** orchestrates and chains local media capabilities—image synthesis (`media.image.generate`), image editing (`media.image.edit`), region inpainting (`media.image.inpaint`), directional canvas outpainting (`media.image.outpaint`), video generation (`media.video.generate`), speech synthesis (`audio.tts`), and video composition (`media.video.compose`)—into verified, deterministic, non-destructive multimodal DAG pipelines without introducing new foundation models.

## 2. Structural Component Overview

```
+----------------------------------------------------------------------------------------------------+
|                                      FRONTEND WORKSPACE (Angular)                                   |
|  +---------------------------+  +-------------------------------+  +-----------------------------+ |
|  | Visual Workflow Composer  |  |  Workflow Template Catalog    |  |  Workflow Simulation Panel  | |
|  +---------------------------+  +-------------------------------+  +-----------------------------+ |
|  +-----------------------------------------------------------------------------------------------+ |
|  |                        Workflow Manifest Viewer & Lineage Visualizer                          | |
|  +-----------------------------------------------------------------------------------------------+ |
+--------------------------------------------------+-------------------------------------------------+
                                                   | REST API (/api/v1/media/workflows/*)
+--------------------------------------------------v-------------------------------------------------+
|                                      BACKEND WORKFLOW ENGINE (FastAPI)                             |
|  +-----------------------------------------------------------------------------------------------+ |
|  | MediaWorkflowComposer                                                                         | |
|  |   - Sequential Peak VRAM Simulator                                                            | |
|  |   - Kahn's Algorithm Topological DAG Sorter & Cycle Detection                                  | |
|  |   - Step-by-Step Node Executor & Dynamic Variable Interpolator ({{node_id.output_key}})         | |
|  |   - Checkpointing Engine & Incremental Resume                                                 | |
|  |   - Cryptographic Manifest Generator (SHA-256 Hashes)                                         | |
|  +-----------------------------------------------------------------------------------------------+ |
|  +-------------------------------------+  +------------------------------------------------------+ |
|  | CapabilityGraphEngine               |  | MediaCompositionRuntime (Safe Video/Audio Muxing)    | |
|  |   - Port Type Compatibility Matrix  |  |   - Injection-Safe Composition Profiles              | |
|  |   - Max 20 Node Bounding Enforcer   |  |   - Output Artifact Validation & VideoStorageManager | |
|  +-------------------------------------+  +------------------------------------------------------+ |
+----------------------------------------------------------------------------------------------------+
```

## 3. Core Subsystems & Invariants

### 3.1 Immutable DAG Execution Model (`CapabilityGraphEngine`)
- **Topological Sorting**: Enforces Kahn's algorithm for deterministic execution order. Cycles are immediately detected and rejected with `WorkflowCycleDetectedError`.
- **Node Limits**: Hard cap of $\le 20$ nodes per workflow to prevent runaway resource exhaustion.
- **Port Compatibility**: Typed ports (`IMAGE`, `VIDEO`, `AUDIO`, `TEXT`, `MASK`, `METADATA`, `ANY`) validated prior to execution.
- **Variable Interpolation**: Step parameter templates (`{{source_node.artifact_id}}`) dynamically resolved from runtime memory or checkpoint storage.

### 3.2 Sequential Peak Resource Feasibility Simulation
- Because nodes execute sequentially in single-tenant local workstations, total required memory is bounded by the **maximum single node peak VRAM** ($\max_{n \in N} \text{PeakVRAM}(n)$) plus minimal orchestration overhead, rather than the sum of all nodes.
- Simulates hardware constraints against the RTX 5050 Laptop GPU (6,400 MB VRAM ceiling, 1,200 MB safe margin).

### 3.3 Composition Runtime & Injection-Safe Profiles (`MediaCompositionRuntime`)
- Allows composing video and audio artifacts using strict allowlisted profiles:
  - `VIDEO_PLUS_AUDIO`: Pairs video track with audio narration.
  - `VIDEO_ONLY`: Strips or processes video streams.
  - `VIDEO_PLUS_AUDIO_SUBTITLES`: Multiplexes media streams with optional text metadata.
- Rejects arbitrary shell command injection; strictly isolates file paths within managed local storage directories.

### 3.4 Checkpoint & Fault-Tolerant Replay
- Every completed DAG node writes an immutable checkpoint to disk.
- When an execution is cancelled or interrupted, `resume_workflow` reloads completed node artifacts and continues execution without re-computing expensive diffusion steps.

### 3.5 Cryptographic Workflow Manifest (`MediaWorkflowManifest`)
- Produces a tamper-evident audit trail containing:
  - Overall `workflow_hash` (deterministic canonical SHA-256 of graph definition and inputs).
  - Individual node outputs, artifact identifiers, and artifact content hashes.
  - Verification flag confirming that all output files match registered checksums.
