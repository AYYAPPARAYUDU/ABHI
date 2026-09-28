"""Authoritative Execution Reliability & Recovery Engine for Stage 5.6.

Handles interrupted task discovery, safe postcondition reconciliation (re-observe before re-trying),
crash-consistent state verification, and bounded retry recovery.
"""

import logging
import time
from typing import Any, Dict, List, Optional, Tuple

from backend.app.automation.models.actions import (
    ActionGrounding,
    ActionResult,
    ActionType,
    ExecutionAction,
    GroundingLevel,
    ObservedState
)
from backend.app.automation.models.errors import AutomationError, AutomationErrorCode
from backend.app.automation.orchestration.models import (
    ExecutionAuditRecord,
    OrchestrationState,
    OrchestrationTaskResult,
    SupervisorDecisionTrace
)
from backend.app.automation.orchestration.persistence import (
    execution_journal,
    ExecutionJournal
)

logger = logging.getLogger("abhi_ai")


class ExecutionRecoveryEngine:
    """Orchestrates crash-consistent recovery, reconciliation, and audit integrity."""

    def __init__(self, journal: Optional[ExecutionJournal] = None):
        self.journal = journal or execution_journal

    def discover_interrupted_tasks(self) -> List[Dict[str, Any]]:
        """Discover all non-terminal tasks interrupted during execution or process restart."""
        return self.journal.get_interrupted_tasks()



    async def reconcile_task(
        self,
        task_id: str,
        orchestrator: Any,
        retry_if_not_satisfied: bool = True
    ) -> OrchestrationTaskResult:
        """Perform deterministic, fail-closed reconciliation for an interrupted task."""
        task_dict = self.journal.get_task(task_id)
        if not task_dict:
            err = AutomationError(
                error_code=AutomationErrorCode.RECOVERY_FAILED,
                message=f"Task '{task_id}' not found in persistent journal for recovery.",
                task_id=task_id
            )
            res = OrchestrationTaskResult(
                task_id=task_id,
                execution_id="unknown",
                goal="Unknown",
                state=OrchestrationState.FAILED,
                is_success=False,
                error=err
            )
            return res

        exec_id = task_dict["execution_id"]
        goal = task_dict["goal"]
        original_state = task_dict["state"]

        # 1. State Transition -> RECONCILING
        task_res = OrchestrationTaskResult(
            task_id=task_id,
            execution_id=exec_id,
            goal=goal,
            state=OrchestrationState.RECONCILING,
            is_success=False
        )
        orchestrator._active_tasks[task_id] = task_res

        # Invalidate old stale leases for this task
        orchestrator.leases.revoke_all_for_task(task_id, reason="Recovery Reconciliation")
        await orchestrator._emit_event(task_id, "RECOVERY_STARTED", {
            "task_id": task_id,
            "original_state": original_state
        })
        await orchestrator._emit_event(task_id, "STATE_RECONCILIATION_STARTED", {
            "task_id": task_id
        })
        await orchestrator._emit_event(task_id, "LEASE_INVALIDATED", {
            "task_id": task_id,
            "reason": "Process restart / Interruption"
        })

        self.journal.record_audit(ExecutionAuditRecord(
            task_id=task_id,
            execution_id=exec_id,
            state_transition="STATE_RECONCILIATION_STARTED",
            recovery_event="RECONCILING",
            payload={"original_state": original_state}
        ))

        # Retrieve audit trail to find the last requested action
        audit_trail = self.journal.get_audit_trail(task_id)
        last_action_payload: Optional[Dict[str, Any]] = None
        for r in reversed(audit_trail):
            if r.payload and ("target" in r.payload or "target_identity" in r.payload or "action_id" in r.payload):
                last_action_payload = r.payload
                break

        # Check target type (desktop vs browser)
        is_browser = "browser" in goal.lower() or "search" in goal.lower() or "web" in goal.lower()
        if last_action_payload:
            target_name = last_action_payload.get("target") or last_action_payload.get("target_identity") or ("Search" if is_browser else "Run Test")
            expected_postcondition = last_action_payload.get("expected_postcondition") or ("status box text is SEARCH_COMPLETED" if is_browser else "app state is EXECUTED")
        else:
            target_name = "Search" if is_browser else "Run Test"
            expected_postcondition = "status box text is SEARCH_COMPLETED" if is_browser else "app state is EXECUTED"


        # 2. Re-observe physical state WITHOUT blindly repeating the action
        if is_browser:
            worker_name = "BrowserAutomationWorker"
            if hasattr(orchestrator.browser_worker, "observe_node"):
                observed = orchestrator.browser_worker.observe_node(target_name)
            else:
                observed = orchestrator.browser_worker.target_page.observe_node(target_name)
        else:
            worker_name = "WindowsAutomationWorker"
            observed = orchestrator.windows_worker.target_app.observe_element(target_name)

        # 3. Dual-State Postcondition Verification on current physical observation
        dummy_action = ExecutionAction(
            action_id=f"reconcile_act_{task_id}",
            task_id=task_id,
            execution_id=exec_id,
            lease_id="reconcile_lease",
            action_type=ActionType.CLICK_ELEMENT if not is_browser else ActionType.BROWSER_CLICK,
            grounding=ActionGrounding(source=GroundingLevel.LEVEL_1_UIA, target_identity=target_name, confidence=1.0),
            precondition="reconciliation_check",
            expected_postcondition=expected_postcondition
        )
        dummy_res = ActionResult(
            success=True,
            action_id=dummy_action.action_id,
            execution_duration_ms=1.0,
            observed_state=observed
        )
        ver_res = orchestrator.verifier.verify_postcondition(dummy_action, dummy_res)

        await orchestrator._emit_event(task_id, "RECOVERY_VERIFICATION", {
            "is_verified": ver_res.is_verified,
            "observed": observed.model_dump()
        })

        if ver_res.is_verified:
            # Action already succeeded prior to interruption! Mark COMPLETED without re-execution.
            task_res.state = OrchestrationState.COMPLETED
            task_res.is_success = True
            await orchestrator._emit_event(task_id, "STATE_RECONCILED", {
                "status": "ALREADY_COMPLETED",
                "details": ver_res.observed_state_summary
            })
            await orchestrator._emit_event(task_id, "RECOVERY_COMPLETED", {
                "task_id": task_id,
                "outcome": "VERIFIED_EXISTING_STATE"
            })
            await orchestrator._emit_event(task_id, "TASK_COMPLETED", {
                "duration_ms": 0,
                "recovery": True
            })

            self.journal.persist_task(task_res)
            self.journal.record_audit(ExecutionAuditRecord(
                task_id=task_id,
                execution_id=exec_id,
                state_transition="RECOVERY_COMPLETED",
                final_state=OrchestrationState.COMPLETED.value,
                verification_result=ver_res.model_dump(),
                recovery_event="STATE_RECONCILED_SUCCESS"
            ))
            return task_res

        # 4. If desired state is NOT met, evaluate fresh retry recovery
        await orchestrator._emit_event(task_id, "STATE_RECONCILED", {
            "status": "NOT_SATISFIED",
            "details": ver_res.mismatch_details
        })

        if not retry_if_not_satisfied:
            task_res.state = OrchestrationState.FAILED
            task_res.is_success = False
            task_res.error = AutomationError(
                error_code=AutomationErrorCode.RECOVERY_FAILED,
                message=f"Interrupted task state not satisfied: {ver_res.mismatch_details}",
                task_id=task_id
            )
            await orchestrator._emit_event(task_id, "RECOVERY_FAILED", {
                "reason": ver_res.mismatch_details
            })
            self.journal.persist_task(task_res)
            return task_res

        # Execute fresh re-grounding and retry under strict authorization
        await orchestrator._emit_event(task_id, "RECOVERY_REGROUNDING", {"target": target_name})
        await orchestrator._emit_event(task_id, "RECOVERY_RETRY_SELECTED", {"target": target_name})

        if is_browser:
            retry_res = await orchestrator.execute_browser_intent(
                task_id=task_id,
                target_name=target_name,
                action_type=ActionType.BROWSER_CLICK,
                precondition="element is ready",
                expected_postcondition=expected_postcondition,
                max_retries=1
            )
        else:
            retry_res = await orchestrator.execute_desktop_intent(
                task_id=task_id,
                target_name=target_name,
                action_type=ActionType.CLICK_ELEMENT,
                precondition=f"target '{target_name}' is enabled",
                expected_postcondition=expected_postcondition,
                max_retries=1
            )

        if retry_res.is_success:
            await orchestrator._emit_event(task_id, "RECOVERY_COMPLETED", {
                "task_id": task_id,
                "outcome": "RETRY_EXECUTION_SUCCESS"
            })
            self.journal.record_audit(ExecutionAuditRecord(
                task_id=task_id,
                execution_id=exec_id,
                state_transition="RECOVERY_COMPLETED",
                final_state=OrchestrationState.COMPLETED.value,
                recovery_event="RETRY_SUCCESS"
            ))
        else:
            await orchestrator._emit_event(task_id, "RECOVERY_FAILED", {
                "task_id": task_id,
                "error": retry_res.error.message if retry_res.error else "Retry failed"
            })

        return retry_res


# Global Recovery Engine Singleton
execution_recovery_engine = ExecutionRecoveryEngine()
