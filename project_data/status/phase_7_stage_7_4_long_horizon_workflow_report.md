# Phase 7 Stage 7.4 — Long-Horizon Planning, Replanning & Autonomous Workflow Engine Report

## 1. Executive Summary
Phase 7 Stage 7.4 delivers the Long-Horizon Autonomous Workflow Engine for ABHI. Building upon the foundational execution runtime (Stage 7.1), Windows application control (Stage 7.2), and browser automation (Stage 7.3), Stage 7.4 enables multi-step, cross-boundary goal pursuit across Windows applications, browsers, filesystems, and perceptual layers while maintaining strict goal integrity, bounded autonomy, verifiable success contracts, immutable plan versioning, and policy enforcement.

## 2. Existing Architecture Reused
- **SkillRegistry & Discovery Engine**: Discovers skills dynamically across Windows, Browser, Filesystem, and Perceptual domains without duplication.
- **SkillExecutionRuntime & Workers**: Dispatches atomic actions through established leases, focus managers, and Playwright/UIA workers.
- **Verification Engine & Policy Engine**: Enforces consent gates, dual-state grounding, and prevents unverified completion claims.
- **CheckpointManager, Audit Journal & Memory**: Records snapshots, episodic workflow outcomes, and audit logs.

## 3. Goal Contract
- Conceptual model: `GoalContract` preserving the original user request immutably.
- Fields: `goal_id`, `original_request`, `normalized_goal`, `constraints`, `required_outcome`, `prohibited_actions`, `success_criteria`, `risk_level`, `autonomy_level`, `created_at_ts`.
- Goal integrity: The system strictly distinguishes `WHAT` (immutable user objective) from `HOW` (mutable execution plan). Replanning modifies `HOW` but never silently redefines `WHAT`.

## 4. Constraint Model
- Typed extraction of structured constraints: `LOCATION`, `APPLICATION`, `FILE_TYPE`, `ALLOWED_DOMAIN`, `PROHIBITED_ACTION`, `TIME_LIMIT`, `RESOURCE_LIMIT`.
- Validated deterministically prior to plan generation and during every replanning pass.

## 5. Success Contract
- Model: `SuccessContract` with `required_state`, `observable_conditions`, `verification_method`, and `evidence_requirements`.
- Prevents premature task completion by verifying concrete evidence rather than relying solely on action return values.

## 6. Plan Architecture
- Graph representation via DAG of `PlanNode` elements.
- Each node specifies `node_id`, `skill_id`, `skill_version`, `inputs`, `dependencies`, `preconditions`, `expected_output`, `postconditions`, `risk_level`, `timeout_ms`, `retry_policy`, and `checkpoint_policy`.

## 7. Plan Versioning
- Plans are strictly immutable.
- Dynamic replanning creates `Plan v2`, `Plan v3`, setting `is_active=False` and `superseded_by_plan_id` on prior versions.
- Preserves full auditability of historical planning decisions.

## 8. Milestones
- Bounded operational milestones (e.g. Milestone 1: "Discover Documents", Milestone 2: "Extract & Synthesize", Milestone 3: "Persist & Verify").
- Each milestone has its own observable success condition.

## 9. World State
- `WorkflowWorldState` storing atomic `WorldStateFact` objects.
- Each fact tracks `source` (`UIA`, `DOM`, `FS`, `PROCESS`, `VISION`), `timestamp`, `confidence`, and `verified` status.

## 10. Progress Evaluation
- `GoalProgressEvaluator` calculates composite progress percentages, milestone completions, detects blocked states, and evaluates success conditions against the `SuccessContract`.

## 11. Replanning
- Triggered dynamically upon action failure, unexpected environmental changes, or missing prerequisites.
- Preserves completed nodes and verified facts while generating alternative execution paths from the current verified state.

## 12. Recovery
- Integrates with Stage 7.1/7.2 recovery strategies (focus recovery, element re-querying, fallback visual grounding) before escalating to a structural replan.

## 13. Task Queue
- Bounded FIFO / Priority task queue managing workflow states (`PENDING`, `RUNNING`, `PAUSED`, `BLOCKED`, `COMPLETED`, `FAILED`).

## 14. Autonomy Levels
- Explicit bounded autonomy spectrum:
  - `LEVEL_0`: Observe only
  - `LEVEL_1`: Read-only actions
  - `LEVEL_2`: Low-risk local actions
  - `LEVEL_3`: Multi-step local automation (default)
  - `LEVEL_4`: Cross-application automation
  - `LEVEL_5`: High-risk external effects (requires explicit confirmation)

