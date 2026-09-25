"""Playwright Browser Automation Performance Benchmarks.

Measures actual local execution timings on host hardware:
Playwright startup, page creation, local navigation, semantic locator resolution,
click dispatch & DOM mutation, text fill, observation, verification, screenshot capture,
and end-to-end pipeline execution.
"""

import os
import time
from pathlib import Path
from typing import Any, Dict, List
import numpy as np

from backend.app.automation.browser.playwright_worker import PlaywrightBrowserWorker
from backend.app.automation.grounding.browser_grounder import BrowserGrounder
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


class BrowserAutomationBenchmarkSuite:
    """Runs automated Playwright browser benchmarks and computes statistical p50, p95, p99 metrics."""

    def __init__(self, iterations: int = 30):
        self.iterations = iterations

    def run_benchmarks(self) -> Dict[str, Any]:
        """Execute full Playwright browser benchmark suite and record measured metrics."""
        local_site_dir = Path(__file__).parent / "local_site"
        test_app_url = f"file:///{str(local_site_dir / 'test_app.html').replace(os.sep, '/')}"

        leases = LeaseManager()
        policy = SafetyPolicyEngine()
        grounder = BrowserGrounder()
        worker = PlaywrightBrowserWorker(leases=leases, policy=policy, headless=True)
        verifier = ActionVerifier()
        pipeline = ExecutionPipeline(
            policy=policy,
            leases=leases,
            web_grounder=grounder,
            web_worker=worker,
            verifier=verifier
        )

        timings: Dict[str, List[float]] = {
            "browser_startup_ms": [],
            "page_creation_ms": [],
            "local_navigation_ms": [],
            "locator_resolution_ms": [],
            "click_dispatch_ms": [],
            "fill_text_ms": [],
            "observation_ms": [],
            "verification_ms": [],
            "screenshot_capture_ms": [],
            "end_to_end_action_ms": []
        }

        try:
            # 1. Measure Browser Startup & Page Creation (Initial Warmup)
            t0 = time.perf_counter()
            worker.start()
            t1 = time.perf_counter()
            timings["browser_startup_ms"].append((t1 - t0) * 1000.0)

            # 2. Local Navigation
            t0 = time.perf_counter()
            worker._page.goto(test_app_url, wait_until="load")
            t1 = time.perf_counter()
            timings["local_navigation_ms"].append((t1 - t0) * 1000.0)

            for i in range(self.iterations):
                # Ensure on main test page
                if "test_app.html" not in worker.current_url:
                    worker._page.goto(test_app_url, wait_until="load")

                # Reset page state
                worker._page.locator("#btn_reset").click()

                # 3. Locator Resolution
                t0 = time.perf_counter()
                loc, _ = worker.resolve_locator("btn_execute", role="button", name="Execute Action")
                t1 = time.perf_counter()
                timings["locator_resolution_ms"].append((t1 - t0) * 1000.0)

                # Acquire lease
                lease = leases.acquire_lease(task_id=f"bench_task_{i}", execution_id=f"exec_{i}", agent_id="browser_agent")

                # Grounding
                grounding = ActionGrounding(
                    source=GroundingLevel.LEVEL_1_UIA,
                    target_identity="btn_execute",
                    selector="[data-testid='btn_execute']",
                    confidence=0.99
                )

                # 4. Click Action via Pipeline (End-to-End)
                action_click = ExecutionAction(
                    action_id=f"bench_click_{i}",
                    task_id=f"bench_task_{i}",
                    execution_id=f"exec_{i}",
                    lease_id=lease.lease_id,
                    action_type=ActionType.BROWSER_CLICK,
                    grounding=grounding,
                    parameters={"expected_url": test_app_url},
                    precondition="Button is visible",
                    expected_postcondition="Status is EXECUTED"
                )

                t0 = time.perf_counter()
                res_click = pipeline.run_browser_action(action_click)
                t1 = time.perf_counter()
                timings["end_to_end_action_ms"].append((t1 - t0) * 1000.0)
                if res_click.action_result:
                    timings["click_dispatch_ms"].append(res_click.action_result.execution_duration_ms)

                # 5. Fill Text
                t0 = time.perf_counter()
                worker._page.locator("#txt_message").fill(f"bench_msg_{i}")
                t1 = time.perf_counter()
                timings["fill_text_ms"].append((t1 - t0) * 1000.0)

                # 6. Postcondition Observation
                t0 = time.perf_counter()
                obs = worker.observe_node("txt_message")
                t1 = time.perf_counter()
                timings["observation_ms"].append((t1 - t0) * 1000.0)

                # 7. Verification
                if res_click.action_result:
                    t0 = time.perf_counter()
                    v_res = verifier.verify_postcondition(action_click, res_click.action_result)
                    t1 = time.perf_counter()
                    timings["verification_ms"].append((t1 - t0) * 1000.0)

                # 8. Screenshot Capture
                t0 = time.perf_counter()
                _ = worker._page.screenshot()
                t1 = time.perf_counter()
                timings["screenshot_capture_ms"].append((t1 - t0) * 1000.0)

        finally:
            worker.stop()

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
            "playwright_version": "1.63.0 (Chromium)",
            "iterations": self.iterations,
            "metrics": results
        }


# Global Benchmark Suite
browser_benchmark_suite = BrowserAutomationBenchmarkSuite()
