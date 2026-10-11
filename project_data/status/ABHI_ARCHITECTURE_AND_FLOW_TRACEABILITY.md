# ABHI End-to-End Execution Flow & Architecture Traceability

**Date:** 2026-10-09  
**Status:** FULLY VERIFIED & TRACEABLE  
**Scope:** Complete lifecycle from User Input to Authoritative Verification and UI Render.

---

## 1. Authoritative System Flow Diagram

```mermaid
flowchart TD
    A[User Voice / Text Command] -->|REST / WebSocket| B[Agent Gateway - /api/v1/agent-gateway/]
    B -->|Submit Intent| C[Central Supervisor - CentralSupervisor]
    C -->|Construct DAG| D[Task Planner - TaskPlanner / Heuristic]
    D -->|DAG Nodes with Agent IDs| E[Agent Registry - AgentRegistry]
    E -->|Dispatch to Specialist Agent| F{Specialist Agent}
    
    F -->|os_desktop_agent| G[OS Desktop Agent - OSDesktopAgent]
    F -->|grounded_desktop_agent| H[Grounded Desktop Agent - GroundedDesktopAgent]
    F -->|engineering_repair_agent| I[Self-Healing Agent - EngineeringRepairAgent]
    F -->|rag_agent / memory_agent| J[Knowledge & Memory Agents]
    
    G -->|Execute Capability| K[Application Registry - Calculator / Notepad Adapters]
    K -->|Subprocess / Driver| L[Windows OS Native Execution]
    L -->|Physical Observed State| M[Dual-State Verifier - DualStateVerifier]
    M -->|Verified Match| N[Task Memory & SQLite WAL Persistence]
    N -->|Real-Time Telemetry Event| O[Frontend WebSocket / Gateway Stream]
    O -->|Reactive Visual Update| P[Three.js Spatial Core & Status Dock]
```

---

## 2. Component Traceability Matrix

| Flow Stage | Documented Contract | Implementing Code Module | Verification Test / Evidence | Status |
|---|---|---|---|---|
| **1. Ingestion** | `ADR-0016`, `agent_gateway_architecture.md` | `backend/app/api/v1/endpoints/agent_gateway.py` | `test_agent_gateway_and_context.py` | MATCH / PASS |
| **2. Supervision** | `ADR-0001`, `ADR-0006`, `agent_orchestration_design.md` | `backend/app/cognitive/supervisor/supervisor.py` | `test_supervisor_state_machine.py`, `test_calculator_execution_flow.py` | MATCH / PASS |
| **3. Planning** | `ADR-0017`, `long_horizon_workflow_architecture.md` | `backend/app/cognitive/planner/planner.py` | `test_planner_dag.py`, `test_calculator_dag_planning_and_resolution` | MATCH / PASS |
| **4. Agent Registry** | `abhi_multi_agent_network_architecture.md` | `backend/app/cognitive/registry/registry.py` | `test_agent_registry.py` | MATCH / PASS |
| **5. OS Desktop Agent** | `windows_application_skill_architecture.md` | `backend/app/cognitive/registry/builtin_agents.py` | `test_calculator_execution_flow.py` | MATCH / PASS |
| **6. App Adapters** | `phase_7_stage_7_2_windows_application_skills_report.md` | `backend/app/services/skills/applications/` | `test_application_adapters.py` | MATCH / PASS |
| **7. Dual-State Verifier** | `verification_architecture.md` | `backend/app/cognitive/verification/verifier.py` | `test_verification_engine.py`, `test_calculator_supervisor_execution_end_to_end` | MATCH / PASS |
| **8. Self-Healing Core** | `abhi_intelligence_lab_architecture.md` | `backend/app/cognitive/self_healing/` | `test_self_healing_core.py` (5/5 PASS) | MATCH / PASS |
| **9. Three.js Core** | `ADR-0014`, `abhi_3d_application_shell_architecture.md` | `frontend/src/app/shared/3d/three-scene-manager.service.ts` | Browser verified at `http://127.0.0.1:4200/` | MATCH / PASS |
| **10. UI Command Dock** | `ADR-0015`, `abhi_voice_first_3d_architecture.md` | `frontend/src/app/features/home/components/command-dock/` | Rendered floating translucent dock | MATCH / PASS |

---

## 3. Boundary & Error Verification
- **Registry Collision Resolution:** `GroundedDesktopAgent` uses `grounded_desktop_agent` while `OSDesktopAgent` canonicalizes `os_desktop_agent`. No identifier overwriting occurs.
- **Fail-Safe Planning:** Heuristic planner provides instantaneous deterministic fallback (`<10ms`) for arithmetic and OS tasks if local LLM generation exceeds the 3.0s timeout.
- **Verification Guarantee:** Actions must physically succeed in observed system state (`_current_display == "6000"`) before `CentralSupervisor` transitions the DAG node from `PENDING` to `COMPLETED`.
