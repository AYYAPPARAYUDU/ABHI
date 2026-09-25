# Phase 3 Readiness Contract & Cognitive Core Scope

**Document ID:** PHASE-3-CONTRACT-001  
**Status:** READY FOR PHASE 3 EXECUTION  
**Prerequisite:** Phase 2 Audit Passed, 100% Tests Passing, Git Tree Clean

---

## 1. Scope of Phase 3: Cognitive Core & Multi-Agent Architecture

Phase 3 builds the cognitive brain of the system on top of the Phase 2 FastAPI and SQLite foundation:

```
                                [USER INPUT]
                                     │
                                     ▼
                   ┌───────────────────────────────────┐
                   │    1. CENTRAL SUPERVISOR AGENT    │
                   │  • Master State Machine           │
                   │  • Human Consent Interceptor      │
                   │  • Task DAG Lifecycle Manager     │
                   └─┬───────────────┬───────────────┬─┘
                     │               │               │
       ┌─────────────┘               │               └─────────────┐
       ▼                             ▼                             ▼
┌──────────────┐              ┌──────────────┐              ┌──────────────┐
│  2. PLANNER  │              │  3. MEMORY   │              │   4. RAG     │
│   (DAG Engine│              │  (Working /  │              │  (LanceDB +  │
│  & Scheduler)│              │   Episodic)  │              │   BM25)      │
└──────┬───────┘              └──────────────┘              └──────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      5. AGENT REGISTRY & DISPATCHER                      │
│  (Typed Metadata: ID, Capabilities, Input/Output Schemas, Permissions)   │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │   6. VERIFICATION ENGINE      │
                   │  • Precondition Verification  │
                   │  • Dual-State Postcondition   │
                   │  • Auto-Correction (Max 3)    │
                   └───────────────────────────────┘
```

---

## 2. Core Subsystems to Implement in Phase 3

### Subsystem 1: Central Supervisor Agent
* **State Machine:** Deterministic states: `IDLE` -> `PARSING_INTENT` -> `PLANNING` -> `WAITING_USER_CONSENT` -> `DISPATCHING` -> `VERIFYING` -> `COMPLETED` -> `FAILED`.
* **Safety Gates:** Intercepts Tier 3 actions and dispatches approval prompts to UI over `/ws/telemetry`.
* **Cancellation & Recovery:** Instant abort on emergency stop message; clean DAG rollback.

### Subsystem 2: Task DAG Planner Engine
* **Representation:** Directed Acyclic Graph (DAG) with typed step nodes, input/output schemas, and dependency links.
* **Execution:** Topological execution with dependency resolution, retry budgets, and failure isolation.

### Subsystem 3: Agent Registry & Metadata Schema
* Standardized registry storing metadata: `agent_id`, `version`, `capabilities`, `input_schema`, `output_schema`, `risk_tier`, `timeout_seconds`, `execution_boundary`.

### Subsystem 4: Segmented Memory Subsystem
* **Working Memory:** Active session token scratchpad.
* **Episodic Memory:** SQLite table storing past completed tasks, solutions, and user feedback.
* **Profile Memory:** User custom settings and preferences.

### Subsystem 5: Hybrid RAG & LanceDB Engine
* Local document chunking, embeddings (`bge-m3`), LanceDB disk-backed vector search + BM25 sparse keyword retrieval, citation attribution.

### Subsystem 6: Dual-State Verification Engine
* Compares `claimed_output` with `observed_system_state`.
* Automated correction loop (up to 3 retries) before declaring task failure.

---

## 3. Explicit Phase 3 Exclusions (Deferred to Later Phases)

To maintain focus and avoid premature complexity, the following are strictly **EXCLUDED from Phase 3**:
* ❌ Full physical Windows mouse/keyboard automation (Phase 5).
* ❌ Full Playwright web browser crawling (Phase 5).
* ❌ MediaPipe camera face/hand vision daemon (Phase 4).
* ❌ Real-time WASAPI audio STT/TTS loop (Phase 4).
* ❌ PyTorch Diffusers image/video generation (Phase 7).
* ❌ Full Three.js 3D avatar viewport rendering (Phase 6).

---

## 4. Phase 3 Quality & Verification Gates

1. **Deterministic State Machine Tests:** All Supervisor state transitions must be covered by async unit tests.
2. **DAG Scheduler Tests:** Complex multi-step task decomposition with simulated failures and dependency rollbacks must pass.
3. **LanceDB Vector Retrieval Tests:** Ingesting test documents and performing hybrid semantic + keyword search with verified source citations.
