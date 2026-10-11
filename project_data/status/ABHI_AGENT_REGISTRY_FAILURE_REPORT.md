# ABHI Agent Registry Failure & Resolution Report

**Date:** 2026-10-09  
**Issue:** `Node 'step_1' failed: Agent 'os_desktop_agent' is not registered in the system.`  
**Goal Trigger:** `Open Calculator and calculate 125 times 48`  
**Status:** FULLY RESOLVED & REGRESSION TESTED  

---

## 1. Root-Cause Analysis (Two Contributing Defects)

### Defect 1: Identifier Overwrite in Grounded Automation Module
- **Location:** `backend/app/automation/orchestration/agents.py`
- **Mechanism:** `GroundedDesktopAgent` initialized with `agent_id = "os_desktop_agent"`. When `register_grounded_agents()` ran, it overwrote `OSDesktopAgent` (which handles high-level application adapters like Calculator, Notepad, Explorer).
- **Consequence:** `GroundedDesktopAgent` intercepted the dispatch and attempted low-level accessibility tree actions that failed verification for headless execution, or if uninitialized, raised unregistered agent errors.

### Defect 2: Startup Lifespan Registration Gap & Registry Isolation
- **Location:** `backend/app/main.py` lifespan
- **Mechanism:** The application startup lifespan did not explicitly invoke `register_builtin_agents()`. If `builtin_agents.py` had not yet been imported during a request path, the registry contained only lazy entries without application capability mappings.

---

## 2. Corrective Actions Applied

1. **Disambiguated Agent Identifiers:**
   - Modified `backend/app/automation/orchestration/agents.py`: Set `GroundedDesktopAgent` agent_id to `"grounded_desktop_agent"`.
   - Preserved `OSDesktopAgent` in `backend/app/cognitive/registry/builtin_agents.py` as canonical `"os_desktop_agent"`.
2. **Deterministic Lazy Auto-Registration:**
   - Updated `backend/app/cognitive/registry/registry.py`: Added `_ensure_defaults_registered()` inside `get_agent()` and `dispatch()` to guarantee built-in agents (`os_desktop_agent`, `rag_agent`, `memory_agent`, `coding_agent`, `engineering_repair_agent`) are always registered even before explicit lifespan calls.
3. **Explicit Lifespan Initialization:**
   - Updated `backend/app/main.py` lifespan: Added Step 4 to explicitly register and log all built-in cognitive agents upon FastAPI startup.
4. **DAG Multi-Step Planning for OS Tasks:**
   - Enhanced `backend/app/cognitive/planner/planner.py`: When a user specifies `"Open Calculator and calculate 125 times 48"`, the planner creates a 2-node DAG:
     - `step_1`: `os_desktop_agent` -> `launch_application` (`params={"app_name": "calculator"}`)
     - `step_2`: `os_desktop_agent` -> `calculate` (`params={"expression": "125 * 48"}`)

---

## 3. Verification & Evidence
- **Unit & Integration Test:** `backend/tests/test_calculator_execution_flow.py`
  - `test_calculator_dag_planning_and_resolution`: **PASSED**
  - `test_calculator_supervisor_execution_end_to_end`: **PASSED**
- **Calculated Outcome:** `125 * 48 = 6000` observed in Calculator session state and verified by `DualStateVerifier`.
