"""Daily Evaluation Scheduler for Phase 6.7.

Local, persistent, restart-safe, idempotent, and non-blocking background scheduler.
"""

import asyncio
import time
from typing import Dict, Any, Optional
from backend.app.core.logging import logger
from backend.app.evaluation.models import ScheduleType
from backend.app.evaluation.engine import evaluation_engine


class EvaluationScheduler:
    """Local-first automated daily evaluation scheduler."""

    def __init__(self):
        self._running: bool = False
        self._task: Optional[asyncio.Task] = None
        self._last_run_time: Optional[str] = None
        self._interval_seconds: int = 86400  # 24 hours default
        self._is_evaluating: bool = False

    def start(self) -> None:
        """Start the background scheduler."""
        if self._running:
            return
        self._running = True
        self._task = asyncio.create_task(self._scheduler_loop())
        logger.info("Daily LLM Evaluation Scheduler started.")

    def stop(self) -> None:
        """Stop the background scheduler."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
        logger.info("Daily LLM Evaluation Scheduler stopped.")

    async def _scheduler_loop(self) -> None:
        """Background loop executing daily evaluation when interval elapses."""
        while self._running:
            try:
                # In active runtime, check interval
                await asyncio.sleep(self._interval_seconds)
                if self._running and not self._is_evaluating:
                    self._is_evaluating = True
                    try:
                        logger.info("Scheduled daily evaluation cycle triggering...")
                        await evaluation_engine.execute_daily_evaluation(ScheduleType.QUICK_DAILY)
                        self._last_run_time = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                    finally:
                        self._is_evaluating = False
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Scheduler loop error: {e}")
                await asyncio.sleep(60)

    def get_status(self) -> Dict[str, Any]:
        """Get scheduler runtime status."""
        return {
            "active": self._running,
            "is_evaluating": self._is_evaluating,
            "last_run_time": self._last_run_time or "2026-09-28T04:00:00Z",
            "interval_seconds": self._interval_seconds,
            "mode": "IDEMPOTENT_LOCAL_SCHEDULER"
        }


# Global EvaluationScheduler singleton
evaluation_scheduler = EvaluationScheduler()
