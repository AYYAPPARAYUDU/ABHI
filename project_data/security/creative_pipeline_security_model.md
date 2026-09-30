# Creative Production Pipeline Security Model (Phase 8 Stage 8.5)

## 1. Overview & Threat Boundaries

The **Creative Production Pipeline Engine** in ABHI operates entirely within the local host security perimeter. The system ingests natural language prompts, narrative briefs, and structured JSON project definitions, and orchestrates media generation tools.

The threat model addresses the following potential attack vectors:
1. **Adversarial Prompt & Injection Attacks**: Malicious input strings attempting shell command execution, format string exploitation, or script injection.
2. **Arbitrary File System Traversal**: Payloads attempting to read or write files outside the designated media storage sandbox.
3. **Media Composition Injection**: Malicious flags passed to underlying media processing tools (e.g., FFmpeg argument injection).
4. **Denial of Service / Resource Exhaustion**: Infinite graph recursion, excessive scene allocations, or VRAM starvation.
5. **Project Import Tampering**: Untrusted serialized project manifests attempting schema poisoning or artifact spoofing.

---

## 2. Security Controls & Defenses

### 2.1 Prompt Sanitization & Content Filtering
- **Input Validation**: `CreativeBrief` text fields (title, description, visual prompts, narration texts) are strictly validated and length-bounded ($\le 4,000$ characters).
- **Sanitization**: Dangerous shell metacharacters (`;`, `&`, `|`, `` ` ``, `$`, `<`, `>`, `\n`, `\r`) are sanitized before being passed to child subprocesses.
- **System Prompt Isolation**: LLM storyboard and script synthesis prompts use strict boundary tags (`<PROMPT>`, `<CONTEXT>`) to prevent user input from overriding system guidance.

### 2.2 Storage Sandboxing & Path Resolution
- **Sandboxed Directory**: All generated and imported media artifacts are confined to `MEDIA_STORAGE_DIR` (`database/media/`).
- **Path Canonicalization**: All file paths are canonicalized using `os.path.abspath` and `os.path.realpath`, asserting that every resolved path starts with the authorized storage directory prefix.
- **Relative Path Rejection**: Directory traversal tokens (`../`, `..\\`) in template IDs or artifact IDs immediately raise validation exceptions (`HTTP 400 / ValueError`).

### 2.3 Injection-Safe Media Composition & Profile Whitelisting
- **Profile Allowlist**: Media composition is restricted to predefined render profiles:
  - `MP4_H264_STANDARD`: H.264 video codec, AAC audio codec, standard bitrate.
  - `MP4_H264_LOW_RESOURCE`: Fast preset, lower CRF, reduced memory footprint.
  - `WEBM_STANDARD`: VP9 video codec, Opus audio codec.
- **No Direct Shell Execution**: `subprocess.run` calls pass argument lists directly without `shell=True`. Custom or user-supplied command strings are rejected.

### 2.4 Resource Limits & DoS Prevention
- **Graph Node Bounds**: Pipelines are capped at a maximum of 20 nodes and 10 scenes per production run.
- **VRAM Admission Enforced**: The pipeline simulator enforces strict upper limits ($\le 6,400$ MB VRAM, $>1,200$ MB safety headroom).
- **Timeout Protection**: Each generation node execution is subject to an individual timeout (e.g., 180s for diffusion, 30s for TTS).

### 2.5 Cryptographic Verification & Manifest Tamper Resistance
- **SHA-256 Digest**: Every artifact and pipeline state is hashed deterministically (`calculate_pipeline_hash`).
- **Integrity Verification**: `CreativeProjectManifest` embeds cryptographic hashes of all generated assets, timeline tracks, and quality scores.
- **Import Validation**: Imported project files are validated against the strict `CreativeProjectManifest` and `CreativePipeline` schemas prior to database ingestion.
