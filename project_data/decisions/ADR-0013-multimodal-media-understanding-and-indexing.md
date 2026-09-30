# ADR-0013: Multimodal Media Understanding, Semantic Vector Namespaces & Asset Reuse Engine

## Status
**ACCEPTED** (Phase 8 — Stage 8.7)

## Context
ABHI generates, edits, and composes rich media artifacts across images, videos, audio speech/narration, and subtitles. To prevent redundant GPU re-generation, support creative exploration, and enable natural-language discovery across local media (e.g., "Find Telugu narration assets longer than 8 seconds", "Find cyberpunk city scenes at night"), ABHI requires an integrated multimodal understanding and semantic retrieval architecture.

## Decision
1. **Isolated LanceDB Namespaces**: Stored in `media_semantic_index` and `media_scene_vector_index` to prevent vector pollution with general document RAG chunks.
2. **Deterministic Multi-Modal Embeddings**: 384-dimensional normalized dense vectors derived from unified modality features (captions, tags, OCR tokens, transcript segments) combining dense cosine similarity, BM25 keyword matching, and strict metadata filtering.
3. **GPU-Aware Media Reuse Engine**: The `MediaReuseEngine` automatically calculates compatibility (aspect ratio, duration, resolution, language) and estimated GPU time savings (avoided diffusion passes).
4. **Mandatory Technical Verification**: Every asset is technically validated prior to indexing. Corrupted assets are quarantined (`is_quarantined = true`).
5. **Versioned Analytical Pipeline**: Understanding records carry `analysis_version` (`analysis.media@1.0.0`) and invalidate cache upon binary SHA-256 changes.

## Consequences
- Fast sub-10ms local hybrid media retrieval.
- Drastic reduction in GPU load by reusing matching assets for creative pipelines.
- Absolute isolation of unverified files from LLM execution boundaries.
