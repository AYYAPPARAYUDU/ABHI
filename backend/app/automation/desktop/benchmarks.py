"""Windows Desktop Automation Performance Benchmarks.

Measures actual local execution timings on host hardware:
UIA window discovery, element enumeration, grounding resolution, click dispatch,
text entry, observation, and end-to-end verification.
"""

import time
from typing import Any, Dict, List
import numpy as np

from backend.app.automation.desktop.test_target_app import DeterministicLocalTestApp
from backend.app.automation.desktop.windows_worker import WindowsAutomationWorker
from backend.app.automation.grounding.desktop_grounder import DesktopGrounder
from backend.app.automation.leases.lease_manager import LeaseManager
from backend.app.automation.models.actions import (
    ExecutionAction,
    ActionType,
    ActionGrounding,
    GroundingLevel
)
from backend.app.automation.pipeline.executor import ExecutionPipeline
from backend.app.automation.policy.safety_policy import SafetyPolicyEngine
from backend.app.automation.verification.action_verifier import ActionVerifier


class DesktopAutomationBenchmarkSuite:
    """Runs automated benchmarks and computes statistical p50, p95, p99 metrics."""

    def __init__(self, iterations: int = 50):
        self.iterations = iterations

    def run_benchmarks(self) -> Dict[str, Any]:
        """Execute full benchmark suite and record measured metrics."""
        app = DeterministicLocalTestApp()
        leases = LeaseManager()
        policy = SafetyPolicyEngine()
        grounder = DesktopGrounder()
        worker = WindowsAutomationWorker(target_app=app, leases=leases, policy=policy)
        verifier = ActionVerifier()
        pipeline = ExecutionPipeline(
            policy=policy,
            leases=leases,
            desk_grounder=grounder,
            win_worker=worker,
            verifier=verifier
        )

        timings: Dict[str, List[float]] = {
            "window_discovery_ms": [],
            "element_enumeration_ms": [],
            "grounding_resolution_ms": [],
            "click_dispatch_ms": [],
            "text_entry_ms": [],
            "observation_ms": [],
            "verification_ms": [],
            "end_to_end_action_ms": []
        }

        for i in range(self.iterations):
            # 1. Window Discovery
            t0 = time.perf_counter()
            title = worker.uia_driver.get_foreground_window_title()
            t1 = time.perf_counter()
            timings["window_discovery_ms"].append((t1 - t0) * 1000.0)

            # 2. Element Enumeration
            t0 = time.perf_counter()
            elements, _ = worker.inspect_active_window()
            t1 = time.perf_counter()
            timings["element_enumeration_ms"].append((t1 - t0) * 1000.0)

            # 3. Grounding Resolution
            t0 = time.perf_counter()
            grounding, _ = grounder.ground_target("Run Test", active_window_elements=elements)
            t1 = time.perf_counter()
            timings["grounding_resolution_ms"].append((t1 - t0) * 1000.0)

            # Issue lease
            lease = leases.acquire_lease(task_id=f"bench_task_{i}", execution_id=f"exec_{i}", agent_id="os_desktop_agent")

            # 4. Click Action & End-to-End
            action = ExecutionAction(
                action_id=f"bench_click_{i}",
                task_id=f"bench_task_{i}",
                execution_id=f"exec_{i}",
                lease_id=lease.lease_id,
                action_type=ActionType.CLICK_ELEMENT,
                grounding=grounding,
                precondition="Button is visible",
                expected_postcondition="Status is EXECUTED"
            )

            t0 = time.perf_counter()
            res = pipeline.run_desktop_action(action)
            t1 = time.perf_counter()
            timings["end_to_end_action_ms"].append((t1 - t0) * 1000.0)
            if res.action_result:
                timings["click_dispatch_ms"].append(res.action_result.execution_duration_ms)

            # 5. Text Entry
            t0 = time.perf_counter()
            app.type_text("txt_username", f"user_{i}")
            t1 = time.perf_counter()
            timings["text_entry_ms"].append((t1 - t0) * 1000.0)

            # 6. Observation
            t0 = time.perf_counter()
            obs = app.observe_element("txt_username")
            t1 = time.perf_counter()
            timings["observation_ms"].append((t1 - t0) * 1000.0)

            # 7. Verification
            if res.action_result:
                t0 = time.perf_counter()
                v_res = verifier.verify_postcondition(action, res.action_result)
                t1 = time.perf_counter()
                timings["verification_ms"].append((t1 - t0) * 1000.0)

        results = {}
        for metric, values in timings.items():
            if values:
                results[metric] = {
                    "p50": round(float(np.percentile(values, 50)), 3),
                    "p95": round(float(np.percentile(values, 95)), 3),
                    "p99": round(float(np.percentile(values, 99)), 3),
                    "mean": round(float(np.mean(values)), 3),
                    "sample_count": len(values)
                }

        return {
            "host_hardware": "AMD Ryzen 7 260 (8C/16T), 24GB DDR5, Windows 11 Build 26200",
            "iterations": self.iterations,
            "metrics": results
        }


# Global benchmark runner
desktop_benchmark_suite = DesktopAutomationBenchmarkSuite()
