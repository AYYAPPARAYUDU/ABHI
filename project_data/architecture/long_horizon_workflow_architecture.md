# Long-Horizon Workflow Architecture

## 1. Overview
The **Long-Horizon Workflow Engine** (Phase 7 Stage 7.4) extends ABHI's cognitive automation architecture with bounded, multi-step goal pursuit across Windows applications, modern browsers, filesystem operations, and visual perception.

It enforces a fundamental architectural separation between:
- **GOAL (`WHAT`)**: Typed, immutable contract capturing original user intent, constraints, and verifiable success criteria.
- **PLAN & ACTIONS (`HOW`)**: Dynamically constructed, simulated, and executed Directed Acyclic Graphs (DAGs) capable of bounded replanning without silent drift of the user's objective.

---

## 2. Core Architectural Components

```text
                        USER GOAL
                            │
                            ▼
                   ┌─────────────────┐
                   │  GoalContract   │  (Immutable Request & Constraints)
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Long-Horizon    │  (Semantic decomposition,
                   │ Planner         │   deterministic heuristics)
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ PlanSimulation  │  (Dry-run permission, risk,
                   │ & Validation    │   resource, and cost analysis)
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ WorkflowPlan    │  (Immutable Plan v1, v2...)
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ SkillExecution  │  (Lease, Policy, Consent,
                   │ Runtime         │   Windows UIA, Playwright)
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Observation &   │  (Atomic facts with source
                   │ World State     │   attribution & freshness decay)
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ GoalProgress    │  (Milestone evaluation,
                   │ Evaluator       │   impossibility detection, replan)
                   └────────┬────────┘
                            │
               ┌────────────┼────────────┐
               ▼            ▼            ▼
           COMPLETE     RECOVER/REPLAN  BLOCKED
               │            │            │
               ▼            ▼            ▼
          SuccessContract  Plan v2    HumanHandoff
```

---

## 3. Key Contracts & Models

### 3.1 GoalContract
- `goal_id`: Unique identifier for the goal instance.
- `original_request`: Raw immutable user prompt string.
- `normalized_goal`: Canonical objective statement.
- `constraints`: Structured constraints (`LOCATION`, `APPLICATION`, `FILE_TYPE`, `ALLOWED_DOMAIN`, `PROHIBITED_ACTION`, etc.).
- `required_outcome`: Measurable target outcome.
- `prohibited_actions`: Explicitly forbidden skills/operations.
- `success_criteria`: Human and machine verifiable conditions.
- `risk_level` & `autonomy_level`: Operational risk bounds (`LEVEL_0` to `LEVEL_5`).

### 3.2 SuccessContract
- `required_state`: Target state key-values.
- `observable_conditions`: Predicates evaluated against verified world state.
- `verification_method`: Grounding strategy (`DUAL_STATE`, `OCR_GROUNDING`, `DOM_ASSERTION`, `FS_VERIFY`).
- `evidence_requirements`: Required artifacts before claiming completion.

### 3.3 WorkflowPlan & Versioning
- Plans are strictly immutable.
- Dynamic replanning generates a new version (`Plan v1` $\to$ `Plan v2`), marking the prior plan as superseded with `superseded_by_plan_id` and audit logging.
- Composed of bounded **Milestones** with observable milestone success conditions.

### 3.4 WorkflowWorldState & Freshness Decay
- Atomic `WorldStateFact` records facts with:
  - `key` & `value`
  - `source` (`UIA`, `DOM`, `FS`, `PROCESS`, `VISION`)
  - `confidence` ($0.0 \dots 1.0$)
  - `verified`: Boolean verification flag
  - `timestamp`: Decay tracking against `freshness_threshold_ms`. Expired facts require re-observation.

---

## 4. Human Handoff Protocol
When execution encounters conditions outside bounded autonomy:
- `AUTHENTICATION_REQUIRED` (MFA, passwords)
- `CAPTCHA_REQUIRED` (bot detection)
- `CONSENT_REQUIRED` (elevated tier action)
- `AMBIGUOUS_TARGET` (multiple matching files/elements)
- `POLICY_BLOCKED` (forbidden domain or path)

The engine yields a `HumanHandoffRequest`, pauses execution safely, presents the operator with clear instructions, and securely awaits resolution before resuming.
