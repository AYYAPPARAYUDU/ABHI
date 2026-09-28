"""Master End-to-End Supervisor Orchestrator for Phase 5 Stage 5.5.

Coordinates the complete 12-stage verified execution lifecycle:
Intent -> Task Creation -> Planning -> Policy Evaluation -> Consent Gate ->
Lease Acquisition -> Grounding Strategy Selection -> Precondition Check ->
Worker Dispatch -> Action Execution -> Fresh Observation -> Dual-State Verification ->
Correction / Re-Grounding -> Final State.
"""

import asyncio
import time
import uuid
from typing import Any, Dict, List, Optional, Set, Tuple

from backend.app.api.websockets.telemetry import manager as ws_manager
from backend.app.automation.browser.browser_worker import browser_worker, BrowserAutomationWorker
from backend.app.automation.browser.playwright_worker import playwright_browser_worker, PlaywrightBrowserWorker
from backend.app.automation.desktop.windows_worker import windows_worker, WindowsAutomationWorker
from backend.app.automation.grounding.visual_models import ScreenEvidence
from backend.app.automation.leases.lease_manager import lease_manager, LeaseManager, AutomationLease
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
from backend.app.automation.orchestration.models import (
    OrchestrationExecutionContext,
    OrchestrationResult,
    OrchestrationState,
    OrchestrationTaskResult,
    SupervisorDecisionTrace
)
from backend.app.automation.orchestration.strategy_selector import (
    grounding_strategy_selector,
    GroundingStrategySelector
)
from backend.app.automation.policy.safety_policy import safety_policy, SafetyPolicyEngine
from backend.app.automation.verification.action_verifier import action_verifier, ActionVerifier
from backend.app.core.logging import logger
from backend.app.services.memory.repository import memory_repo


