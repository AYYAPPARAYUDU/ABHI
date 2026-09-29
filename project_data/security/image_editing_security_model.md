# Phase 8 Stage 8.3 — Image Editing Security & Adversarial Model

## 1. Threat Modeling & Security Perimeter

Image editing introduces multidimensional risk vectors including untrusted input image structures, malicious prompt conditioning payloads, fake artifact lineage injections, memory exhaustion attacks, and filesystem escapes.

```
                    ┌──────────────────────────────────────┐
                    │       UNTRUSTED CLIENT / LLM         │
                    └──────────────────┬───────────────────┘
                                       │
                      [Attempt: Filesystem Path Traversal,
                       Fake Artifact IDs, Mask Bombing,
                       Prompt Injection, System Commands]
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │          SECURITY GATEWAY            │
                    ├──────────────────────────────────────┤
                    │ • Artifact ID Verification (No Paths)│
                    │ • SHA-256 Digest Cryptographic Check │
                    │ • Dimension & Area Limit Bounding    │
                    │ • Prompt Injection & Control Filter  │
                    │ • Mask Structure & Value Validator   │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      ISOLATED SANDBOX RUNTIME        │
                    ├──────────────────────────────────────┤
                    │ • Job-Scoped Temp Directory          │
                    │ • Resource Ledger Strict Leasing     │
                    │ • No Direct Shell / OS Subprocess    │
                    │ • Non-Destructive Source Immutability│
                    └──────────────────────────────────────┘
```

---

## 2. Core Security Controls

### 2.1 Direct Filesystem Path Prohibition
- **Rule**: Neither the LLM nor the UI is permitted to provide raw filesystem paths (e.g. `C:\Windows\...` or `/etc/passwd`).
- **Enforcement**: All inputs must reference registered `artifact_id`s. Paths are resolved exclusively by `MediaStorageManager` from validated database records.

### 2.2 Mask Contract & Boundary Defense
- **Empty Mask Rejection**: Masks containing zero editable pixels fail closed with `INVALID_MASK_EMPTY`.
- **Dimension Matching**: Mask resolution must strictly match source artifact dimensions; unrecorded resizing is rejected.
- **Outpaint Bounds Clamping**: Canvas expansions are capped at $+512$ px per edge to prevent memory exhaustion (Zip bomb / pixel bomb defense).

### 2.3 Prompt / Control Plane Separation
- **Conditioning Isolation**: Prompts containing operational instructions (e.g., `execute shell`, `delete files`, `change system policy`) are strictly treated as passive latent conditioning tokens and cannot trigger ABHI automation skills.

### 2.4 Metadata Sanitization
- **Untrusted Metadata**: EXIF, XMP, and PNG text chunks from user-uploaded images are stripped during validation and never executed as executable script tags or automation parameters.

### 2.5 Candidate Model Isolation
- **Evaluation Isolation**: Experimental editing models (e.g., `kandinsky-outpainting-candidate`) execute under isolated priority (`P6_CANDIDATE_EXPERIMENT`) and can never preempt or starve production systems.

---

## 3. Adversarial Test Matrix

| Adversarial Attack Vector | Test Case | Outcome | Status |
|---|---|---|---|
| Arbitrary Host Path Injection | `test_reject_arbitrary_filesystem_path_access` | `INVALID_SOURCE_PATH` | Passed |
| Non-Existent Fake Artifact ID | `test_reject_non_existent_source_artifact` | `SOURCE_ARTIFACT_NOT_FOUND` | Passed |
| Empty Inpainting Mask | `test_reject_empty_mask_for_inpainting` | `INVALID_MASK_EMPTY` | Passed |
| Mask Dimension Mismatch | `test_reject_mismatched_mask_dimensions` | `MASK_DIMENSION_MISMATCH` | Passed |
| Extreme Canvas Expansion Bomb | `test_reject_extreme_outpainting_expansion` | `OUTPAINT_BOUNDS_EXCEEDED` | Passed |
| Prompt Injection Payload in Edit | `test_prompt_injection_safety_screening` | Screened & Sanitized | Passed |
