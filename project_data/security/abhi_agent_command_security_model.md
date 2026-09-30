# ABHI Agent Command Security Model (Phase 9 Stage 2)

## 1. Security Principles

### 1.1 UI is Never the Authority
The frontend layer is strictly an **Experience Projection**. All security boundaries, permission checks, consent requirements, sandboxing, and execution constraints reside authoritatively within the backend `Supervisor`, `PolicyEngine`, and `SkillRuntime`.

### 1.2 Zero Direct Client Execution
Frontend code is architecturally prohibited from:
- Directly spawning OS processes or executing shell / PowerShell scripts.
- Directly invoking Win32 APIs or native handles.
- Directly executing arbitrary Playwright scripts or browser DOM manipulations outside the sandboxed backend skill runtime.
- Directly accessing raw filesystem paths without backend validation and path-traversal sanitation.

### 1.3 Untrusted Data Boundary (Prompt & Command Injection Defense)
All incoming natural language inputs, web page texts, OCR results, and media metadata are treated as untrusted data strings. They are never converted into raw Python `eval()` or unescaped shell commands. Direct mathematical evaluation in the frontend is restricted to strict numeric/operator regex (`^[\d\s\+\-\*\/\(\)\.\%]+$`).

### 1.4 Command History & Privacy Sanitization
Commands containing sensitive terms (e.g., `password`, `secret`, `api_key`, `token`, `private_key`, `otp`) are sanitized by `AgentCommandService`:
- They are processed securely for backend policy evaluation.
- They are immediately redacted from local client persistence (`commandHistory` signal) to prevent credential leakage in browser memory.

### 1.5 Consent & High-Risk Gate Retention
Any backend execution requiring elevated privileges or user confirmation (e.g., file system modifications, credential access, external API transactions) halts at `WAITING_FOR_APPROVAL` and renders the existing `ConsentModalComponent` without bypass.
