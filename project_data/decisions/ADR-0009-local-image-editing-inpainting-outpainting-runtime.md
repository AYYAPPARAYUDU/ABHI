# ADR-0009: Local Image Editing, Inpainting & Outpainting Architecture

## Status
**Accepted** (2026-09-29)

## Context
Following the completion of Stage 8.1 (Local Image Generation) and Stage 8.2 (Local Video Generation), ABHI requires controlled local image transformation capabilities. Users and automated workflows need to edit existing media, inpaint specific damaged or modified regions with soft feathering, and expand image borders (outpainting) without relying on external cloud APIs or mutating historical source artifacts.

## Decision

1. **Non-Destructive Lineage Architecture**:
   - Source artifacts remain strictly immutable. Every edit job generates a new `MediaArtifact` with an immutable `ArtifactLineageRecord`.
   - Technical difference evidence (`EditDifferenceEvidence`) is calculated deterministically (changed pixel count, changed ratio, bounding box, mask overlap ratio).

2. **Unified Operation Contract (`ImageEditType`)**:
   - `IMAGE_TO_IMAGE`: Latent variation controlled by strength ($0.05 - 1.0$).
   - `INPAINTING`: Mask-governed region synthesis ($255 = \text{edit}, 0 = \text{preserve}$) with edge Gaussian feathering.
   - `OUTPAINTING`: Directional canvas expansion with deterministic border mask generation.

3. **Resource Admission & GPU Protection**:
   - Workloads are arbitrated by `ImageEditResourceAdmission` integrated with the centralized `ResourceLedger`.
   - Hardware limits: RTX 5050 Laptop GPU ($\le 6,400$ MB VRAM ceiling, $>1,200$ MB headroom), dynamic CPU RAM fallback.

4. **Skill Engine & DAG Registration**:
   - Registered `media.image.edit@1.0.0`, `media.image.inpaint@1.0.0`, and `media.image.outpaint@1.0.0` in `SkillRegistry` for supervisor workflow composition.

5. **Standalone Interactive Angular UI**:
   - Extended `/media` with an interactive Mask Canvas Studio, Before/After Split Difference Viewer, and Lineage Tree Visualizer using Angular Signals.

## Consequences
- **Positive**:
  - Full local privacy with no cloud telemetry or API cost.
  - Complete traceability and cryptographic integrity via parent-child lineage.
  - Zero risk of destructive image overwrites.
- **Negative / Tradeoffs**:
  - Outpainting and heavy inpainting require additional memory scaling compared to base image generation. Handled via automatic CPU fallback.
