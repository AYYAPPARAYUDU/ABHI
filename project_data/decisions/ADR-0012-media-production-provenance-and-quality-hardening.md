# ADR-0012: Media Production Provenance, Reliability & Quality Hardening

## Status
Accepted

## Context
Across Phase 8 (Stages 8.1 through 8.5), ABHI established local image generation, video generation, inpainting/outpainting, DAG workflow composition, and multimodal creative production pipelines.
To transition the media production subsystem into a mission-critical, enterprise-grade, local-first automation layer, the system must guarantee that all media operations are verifiable, reproducible, resource-governed, fail-safe, and truthful.

Prior to Stage 8.6, systems could inadvertently report procedural transformations or mock test fixtures with ambiguous labels like "AI-generated" or "production output". Furthermore, creative quality (aesthetic coherence, temporal flow) was frequently conflated with technical integrity (container valid, codec compliant, frame-rate mathematically consistent).

## Decision
1. **Unambiguous Provenance Classification**:
   Every media result and telemetry item must be classified into exactly one mutually exclusive provenance state:
   - `ACTUAL_MODEL_INFERENCE`: Executed against an authentic, verified model weights file via approved runtime.
   - `PROCEDURAL`: Produced by mathematical, geometric, or algorithmic logic (OpenCV, FFmpeg filter, tensor transform).
   - `SIMULATED`: Generated via deterministic simulation models without executing heavy neural weights.
   - `MOCKED`: Test fixture or synthetic mock stub.
   - `ESTIMATED`: Calculated resource prediction before execution.
   - `MEASURED`: Empirically observed operating system or GPU metric.

2. **Authoritative Model & Runtime Authenticity**:
   The `ModelLifecycleManager` and registry are authoritative. Fabricated model IDs or mismatched SHA-256 digests fail closed. Runtimes cannot claim model inference when executing procedural fallbacks. Candidate models are strictly isolated from production pipelines without explicit authorization.

3. **Cryptographic Attestation & Manifest Hash**:
   Every operation produces an immutable `MediaRuntimeAttestation` canonicalized via SHA-256 (`attestation_hash`). Pipeline manifests produce deterministic `manifest_hash` canonical representations.

4. **Decoupled Technical Validation and Creative Quality**:
   - Technical validation audits file existence, container readability, codec compliance, frame-count/fps/duration mathematical consistency (`abs(frame_count / fps - duration) <= tolerance`), monotonic subtitle timestamps, and byte digests.
   - Creative quality evaluation reports only empirical metrics (prompt keyword coverage, audio-video duration alignment, subtitle lexical coverage). Subjective dimensions without active neural evaluators must return explicit `NOT_EVALUATED`.

5. **3-Phase Replay Safety Contract**:
   Replay is segregated into three distinct, non-destructive phases:
   - `INSPECT`: Audits schema, models, digests, reusable vs regenerate node counts.
   - `SIMULATE`: Validates VRAM headroom and execution safety.
   - `REPLAY`: Executes re-generation with full policy and resource leases.

## Consequences
- **Positive**: Complete auditability, zero false claims of neural inference, guaranteed mathematical validity for videos and subtitles, deterministic cache invalidation, and robust failure isolation.
- **Trade-offs**: Strict model registry lookups require accurate digest declarations during model registration.
