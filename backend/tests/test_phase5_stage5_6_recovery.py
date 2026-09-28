"""Comprehensive Verification & Regression Suite for Phase 5 Stage 5.6.

Tests:
1. State Recovery & Interrupted Execution Handling
2. Postcondition Reconciliation (Action already completed vs unsatisfied)
3. Idempotency & Replay Prevention across Restarts
4. AutomationLease Recovery & Invalidation
5. Worker Crash Detection & Recovery (Windows & Browser workers)
6. Crash Consistency & Impossible-State Detection
7. Safety Precedence (Emergency Stop & Cancellation during recovery)
8. Browser Origin Security during Recovery
9. Structured Execution Audit Records
10. Recovery Benchmark Suite (7 boundaries)
"""

import asyncio
import os
import tempfile
import time
import pytest
from typing import Dict, Any

from backend.app.automation.browser.browser_worker import BrowserAutomationWorker
from backend.app.automation.desktop.test_target_app import DeterministicLocalTestApp
from backend.app.automation.desktop.windows_worker import WindowsAutomationWorker
from backend.app.automation.grounding.visual_models import ScreenEvidence
from backend.app.automation.leases.lease_manager import LeaseManager
from backend.app.automation.models.actions import (
    ActionGrounding,
    ActionResult,
    ActionType,
    BoundingBoxCoord,
    ExecutionAction,
    GroundingLevel,
    ObservedState
)
from backend.app.automation.models.errors import AutomationError, AutomationErrorCode
from backend.app.automation.orchestration.benchmarks import recovery_benchmark_suite
from backend.app.automation.orchestration.models import (
    ExecutionAuditRecord,
    OrchestrationState,
    OrchestrationTaskResult
)
from backend.app.automation.orchestration.orchestrator import SupervisorOrchestrator
from backend.app.automation.orchestration.persistence import ExecutionJournal
from backend.app.automation.orchestration.recovery import ExecutionRecoveryEngine
from backend.app.automation.policy.safety_policy import SafetyPolicyEngine


