"""Autonomous Worker Lifecycle & Process Governance Engine.

Provides authoritative worker registration, tracking, cooperative cancellation tokens,
process lifecycle management, heartbeats, failure isolation, and resource cleanup.
"""

import asyncio
import os
import psutil
import time
import uuid
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set
from pydantic import BaseModel, Field

from backend.app.automation.models.errors import AutomationError, AutomationErrorCode
from backend.app.core.logging import logger


class WorkerState(str, Enum):
    IDLE = "IDLE"
    BUSY = "BUSY"
    UNHEALTHY = "UNHEALTHY"
    STOPPED = "STOPPED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"


class CancellationToken:
    """Cooperative cancellation token for in-flight tasks and worker executions."""

    def __init__(self, token_id: Optional[str] = None):
        self.token_id = token_id or f"ctok_{uuid.uuid4().hex[:8]}"
        self.is_cancelled: bool = False
        self.cancel_reason: Optional[str] = None
        self.cancelled_at: Optional[float] = None
        self._callbacks: List[Callable[[str], None]] = []

    def cancel(self, reason: str = "User Cancelled") -> None:
        """Trigger cancellation and invoke registered cleanup callbacks."""
        if self.is_cancelled:
            return
        self.is_cancelled = True
        self.cancel_reason = reason
        self.cancelled_at = time.time()
        logger.warning(f"CancellationToken '{self.token_id}' CANCELLED: {reason}")
        for cb in self._callbacks:
            try:
                cb(reason)
            except Exception as e:
                logger.error(f"Error in cancellation callback: {e}")

    def register_callback(self, callback: Callable[[str], None]) -> None:
        """Register a callback invoked when token is cancelled."""
        if self.is_cancelled:
            callback(self.cancel_reason or "Already Cancelled")
        else:
            self._callbacks.append(callback)

    def throw_if_cancelled(self) -> None:
        """Raise an AutomationError if cancellation has been requested."""
        if self.is_cancelled:
            raise AutomationError(
                error_code=AutomationErrorCode.ACTION_CANCELLED,
                message=f"Execution halted: {self.cancel_reason or 'Operation cancelled by operator.'}"
            )


class WorkerRecord(BaseModel):
    """Runtime representation and state of an autonomous execution worker."""
    worker_id: str
    worker_name: str
    worker_type: str  # "browser", "desktop_os", "system", "neural", "custom"
    capabilities: List[str] = Field(default_factory=list)
    state: WorkerState = WorkerState.IDLE
    process_id: Optional[int] = None
    registered_at: float = Field(default_factory=time.time)
    last_heartbeat: float = Field(default_factory=time.time)
    heartbeat_timeout_sec: float = 30.0
    current_task_id: Optional[str] = None
    cancellation_token_id: Optional[str] = None
    tasks_completed: int = 0
    tasks_failed: int = 0
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @property
    def is_alive(self) -> bool:
        """Check if process is active and heartbeat is within tolerance."""
        if self.state in [WorkerState.STOPPED, WorkerState.FAILED]:
            return False
        # Check process existence if PID is known
        if self.process_id:
            try:
                p = psutil.Process(self.process_id)
                if not p.is_running() or p.status() == psutil.STATUS_ZOMBIE:
                    return False
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                return False
        # Heartbeat check
        if time.time() - self.last_heartbeat > self.heartbeat_timeout_sec:
            return False
        return True


