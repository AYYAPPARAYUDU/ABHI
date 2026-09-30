# Agent Gateway & Context Security Model (Phase 9 Stage 3)

## 1. Security Architecture Principles

### 1.1 Backend Authority Principle
All semantic interpretation, skill discovery, policy evaluation, deterministic math evaluation, and workflow scheduling reside authoritatively within the backend Python service. The frontend Angular code is strictly a presentation and interaction layer.

### 1.2 Zero Frontend Direct Execution
The frontend is structurally incapable of:
- Directly spawning processes via shell, PowerShell, or Python.
- Directly invoking native Win32 handles or Playwright browser instances.
- Directly manipulating the filesystem or reading credentials.

### 1.3 Safe Deterministic AST Evaluation
Arithmetic queries are validated and parsed via Python's `ast` module against an explicit whitelist of safe binary/unary operators. Raw string execution (`eval()` / `exec()`) is strictly prohibited. Division by zero and type mismatches are caught and handled gracefully.

### 1.4 Command History Sanitization
Incoming command utterances are scanned for sensitive credential patterns (passwords, tokens, API keys, private keys, OTPs) using compiled regex sanitizers. Redacted versions (`[REDACTED_CREDENTIAL]`) are persisted in thread histories.

### 1.5 Context Security & Permission Isolation
- **Context is Information, Not Permission**: Having an active `selected_artifact_id` in context does not grant privilege to execute unauthorized mutations.
- **Cross-Task / Cross-Project Isolation**: The Gateway verifies artifact and task existence against persistent SQLite records before attaching them to new workflow goals.
- **Strict Consent Enforcement**: Critical actions (e.g. file deletion, OS shutdown, system configuration changes) halt execution at `WAITING_FOR_APPROVAL` and require explicit operator confirmation via `ConsentModalComponent` or the Attention Banner.
