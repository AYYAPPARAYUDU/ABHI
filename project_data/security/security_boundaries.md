# Security Boundaries & Permission Enforcement Framework

## 1. System Trust Hierarchy

```
[USER] (Root Authority)
  │ (Voice / UI / Global Hotkey Consent)
  ▼
[ANGULAR FRONTEND] (Untrusted / Presentation Zone)
  │ (Validates input formats, no direct OS handles)
  ▼
[FASTAPI GATEWAY & SUPERVISOR] (Policy Enforcement Point)
  │ (Evaluates action risk tiers, checks path whitelists)
  ▼
[SPECIALIZED AGENTS & DRIVERS] (Constrained Execution Zone)
  │ (Executes atomic, verified operations)
  ▼
[OPERATING SYSTEM / BROWSER / FILESYSTEM]
```

---

## 2. Action Risk Classification & Permission Gates

| Risk Tier | Classification | Action Examples | Enforcement Mechanism |
| :--- | :--- | :--- | :--- |
| **Tier 1 (Safe)** | Read-Only & Perception | Screen capture, reading local docs, web search, mouse hover, focus window. | **Autonomous:** Executed immediately with audit log entry. |
| **Tier 2 (Cautious)** | Non-Destructive Mutations | Creating new files, opening known applications, writing temporary caches. | **Autonomous with Notification:** Toast banner in UI; automated `.bak` snapshot. |
| **Tier 3 (Critical / Dangerous)** | High-Impact & Irreversible | File deletion, overwriting system configs, admin/PowerShell execution, financial checkout in browser, credential access. | **Mandatory Explicit Consent:** Gateway pauses execution DAG, dispatches modal prompt to Angular UI, requires explicit user click or voice confirmation before proceeding. |

---

## 3. Sandboxing & Secret Hygiene Rules

1. **Zero Hardcoded Credentials:** All API keys, environment tokens, and credentials must be read exclusively from `.env` or Windows DPAPI keystores.
2. **Automated Log Redaction:** Structured logger regex scrubs passwords, credit cards, auth tokens, and session cookies prior to disk writes.
3. **Execution Timeouts:** All shell subprocesses enforce a hard 60-second execution cap to prevent orphan/zombie process locks.
4. **Hardware Panic Interlock:** Global keyboard hook (`Ctrl + Shift + Esc` / `F12`) instantly terminates active automation worker subprocesses.

---

## 4. Multimodal Perception & Execution Isolation Rules

1. **Strict Input-Only Perception:** Perception signals (speech, spatial hand gestures, face attention/expression) cannot directly trigger physical automation or invoke execution workers.
2. **Mandatory Canonical Normalization:** All voice/text inputs must be resolved into typed `CanonicalIntent` objects via the authoritative backend NLP/canonicalizer before any task creation.
3. **Multi-Frame Gesture Stabilization:** Gestures (`OPEN_PALM`, `THUMBS_UP`) require temporal debouncing over a minimum 3-frame stabilization window before producing semantic control events.
4. **Command Preview Gate:** Operator receives a structured preview before dispatching high-impact or ambiguous commands to the Supervisor.
5. **Fail-Closed Consent & Emergency Stop:**
   - `OPEN_PALM` or UI Panic triggers immediate fail-closed revocation of all automation leases and halts running execution DAGs.
   - Consent (`WAITING_USER_CONSENT`) cannot be bypassed by voice confidence or facial recognition.