class WorkerLifecycleManager:
    """Manages worker registration, health heartbeats, cancellation, and clean resource destruction."""

    def __init__(self):
        self._workers: Dict[str, WorkerRecord] = {}
        self._tokens: Dict[str, CancellationToken] = {}
        self._emergency_lock: bool = False
        self._managed_pids: Set[int] = set()

    def register_worker(
        self,
        worker_id: str,
        name: str,
        worker_type: str,
        capabilities: List[str],
        pid: Optional[int] = None,
        heartbeat_timeout_sec: float = 30.0,
        metadata: Optional[Dict[str, Any]] = None
    ) -> WorkerRecord:
        """Register a new autonomous worker with the lifecycle manager."""
        if self._emergency_lock:
            raise RuntimeError("Cannot register worker: System is locked in EMERGENCY_STOP state.")

        record = WorkerRecord(
            worker_id=worker_id,
            worker_name=name,
            worker_type=worker_type,
            capabilities=capabilities,
            state=WorkerState.IDLE,
            process_id=pid,
            heartbeat_timeout_sec=heartbeat_timeout_sec,
            metadata=metadata or {}
        )
        self._workers[worker_id] = record
        if pid:
            self._managed_pids.add(pid)
        logger.info(f"Worker registered: '{worker_id}' ({name}, type={worker_type}, pid={pid})")
        return record

    def unregister_worker(self, worker_id: str) -> bool:
        """Gracefully unregister a worker and remove from active pool."""
        record = self._workers.pop(worker_id, None)
        if record:
            if record.process_id in self._managed_pids:
                self._managed_pids.discard(record.process_id)
            logger.info(f"Worker unregistered: '{worker_id}'")
            return True
        return False

    def record_heartbeat(self, worker_id: str) -> bool:
        """Update last heartbeat timestamp for a worker."""
        worker = self._workers.get(worker_id)
        if not worker:
            return False
        worker.last_heartbeat = time.time()
        if worker.state == WorkerState.UNHEALTHY:
            worker.state = WorkerState.IDLE if not worker.current_task_id else WorkerState.BUSY
        return True

    def check_health(self) -> Dict[str, WorkerState]:
        """Audit all registered workers and transition unresponsive ones to UNHEALTHY or FAILED."""
        health_report: Dict[str, WorkerState] = {}
        now = time.time()
        for wid, worker in self._workers.items():
            if worker.state in [WorkerState.STOPPED, WorkerState.FAILED]:
                health_report[wid] = worker.state
                continue

            if now - worker.last_heartbeat > worker.heartbeat_timeout_sec:
                logger.warning(f"Worker '{wid}' missed heartbeat deadline ({now - worker.last_heartbeat:.1f}s > {worker.heartbeat_timeout_sec}s). Marking UNHEALTHY.")
                worker.state = WorkerState.UNHEALTHY
            elif worker.process_id:
                try:
                    p = psutil.Process(worker.process_id)
                    if not p.is_running() or p.status() == psutil.STATUS_ZOMBIE:
                        worker.state = WorkerState.FAILED
                        logger.error(f"Worker '{wid}' process {worker.process_id} terminated unexpectedly.")
                except Exception:
                    worker.state = WorkerState.FAILED

            health_report[wid] = worker.state
        return health_report

    def create_cancellation_token(self, task_id: str) -> CancellationToken:
        """Create and track a cancellation token for an orchestration task."""
        token = CancellationToken()
        self._tokens[task_id] = token
        return token

    def get_cancellation_token(self, task_id: str) -> Optional[CancellationToken]:
        """Retrieve active cancellation token for a task."""
        return self._tokens.get(task_id)

    def cancel_task(self, task_id: str, reason: str = "Operator Cancel") -> bool:
        """Cancel a running task and its associated workers."""
        token = self._tokens.get(task_id)
        if token:
            token.cancel(reason)

        # Update any worker running this task
        for worker in self._workers.values():
            if worker.current_task_id == task_id:
                worker.state = WorkerState.CANCELLED
                worker.current_task_id = None
                worker.cancellation_token_id = None
        return True

    def acquire_worker(
        self,
        worker_type: str,
        required_capability: Optional[str] = None,
        task_id: Optional[str] = None
    ) -> Optional[WorkerRecord]:
        """Find and claim an IDLE worker matching requested type and capability."""
        if self._emergency_lock:
            return None

        for worker in self._workers.values():
            if worker.state == WorkerState.IDLE and worker.worker_type == worker_type:
                if required_capability and required_capability not in worker.capabilities:
                    continue
                worker.state = WorkerState.BUSY
                worker.current_task_id = task_id
                if task_id and task_id in self._tokens:
                    worker.cancellation_token_id = self._tokens[task_id].token_id
                return worker
        return None

    def release_worker(self, worker_id: str, success: bool = True) -> bool:
        """Release worker back to IDLE state upon task completion."""
        worker = self._workers.get(worker_id)
        if not worker:
            return False
        if success:
            worker.tasks_completed += 1
        else:
            worker.tasks_failed += 1
        worker.state = WorkerState.IDLE
        worker.current_task_id = None
        worker.cancellation_token_id = None
        worker.last_heartbeat = time.time()
        return True

    def emergency_stop_all(self, reason: str = "Emergency Safety Interruption") -> int:
        """Instantly cancel all tokens, mark workers STOPPED, and enforce emergency lockout."""
        self._emergency_lock = True
        stopped_count = 0

        # Cancel all active cancellation tokens
        for token in self._tokens.values():
            token.cancel(reason=reason)

        # Transition all active workers
        for worker in self._workers.values():
            if worker.state in [WorkerState.BUSY, WorkerState.IDLE, WorkerState.UNHEALTHY]:
                worker.state = WorkerState.STOPPED
                worker.current_task_id = None
                worker.cancellation_token_id = None
                stopped_count += 1

        logger.critical(f"WorkerLifecycleManager: EMERGENCY STOP executed. {stopped_count} workers halted.")
        return stopped_count

    def emergency_reset(self) -> bool:
        """Reset emergency lockout and re-enable worker assignments."""
        self._emergency_lock = False
        for worker in self._workers.values():
            if worker.state == WorkerState.STOPPED:
                worker.state = WorkerState.IDLE
                worker.last_heartbeat = time.time()
        logger.info("WorkerLifecycleManager: Emergency lockout reset.")
        return True

    def cleanup_managed_processes(self) -> int:
        """Cleanly terminate all managed subprocesses to prevent zombie or orphaned tasks."""
        terminated = 0
        for pid in list(self._managed_pids):
            try:
                p = psutil.Process(pid)
                p.terminate()
                p.wait(timeout=1.0)
                terminated += 1
            except Exception:
                pass
            self._managed_pids.discard(pid)
        return terminated

    def get_all_workers(self) -> List[Dict[str, Any]]:
        """Return all worker records as structured dictionaries."""
        return [w.model_dump() for w in self._workers.values()]


# Global Singleton Instance
worker_lifecycle_manager = WorkerLifecycleManager()
