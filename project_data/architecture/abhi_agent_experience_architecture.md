# ABHI Agent Experience Architecture

## Executive Summary
This document specifies the **Agent Experience Projection Architecture** for ABHI. In default `USER MODE`, internal agent complexity (Supervisors, Planners, DAG node IDs, Worker leases, Recovery state machines) is hidden behind clear, humanized outcome updates. Advanced and Developer modes provide progressively deeper technical telemetry without cluttering the primary operator workspace.

---

## 1. The Outcome-First Interaction Model

```text
USER INTENT ("Open Calculator", "Create night city video")
    ↓
CENTRAL SUPERVISOR (Backend Authoritative Core)
    ↓
PLANNER & MULTI-AGENT DAG
    ↓
WORKER DISPATCH & VERIFICATION
    ↓
TELEMETRY EVENT BUS (WebSocket / Reactive Stream)
    ↓
OPERATOR STATE SERVICE (Angular Signals)
    ↓
PROJECTION BY EXPERIENCE MODE:
    ├── USER MODE      → "Working…", "Opening Calculator…", "Completed"
    ├── ADVANCED MODE  → Workflow steps, resources, artifact lineage
    └── DEVELOPER MODE → DAG node traces, worker leases, verification diffs
```

---

## 2. Three User Experience Modes

| Mode | Target User | Displayed Information |
| :--- | :--- | :--- |
| **USER** *(Default)* | Everyday Operator | Humanized progress, status badges, outcomes, essential error recovery options, consent gates. |
| **ADVANCED** | Power User / Creator | Step-by-step pipeline execution, resource utilization summaries, media artifact lineage, retry controls. |
| **DEVELOPER** | Core Engineer / Auditor | Real-time telemetry log stream, worker status, lease IDs, UIA grounding confidence scores, verification metrics. |

---

## 3. Humanized Copy Translation Matrix

| Raw Internal Telemetry Event | User Mode Presentation | Advanced Mode Presentation |
| :--- | :--- | :--- |
| `TASK_CREATED` | *Planning your request…* | Task initialized, DAG generation in progress |
| `GROUNDING_STARTED` | *Locating target on screen…* | Level 1 UIA element resolution active |
| `LEASE_ACQUIRED` | *Resources ready* | Automation lease granted (TTL: 15s) |
| `ACTION_EXECUTING` | *Executing action…* | Worker executing step `act_104` |
| `VERIFICATION_COMPLETED` | *Verified successfully* | Dual-state visual & DOM verification passed |
| `TASK_COMPLETED` | *Completed* | Task execution finished in 450ms |
| `TASK_EMERGENCY_STOPPED` | *Emergency Stopped* | Safety policy revoked all active leases |

---

## 4. Safety & Consent Preservation
Hiding agent internals in User Mode **never bypasses safety or consent**. When an action requires operator authorization (Tier 2/3 Critical Actions), the `ConsentModalComponent` reactively intercepts the flow, displaying clear reasoning and risk levels before any worker dispatch is permitted.
