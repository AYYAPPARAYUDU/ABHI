# Multimodal Media Understanding, Semantic Indexing & Asset Reuse Architecture

**Phase 8 — Stage 8.7**
**System**: Local-First Personal AI Computer Automation System (ABHI)

---

## 1. Executive Summary & Core Principle

Stage 8.7 elevates ABHI from a media generation and composition engine into a self-understanding, indexed, semantic media repository. ABHI can understand, inspect, search, compare, and reuse its own local media library across text, image, video, audio, and subtitle modalities.

### Core Architectural Axioms
1. **Never Arbitrary Files to LLMs**: Unvalidated files or raw binaries are never injected into LLM context; only cryptographically authenticated, metadata-validated references are provided.
2. **Deterministic & Normalized Embeddings**: Semantic representations are 384-dimensional normalized dense vectors derived from localized multimodal evidence (captions, scene labels, OCR tokens, STT transcripts) with dedicated LanceDB tables (`media_semantic_index` and `media_scene_vector_index`).
3. **No Redundant Re-Generations**: The `MediaReuseEngine` detects exact duplicates (SHA-256) and evaluates semantic/technical compatibility (aspect ratio, duration, resolution, language), calculating empirical GPU time savings and avoiding redundant generation jobs.
4. **Safety Quarantine**: Files failing technical validation or exhibiting structural corruption are flagged as `is_quarantined = true` and quarantined from standard retrieval.

---

## 2. End-to-End Pipeline Data Flow

```text
                              USER / SUPERVISOR
                                      │
                                      ▼
                             MEDIA LIBRARY QUERY
                                      │
                         ┌────────────┴────────────┐
                         ▼                         ▼
                  TECHNICAL FILTER          SEMANTIC SEARCH
                         │                         │
                         │                   LANCE EMBEDDINGS
                         │                         │
                         └────────────┬────────────┘
                                      ▼
                               HYBRID RETRIEVAL
                                      │
                                      ▼
                             MEDIA UNDERSTANDING
                                      │
                       ┌──────────────┼──────────────┐
                       ▼              ▼              ▼
                     IMAGE          VIDEO          AUDIO
                    ANALYSIS       ANALYSIS       ANALYSIS
                       │              │              │
                     (OCR)         (SCENES)        (STT)
                       │              │              │
                       └──────────────┼──────────────┘
                                      ▼
                                REUSE ENGINE
                                      │
                                      ▼
                              CREATIVE PIPELINE
                                      │
                                      ▼
                              VERIFIED ARTIFACT
                                      │
                                      ▼
                                  PROVENANCE
                                      │
                                      ▼
                                   FRONTEND
```

---

## 3. Multimodal Media Understanding Layer

### 3.1 MediaUnderstandingRecord Specification
An immutable record capturing both empirical technical specifications and extracted semantic knowledge:
- `understanding_id`: Unique identifier (`und_<uuid>`).
- `artifact_id`: Source media artifact identifier.
- `media_type`: `IMAGE`, `VIDEO`, `AUDIO`, `SUBTITLE`, `TEXT`.
- `analysis_version`: Versioned analytical pipeline (`analysis.media@1.0.0`).
- `technical_metadata`: Verified dimensions, container format, codec, sample rate, channels, duration, frame count, and cryptographic SHA-256.
- `semantic_metadata`: Extracted caption, environment type, visual style, dominant colors, detected language, and categorized visual tags.
- `modality_features`:
  - Image: OCR blocks with bounding boxes and recognized text.
  - Video: Chronological scene slices with representative frame indices, captions, and duration boundaries.
  - Audio: Time-aligned speech segments, transcript snippets, language, and confidence.
- `provenance_class`: Categorized runtime evidence (`ACTUAL_MODEL_INFERENCE`, `PROCEDURAL`, `SIMULATED`, `MOCKED`).

---

## 4. Semantic Vector Index & Hybrid Retrieval

### 4.1 Isolated LanceDB Tables
Media semantic vectors are stored in isolated namespaces:
- `media_semantic_index`: 384-dimensional dense vectors representing root media assets with metadata columns for fast SQL/predicate filtering (`media_type`, `language`, `provenance_class`, `duration`, `width`, `height`).
- `media_scene_vector_index`: Fine-grained scene-level vectors allowing temporal video scene search (e.g., "Find scene at 00:06 containing neon signs").

### 4.2 Hybrid Retrieval Scoring Formula
Retrieval combines dense cosine similarity, BM25 token overlap bonus, and strict predicate filtering:
$$\text{Score}(q, d) = \alpha \cdot \text{CosineSim}(\vec{v}_q, \vec{v}_d) + \beta \cdot \text{BM25Score}(q, d) + \gamma \cdot \text{TagOverlap}(q, d)$$
where $\alpha = 0.65$, $\beta = 0.25$, and $\gamma = 0.10$.

---

## 5. Media Reuse & Derivation Engine

The `MediaReuseEngine` prevents unnecessary GPU utilization by analyzing target creative pipeline requirements:
1. **Exact Duplicate Suppression**: Matches cryptographic SHA-256 checksums to instantly return cached artifacts.
2. **Compatibility Analysis**:
   - `COMPATIBLE`: Aspect ratio, resolution, and duration match within tolerances.
   - `NEEDS_RESCALE`: Same aspect ratio, different resolution; indicates light ffmpeg scaling rather than diffusion regeneration.
   - `NEEDS_TRANSCODE`: Video/audio codec mismatch requiring ffmpeg re-encode.
   - `INCOMPATIBLE`: Fundamental modality or concept divergence.
3. **GPU Savings Quantification**: Computes estimated GPU seconds conserved (e.g., ~15.0s per 1024x1024 SDXL image generation, ~45.0s per SVD video render).

---

## 6. Built-in Skills Integration

Registered under `backend/app/services/skills/`:
- `media.library.search@1.0.0`: Hybrid dense/keyword library search.
- `media.library.inspect@1.0.0`: Detailed technical and semantic metadata inspection.
- `media.library.similar@1.0.0`: Proximity search for visual/stylistic similarity.
- `media.library.reuse_candidate@1.0.0`: Automated asset reuse evaluation.
- `media.library.analyze@1.0.0`: Direct synchronous understanding extraction.
- `media.library.index@1.0.0`: Asynchronous background indexing queue submission.
