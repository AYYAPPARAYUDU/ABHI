# ADR-0011: Advanced Multimodal Creative Production Pipelines

## Status
**Accepted** (2026-09-30)

## Context
Following the completion of Stage 8.4 (Multimodal Media Workflow Composer), ABHI provided low-level graph compilation and node execution capabilities. However, users needed a higher-level creative abstraction: the ability to submit a high-level creative brief (e.g. topic, tone, style, target duration, language) and have the system autonomously decompose the brief into scripts, storyboards, scene schedules, subtitle tracks, and compiled media workflows.

Furthermore, creative production is inherently iterative: revising a single scene's prompt or duration should not require re-rendering the entire project from scratch. A selective invalidation and deterministic caching mechanism was necessary to conserve GPU compute.

## Decision

1. **Hierarchical Creative Decomposition Engine**:
   - Implemented `CreativePipelinePlanner` to decompose `CreativeBrief` into structured `CreativeScript` and `Storyboard` scenes.
   - Added multilingual narrative synthesis supporting English (`en`), Telugu (`te`), Hindi (`hi`), and Tamil (`ta`).
   - Automated timeline assembly and SRT/VTT subtitle track generation.

2. **Asset Planning & Deterministic Caching**:
   - Developed `AssetPlanner` and `CreativeCache` to compute deterministic SHA-256 digests over `(asset_type, prompt, model_digest, parameters)`.
   - Reused previously generated artifacts across runs to prevent redundant generation.

3. **Downstream Dependency Invalidation**:
   - Created `DependencyInvalidationEngine` using topological graph closures.
   - When a scene is revised, only downstream dependent nodes are invalidated, calculating and reporting an explicit GPU compute savings metric.

4. **Production Template Catalog & Orchestration**:
   - Introduced 6 built-in production templates (`short_promotional_video`, `narrated_image_story`, `social_media_clip`, `presentation_visual`, `cinematic_scene`, `photo_to_video`).
   - Implemented WAL persistence for pipeline records, asset registries, and template configurations in SQLite.

5. **Integrated Angular Creative Pipeline Studio**:
   - Built the `CreativePipelineStudioComponent` featuring brief creation, template selector chips, storyboard cards, multi-track timeline visualization, scene revision modal, and quality scorecard.

## Consequences

- **Positive**:
  - High-level intent to finished video workflow operating completely on-device.
  - Efficient iterative edits saving up to 80% GPU time on single scene revisions.
  - Multilingual support for English, Telugu, Hindi, and Tamil narrative synthesis.
  - Cryptographically verifiable project manifests with full lineage tracking.
- **Negative / Tradeoffs**:
  - Full creative generation (multiple video scenes + TTS + composition) requires multiple minutes on laptop GPUs. Mitigated by sequential pre-simulation and progress telemetry.
