"""Performance Profiling & Benchmark Suite for End-to-End Supervisor Orchestration.

Measures latency distributions (p50, p95, p99, mean, min, max) across orchestration boundaries:
1. Task Creation -> Planning
2. Planning -> Authorization (Policy + Lease)
3. Authorization -> Grounding Strategy Selection
4. Grounding -> Precondition Verification & Dispatch
5. Dispatch -> Physical/Browser Execution & Observation
6. Observation -> Dual-State Verification
7. Total Successful Execution Cycle
"""

import asyncio
import statistics
import time
from typing import Any, Dict, List

from backend.app.automation.desktop.test_target_app import DeterministicLocalTestApp
from backend.app.automation.desktop.windows_worker import WindowsAutomationWorker
from backend.app.automation.models.actions import (
    ActionGrounding,
    ActionResult,
    ActionType,
    ExecutionAction,
    GroundingLevel,
    ObservedState
)
from backend.app.automation.orchestration.models import OrchestrationState
from backend.app.automation.orchestration.orchestrator import SupervisorOrchestrator



class OrchestrationBenchmarkSuite:
    """Measures latency distributions across all 7 orchestration boundaries."""

    def __init__(self, iterations: int = 30):
        self.iterations = iterations

    async def run_benchmarks(self) -> Dict[str, Any]:
        """Execute the full benchmark suite across iterations."""
        create_plan_times: List[float] = []
        plan_auth_times: List[float] = []
        auth_ground_times: List[float] = []
        ground_dispatch_times: List[float] = []
        dispatch_obs_times: List[float] = []
        obs_verify_times: List[float] = []
        total_cycle_times: List[float] = []

        for i in range(self.iterations):
            # Setup isolated mock app & worker for benchmark consistency
            mock_app = DeterministicLocalTestApp()
            win_worker = WindowsAutomationWorker(target_app=mock_app)
            orch = SupervisorOrchestrator(win_worker=win_worker)
            task_id = f"bench_task_{i}_{int(time.time()*1000)}"

            t_start = time.perf_counter()

            # 1. Task Creation -> Planning
            t0 = time.perf_counter()
            task_res = await orch.create_task(goal="Click the Run Test button", task_id=task_id)
            create_plan_times.append((time.perf_counter() - t0) * 1000.0)

            # 2. Planning -> Authorization (Policy + Lease)
            t0 = time.perf_counter()
            lease = orch.leases.acquire_lease(task_id=task_id, execution_id=task_res.execution_id, agent_id="os_desktop_agent")
            plan_auth_times.append((time.perf_counter() - t0) * 1000.0)

            # 3. Authorization -> Grounding Strategy Selection
            t0 = time.perf_counter()
            grounding, trace, err = orch.strategy_selector.select_desktop_strategy(
                target_name="Run Test",
                action_type=ActionType.CLICK_ELEMENT,
                task_id=task_id,
                execution_id=task_res.execution_id
            )
            auth_ground_times.append((time.perf_counter() - t0) * 1000.0)

            # 4. Grounding -> Precondition Verification & Dispatch
            t0 = time.perf_counter()
            initial_obs = win_worker.target_app.observe_element("Run Test")
            ground_dispatch_times.append((time.perf_counter() - t0) * 1000.0)

            # 5. Dispatch -> Physical Execution & Observation
            t0 = time.perf_counter()
            action_res = await orch.execute_desktop_intent(
                task_id=task_id,
                target_name="Run Test",
                action_type=ActionType.CLICK_ELEMENT,
                precondition="target 'Run Test' is enabled",
                expected_postcondition="app state is EXECUTED"
            )
            dispatch_obs_times.append((time.perf_counter() - t0) * 1000.0)

            # 6. Observation -> Dual-State Verification
            t0 = time.perf_counter()
            if action_res.executed_actions and grounding:
                sample_action = ExecutionAction(
                    action_id=f"act_bench_{i}",
                    task_id=task_id,
                    execution_id=task_res.execution_id,
                    lease_id=lease.lease_id,
                    action_type=ActionType.CLICK_ELEMENT,
                    grounding=grounding,
                    precondition="target 'Run Test' is enabled",
                    expected_postcondition="app state is RUNNING"
                )
                sample_res = ActionResult(
                    success=True,
                    action_id=f"act_bench_{i}",
                    execution_duration_ms=1.0,
                    observed_state=ObservedState(target_found=True, status_label="RUNNING")
                )
                _ = orch.verifier.verify_postcondition(sample_action, sample_res)
            obs_verify_times.append((time.perf_counter() - t0) * 1000.0)

            total_cycle_times.append((time.perf_counter() - t_start) * 1000.0)

        return {
            "iterations": self.iterations,
            "metrics": {
                "task_creation_to_planning_ms": self._calc_stats(create_plan_times),
                "planning_to_authorization_ms": self._calc_stats(plan_auth_times),
                "authorization_to_grounding_ms": self._calc_stats(auth_ground_times),
                "grounding_to_dispatch_ms": self._calc_stats(ground_dispatch_times),
                "dispatch_to_observation_ms": self._calc_stats(dispatch_obs_times),
                "observation_to_verification_ms": self._calc_stats(obs_verify_times),
                "total_successful_execution_ms": self._calc_stats(total_cycle_times)
            }
        }

    def _calc_stats(self, samples: List[float]) -> Dict[str, float]:
        if not samples:
            return {"p50": 0.0, "p95": 0.0, "p99": 0.0, "mean": 0.0, "min": 0.0, "max": 0.0}
        sorted_samples = sorted(samples)
        n = len(sorted_samples)
        p50 = sorted_samples[int(n * 0.50)]
        p95 = sorted_samples[min(int(n * 0.95), n - 1)]
        p99 = sorted_samples[min(int(n * 0.99), n - 1)]
        return {
            "p50": round(p50, 3),
            "p95": round(p95, 3),
            "p99": round(p99, 3),
            "mean": round(statistics.mean(samples), 3),
            "min": round(min(samples), 3),
            "max": round(max(samples), 3)
        }


