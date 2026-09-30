# ADR-0010: Multimodal Media Workflow Composer Architecture

## Status
**Accepted** (2026-09-30)

## Context
Following the completion of Stage 8.1 (Local Image Generation), Stage 8.2 (Local Video Generation), and Stage 8.3 (Non-Destructive Image Editing & Inpainting), ABHI required a unified workflow composer capable of chaining multiple media skills into cohesive, verified multimodal pipelines (e.g. generating an image, animating it into a video, synthesizing voice narration, and multiplexing the final audio-video output) without adding external foundation models or exceeding local hardware constraints.

## Decision

1. **DAG Graph Engine & Topological Execution**:
   - Implemented `CapabilityGraphEngine` using Kahn's algorithm for topological ordering and cycle detection.
   - Constrained workflows to a maximum of 20 nodes with strictly validated input/output port typing (`IMAGE`, `VIDEO`, `AUDIO`, `TEXT`, `MASK`, `METADATA`, `ANY`).
   - Dynamic parameter interpolation using `{{source_node_id.output_key}}` syntax.

2. **Sequential Resource Feasibility Simulation**:
   - Developed `simulate_workflow` to calculate sequential peak VRAM and host RAM requirements.
   - Enforces the RTX 5050 Laptop GPU budget ($\le 6,400$ MB VRAM ceiling, $>1,200$ MB safety headroom).

3. **Injection-Safe Media Composition**:
   - Introduced `MediaCompositionRuntime` supporting fixed composition profiles (`VIDEO_PLUS_AUDIO`, `VIDEO_ONLY`, `VIDEO_PLUS_AUDIO_SUBTITLES`).
   - Disallowed arbitrary shell injection; audio/video multiplexing operates exclusively on registered internal artifacts.

4. **Fault-Tolerant Checkpointing & Cryptographic Manifests**:
   - Every node step creates a checkpoint on completion.
   - Support for workflow cancellation (`cancel_workflow`) and incremental resumption (`recover_workflow`).
   - Executions produce a cryptographic `MediaWorkflowManifest` containing SHA-256 hashes of all generated artifacts.

5. **Integrated Angular 19 UI**:
   - Added a dedicated "Workflow Composer (Phase 8.4)" tab to `/media` featuring visual node assembly, template catalog loading, simulation diagnostics, and manifest viewer.

## Consequences
- **Positive**:
  - End-to-end multimodal composition completely on-device.
  - Zero external foundation model downloads or dependencies.
  - Provable hardware safety via pre-execution simulation.
  - Non-destructive lineage and cryptographic reproducibility.
- **Negative / Tradeoffs**:
  - Long multi-step DAGs (e.g., Image $\to$ Video $\to$ TTS $\to$ Mux) take combined duration equal to sum of individual generation steps. Mitigated by checkpointing and progress telemetry.
