# Media Provenance & Pipeline Security Model

## 1. Threat Model & Boundaries

In ABHI's local-first architecture, all media operations must adhere to strict security boundaries:

```text
Untrusted Input (Prompt, Script, External Manifest, Subtitle, Template)
                             │
                             ▼
              [Data Sanitization & Bounds Checking]
                             │
                             ▼
                 [Schema & Type Validation]
                             │
                             ▼
                [Authoritative Model Lookup]
                             │
                             ▼
            [Isolated Execution Sandbox / Leases]
```

### Critical Rules:
1. **Data != Code**: Prompts, creative briefs, scripts, subtitle lines, and template parameters are pure data. Under no circumstances may they become shell commands, raw FFmpeg executable arguments, Python expressions (`eval()`, `__import__`), SQL queries, or filesystem path traverses.
2. **Template Variables**: Must be typed, bounded, sanitized, and strictly formatted. Template syntax like `{{ system.call() }}` or `${command}` must fail closed during schema validation.
3. **Import != Execute**: Imported creative project manifests are untrusted. Replay/Import operations must pass schema validation, digest verification, model authorization, capability validation, and resource headroom simulation before execution is scheduled.

---

## 2. Model & Candidate Isolation

- **Model Registry Authority**: Only models registered in `ModelLifecycleManager` or active coordinators can be executed. Unregistered model IDs or fabricated digests immediately abort execution.
- **Candidate Isolation**: Experimental or candidate models (`is_candidate=True`) cannot silently substitute for production models (`is_production=True`) under resource pressure or default pipeline requests. Substitution requires explicit user policy consent.

---

## 3. Cryptographic Lineage & Immutability

- Every generated intermediate and final asset receives a SHA-256 hash calculated directly from the file bytes upon generation.
- Lineage links are verified via parents' hash checks before rendering composite timelines.
- Cache invalidation is total if any material dependency (model digest, prompt hash, seed, runtime version) changes or if a cached artifact fails SHA-256 validation.