# Global Benchmark Suite Singleton
orchestration_benchmark_suite = OrchestrationBenchmarkSuite()


class RecoveryBenchmarkSuite:
    """Measures latency distributions across all 7 recovery boundaries."""

    def __init__(self, iterations: int = 30):
        self.iterations = iterations

    async def run_benchmarks(self) -> Dict[str, Any]:
        """Execute recovery benchmark suite across iterations."""
        discovery_times: List[float] = []
        reconciliation_times: List[float] = []
        win_worker_restart_times: List[float] = []
        browser_worker_restart_times: List[float] = []
        fresh_grounding_times: List[float] = []
        verification_times: List[float] = []
        total_recovery_times: List[float] = []

        for i in range(self.iterations):
            mock_app = DeterministicLocalTestApp()
            win_worker = WindowsAutomationWorker(target_app=mock_app)
            orch = SupervisorOrchestrator(win_worker=win_worker)
            task_id = f"bench_rec_task_{i}_{int(time.time()*1000)}"

            # Seed an interrupted task in journal
            task_res = await orch.create_task(goal="Click Run Test button", task_id=task_id)
            task_res.state = OrchestrationState.EXECUTING
            orch.journal.persist_task(task_res)

            t_start = time.perf_counter()

            # 1. Restart -> State Discovery
            t0 = time.perf_counter()
            interrupted = orch.recovery_engine.discover_interrupted_tasks()
            discovery_times.append((time.perf_counter() - t0) * 1000.0)

            # 2. State Discovery -> Reconciliation
            t0 = time.perf_counter()
            _ = await orch.reconcile_task(task_id)
            reconciliation_times.append((time.perf_counter() - t0) * 1000.0)

            # 3. Worker Restart
            t0 = time.perf_counter()
            win_worker.restart_worker()
            win_worker_restart_times.append((time.perf_counter() - t0) * 1000.0)

            # 4. Browser Worker Restart
            t0 = time.perf_counter()
            orch.browser_worker.restart_worker()
            browser_worker_restart_times.append((time.perf_counter() - t0) * 1000.0)

            # 5. Fresh Grounding
            t0 = time.perf_counter()
            grounding, _, _ = orch.strategy_selector.select_desktop_strategy(
                target_name="Run Test",
                action_type=ActionType.CLICK_ELEMENT,
                task_id=task_id,
                execution_id=task_res.execution_id
            )
            fresh_grounding_times.append((time.perf_counter() - t0) * 1000.0)

            # 6. Recovery Verification
            t0 = time.perf_counter()
            sample_action = ExecutionAction(
                action_id=f"act_rec_{i}",
                task_id=task_id,
                execution_id=task_res.execution_id,
                lease_id=f"lease_{i}",
                action_type=ActionType.CLICK_ELEMENT,
                grounding=grounding or ActionGrounding(source=GroundingLevel.LEVEL_1_UIA, target_identity="Run Test"),
                precondition="target 'Run Test' is enabled",
                expected_postcondition="app state is RUNNING"
            )
            sample_res = ActionResult(
                success=True,
                action_id=f"act_rec_{i}",
                execution_duration_ms=1.0,
                observed_state=ObservedState(target_found=True, status_label="RUNNING")
            )
            _ = orch.verifier.verify_postcondition(sample_action, sample_res)
            verification_times.append((time.perf_counter() - t0) * 1000.0)

            total_recovery_times.append((time.perf_counter() - t_start) * 1000.0)

        return {
            "iterations": self.iterations,
            "metrics": {
                "restart_to_state_discovery_ms": self._calc_stats(discovery_times),
                "state_discovery_to_reconciliation_ms": self._calc_stats(reconciliation_times),
                "worker_restart_ms": self._calc_stats(win_worker_restart_times),
                "browser_restart_ms": self._calc_stats(browser_worker_restart_times),
                "fresh_regrounding_ms": self._calc_stats(fresh_grounding_times),
                "recovery_verification_ms": self._calc_stats(verification_times),
                "total_recovery_completion_ms": self._calc_stats(total_recovery_times)
            }
        }

    def _calc_stats(self, samples: List[float]) -> Dict[str, float]:
        if not samples:
            return {"p50": 0.0, "p95": 0.0, "p99": 0.0, "mean": 0.0, "min": 0.0, "max": 0.0}
        sorted_samples = sorted(samples)
        n = len(sorted_samples)
        p50 = sorted_samples[int(n * 0.50)]
        p95 = sorted_samples[min(int(n * 0.95), n - 1)]
        p99 = sorted_samples[min(int(n * 0.99), n - 1)]
        return {
            "p50": round(p50, 3),
            "p95": round(p95, 3),
            "p99": round(p99, 3),
            "mean": round(statistics.mean(samples), 3),
            "min": round(min(samples), 3),
            "max": round(max(samples), 3)
        }


# Global Recovery Benchmark Suite Singleton
recovery_benchmark_suite = RecoveryBenchmarkSuite()

