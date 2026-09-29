# Autonomous Workflow Security & Data Governance

## 1. Security Axioms & Invariant Boundaries

1. **LLM Does Not Own Policy**: Natural language outputs or model suggestions are subject to deterministic schema validation and policy evaluation before any worker action.
2. **Web Content Is Untrusted**: Data extracted from DOM or web pages cannot alter the immutable `GoalContract` or elevate execution permissions.
3. **Data Exfiltration Prevention**: Moving data classified as `LOCAL_FILE` or `PRIVATE_DATA` to an external `PUBLIC_WEB` destination without explicit policy authorization and user consent is blocked.
4. **Bounded Autonomy Limits**:
   - `max_replans`: 3
   - `max_total_nodes`: 50
   - `max_task_duration_ms`: 1,800,000 (30 mins)
   - `max_llm_calls`: 20
5. **No Secret Ingestion**: Passwords, MFA tokens, and sensitive authentication material are routed exclusively through the `HumanHandoff` protocol.

---

## 2. Cross-Application Data Provenance Model

Every cross-boundary data transfer is audited via `DataFlowRecord`:
- `transfer_id`: Unique transfer identifier
- `source_application`: e.g. `FileSystem`, `Notepad`
- `source_object`: e.g. `Downloads/quarterly_report.pdf`
- `data_classification`: `LOCAL_FILE`, `PRIVATE_DATA`, `PUBLIC_WEB`, `INTERNAL_SYSTEM`
- `destination_application`: e.g. `Browser`, `Notepad`
- `transfer_reason`: Context justification
- `policy_decision`: `ALLOWED`, `DENIED`, `CONSENT_REQUIRED`

---

## 3. Adversarial Resilience Matrix

| Attack / Hazard Vector | Mitigation Strategy | Verification |
|---|---|---|
| Prompt Injection in Web Page | Web context isolation; goal immutability; untrusted source tagging | `test_workflow_scenario_f_adversarial_prompt_injection` |
| Goal Redefinition via Replan | Goal contract immutable; integrity validator asserts all prohibited actions & required outcomes | `test_workflow_goal_integrity_preservation` |
| Endless Replanning Loops | Strict `max_replans` counter capped at 3; hard abort to `BLOCKED` | `test_workflow_max_replans_limit_enforced` |
| Expired Leases / State Desync | Fact freshness threshold validation; state refresh prior to side-effect execution | `test_workflow_stale_world_state_triggers_reobservation` |
| Unauthorized File Overwrite | Prohibition rules in `GoalContract`; explicit destination path enforcement | `test_workflow_scenario_a_notepad_creation` |
