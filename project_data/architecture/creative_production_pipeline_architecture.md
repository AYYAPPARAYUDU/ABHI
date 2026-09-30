# Advanced Multimodal Creative Production Pipeline Architecture (Phase 8 Stage 8.5)

## 1. Executive Summary

Phase 8 Stage 8.5 introduces the **Advanced Multimodal Creative Production Pipeline Engine** to ABHI. This system transforms high-level user creative intents (`CreativeBrief`) into complete, polished multimodal productions through an automated, hierarchical orchestration flow:

$$\text{CreativeBrief} \longrightarrow \text{Script} \longrightarrow \text{Storyboard} \longrightarrow \text{Scenes} \longrightarrow \text{AssetPlan} \longrightarrow \text{MediaTimeline} \longrightarrow \text{MediaWorkflow} \longrightarrow \text{Render \& Mux} \longrightarrow \text{Validation} \longrightarrow \text{ProjectManifest}$$

The engine is built on strict local-first principles, reusing the unified skill execution runtimes (`media.image.generate`, `media.video.generate`, `media.image.edit`, `audio.tts`, and `media.video.compose`) and the centralized `ResourceManager` admission ledger.

---

## 2. Core Architecture & Layered Decomposition

```
+-------------------------------------------------------------------------------+
|                             Creative Brief Layer                              |
|   (CreativeBrief: Title, Tone, Style, Language [en/te/hi/ta], Target Dur)    |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼
+-------------------------------------------------------------------------------+
|                           Decomposition & Planning                            |
|   CreativePlanner: Script Synthesis + Storyboard Parsing + Multilingual TTS   |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼
+-------------------------------------------------------------------------------+
|                       Asset Planning & Caching Engine                         |
|   AssetPlanner: Deterministic Hashing + Cache Reuse + Intermediate Budgets   |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼
+-------------------------------------------------------------------------------+
|                    Dependency Invalidation & Rebuild Engine                    |
|    DependencyInvalidationEngine: Graph Closure Analysis + GPU Savings Metric |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼
+-------------------------------------------------------------------------------+
|                       Multi-Track Timeline & Subtitles                        |
|   MediaTimeline: Video/Audio/Subtitle Tracks + SRT/VTT Subtitle Generators   |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼
+-------------------------------------------------------------------------------+
|                       DAG Compilation & Orchestration                         |
|    MediaCapabilityGraph -> MediaWorkflow Execution -> Verification Engine     |
+-------------------------------------------------------------------------------+
                                      │
                                      ▼
+-------------------------------------------------------------------------------+
|                     Cryptographic Project Manifest & WAL                      |
|       CreativeProjectManifest (SHA-256 Digest) + Quality Scorecard            |
+-------------------------------------------------------------------------------+
```

---

## 3. Key Components

### 3.1 Contract & Schema Models (`creative_models.py`)
- **`CreativeBrief`**: Defines production parameters including title, description, style, tone, language (`en`, `te`, `hi`, `ta`), duration, aspect ratio, and resolution.
- **`CreativeScript` & `NarrationSegment`**: Structured narrative breakdown with estimated and actual timing bounds per scene.
- **`Storyboard` & `StoryboardScene`**: Visual narrative structure specifying visual prompts, camera motions, narration text, on-screen text, and transitions (`CUT`, `FADE`, `CROSSFADE`, `DISSOLVE`).
- **`Scene`**: Concrete execution units tracking generated image, video, and audio artifact references and lifecycle status (`PLANNING`, `ASSET_GENERATION`, `SCENE_GENERATION`, `NARRATION`, `COMPOSITION`, `RENDERING`, `VALIDATING`, `COMPLETED`, `FAILED`, `CANCELLED`, `REVISING`).
- **`MediaTimeline` & `SubtitleTrack`**: Precise multi-track assembly model supporting SRT and WebVTT rendering with millisecond timing offsets.
- **`PipelineQualityScore`**: Multi-dimensional quality scorecard evaluating technical integrity, resource efficiency, prompt adherence, temporal consistency, audio-video alignment, and resolution compliance.

### 3.2 Asset Planning & Deterministic Caching (`asset_planner.py`)
- **`CreativeCache`**: In-memory and persisted registry of deterministic artifact hashes computed from `(asset_type, prompt, model_digest, sorted_parameters)`.
- **`AssetPlanner`**: Analyzes the storyboard to compute required generation steps, identifies reusable cached artifacts, and allocates memory/storage budgets adhering to the configured retention policy (`FINAL_ONLY`, `FINAL_PLUS_SOURCES`, `FULL_PROJECT`).

### 3.3 Graph Invalidation & Selective Rebuild (`dependency_invalidation.py`)
- **`DependencyInvalidationEngine`**: When a user revises a specific scene (prompt, duration, narration), this engine computes the exact downstream subgraph closure requiring regeneration.
- **GPU Savings Metric**: Quantifies computation saved by skipping unaffected scenes and intermediate assets:
$$\text{Savings \%} = \left(1.0 - \frac{|\text{Rebuild Nodes}|}{|\text{Total Nodes}|}\right) \times 100\%$$

### 3.4 Creative DAG Compilation & Multilingual Synthesis (`creative_planner.py`)
- **`CreativePipelinePlanner`**: Synthesizes storyboards and narrative scripts for English, Telugu, Hindi, and Tamil.
- **DAG Compiler**: Translates storyboard scenes into a valid `MediaWorkflow` DAG consisting of Image Generation $\to$ Video Generation $\to$ TTS Synthesis $\to$ Video-Audio-Subtitle Composition nodes.

### 3.5 Pipeline Orchestrator & Lifecycle Management (`creative_orchestrator.py`)
- **`CreativePipelineOrchestrator`**: Manages the complete lifecycle of creative pipelines (Creation, Simulation, Execution, Revision, Cancellation, Manifest Export/Import).
- **6 Built-in Production Templates**:
  1. `template.short_promotional_video@1.0.0` (Fast-paced promotional clip with subtitles)
  2. `template.narrated_image_story@1.0.0` (Image sequence with voiceover and transitions)
  3. `template.social_media_clip@1.0.0` (Dynamic portrait/square video clip)
  4. `template.presentation_visual@1.0.0` (Clean explanatory slide-style sequence)
  5. `template.cinematic_scene@1.0.0` (Atmospheric cinematic narrative)
  6. `template.photo_to_video@1.0.0` (Image-to-video animation with soundtrack)

---

## 4. Hardware Safety & Admission Control

- **VRAM Constraint**: Adheres strictly to the RTX 5050 Laptop GPU budget ($\le 6,400$ MB VRAM ceiling, $>1,200$ MB safety headroom).
- **Sequential Execution**: Node executions acquire atomic leases via `ResourceManager` and unload models upon completion, preventing concurrent diffusion model VRAM contention.
- **Resource Simulation**: Pre-execution simulation verifies total VRAM and RAM footprint before dispatching heavy GPU workloads.

---

## 5. Security & Isolation Model

- **Local Storage Isolation**: Media files and output artifacts are stored exclusively in sandboxed storage paths under `MEDIA_STORAGE_DIR`.
- **Zero Shell Injection**: FFmpeg composition strictly utilizes predefined parameter templates without shell invocation.
- **Allowlisted Render Profiles**: Outputs restricted to `MP4_H264_STANDARD`, `MP4_H264_LOW_RESOURCE`, and `WEBM_STANDARD`.
- **Path Traversal Protection**: Export/import operations enforce strict JSON payload validation and reject unsafe file system paths.