class SupervisorOrchestrator:
    """Master Orchestrator enforcing verified physical and browser execution."""

    def __init__(
        self,
        policy: Optional[SafetyPolicyEngine] = None,
        leases: Optional[LeaseManager] = None,
        selector: Optional[GroundingStrategySelector] = None,
        win_worker: Optional[WindowsAutomationWorker] = None,
        web_worker: Optional[Any] = None,
        verifier: Optional[ActionVerifier] = None
    ):
        self.policy = policy or safety_policy
        self.leases = leases or lease_manager
        self.strategy_selector = selector or grounding_strategy_selector
        self.windows_worker = win_worker or windows_worker
        self.browser_worker = web_worker or browser_worker
        self.verifier = verifier or action_verifier

        # Active tasks state tracking
        self._active_tasks: Dict[str, OrchestrationTaskResult] = {}
        self._pending_consents: Dict[str, asyncio.Event] = {}
        self._pause_events: Dict[str, asyncio.Event] = {}
        self._executed_action_hashes: Set[str] = set()

    async def _emit_event(self, task_id: str, event_type: str, payload: Dict[str, Any]):
        """Emit authoritative structured telemetry event to WebSocket clients."""
        try:
            await ws_manager.broadcast({
                "channel": "orchestrator",
                "type": event_type,
                "task_id": task_id,
                "timestamp": int(time.time() * 1000),
                "payload": payload
            })
        except Exception as e:
            logger.debug(f"Telemetry broadcast warning: {e}")

    async def create_task(self, goal: str, task_id: Optional[str] = None) -> OrchestrationTaskResult:
        """Create and initialize a new orchestrated execution task."""
        tid = task_id or f"task_{uuid.uuid4().hex[:12]}"
        exec_id = f"exec_{uuid.uuid4().hex[:8]}"

        task_res = OrchestrationTaskResult(
            task_id=tid,
            execution_id=exec_id,
            goal=goal,
            state=OrchestrationState.CREATED,
            is_success=False
        )
        self._active_tasks[tid] = task_res
        self._pause_events[tid] = asyncio.Event()
        self._pause_events[tid].set()

        await self._emit_event(tid, "TASK_CREATED", {"goal": goal, "execution_id": exec_id})
        return task_res

    async def execute_desktop_intent(
        self,
        task_id: str,
        target_name: str,
        action_type: ActionType,
        precondition: str,
        expected_postcondition: str,
        parameters: Optional[Dict[str, Any]] = None,
        risk_tier: str = "Tier 1",
        user_consent_granted: bool = False,
        evidence: Optional[ScreenEvidence] = None,
        max_retries: int = 2
    ) -> OrchestrationTaskResult:
        """Execute a Windows Desktop automation intent through the full verified lifecycle."""
        task_res = self._active_tasks.get(task_id) or await self.create_task(
            goal=f"Desktop {action_type.value} on '{target_name}'",
            task_id=task_id
        )
        exec_id = task_res.execution_id
        action_id = f"act_{uuid.uuid4().hex[:8]}"
        start_ts = time.perf_counter()

        # Check for duplicate action idempotency
        action_hash = f"{task_id}:{target_name}:{action_type.value}:{precondition}:{expected_postcondition}"
        if action_hash in self._executed_action_hashes:
            logger.warning(f"Duplicate action detected: {action_hash}")
            # Reject as duplicate action
            err = AutomationError(
                error_code=AutomationErrorCode.DUPLICATE_ACTION,
                message="Duplicate action dispatch rejected by idempotency policy.",
                action_id=action_id,
                task_id=task_id
            )
            task_res.state = OrchestrationState.FAILED
            task_res.is_success = False
            task_res.error = err
            await self._emit_event(task_id, "TASK_FAILED", {"error": err.message})
            return task_res

        # 1. PLANNING
        task_res.state = OrchestrationState.PLANNING
        await self._emit_event(task_id, "TASK_PLANNED", {
            "action_id": action_id,
            "target": target_name,
            "action_type": action_type.value
        })

        # 2. ACQUIRING LEASE
        task_res.state = OrchestrationState.ACQUIRING_LEASE
        lease = self.leases.acquire_lease(
            task_id=task_id,
            execution_id=exec_id,
            agent_id="os_desktop_agent",
            risk_tier=risk_tier
        )
        await self._emit_event(task_id, "LEASE_ACQUIRED", {"lease_id": lease.lease_id, "ttl": lease.initial_ttl_seconds})

        # Synchronize lease & policy with worker
        self.windows_worker.leases = self.leases
        self.windows_worker.policy = self.policy

        decision_trace = SupervisorDecisionTrace(
            task_id=task_id,
            execution_id=exec_id,
            action_id=action_id,
            requested_action=f"{action_type.value}:{target_name}",
            preferred_grounding=GroundingLevel.LEVEL_1_UIA.value,
            selected_grounding="UNKNOWN",
            why_selected="Initializing execution flow"
        )

        try:
            # 3. POLICY EVALUATION
            task_res.state = OrchestrationState.POLICY_EVALUATION
            dummy_grounding = ActionGrounding(
                source=GroundingLevel.LEVEL_1_UIA,
                target_identity=target_name,
                confidence=1.0
            )
            proposed_action = ExecutionAction(
                action_id=action_id,
                task_id=task_id,
                execution_id=exec_id,
                lease_id=lease.lease_id,
                action_type=action_type,
                grounding=dummy_grounding,
                parameters=parameters or {},
                precondition=precondition,
                expected_postcondition=expected_postcondition,
                risk_tier=risk_tier
            )

            policy_ok, policy_err = self.policy.validate_action(
                action=proposed_action,
                agent_id="os_desktop_agent",
                user_consent_granted=user_consent_granted
            )
            decision_trace.policy_result = {"is_valid": policy_ok, "error": policy_err.message if policy_err else None}
            await self._emit_event(task_id, "POLICY_EVALUATED", {"approved": policy_ok})

            if not policy_ok or policy_err:
                if policy_err and policy_err.error_code == AutomationErrorCode.CONSENT_REQUIRED and not user_consent_granted:
                    task_res.state = OrchestrationState.WAITING_USER_CONSENT
                    await self._emit_event(task_id, "CONSENT_REQUIRED", {"action_id": action_id, "tier": risk_tier})
                    event = asyncio.Event()
                    self._pending_consents[task_id] = event
                    await event.wait()
                    del self._pending_consents[task_id]
                    if task_res.state in [OrchestrationState.CANCELLED, OrchestrationState.EMERGENCY_STOPPED]:
                        return task_res
                    user_consent_granted = True
                    await self._emit_event(task_id, "CONSENT_GRANTED", {"action_id": action_id})
                else:
                    task_res.state = OrchestrationState.FAILED
                    task_res.is_success = False
                    task_res.error = policy_err
                    decision_trace.final_state = OrchestrationState.FAILED.value
                    task_res.decision_traces.append(decision_trace)
                    await self._emit_event(task_id, "TASK_FAILED", {"error": policy_err.message if policy_err else "Policy denied"})
                    return task_res

            # Retry loop with fresh observation & re-grounding
            retry_count = 0
            current_evidence = evidence

            while retry_count <= max_retries:
                if task_res.state in [OrchestrationState.CANCELLED, OrchestrationState.EMERGENCY_STOPPED]:
                    break

                # Check Pause state
                if task_id in self._pause_events:
                    await self._pause_events[task_id].wait()

                action_id = f"act_{uuid.uuid4().hex[:8]}"

                # 4. GROUNDING STRATEGY SELECTION
                task_res.state = OrchestrationState.GROUNDING if retry_count == 0 else OrchestrationState.REGROUNDING
                await self._emit_event(task_id, "GROUNDING_STARTED" if retry_count == 0 else "REGROUNDING_STARTED", {
                    "target": target_name,
                    "attempt": retry_count + 1
                })

                grounding, trace, grnd_err = self.strategy_selector.select_desktop_strategy(
                    target_name=target_name,
                    action_type=action_type,
                    evidence=current_evidence,
                    task_id=task_id,
                    execution_id=exec_id
                )

                if trace:
                    fallback_val = trace.fallback_method.value if trace.fallback_method else "NONE"
                    pref_val = trace.preferred_method.value if trace.preferred_method else "NONE"
                    decision_trace.selected_grounding = fallback_val
                    decision_trace.why_selected = trace.final_decision
                    decision_trace.available_grounding = [pref_val, fallback_val]

                if not grounding or grnd_err:
                    task_res.state = OrchestrationState.FAILED
                    task_res.is_success = False
                    task_res.error = grnd_err
                    decision_trace.final_state = OrchestrationState.FAILED.value
                    task_res.decision_traces.append(decision_trace)
                    await self._emit_event(task_id, "TASK_FAILED", {"error": grnd_err.message if grnd_err else "Grounding failed"})
                    return task_res

                await self._emit_event(task_id, "GROUNDING_SELECTED", {
                    "source": grounding.source.value,
                    "confidence": grounding.confidence,
                    "target_identity": grounding.target_identity
                })

                # Construct validated physical action
                action = ExecutionAction(
                    action_id=action_id,
                    task_id=task_id,
                    execution_id=exec_id,
                    lease_id=lease.lease_id,
                    action_type=action_type,
                    grounding=grounding,
                    parameters=parameters or {},
                    precondition=precondition,
                    expected_postcondition=expected_postcondition,
                    risk_tier=risk_tier
                )

                # 5. PRECONDITION CHECK
                task_res.state = OrchestrationState.PRECONDITION_CHECK
                initial_obs = self.windows_worker.target_app.observe_element(action.grounding.target_identity)
                if not initial_obs.target_found and action.grounding.bounding_box:
                    cx = action.grounding.bounding_box.center_x
                    cy = action.grounding.bounding_box.center_y
                    for elem in getattr(self.windows_worker.target_app, "_elements", []):
                        b = elem.get("bbox", {})
                        if b.get("x", 0) <= cx <= b.get("x", 0) + b.get("width", 0) and b.get("y", 0) <= cy <= b.get("y", 0) + b.get("height", 0):
                            initial_obs = ObservedState(
                                target_found=True,
                                is_enabled=elem.get("is_enabled", True),
                                is_focused=getattr(self.windows_worker.target_app, "is_focused", True),
                                window_title=getattr(self.windows_worker.target_app, "window_title", None),
                                bounding_box=action.grounding.bounding_box,
                                raw_properties=elem
                            )
                            break

                precond_ok = self.verifier.verify_precondition(action, initial_obs)
                decision_trace.precondition_result = {"passed": precond_ok, "observation": initial_obs.model_dump()}
                await self._emit_event(task_id, "PRECONDITION_CHECKED", {"passed": precond_ok})

                if not precond_ok:
                    logger.warning(f"Precondition failed for desktop action '{action_id}'. Attempting re-observation...")
                    retry_count += 1
                    if retry_count <= max_retries:
                        current_evidence = ScreenEvidence(source="windows_desktop", width=1920, height=1080)
                        await self._emit_event(task_id, "RETRY_SELECTED", {"reason": "PRECONDITION_FAILED", "attempt": retry_count})
                        continue
                    else:
                        task_res.state = OrchestrationState.FAILED
                        task_res.is_success = False
                        task_res.error = AutomationError(
                            error_code=AutomationErrorCode.PRECONDITION_FAILED,
                            message=f"Precondition '{precondition}' failed for desktop action.",
                            action_id=action_id
                        )
                        decision_trace.final_state = OrchestrationState.FAILED.value
                        task_res.decision_traces.append(decision_trace)
                        break

                # 6. DISPATCHING & EXECUTING
                task_res.state = OrchestrationState.DISPATCHING
                await self._emit_event(task_id, "ACTION_DISPATCHED", {"action_id": action_id, "worker": "WindowsAutomationWorker"})

                task_res.state = OrchestrationState.EXECUTING
                await self._emit_event(task_id, "ACTION_EXECUTING", {"action_id": action_id})

                exec_res, exec_err = self.windows_worker.execute_action(action, user_consent_granted=user_consent_granted)
                decision_trace.execution_result = exec_res.model_dump() if exec_res else {"error": exec_err.message if exec_err else "None"}

                if not exec_res or exec_err:
                    task_res.state = OrchestrationState.FAILED
                    task_res.is_success = False
                    task_res.error = exec_err
                    decision_trace.final_state = OrchestrationState.FAILED.value
                    task_res.decision_traces.append(decision_trace)
                    await self._emit_event(task_id, "TASK_FAILED", {"error": exec_err.message if exec_err else "Execution error"})
                    return task_res

                # 7. OBSERVING
                task_res.state = OrchestrationState.OBSERVING
                obs_data = exec_res.observed_state or ObservedState(target_found=True)
                decision_trace.observation_result = obs_data.model_dump()
                await self._emit_event(task_id, "OBSERVATION_CAPTURED", {"observed": obs_data.model_dump()})

                # 8. DUAL-STATE VERIFYING
                task_res.state = OrchestrationState.VERIFYING
                await self._emit_event(task_id, "VERIFICATION_STARTED", {"action_id": action_id})

                ver_res = self.verifier.verify_postcondition(action, exec_res)
                decision_trace.verification_result = ver_res.model_dump()

                if ver_res.is_verified:
                    await self._emit_event(task_id, "VERIFICATION_COMPLETED", {"is_verified": True})
                    await self._emit_event(task_id, "ACTION_COMPLETED", {"action_id": action_id})
                    
                    self._executed_action_hashes.add(action_hash)
                    task_res.is_success = True
                    task_res.state = OrchestrationState.COMPLETED
                    decision_trace.final_state = OrchestrationState.COMPLETED.value
                    task_res.decision_traces.append(decision_trace)
                    task_res.executed_actions.append(action.model_dump())
                    break
                else:
                    await self._emit_event(task_id, "VERIFICATION_FAILED", {"details": ver_res.mismatch_details})
                    retry_count += 1
                    if retry_count <= max_retries:
                        task_res.state = OrchestrationState.RETRYING
                        decision_trace.retry_decision = f"Retrying attempt {retry_count}/{max_retries}"
                        await self._emit_event(task_id, "RETRY_SELECTED", {"attempt": retry_count, "reason": ver_res.mismatch_details})
                        # Fresh observation for next iteration
                        current_evidence = ScreenEvidence(source="windows_desktop", width=1920, height=1080)
                    else:
                        task_res.state = OrchestrationState.FAILED
                        task_res.is_success = False
                        task_res.error = AutomationError(
                            error_code=AutomationErrorCode.VERIFICATION_FAILED,
                            message=ver_res.mismatch_details or "Dual-state postcondition verification failed.",
                            action_id=action_id
                        )
                        decision_trace.final_state = OrchestrationState.FAILED.value
                        task_res.decision_traces.append(decision_trace)
                        break

        finally:
            # Cleanly release lease
            self.leases.release_lease(lease.lease_id, task_id)
            duration_ms = int((time.perf_counter() - start_ts) * 1000)
            task_res.duration_ms = duration_ms

            if task_res.state == OrchestrationState.COMPLETED:
                await self._emit_event(task_id, "TASK_COMPLETED", {"duration_ms": duration_ms})
            elif task_res.state in [OrchestrationState.FAILED, OrchestrationState.CANCELLED, OrchestrationState.EMERGENCY_STOPPED]:
                # Error state already set or handled
                pass

        return task_res

    async def execute_browser_intent(
        self,
        task_id: str,
        target_name: str,
        action_type: ActionType,
        precondition: str,
        expected_postcondition: str,
        role: Optional[str] = None,
        parameters: Optional[Dict[str, Any]] = None,
        risk_tier: str = "Tier 1",
        user_consent_granted: bool = False,
        evidence: Optional[ScreenEvidence] = None,
        max_retries: int = 2
    ) -> OrchestrationTaskResult:
        """Execute a Browser automation intent through the full verified lifecycle."""
        task_res = self._active_tasks.get(task_id) or await self.create_task(
            goal=f"Browser {action_type.value} on '{target_name}'",
            task_id=task_id
        )
        exec_id = task_res.execution_id
        action_id = f"act_{uuid.uuid4().hex[:8]}"
        start_ts = time.perf_counter()

        # Check for duplicate action idempotency
        action_hash = f"{task_id}:{target_name}:{action_type.value}:{precondition}:{expected_postcondition}"
        if action_hash in self._executed_action_hashes:
            logger.warning(f"Duplicate browser action detected: {action_hash}")
            err = AutomationError(
                error_code=AutomationErrorCode.DUPLICATE_ACTION,
                message="Duplicate action dispatch rejected by idempotency policy.",
                action_id=action_id,
                task_id=task_id
            )
            task_res.state = OrchestrationState.FAILED
            task_res.is_success = False
            task_res.error = err
            await self._emit_event(task_id, "TASK_FAILED", {"error": err.message})
            return task_res

        # 1. PLANNING
        task_res.state = OrchestrationState.PLANNING
        await self._emit_event(task_id, "TASK_PLANNED", {
            "action_id": action_id,
            "target": target_name,
            "action_type": action_type.value
        })

        # 2. ACQUIRING LEASE
        task_res.state = OrchestrationState.ACQUIRING_LEASE
        lease = self.leases.acquire_lease(
            task_id=task_id,
            execution_id=exec_id,
            agent_id="browser_agent",
            risk_tier=risk_tier
        )
        await self._emit_event(task_id, "LEASE_ACQUIRED", {"lease_id": lease.lease_id, "ttl": lease.initial_ttl_seconds})

        # Synchronize lease & policy with worker
        self.browser_worker.leases = self.leases
        self.browser_worker.policy = self.policy

        decision_trace = SupervisorDecisionTrace(
            task_id=task_id,
            execution_id=exec_id,
            action_id=action_id,
            requested_action=f"{action_type.value}:{target_name}",
            preferred_grounding=GroundingLevel.LEVEL_1_UIA.value,
            selected_grounding="UNKNOWN",
            why_selected="Initializing browser execution flow"
        )

        try:
            # 3. POLICY EVALUATION
            task_res.state = OrchestrationState.POLICY_EVALUATION
            dummy_grounding = ActionGrounding(
                source=GroundingLevel.LEVEL_1_UIA,
                target_identity=target_name,
                confidence=1.0
            )
            proposed_action = ExecutionAction(
                action_id=action_id,
                task_id=task_id,
                execution_id=exec_id,
                lease_id=lease.lease_id,
                action_type=action_type,
                grounding=dummy_grounding,
                parameters=parameters or {},
                precondition=precondition,
                expected_postcondition=expected_postcondition,
                risk_tier=risk_tier
            )

            policy_ok, policy_err = self.policy.validate_action(
                action=proposed_action,
                agent_id="browser_agent",
                user_consent_granted=user_consent_granted
            )
            decision_trace.policy_result = {"is_valid": policy_ok, "error": policy_err.message if policy_err else None}
            await self._emit_event(task_id, "POLICY_EVALUATED", {"approved": policy_ok})

            if not policy_ok or policy_err:
                if policy_err and policy_err.error_code == AutomationErrorCode.CONSENT_REQUIRED and not user_consent_granted:
                    task_res.state = OrchestrationState.WAITING_USER_CONSENT
                    await self._emit_event(task_id, "CONSENT_REQUIRED", {"action_id": action_id, "tier": risk_tier})
                    event = asyncio.Event()
                    self._pending_consents[task_id] = event
                    await event.wait()
                    del self._pending_consents[task_id]
                    if task_res.state in [OrchestrationState.CANCELLED, OrchestrationState.EMERGENCY_STOPPED]:
                        return task_res
                    user_consent_granted = True
                    await self._emit_event(task_id, "CONSENT_GRANTED", {"action_id": action_id})
                else:
                    task_res.state = OrchestrationState.FAILED
                    task_res.is_success = False
                    task_res.error = policy_err
                    decision_trace.final_state = OrchestrationState.FAILED.value
                    task_res.decision_traces.append(decision_trace)
                    await self._emit_event(task_id, "TASK_FAILED", {"error": policy_err.message if policy_err else "Policy denied"})
                    return task_res

            # Retry loop with fresh observation & re-grounding
            retry_count = 0
            current_evidence = evidence

            while retry_count <= max_retries:
                if task_res.state in [OrchestrationState.CANCELLED, OrchestrationState.EMERGENCY_STOPPED]:
                    break

                # Check Pause state
                if task_id in self._pause_events:
                    await self._pause_events[task_id].wait()

                action_id = f"act_{uuid.uuid4().hex[:8]}"

                # 4. GROUNDING STRATEGY SELECTION
                task_res.state = OrchestrationState.GROUNDING if retry_count == 0 else OrchestrationState.REGROUNDING
                await self._emit_event(task_id, "GROUNDING_STARTED" if retry_count == 0 else "REGROUNDING_STARTED", {
                    "target": target_name,
                    "attempt": retry_count + 1
                })

                grounding, trace, grnd_err = self.strategy_selector.select_browser_strategy(
                    target_name=target_name,
                    action_type=action_type,
                    role=role,
                    evidence=current_evidence,
                    task_id=task_id,
                    execution_id=exec_id
                )

                if trace:
                    fallback_val = trace.fallback_method.value if trace.fallback_method else "NONE"
                    pref_val = trace.preferred_method.value if trace.preferred_method else "NONE"
                    decision_trace.selected_grounding = fallback_val
                    decision_trace.why_selected = trace.final_decision
                    decision_trace.available_grounding = [pref_val, fallback_val]

                if not grounding or grnd_err:
                    task_res.state = OrchestrationState.FAILED
                    task_res.is_success = False
                    task_res.error = grnd_err
                    decision_trace.final_state = OrchestrationState.FAILED.value
                    task_res.decision_traces.append(decision_trace)
                    await self._emit_event(task_id, "TASK_FAILED", {"error": grnd_err.message if grnd_err else "Grounding failed"})
                    return task_res

                await self._emit_event(task_id, "GROUNDING_SELECTED", {
                    "source": grounding.source.value,
                    "confidence": grounding.confidence,
                    "target_identity": grounding.target_identity
                })

                # Construct validated physical action
                action = ExecutionAction(
                    action_id=action_id,
                    task_id=task_id,
                    execution_id=exec_id,
                    lease_id=lease.lease_id,
                    action_type=action_type,
                    grounding=grounding,
                    parameters=parameters or {},
                    precondition=precondition,
                    expected_postcondition=expected_postcondition,
                    risk_tier=risk_tier
                )

                # 5. PRECONDITION CHECK
                task_res.state = OrchestrationState.PRECONDITION_CHECK
                meta = action.grounding.metadata or {}
                frame_id = meta.get("frame_identity") or action.parameters.get("frame_identity")

                if hasattr(self.browser_worker, "observe_node"):
                    try:
                        initial_obs = self.browser_worker.observe_node(action.grounding.target_identity, frame_identity=frame_id)
                    except TypeError:
                        initial_obs = self.browser_worker.observe_node(action.grounding.target_identity)
                elif hasattr(self.browser_worker, "target_page"):
                    initial_obs = self.browser_worker.target_page.observe_node(action.grounding.target_identity)
                else:
                    initial_obs = ObservedState(target_found=True, is_enabled=True)

                if not initial_obs.target_found and action.grounding.source in [GroundingLevel.LEVEL_3_OCR, GroundingLevel.LEVEL_4_COORDINATES] and action.grounding.bounding_box:
                    initial_obs = ObservedState(target_found=True, is_enabled=True, bounding_box=action.grounding.bounding_box)

                precond_ok = self.verifier.verify_precondition(action, initial_obs)
                decision_trace.precondition_result = {"passed": precond_ok, "observation": initial_obs.model_dump()}
                await self._emit_event(task_id, "PRECONDITION_CHECKED", {"passed": precond_ok})

                if not precond_ok:
                    logger.warning(f"Precondition failed for browser action '{action_id}'. Attempting re-observation...")
                    retry_count += 1
                    if retry_count <= max_retries:
                        current_evidence = ScreenEvidence(source="playwright_browser", width=1920, height=1080)
                        await self._emit_event(task_id, "RETRY_SELECTED", {"reason": "PRECONDITION_FAILED", "attempt": retry_count})
                        continue
                    else:
                        task_res.state = OrchestrationState.FAILED
                        task_res.is_success = False
                        task_res.error = AutomationError(
                            error_code=AutomationErrorCode.PRECONDITION_FAILED,
                            message=f"Precondition '{precondition}' failed for browser action.",
                            action_id=action_id
                        )
                        decision_trace.final_state = OrchestrationState.FAILED.value
                        task_res.decision_traces.append(decision_trace)
                        break

                # 6. DISPATCHING & EXECUTING
                task_res.state = OrchestrationState.DISPATCHING
                await self._emit_event(task_id, "ACTION_DISPATCHED", {"action_id": action_id, "worker": "BrowserAutomationWorker"})

                task_res.state = OrchestrationState.EXECUTING
                await self._emit_event(task_id, "ACTION_EXECUTING", {"action_id": action_id})

                exec_res, exec_err = self.browser_worker.execute_action(action, user_consent_granted=user_consent_granted)
                decision_trace.execution_result = exec_res.model_dump() if exec_res else {"error": exec_err.message if exec_err else "None"}

                if not exec_res or exec_err:
                    task_res.state = OrchestrationState.FAILED
                    task_res.is_success = False
                    task_res.error = exec_err
                    decision_trace.final_state = OrchestrationState.FAILED.value
                    task_res.decision_traces.append(decision_trace)
                    await self._emit_event(task_id, "TASK_FAILED", {"error": exec_err.message if exec_err else "Execution error"})
                    return task_res

                # 7. OBSERVING
                task_res.state = OrchestrationState.OBSERVING
                obs_data = exec_res.observed_state or ObservedState(target_found=True)
                decision_trace.observation_result = obs_data.model_dump()
                await self._emit_event(task_id, "OBSERVATION_CAPTURED", {"observed": obs_data.model_dump()})

                # 8. DUAL-STATE VERIFYING
                task_res.state = OrchestrationState.VERIFYING
                await self._emit_event(task_id, "VERIFICATION_STARTED", {"action_id": action_id})

                ver_res = self.verifier.verify_postcondition(action, exec_res)
                decision_trace.verification_result = ver_res.model_dump()

                if ver_res.is_verified:
                    await self._emit_event(task_id, "VERIFICATION_COMPLETED", {"is_verified": True})
                    await self._emit_event(task_id, "ACTION_COMPLETED", {"action_id": action_id})

                    self._executed_action_hashes.add(action_hash)
                    task_res.is_success = True
                    task_res.state = OrchestrationState.COMPLETED
                    decision_trace.final_state = OrchestrationState.COMPLETED.value
                    task_res.decision_traces.append(decision_trace)
                    task_res.executed_actions.append(action.model_dump())
                    break
                else:
                    await self._emit_event(task_id, "VERIFICATION_FAILED", {"details": ver_res.mismatch_details})
                    retry_count += 1
                    if retry_count <= max_retries:
                        task_res.state = OrchestrationState.RETRYING
                        decision_trace.retry_decision = f"Retrying attempt {retry_count}/{max_retries}"
                        await self._emit_event(task_id, "RETRY_SELECTED", {"attempt": retry_count, "reason": ver_res.mismatch_details})
                        current_evidence = ScreenEvidence(source="playwright_browser", width=1920, height=1080)
                    else:
                        task_res.state = OrchestrationState.FAILED
                        task_res.is_success = False
                        task_res.error = AutomationError(
                            error_code=AutomationErrorCode.VERIFICATION_FAILED,
                            message=ver_res.mismatch_details or "Dual-state postcondition verification failed.",
                            action_id=action_id
                        )
                        decision_trace.final_state = OrchestrationState.FAILED.value
                        task_res.decision_traces.append(decision_trace)
                        break

        finally:
            self.leases.release_lease(lease.lease_id, task_id)
            duration_ms = int((time.perf_counter() - start_ts) * 1000)
            task_res.duration_ms = duration_ms

            if task_res.state == OrchestrationState.COMPLETED:
                await self._emit_event(task_id, "TASK_COMPLETED", {"duration_ms": duration_ms})

        return task_res

    async def provide_consent(self, task_id: str, approved: bool) -> bool:
        """Handle user consent gate response for pending action."""
        task_res = self._active_tasks.get(task_id)
        if not task_res or task_res.state != OrchestrationState.WAITING_USER_CONSENT:
            return False

        if task_id in self._pending_consents:
            if approved:
                self._pending_consents[task_id].set()
                return True
            else:
                task_res.state = OrchestrationState.CANCELLED
                task_res.error = AutomationError(
                    error_code=AutomationErrorCode.ACTION_CANCELLED,
                    message="User declined consent for action."
                )
                self._pending_consents[task_id].set()
                await self._emit_event(task_id, "TASK_CANCELLED", {"reason": "Consent Rejected"})
                return True
        return False

    async def pause_task(self, task_id: str, reason: str = "User manual input contention") -> bool:
        """Pause active task due to manual operator contention."""
        task_res = self._active_tasks.get(task_id)
        if not task_res or task_res.state in [
            OrchestrationState.COMPLETED,
            OrchestrationState.FAILED,
            OrchestrationState.CANCELLED,
            OrchestrationState.EMERGENCY_STOPPED
        ]:
            return False

        logger.warning(f"Pausing task '{task_id}': {reason}")
        task_res.state = OrchestrationState.PAUSED_USER_INTERFERENCE

        if task_id in self._pause_events:
            self._pause_events[task_id].clear()

        await self._emit_event(task_id, "TASK_PAUSED", {"reason": reason})
        return True

    async def resume_task(self, task_id: str) -> bool:
        """Resume execution of a paused task."""
        task_res = self._active_tasks.get(task_id)
        if not task_res or task_res.state != OrchestrationState.PAUSED_USER_INTERFERENCE:
            return False

        logger.info(f"Resuming task '{task_id}' from operator pause")
        task_res.state = OrchestrationState.DISPATCHING

        if task_id in self._pause_events:
            self._pause_events[task_id].set()

        await self._emit_event(task_id, "TASK_RESUMED", {})
        return True

    async def emergency_stop(self, task_id: Optional[str] = None) -> bool:
        """Immediately revoke all active execution leases and halt automation."""
        target_tasks = [self._active_tasks[task_id]] if task_id and task_id in self._active_tasks else list(self._active_tasks.values())
        if not target_tasks:
            return False

        for task_res in target_tasks:
            tid = task_res.task_id
            logger.critical(f"EMERGENCY STOP invoked for task '{tid}'")
            task_res.state = OrchestrationState.EMERGENCY_STOPPED
            task_res.is_success = False
            task_res.error = AutomationError(
                error_code=AutomationErrorCode.EMERGENCY_STOPPED,
                message="Immediate emergency stop triggered by operator or open palm gesture."
            )

            if tid in self._pending_consents:
                self._pending_consents[tid].set()
            if tid in self._pause_events:
                self._pause_events[tid].set()

            await self._emit_event(tid, "TASK_EMERGENCY_STOPPED", {"reason": "Operator Override"})

        return True

    async def cancel_task(self, task_id: str) -> bool:
        """Cancel an in-progress automation task cleanly."""
        task_res = self._active_tasks.get(task_id)
        if not task_res:
            return False

        logger.warning(f"Cancellation requested for task '{task_id}'")
        task_res.state = OrchestrationState.CANCELLED
        task_res.is_success = False
        task_res.error = AutomationError(
            error_code=AutomationErrorCode.ACTION_CANCELLED,
            message="Task cancelled by user request."
        )

        if task_id in self._pending_consents:
            self._pending_consents[task_id].set()
        if task_id in self._pause_events:
            self._pause_events[task_id].set()

        await self._emit_event(task_id, "TASK_CANCELLED", {"reason": "User Request"})
        return True


# Global Orchestrator Singleton
supervisor_orchestrator = SupervisorOrchestrator()
