# Hallucination Reduction, Grounding & Safety Verification

## 1. Dual-State Disambiguation: Claim vs. Verified State

A critical flaw in naive AI agents is assuming an action succeeded simply because the LLM generated a tool completion response. In this system, the cognitive loop enforces a strict **Dual-State Separation**:

```
[LLM Tool Execution Attempt]
            │
            ▼
[Tool Invocation (e.g. Save File / Click Button)]
            │
            ▼
[Physical State Inspector (OS / File System / Playwright DOM)]
      ┌─────┴─────┐
      ▼           ▼
[State Matches?] ───► NO  ──► [Trigger Self-Correction / Retry Loop (Max 3)]
      │
      ▼ YES
[Verified State Recorded in Memory DAG]
      │
      ▼
[Supervisor Confirms to User]
```

---

## 2. Hallucination Suppression Techniques

1. **Constrained Schema Decoding:** All LLM outputs must match strict Pydantic JSON schemas. Malformed outputs are rejected at grammar decoding level before reaching application logic.
2. **Deterministic Grounding:** Tool arguments (file paths, window titles, URLs, coordinates) are cross-referenced with active OS inventory prior to execution.
3. **Retrieval Attribution:** In RAG workflows, generated answers must cite specific line numbers / file chunks retrieved from local storage.
4. **Independent Verification Agent:** For critical state changes (e.g. software build, database modification, bulk file changes), a lightweight secondary inspection pass verifies output artifacts before marking the step as complete.

---

## 3. Human-in-the-Loop Safety Interceptors

* **Tier 1 (Safe / Autonomous):** Read-only operations, search queries, screen captures, UI navigation, non-destructive app focus.
* **Tier 2 (Cautious / Notified):** File edits with automated backups, standard command executions, opening applications.
* **Tier 3 (High-Risk / Explicit Consent Required):**
  - Permanent file deletion or directory purging.
  - Commands with administrative privilege elevation.
  - Financial transactions, checkout clicks, or credential submissions in browser.
  - Direct modification of system registry or Windows system configurations.
