"""Worker Process Lifecycle & Orphan Reconciliation Manager for Phase 7 Stage 7.6.

Governs:
- Process Identity & Ownership: PID, PPID, worker_id, task_id, execution_id
- Worker States: STARTING -> RUNNING -> IDLE -> STOPPING -> STOPPED -> FAILED -> ORPHANED
- Orphan Process Detection & Safe Reconciliation
- Security Boundary: Never kills unrelated Windows processes (explorer.exe, system services)
- Graceful Worker Shutdown & Resource Lease Recovery
"""

import os
import sys
import time
import psutil
import threading
from typing import Dict, List, Optional, Tuple
from backend.app.core.logging import logger
from backend.app.runtime.resources.models import (
    WorkerProcessRecord,
    ProcessState,
    ResourceType,
    WorkloadPriority,
    OperatingModeConfig,
)
from backend.app.runtime.resources.ledger import ResourceLedger

PROTECTED_PROCESS_NAMES = {
    "explorer.exe",
    "svchost.exe",
    "services.exe",
    "lsass.exe",
    "csrss.exe",
    "winlogon.exe",
    "smss.exe",
    "system",
    "registry",
    "python.exe",  # Protected from self-termination of main supervisor
}


class WorkerLifecycleManager:
    """Manages heavy worker process lifecycles and provides secure orphan detection & cleanup."""

    def __init__(self, ledger: ResourceLedger, config: OperatingModeConfig):
        self.ledger = ledger
        self.config = config
        self._lock = threading.RLock()
        self._workers: Dict[str, WorkerProcessRecord] = {}  # worker_id -> record
        self._pid_to_worker: Dict[int, str] = {}  # pid -> worker_id

    def register_worker(
        self,
        worker_id: str,
        pid: int,
        worker_type: str = "playwright",
        task_id: Optional[str] = None,
        execution_id: Optional[str] = None,
        cmdline: Optional[List[str]] = None
    ) -> WorkerProcessRecord:
        """Register a newly spawned heavy child worker process."""
        with self._lock:
            ppid = os.getpid()
            proc_name = "unknown"
            try:
                p = psutil.Process(pid)
                proc_name = p.name()
            except Exception:
                pass

            record = WorkerProcessRecord(
                pid=pid,
                ppid=ppid,
                worker_id=worker_id,
                worker_type=worker_type,
                task_id=task_id,
                execution_id=execution_id,
                process_name=proc_name,
                cmdline=cmdline or [],
                state=ProcessState.RUNNING,
                start_time=time.time(),
                last_heartbeat=time.time(),
                is_verified_abhi_process=True
            )
            self._workers[worker_id] = record
            self._pid_to_worker[pid] = worker_id
            logger.info(f"Registered worker {worker_id} (type={worker_type}, pid={pid}, task={task_id})")
            return record

    def record_heartbeat(self, worker_id: str, cpu_percent: float = 0.0, memory_mb: float = 0.0) -> None:
        """Record worker liveness heartbeat and current utilization metrics."""
        with self._lock:
            w = self._workers.get(worker_id)
            if w:
                w.last_heartbeat = time.time()
                w.cpu_percent = cpu_percent
                w.memory_mb = memory_mb
                if w.state == ProcessState.STARTING:
                    w.state = ProcessState.RUNNING

    def stop_worker(self, worker_id: str, timeout_sec: float = 5.0) -> Tuple[bool, str]:
        """Gracefully stop a managed worker process and release its leases."""
        with self._lock:
            w = self._workers.get(worker_id)
            if not w:
                return False, f"Worker {worker_id} not found"

            w.state = ProcessState.STOPPING
            pid = w.pid

            # Release all associated leases from ledger
            self.ledger.release_leases_by_owner(worker_id)

            # Terminate process if still running
            success = True
            try:
                if psutil.pid_exists(pid):
                    p = psutil.Process(pid)
                    if p.name().lower() in PROTECTED_PROCESS_NAMES and pid == os.getpid():
                        logger.warning("Attempted to terminate protected main supervisor PID. Skipped.")
                    else:
                        p.terminate()
                        try:
                            p.wait(timeout=timeout_sec)
                        except psutil.TimeoutExpired:
                            p.kill()
            except Exception as e:
                logger.debug(f"Process termination note for pid {pid}: {e}")

            w.state = ProcessState.STOPPED
            self._pid_to_worker.pop(pid, None)
            logger.info(f"Worker {worker_id} (pid={pid}) stopped successfully.")
            return True, f"Worker {worker_id} stopped"

    def scan_and_reconcile_orphans(self) -> List[int]:
        """Scan system for orphaned ABHI child processes and terminate them safely."""
        with self._lock:
            reconciled_pids: List[int] = []
            now = time.time()

            # 1. Check registered workers for missing processes or dead heartbeats
            for w_id, w in list(self._workers.items()):
                if w.state in [ProcessState.RUNNING, ProcessState.IDLE]:
                    if not psutil.pid_exists(w.pid):
                        logger.warning(f"Worker {w_id} (pid={w.pid}) died unexpectedly. Marking FAILED.")
                        w.state = ProcessState.FAILED
                        self.ledger.release_leases_by_owner(w_id)
                        self._pid_to_worker.pop(w.pid, None)
                    elif (now - w.last_heartbeat > 60.0):
                        logger.warning(f"Worker {w_id} (pid={w.pid}) heartbeat timed out. Marking ORPHANED.")
                        w.state = ProcessState.ORPHANED
                        self.stop_worker(w_id)
                        reconciled_pids.append(w.pid)

            # 2. Inspect child processes of current process for unmanaged orphans
            try:
                current_proc = psutil.Process(os.getpid())
                children = current_proc.children(recursive=True)
                for child in children:
                    c_pid = child.pid
                    if c_pid not in self._pid_to_worker:
                        # Unmanaged child process detected
                        c_name = child.name().lower()
                        if c_name not in PROTECTED_PROCESS_NAMES:
                            logger.warning(f"Detected unmanaged child orphan PID {c_pid} ({c_name}). Reconciling...")
                            try:
                                child.terminate()
                                child.wait(timeout=2.0)
                            except Exception:
                                try:
                                    child.kill()
                                except Exception:
                                    pass
                            reconciled_pids.append(c_pid)
            except Exception as e:
                logger.debug(f"Child process orphan scan error: {e}")

            return reconciled_pids

    def get_all_workers(self) -> List[WorkerProcessRecord]:
        """Return list of all tracked worker processes."""
        with self._lock:
            return [w.model_copy() for w in self._models_copy()]

    def _models_copy(self) -> List[WorkerProcessRecord]:
        return list(self._workers.values())