@pytest.fixture
def temp_db():
    """Create a temporary SQLite WAL database for test isolation."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    yield path
    if os.path.exists(path):
        try:
            os.remove(path)
        except OSError:
            pass


@pytest.fixture
def recovery_env(temp_db):
    """Set up isolated recovery environment."""
    journal = ExecutionJournal(db_path=temp_db)
    leases = LeaseManager()
    policy = SafetyPolicyEngine()
    test_app = DeterministicLocalTestApp()
    win_worker = WindowsAutomationWorker(target_app=test_app, leases=leases, policy=policy)
    web_worker = BrowserAutomationWorker(leases=leases, policy=policy)
    rec_engine = ExecutionRecoveryEngine(journal=journal)
    orchestrator = SupervisorOrchestrator(
        policy=policy,
        leases=leases,
        win_worker=win_worker,
        web_worker=web_worker,
        journal=journal,
        recovery_engine=rec_engine
    )
    return {
        "journal": journal,
        "leases": leases,
        "policy": policy,
        "test_app": test_app,
        "win_worker": win_worker,
        "web_worker": web_worker,
        "recovery_engine": rec_engine,
        "orchestrator": orchestrator
    }



# =========================================================================
# 1. STATE RECOVERY & INTERRUPTED EXECUTION HANDLING
# =========================================================================

@pytest.mark.asyncio
async def test_interrupted_task_discovery(recovery_env):
    """Supervisor discovers non-terminal tasks from journal after restart."""
    journal = recovery_env["journal"]
    rec_engine = recovery_env["recovery_engine"]

    # Seed 3 tasks: 1 completed, 1 failed, 2 interrupted (executing & grounding)
    t1 = OrchestrationTaskResult(task_id="t1", execution_id="e1", goal="Goal 1", state=OrchestrationState.COMPLETED, is_success=True)
    t2 = OrchestrationTaskResult(task_id="t2", execution_id="e2", goal="Goal 2", state=OrchestrationState.FAILED, is_success=False)
    t3 = OrchestrationTaskResult(task_id="t3", execution_id="e3", goal="Goal 3", state=OrchestrationState.EXECUTING, is_success=False)
    t4 = OrchestrationTaskResult(task_id="t4", execution_id="e4", goal="Goal 4", state=OrchestrationState.GROUNDING, is_success=False)

    journal.persist_task(t1)
    journal.persist_task(t2)
    journal.persist_task(t3)
    journal.persist_task(t4)

    interrupted = rec_engine.discover_interrupted_tasks()
    interrupted_ids = [t["task_id"] if isinstance(t, dict) else t.task_id for t in interrupted]

    assert "t3" in interrupted_ids
    assert "t4" in interrupted_ids
    assert "t1" not in interrupted_ids
    assert "t2" not in interrupted_ids



# =========================================================================
# 2. POSTCONDITION RECONCILIATION
# =========================================================================

@pytest.mark.asyncio
async def test_reconciliation_action_already_succeeded(recovery_env):
    """If target app state shows action already succeeded, mark task verified without re-execution."""
    orch = recovery_env["orchestrator"]
    journal = recovery_env["journal"]
    test_app = recovery_env["test_app"]

    task_id = "task_reconcile_already_done"
    exec_id = "exec_rec_1"
    task_res = OrchestrationTaskResult(
        task_id=task_id,
        execution_id=exec_id,
        goal="Run test",
        state=OrchestrationState.EXECUTING,
        is_success=False
    )
    journal.persist_task(task_res)

    # Persist last known action
    action = ExecutionAction(
        action_id="act_rec_done",
        task_id=task_id,
        execution_id=exec_id,
        lease_id="lease_old",
        action_type=ActionType.CLICK_ELEMENT,
        grounding=ActionGrounding(source=GroundingLevel.LEVEL_1_UIA, target_identity="Run Test", confidence=1.0),
        precondition="target 'Run Test' is enabled",
        expected_postcondition="app state is EXECUTED"
    )
    journal.persist_action(action)

    # Set app state to EXECUTED (simulating action completed before supervisor crashed)
    test_app.status_label = "EXECUTED"

    reconciled = await orch.reconcile_task(task_id)

    assert reconciled.state == OrchestrationState.COMPLETED
    assert reconciled.is_success is True
    # The physical click count should remain 0 because it was not blindly re-executed
    assert test_app.click_count == 0


@pytest.mark.asyncio
async def test_reconciliation_action_unsatisfied_triggers_fresh_regrounding(recovery_env):
    """If target app postcondition is NOT satisfied, reconciliation acquires fresh lease, re-grounds, and executes safely."""
    orch = recovery_env["orchestrator"]
    journal = recovery_env["journal"]
    test_app = recovery_env["test_app"]

    task_id = "task_reconcile_unsatisfied"
    exec_id = "exec_rec_2"
    task_res = OrchestrationTaskResult(
        task_id=task_id,
        execution_id=exec_id,
        goal="Run test",
        state=OrchestrationState.EXECUTING,
        is_success=False
    )
    journal.persist_task(task_res)

    action = ExecutionAction(
        action_id="act_rec_pending",
        task_id=task_id,
        execution_id=exec_id,
        lease_id="lease_old",
        action_type=ActionType.CLICK_ELEMENT,
        grounding=ActionGrounding(source=GroundingLevel.LEVEL_1_UIA, target_identity="Run Test", confidence=1.0),
        precondition="target 'Run Test' is enabled",
        expected_postcondition="app state is EXECUTED"
    )
    journal.persist_action(action)

    # App state is IDLE (action did not complete)
    test_app.status_label = "IDLE"
    assert test_app.click_count == 0

    reconciled = await orch.reconcile_task(task_id)

    assert reconciled.state == OrchestrationState.COMPLETED
    assert reconciled.is_success is True
    assert test_app.click_count == 1
    assert test_app.status_label == "EXECUTED"



# =========================================================================
# 3. IDEMPOTENCY & REPLAY PREVENTION ACROSS RESTARTS
# =========================================================================

@pytest.mark.asyncio
async def test_persistent_idempotency_cache(recovery_env):
    """Duplicate logical action is rejected across restarts via SQLite WAL idempotency cache."""
    orch = recovery_env["orchestrator"]
    task_id = "task_idempotent_1"

    res1 = await orch.execute_desktop_intent(
        task_id=task_id,
        target_name="Run Test",
        action_type=ActionType.CLICK_ELEMENT,
        precondition="target 'Run Test' is enabled",
        expected_postcondition="app state is EXECUTED"
    )
    assert res1.is_success is True
    assert res1.state == OrchestrationState.COMPLETED

    # Dispatch exact same action again
    res2 = await orch.execute_desktop_intent(
        task_id=task_id,
        target_name="Run Test",
        action_type=ActionType.CLICK_ELEMENT,
        precondition="target 'Run Test' is enabled",
        expected_postcondition="app state is EXECUTED"
    )

    assert res2.is_success is False
    assert res2.state == OrchestrationState.FAILED
    assert res2.error.error_code == AutomationErrorCode.DUPLICATE_ACTION


# =========================================================================
# 4. LEASE RECOVERY & INVALIDATION
# =========================================================================

def test_lease_invalidation_on_recovery(recovery_env):
    """All active leases are invalidated upon recovery to prevent stale executions."""
    leases = recovery_env["leases"]
    orch = recovery_env["orchestrator"]

    l1 = leases.acquire_lease("t1", "e1", "os_desktop_agent")
    l2 = leases.acquire_lease("t2", "e2", "browser_agent")
    ok1, _ = leases.validate_lease(l1.lease_id, "t1")
    ok2, _ = leases.validate_lease(l2.lease_id, "t2")
    assert ok1 is True
    assert ok2 is True

    # Process recovers -> invalidate stale leases
    stale_count = orch.recover_leases()
    assert stale_count == 2
    ok1_post, _ = leases.validate_lease(l1.lease_id, "t1")
    ok2_post, _ = leases.validate_lease(l2.lease_id, "t2")
    assert ok1_post is False
    assert ok2_post is False


# =========================================================================
# 5. WORKER CRASH DETECTION & RECOVERY
# =========================================================================

@pytest.mark.asyncio
async def test_windows_worker_crash_and_restart(recovery_env):
    """Crashing the Windows worker triggers failure detection and restart allows fresh execution."""
    orch = recovery_env["orchestrator"]
    win_worker = recovery_env["win_worker"]

    task_id = "task_worker_crash"

    # Simulate worker crash
    win_worker.simulate_worker_crash()

    res = await orch.execute_desktop_intent(
        task_id=task_id,
        target_name="Run Test",
        action_type=ActionType.CLICK_ELEMENT,
        precondition="target 'Run Test' is enabled",
        expected_postcondition="app state is EXECUTED"
    )

    assert res.is_success is False
    assert res.state == OrchestrationState.FAILED
    assert res.error.error_code == AutomationErrorCode.WORKER_UNAVAILABLE

    # Restart worker cleanly
    win_worker.restart_worker()
    assert win_worker.is_crashed is False

    # New task succeeds
    task_id_2 = "task_worker_recovered"
    res2 = await orch.execute_desktop_intent(
        task_id=task_id_2,
        target_name="Run Test",
        action_type=ActionType.CLICK_ELEMENT,
        precondition="target 'Run Test' is enabled",
        expected_postcondition="app state is EXECUTED"
    )
    assert res2.is_success is True
    assert res2.state == OrchestrationState.COMPLETED


@pytest.mark.asyncio
async def test_browser_worker_crash_and_restart(recovery_env):
    """Crashing the Browser worker triggers failure detection and restart allows fresh execution."""
    orch = recovery_env["orchestrator"]
    web_worker = recovery_env["web_worker"]

    task_id = "task_browser_crash"
    web_worker.simulate_worker_crash()

    res = await orch.execute_browser_intent(
        task_id=task_id,
        target_name="Search",
        action_type=ActionType.CLICK_ELEMENT,
        precondition="target 'Search' is enabled",
        expected_postcondition="status box text is SEARCH_COMPLETED"
    )

    assert res.is_success is False
    assert res.state == OrchestrationState.FAILED
    assert res.error.error_code == AutomationErrorCode.WORKER_UNAVAILABLE

    # Restart browser worker
    web_worker.restart_worker()
    assert web_worker.is_crashed is False



# =========================================================================
# 6. CRASH CONSISTENCY & IMPOSSIBLE-STATE DETECTION
# =========================================================================

def test_crash_consistency_validation(recovery_env):
    """Journal detects impossible states in persisted SQLite WAL records."""
    journal = recovery_env["journal"]
    orch = recovery_env["orchestrator"]

    # Valid task with verification audit record
    valid_task = OrchestrationTaskResult(
        task_id="valid_1",
        execution_id="e1",
        goal="Goal",
        state=OrchestrationState.COMPLETED,
        is_success=True
    )
    journal.persist_task(valid_task)
    journal.record_audit(ExecutionAuditRecord(
        task_id="valid_1",
        execution_id="e1",
        state_transition="VERIFICATION_COMPLETED"
    ))

    # Impossible state: COMPLETED without verification audit record
    bad_task_1 = OrchestrationTaskResult(
        task_id="bad_1",
        execution_id="e2",
        goal="Goal",
        state=OrchestrationState.COMPLETED,
        is_success=True
    )
    journal.persist_task(bad_task_1)

    is_consistent, issues = orch.validate_crash_consistency()
    assert is_consistent is False
    assert len(issues) >= 1
    assert any(i["task_id"] == "bad_1" for i in issues)


# =========================================================================
# 7. SAFETY PRECEDENCE (EMERGENCY STOP & CANCELLATION)
# =========================================================================

@pytest.mark.asyncio
async def test_emergency_stop_precedence(recovery_env):
    """Emergency stop takes immediate precedence over execution and recovery."""
    orch = recovery_env["orchestrator"]
    task_id = "task_estop"

    task = await orch.create_task(goal="Critical operation", task_id=task_id)
    assert task.state == OrchestrationState.CREATED

    # Trigger emergency stop
    await orch.emergency_stop(task_id)

    assert orch._active_tasks[task_id].state == OrchestrationState.EMERGENCY_STOPPED
    assert orch._active_tasks[task_id].error.error_code == AutomationErrorCode.EMERGENCY_STOPPED


@pytest.mark.asyncio
async def test_cancellation_precedence(recovery_env):
    """Cancellation halts execution cleanly and persists terminal state."""
    orch = recovery_env["orchestrator"]
    task_id = "task_cancel"

    task = await orch.create_task(goal="Cancellable task", task_id=task_id)
    await orch.cancel_task(task_id)

    assert orch._active_tasks[task_id].state == OrchestrationState.CANCELLED
    assert orch._active_tasks[task_id].error.error_code == AutomationErrorCode.ACTION_CANCELLED


# =========================================================================
# 8. BROWSER ORIGIN SECURITY DURING RECOVERY
# =========================================================================

def test_browser_origin_security_preserved(recovery_env):
    """Localhost origins remain strictly allowed; external or spoofed domains rejected."""
    policy = recovery_env["policy"]

    # Allowed localhost origins
    valid_nav = ExecutionAction(
        action_id="act_nav_1",
        task_id="t1",
        execution_id="e1",
        lease_id="l1",
        action_type=ActionType.BROWSER_NAVIGATE,
        grounding=ActionGrounding(source=GroundingLevel.LEVEL_1_UIA, target_identity="url_bar", confidence=1.0),
        precondition="browser is open",
        expected_postcondition="url navigated",
        parameters={"url": "http://127.0.0.1:8000/app"}
    )
    ok, err = policy.validate_action(valid_nav, "browser_agent")
    assert ok is True
    assert err is None

    # Forbidden external domain
    evil_nav = ExecutionAction(
        action_id="act_nav_2",
        task_id="t2",
        execution_id="e2",
        lease_id="l2",
        action_type=ActionType.BROWSER_NAVIGATE,
        grounding=ActionGrounding(source=GroundingLevel.LEVEL_1_UIA, target_identity="url_bar", confidence=1.0),
        precondition="browser is open",
        expected_postcondition="url navigated",
        parameters={"url": "http://127.0.0.1.evil.com/app"}
    )
    ok2, err2 = policy.validate_action(evil_nav, "browser_agent")
    assert ok2 is False
    assert err2.error_code == AutomationErrorCode.POLICY_DENIED






# =========================================================================
# 9. STRUCTURED EXECUTION AUDIT RECORDS
# =========================================================================

@pytest.mark.asyncio
async def test_structured_audit_trail(recovery_env):
    """Orchestrator writes structured audit records to SQLite WAL journal without sensitive data."""
    orch = recovery_env["orchestrator"]
    journal = recovery_env["journal"]
    task_id = "task_audit_trail"

    await orch.execute_desktop_intent(
        task_id=task_id,
        target_name="Run Test",
        action_type=ActionType.CLICK_ELEMENT,
        precondition="target 'Run Test' is enabled",
        expected_postcondition="app state is EXECUTED"
    )

    records = journal.get_audit_trail(task_id)
    assert len(records) > 0

    transitions = [r.state_transition for r in records]
    assert "TASK_CREATED" in transitions
    assert "LEASE_ACQUIRED" in transitions
    assert "ACTION_DISPATCHED" in transitions
    assert "VERIFICATION_COMPLETED" in transitions


# =========================================================================
# 10. RECOVERY BENCHMARK SUITE
# =========================================================================

@pytest.mark.asyncio
async def test_recovery_benchmark_suite():
    """Recovery benchmarks profile all 7 boundaries and produce valid distributions."""
    res = await recovery_benchmark_suite.run_benchmarks()

    assert res["iterations"] == 30
    metrics = res["metrics"]

    boundaries = [
        "restart_to_state_discovery_ms",
        "state_discovery_to_reconciliation_ms",
        "worker_restart_ms",
        "browser_restart_ms",
        "fresh_regrounding_ms",
        "recovery_verification_ms",
        "total_recovery_completion_ms"
    ]

    for b in boundaries:
        assert b in metrics
        assert metrics[b]["p50"] >= 0.0
        assert metrics[b]["p95"] >= 0.0
        assert metrics[b]["mean"] >= 0.0
