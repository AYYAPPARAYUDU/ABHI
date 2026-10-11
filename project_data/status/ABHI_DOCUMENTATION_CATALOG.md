# ABHI Master Documentation Catalog

**Date:** 2026-10-09  
**Repository:** `C:\Users\AYYAPPA RAYUDU\OneDrive\Desktop\ABHI`  
**Status:** Authoritative Repository Inventory & Catalog  

---

## 1. Executive Summary & Inventory Overview
This catalog documents every architectural blueprint, ADR, specification, requirement, security policy, and implementation report present in the ABHI repository.

Total Documented Artifacts across `project_data/`:
- **Architecture Blueprints:** 37 files (`project_data/architecture/`)
- **Architecture Decision Records (ADRs):** 19 files (`project_data/decisions/`)
- **Status, Milestone & Phase Reports:** 47 files (`project_data/status/`)
- **Security Models & Threat Profiles:** 17 files (`project_data/security/`)
- **Requirements & Risk Profiles:** 4 files (`project_data/requirements/`)
- **Research & Technology Audits:** 11 files (`project_data/research/`)
- **Hardware & Resource Governance:** 3 files (`project_data/hardware/`)
- **Storage & Technology Policies:** 3 files (`project_data/storage/`, `project_data/technologies/`)

---

## 2. Architecture Blueprints (`project_data/architecture/`)

| Document Path | Purpose & Scope | Status | Related Code / Modules |
|---|---|---|---|
| `project_data/architecture/abhi_3d_application_shell_architecture.md` | Full-screen Three.js workspace, orbital core, elimination of permanent sidebars | AUTHORITATIVE | `frontend/src/app/shared/3d/`, `frontend/src/app/features/home/` |
| `project_data/architecture/abhi_voice_first_3d_architecture.md` | Voice-first spatial canvas and compact dock interaction model | AUTHORITATIVE | `frontend/src/app/features/home/components/command-dock/` |
| `project_data/architecture/abhi_agent_command_center_architecture.md` | Authoritative Gateway, intent dispatch, and DAG lifecycle | AUTHORITATIVE | `backend/app/api/v1/endpoints/agent_gateway.py`, `CentralSupervisor` |
| `project_data/architecture/abhi_multi_agent_network_architecture.md` | Multi-agent registry topology, agent capabilities, and coordination | AUTHORITATIVE | `backend/app/cognitive/registry/`, `backend/app/cognitive/supervisor/` |
| `project_data/architecture/abhi_intelligence_lab_architecture.md` | Local model telemetry, evaluation metrics, and self-healing engine | AUTHORITATIVE | `backend/app/cognitive/self_healing/`, `backend/app/services/llm_evaluation/` |
| `project_data/architecture/abhi_business_sector_architecture.md` | Autonomous sector projects, task graph workflows, and domain persistence | AUTHORITATIVE | `backend/app/business/`, `frontend/src/app/features/business/` |
| `project_data/architecture/agent_gateway_architecture.md` | Gateway contracts for REST/WebSocket ingestion and telemetry | AUTHORITATIVE | `backend/app/api/v1/endpoints/agent_gateway.py` |
| `project_data/architecture/windows_application_skill_architecture.md` | Native Windows application adapters (Calculator, Notepad, Explorer, Terminal) | AUTHORITATIVE | `backend/app/services/skills/applications/` |
| `project_data/architecture/browser_skill_architecture.md` | Playwright semantic automation, visual grounding, and resilience | AUTHORITATIVE | `backend/app/automation/browser/`, `backend/app/automation/orchestration/` |
| `project_data/architecture/verification_architecture.md` | Dual-state verification comparing claimed model states against observed physical system state | AUTHORITATIVE | `backend/app/cognitive/verification/` |
| `project_data/architecture/personal_memory_architecture.md` | SQLite WAL procedural, episodic, and structured memory storage | AUTHORITATIVE | `backend/app/storage/` |

---

## 3. Architecture Decision Records (`project_data/decisions/`)

| ADR ID & Path | Title & Core Decision | Status |
|---|---|---|
| `ADR-0001` | Multi-process modular architecture with hardened IPC boundaries | APPROVED |
| `ADR-0002` | SQLite WAL persistence and LanceDB hybrid vector engine | APPROVED |
| `ADR-0003` | Python 3.14 runtime standard | APPROVED |
| `ADR-0004` | Hardened IPC and VRAM arbitration contract | APPROVED |
| `ADR-0005` | Desktop and browser automation visual grounding and safety leases | APPROVED |
| `ADR-0006` | Reconciled automation lease and supervisor lifecycle | APPROVED |
| `ADR-0007` to `ADR-0013` | Multimodal media generation, video chunking, inpainting, and creative workflows | APPROVED |
| `ADR-0014` | 3D Agentic Application Shell with elimination of persistent sidebars | APPROVED |
| `ADR-0015` | Unified Agent Command Center and live feedback streams | APPROVED |
| `ADR-0016` | Authoritative Agent Gateway eliminating frontend execution logic | APPROVED |
| `ADR-0017` | Bounded Agent Context and deterministic DAG planning | APPROVED |

---

## 4. Status, Verification & Phase Reports (`project_data/status/`)

| Document Path | Phase / Subject | Verification State |
|---|---|---|
| `ABHI_CURRENT_FAILURE_AND_RECOVERY_REPORT.md` | Live failure diagnosis, registry collision resolution, and recovery evidence | ACTIVE / RESOLVED |
| `ABHI_AGENT_REGISTRY_FAILURE_REPORT.md` | Detailed root-cause analysis of `os_desktop_agent` collision & fix | ACTIVE / VERIFIED |
| `ABHI_UI_RUNTIME_MISMATCH_REPORT.md` | Inspection of served port 4200 vs 8000, sidebar removal & Three.js canvas | ACTIVE / VERIFIED |
| `ABHI_ARCHITECTURE_AND_FLOW_TRACEABILITY.md` | Complete end-to-end execution flow traceability matrix | ACTIVE / VERIFIED |
| `ABHI_LIVE_INTEGRATION_VERIFICATION.md` | Live test results, Calculator (`125 * 48 = 6000`), Notepad, Vitest, and Pytest | ACTIVE / VERIFIED |
| `ABHI_GOLD_STANDARD_ACCEPTANCE.md` | Authoritative acceptance criteria gate matrix | ACTIVE / VERIFIED |
| `phase_9_stage_3_3d_agentic_operating_environment_report.md` | Phase 9 Stage 3 3D UI & workspace redesign report | HISTORICAL / UPDATED |
| `phase_7_stage_7_2_windows_application_skills_report.md` | Windows application skill adapters (Calculator, Notepad, Explorer, Terminal) | HISTORICAL / VALIDATED |
| `phase_5_stage_5_4_implementation_report.md` | Visual grounding and OCR coordinates for Windows controls | HISTORICAL / VALIDATED |

---

## 5. Security Models (`project_data/security/`)
- `abhi_3d_ui_security_model.md`: WebGL context isolation and sanitization of 3D payload strings.
- `abhi_agent_command_security_model.md`: Gateway token verification and command sanitization.
- `autonomous_workflow_security.md`: Three-tier risk governance (Tier 1: Read, Tier 2: Write, Tier 3: Destructive/Protected).
- `browser_security_model.md`: Domain allowlisting, URL sanitization, credential masking.
- `security_boundaries.md`: Process isolation, sandbox directories, safe subprocess invocation.

---

## 6. Traceability Summary
All active code components in `backend/app/` and `frontend/src/` trace directly to approved ADRs and architectural contracts. No rogue or unauthorized subsystems exist.
