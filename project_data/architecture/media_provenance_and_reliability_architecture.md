# Media Provenance, Reliability & Quality Hardening Architecture

## 1. System Overview & Core Chain

The Phase 8 Stage 8.6 architecture hardens the media production subsystem into a local, traceable, reproducible, resource-governed, and fail-safe pipeline:

```text
Creative Pipeline
      │
      ▼
Media Workflow
      │
      ▼
SkillRuntime
      │
      ▼
Policy Engine
      │
      ▼
ResourceManager (Admission, VRAM Lease)
      │
      ▼
ModelRuntime (Local Diffusion, Video, Inpainting, TTS)
      │
      ▼
MediaProvenanceAttestor (Authenticity & Attestation)
      │
      ▼
Artifact Store (SHA-256 Storage & Lineage)
      │
      ▼
MediaTechnicalValidator (Container, Codec, Math Consistency)
      │
      ▼
Project Manifest (Deterministic Canonical Hash)
      │
      ▼
Replay & Recovery Engine (Inspect, Simulate, Replay)
      │
      ▼
Procedural & Personal Memory Promotion
```

---

## 2. Provenance Taxonomy & Truthfulness

Every media output and resource metric is classified into one authoritative provenance state:

| Provenance State | Description | Permitted Runtimes |
|:---|:---|:---|
| `ACTUAL_MODEL_INFERENCE` | True forward pass on verified model weights | PyTorch CUDA/ROCm, Diffusers, ONNX Runtime with authentic model |
| `PROCEDURAL` | Algorithmic / mathematical generation | OpenCV, NumPy, FFmpeg procedural filters, ImageMagick |
| `SIMULATED` | Resource / timeline simulation | Discrete-event DAG simulator, memory estimator |
| `MOCKED` | Test doubles and fixture synthetic generators | Pytest fixtures, mock runtimes, stub tensors |
| `ESTIMATED` | Pre-execution resource prediction | ResourceManager admission estimator |
| `MEASURED` | Empirically observed operating system telemetry | PyTorch `torch.cuda.max_memory_allocated`, `psutil`, NVML |

---

## 3. Cryptographic Attestation Object

The immutable `MediaRuntimeAttestation` contract captures:
- `attestation_id`: Unique cryptographic UUID
- `operation_id` / `artifact_id`
- `operation_type`: `IMAGE_GENERATE`, `VIDEO_GENERATE`, `IMAGE_EDIT`, `INPAINT`, `OUTPAINT`, `TTS`, `COMPOSITION`
- `model_id` & `model_digest`: Checked against authoritative `ModelRegistry`
- `runtime_name` & `runtime_version`
- `device`, `driver_version`, `compute_runtime`
- `provenance_class`: Enforced authenticity (procedural runtimes cannot claim `ACTUAL_MODEL_INFERENCE`)
- `parameters_hash`, `input_hashes`, `output_hashes`
- `seed`: Pseudo-random seed if applicable
- `started_at` & `completed_at` timestamps
- `attestation_hash`: Deterministic SHA-256 digest over canonical JSON representation

---

## 4. Centralized Technical Validation

`MediaTechnicalValidator` validates media files against mathematical and physical constraints:
- **Images**: Header magic bytes, PNG/JPEG chunk structure, exact pixel dimensions `[width, height]`, SHA-256 digest.
- **Videos**: Container validation (`mp4`, `webm`, `mkv`), video track existence, exact framerate and duration mathematical consistency:
  $$\left|\frac{\text{frame\_count}}{\text{fps}} - \text{duration}\right| \le \text{tolerance}$$
- **Audio / TTS**: RIFF/WAV format headers, sample rate ($\ge 16000$ Hz), channel counts, duration bounds.
- **Subtitles**: Monotonic timestamp sequences ($t_{\text{start}, i} < t_{\text{end}, i} \le t_{\text{start}, i+1}$), maximum timestamp $\le \text{media\_duration}$.

---

## 5. Creative Quality Decoupling

Subjective aesthetics (style consistency, temporal fluidity, character likeness) are strictly separated from technical validation:
- Evaluated metrics: `prompt_keyword_coverage` (lexical presence in visual prompt), `alignment_delta_seconds` ($|\text{video\_duration} - \text{audio\_duration}|$), `subtitle_coverage_ratio`.
- Unevaluated metrics: Return explicit `NOT_EVALUATED`. Never produce ungrounded arbitrary confidence numbers (e.g. `0.93`).

---

## 6. Controlled 3-Phase Replay Contract

1. **INSPECT**: Validates DAG integrity, checks model availability in `ModelRegistry`, compares recorded model digests with current files, and computes reusable vs regenerate node counts.
2. **SIMULATE**: Computes VRAM and RAM footprint against current GPU headroom.
3. **REPLAY**: Executes only invalidated or missing nodes while reusing valid intermediate artifacts.
