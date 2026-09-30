# Multimodal Media Index & Retrieval Security Model

**Phase 8 — Stage 8.7**
**System**: Local-First Personal AI Computer Automation System (ABHI)

---

## 1. Threat Vectors & Defense Mechanisms

### 1.1 Untrusted Media Metadata & Indirect Prompt Injection
- **Threat**: User-supplied or scraped tags/captions containing prompt injection attacks (e.g., `IGNORE ALL PREVIOUS INSTRUCTIONS; DROP TABLE users;`) attempting to hijack LLM supervisor decisions.
- **Defense**: Metadata is strictly treated as untrusted data strings. Strings are sanitized, tokenized, and never passed directly to shell, SQL engines, or raw system prompts without strict template boundaries.

### 1.2 Path Traversal & Unauthorized Filesystem Access
- **Threat**: Retrieval requests supplying relative or absolute paths (e.g., `../../etc/shadow` or `C:\Windows\System32\cmd.exe`) under the guise of an artifact ID.
- **Defense**: Artifact paths are resolved exclusively through the localized `ArtifactStore` mapping and UUID verification. Absolute path traversal requests outside approved artifact storage directories fail closed with `HTTP 403 Forbidden` or `HTTP 404 Not Found`.

### 1.3 Media Quarantine on Validation Failure
- **Threat**: Attackers uploading malformed or exploit-laden media files (e.g., buffer overflow payloads in TIFF headers or MP4 atom containers).
- **Defense**: Pre-indexing technical validation via `MediaTechnicalValidator` verifies container signatures, byte counts, and codec structures. Any validation failure sets `is_quarantined = true` and rejects the asset from semantic retrieval indexes.

### 1.4 Cryptographic Verification & Cache Tamper Resistance
- **Threat**: Tampering with cached understanding records to poison search results.
- **Defense**: Cache keys incorporate the cryptographic SHA-256 hash of the media binary (`sha256:analysis_version:model_digest`). Any file byte modification instantly invalidates cache entries and triggers clean re-analysis.

---

## 2. Resource Governance & VRAM Sandboxing

1. **Strict Leases**: Analysis jobs require explicit leases from `ResourceManager`.
2. **Deterministic Budgets**: Video frame sampling is bounded (e.g., maximum 64 sample frames per video, max 2048px image dimensions for OCR) to prevent memory exhaustion (OOM).
3. **Graceful Degraded Modes**: When GPU VRAM is under high load from real-time workflows, background media indexing automatically yields and transitions to CPU/procedural analysis.
