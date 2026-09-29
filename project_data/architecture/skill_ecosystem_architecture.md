# ABHI Architecture Document: Skill Ecosystem & Autonomous Execution Runtime

**Phase 7 — Stage 7.1**  
**Date:** September 2026  
**Status:** Implemented & Verified

---

## 1. Executive Overview

The **Skill Runtime Layer** is the production execution engine in ABHI that converts high-level user intentions into deterministic, observable, recoverable, and verified actions on Windows OS, browser, and local filesystem environments.

### Core Architectural Principle: Strict LLM Tool Sandboxing

```
User Goal
   ↓
Canonicalization
   ↓
Supervisor
   ↓
DAG Planner
   ↓
Skill Discovery (Deterministic matching)
   ↓
Policy Engine (Fail-closed validation)
   ↓
Execution Lease (Tokenized authorization)
   ↓
Perception Grounding (Semantic UIA / Visual OCR)
   ↓
Skill Execution (Windows / Browser / Files / Perception)
   ↓
Observation & State Capture
   ↓
Dual-State Verification
   ↓
Checkpointing & Recovery
   ↓
Memory & Audit Recording
```

The LLM is strictly constrained: it **never** has direct access to shell execution, subprocess spawning, arbitrary Python evaluation, or unvetted OS/browser APIs. The LLM only proposes structured DAG plans referencing registered skill identifiers (`skill_id@version`). The local policy engine, lease manager, and skill runtime enforce boundaries before any worker invocation occurs.

---

## 2. Strongly-Typed Skill Contract

Every skill in ABHI conforms to an immutable, strongly-typed contract:

```python
class SkillDefinition(BaseModel):
    skill_id: str
    name: str
    version: str = "1.0.0"
    description: str
    category: SkillCategory
    risk_level: SkillRiskLevel
    permissions: List[str]
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    preconditions: List[str]
    postconditions: List[str]
    grounding_requirements: List[str]
    confirmation_policy: str
    timeout_policy_ms: int = 10000
    retry_policy: Dict[str, Any]
    recovery_policy: str
    verification_policy: str
    supported_workers: List[str]
    enabled: bool = True
    lifecycle_state: SkillLifecycleState = SkillLifecycleState.ENABLED
    audit_metadata: Dict[str, Any]
```

### Immutable Version Key
A skill's deterministic execution key is `skill_id@version`. Running tasks remain pinned to the exact version selected at planning time, preventing mid-execution contract drifts.

---

## 3. Skill Taxonomy & Categories

Supported capability categories:
1. `WINDOWS`: Window enumeration, activation, reading desktop elements.
2. `APPLICATION`: Process launching and focus control.
3. `FILES`: Canonical directory listing, reading, searching, directory creation, copying, moving.
4. `BROWSER`: URL navigation, element clicking, text entry, and page reading via Playwright.
5. `PERCEPTION`: Screen observation, presence detection, gesture recognition.
6. `SYSTEM`, `TEXT`, `VISION`, `KNOWLEDGE`, `MEMORY`, `LLM`, `COMMUNICATION`, `MEDIA`, `UTILITY`.

---

## 4. Security & Boundary Enforcement

### Path Traversal & File Safety
- All file operations require strict path sanitization (`_sanitize_path`).
- Paths containing null bytes or resolving outside allowed directory trees (e.g. `C:\Windows\System32\config`, `C:\Boot`) fail closed immediately.
- Destructive operations (moving, deleting) carry `MEDIUM` or `HIGH` risk tiers requiring explicit consent.

### Browser Origin & Scheme Restrictions
- Browser URLs are strictly validated (`_validate_browser_url`).
- Dangerous URI schemes (`javascript:`, `file://`, `data:`, `about:`, `ftp://`) are rejected with `INVALID_ARGUMENTS` or `POLICY_DENIED`.
- Host collisions and credential-bearing URLs are blocked.

### Autonomy Limits
```python
class AutonomyLimits(BaseModel):
    max_task_duration_s: int = 300
    max_dag_nodes: int = 20
    max_retries_per_node: int = 3
    max_replans: int = 2
    max_concurrent_skills: int = 1
    max_recovery_attempts: int = 3
    max_tool_calls: int = 50
```

---

## 5. Checkpointing & Recovery

After each verified node completion:
- `CheckpointManager` records a `SessionCheckpoint`.
- The checkpoint captures `task_id`, `session_id`, `node_id`, `skill_id`, `action_id`, `result_summary`, and `verified=True`.
- In the event of worker or process interruption, recovery resumes from the latest verified checkpoint without duplicating completed side-effects.

---

## 6. Telemetry & Observability

The runtime publishes live WebSocket timeline events (`channel: skills_runtime`):
- `PLANNED`
- `ACTION_STARTED`
- `ACTION_COMPLETE`
- `VERIFIED`
- `RECOVERING`
- `REPLANNED`
- `FAILED`
- `COMPLETED`