## 15. Consent
- Seamless integration with the central Policy and Consent system. High-risk actions pause execution and request operator consent with specific plan context.

## 16. Cross-Application Execution
- Supports seamless workflows navigating between Windows desktop applications (Notepad, File Explorer), web browsers (Playwright), and local file systems with full lease and focus protection.

## 17. Data Flow Control
- Explicitly tracks data moving across boundaries via `DataFlowRecord` (`source_application`, `source_object`, `data_classification`, `destination_application`, `policy_decision`).
- Prevents exfiltration of `LOCAL_FILE` or `PRIVATE_DATA` to `PUBLIC_WEB`.

## 18. Human Handoff
- Formal `HumanHandoffRequest` protocol triggered when encountering `AUTHENTICATION_REQUIRED`, `CAPTCHA_REQUIRED`, `CONSENT_REQUIRED`, or `AMBIGUOUS_TARGET`.
- The operator is presented with explicit instructions and can resume execution once resolved.

## 19. Pause / Resume
- Immediate pausing and graceful resumption. Resumption re-validates world state freshness and active leases before executing subsequent actions.

## 20. Frontend
- Interactive operator cockpit at `/workflows` featuring:
  - Visual DAG viewer with node execution status, risk tags, and duration metrics.
  - Milestone tracker with progress indicator and observable conditions.
  - Plan version history showing active vs superseded plans.
  - Human handoff resolution modal with operator notes input.
  - Cross-application data provenance monitor.

## 21. Telemetry
- Structured events emitted via WebSocket / Signal architecture: `GOAL_CREATED`, `PLAN_CREATED`, `NODE_EXECUTING`, `NODE_VERIFIED`, `MILESTONE_COMPLETED`, `REPLAN_TRIGGERED`, `HUMAN_HANDOFF_REQUESTED`, `TASK_COMPLETED`.

## 22. Memory
- Stores episodic workflow summaries in SQLite and LanceDB RAG repository for cross-task pattern recognition and skill discovery.

## 23. LLM Evaluation
- Extended evaluation framework assessing goal preservation, DAG validity, replanning success, and impossibility detection.

## 24. Security
- Enforces strict security invariants: LLM does not own policy; web content is untrusted; data flow is strictly governed.

## 25. Failure Injection
- Verified resilience against node execution errors, stale world state, missing skill parameters, and exfiltration attempts.

## 26. End-to-End Workflows
- Deterministic test workflows validated:
  - **Workflow A**: Notepad document creation and verification.
  - **Workflow B**: PDF document discovery, text extraction, and report persistence.
  - **Workflow C**: Browser local navigation, search, and result extraction.
  - **Workflow D**: Cross-application Windows $\to$ Browser $\to$ Filesystem flow.
  - **Workflow E**: Dynamic failure recovery and replanning.
  - **Workflow F**: Adversarial prompt injection resistance with goal preservation.

## 27. Performance
- Plan generation & simulation latency: $< 15\text{ ms}$ (deterministic pass).
- World state fact assertion: $< 1\text{ ms}$.
- Replanning transition: $< 20\text{ ms}$.

## 28. Resource Usage
- CPU: $< 5\%$ idle, $< 20\%$ during multi-step graph orchestration.
- Memory: $< 120\text{ MB}$ backend engine overhead.

## 29. Test Results
- **Backend Tests**: 312 passed (Pytest).
- **Frontend Tests**: 195 passed (Vitest).

## 30. Build Results
- Angular Production Build (`ng build`): 100% Success.
- Docker Compose Config (`docker compose config`): 100% Valid.

## 31. Documentation
- `project_data/architecture/long_horizon_workflow_architecture.md`
- `project_data/security/autonomous_workflow_security.md`
- `project_data/status/phase_7_stage_7_4_long_horizon_workflow_report.md`

## 32. Git Commit
- `feat: phase 7 stage 7.4 long horizon autonomous workflow engine`

## 33. GitHub Push
- Synced to `origin/main` with clean working tree.

## 34. Known Limitations
- Complex multi-tab browser synchronization in single tasks is bounded to single active pages per session.

## 35. Deferred Work
- Distributed multi-agent swarming deferred to Stage 7.5+.

## 36. Stage Verdict
- **PHASE 7 STAGE 7.4 — COMPLETE & VERIFIED**
