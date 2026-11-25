# ABHI Multi-Model Negotiation & Consensus Protocol

**Project:** ABHI — Local-First Personal AI Computer Automation System  
**Document:** `ABHI_MODEL_NEGOTIATION_PROTOCOL.md`  
**Status:** **AUTHORITATIVE & INTEGRATED**  
**Date:** 2026-11-24  

---

## 1. Protocol Overview

The Multi-Model Negotiation Protocol enables local LLMs to exchange structured technical arguments, challenge flawed premises, revise execution plans, and achieve verified consensus before physical actions execute.

To prevent token waste and uncontrolled infinite discussion loops:
- Deliberation is strictly bounded to a maximum of **3 rounds**.
- A per-round timeout (default 8.0 seconds) ensures rapid responsiveness.
- Raw model chain-of-thought is never exposed or logged; only concise conclusions, evidence snippets, and confidence ratings are preserved.
- The `CentralSupervisor` maintains ultimate arbitration authority.

---

## 2. Structured Message Types

Implemented in `backend/app/intelligence/model_negotiation.py`:

```
+---------------------------------------------------------------------------------+
|                               NEGOTIATION LIFECYCLE                             |
+---------------------------------------------------------------------------------+
| 1. TASK_PROPOSAL   | Master Model defines parsed intent & scope.                |
| 2. PLAN            | Reasoning Model generates topological execution steps.     |
| 3. EVIDENCE        | Research Model supplies LanceDB RAG / DOM spatial context. |
| 4. CRITIQUE        | Verification Model challenges risks & missing assertions.  |
| 5. REVISION        | Coding Model mutates plan to satisfy valid critiques.      |
| 6. APPROVAL        | Specialist models cast affirmative consensus votes.        |
| 7. DISAGREEMENT    | Emitted if irreconcilable safety/technical dispute occurs. |
| 8. FINAL_DECISION  | Supervisor arbitrates winning approach & ratifies the DAG. |
+---------------------------------------------------------------------------------+
```

---

## 3. Message Schema

```json
{
  "message_id": "cmsg_4f89ac12",
  "session_id": "csess_e82b19f0",
  "event_type": "CRITIQUE",
  "sender_agent_id": "sentinel-x",
  "recipient": "COUNCIL_ALL",
  "confidence_score": 0.96,
  "payload": {
    "sandbox_required": true,
    "human_consent_tier": 2,
    "missing_assertions": ["DualStateVerifier file size > 0"]
  },
  "rationale": "Safety check: Enforce read-only sandboxing on research node; prohibit destructive OS delete without explicit operator consent.",
  "timestamp_ms": 1732450892000
}
```

---

## 4. Supervisor Arbitration Mechanics

1. **Consensus Path ($\ge 75\%$ Agreement):**
   - When participating models approve the revised plan, `CentralSupervisor` issues a `FINAL_DECISION` event and ratifies the execution DAG.
2. **Deadlock / Disagreement Path:**
   - If consensus is not reached within 3 rounds, `CentralSupervisor` evaluates the proposals against:
     - *Safety Policies:* Least-privilege and non-destructive execution always triumph.
     - *Evidence Weight:* Verified file/screen evidence beats speculative assumptions.
     - *Explicit Consent:* If an action involves high-risk actions (e.g. deletion, external comms), the supervisor transitions into `WAITING_USER_CONSENT`.
