"""Transactional SQLite WAL State Persistence & Execution Audit Journal.

Provides crash-consistent state storage, immutable audit logging,
idempotency cache persistence, and restart-safe reconciliation discovery.
"""

import os
import json
import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from backend.app.automation.models.actions import ExecutionAction, ActionType
from backend.app.automation.models.errors import AutomationError, AutomationErrorCode
from backend.app.automation.orchestration.models import (
    ExecutionAuditRecord,
    OrchestrationState,
    OrchestrationTaskResult,
    SupervisorDecisionTrace
)


class ExecutionJournal:
    """Crash-consistent transactional state store and immutable audit journal."""

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            base_dir = Path("./database/relational")
            base_dir.mkdir(parents=True, exist_ok=True)
            self.db_path = str(base_dir / "execution_journal.db")
        else:
            self.db_path = db_path
            if db_path != ":memory:":
                Path(db_path).parent.mkdir(parents=True, exist_ok=True)

        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        """Create a connection with WAL journal mode enabled."""
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        if self.db_path != ":memory:":
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute("PRAGMA synchronous=NORMAL;")
        return conn

    def _init_db(self) -> None:
        """Initialize database schema tables and indexes."""
        with self._get_connection() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS tasks (
                    task_id TEXT PRIMARY KEY,
                    execution_id TEXT NOT NULL,
                    goal TEXT NOT NULL,
                    state TEXT NOT NULL,
                    is_success INTEGER NOT NULL DEFAULT 0,
                    duration_ms INTEGER NOT NULL DEFAULT 0,
                    error_json TEXT,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                );

                CREATE TABLE IF NOT EXISTS actions (
                    action_id TEXT PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    execution_id TEXT NOT NULL,
                    lease_id TEXT,
                    action_type TEXT NOT NULL,
                    grounding_source TEXT,
                    grounding_target TEXT,
                    precondition TEXT,
                    expected_postcondition TEXT,
                    status TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL,
                    FOREIGN KEY(task_id) REFERENCES tasks(task_id)
                );

                CREATE TABLE IF NOT EXISTS audit_records (
                    record_id TEXT PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    execution_id TEXT NOT NULL,
                    action_id TEXT,
                    timestamp REAL NOT NULL,
                    state_transition TEXT NOT NULL,
                    worker TEXT,
                    grounding_method TEXT,
                    lease_status TEXT,
                    policy_result TEXT,
                    precondition_result TEXT,
                    observation_reference TEXT,
                    verification_result TEXT,
                    recovery_event TEXT,
                    final_state TEXT,
                    payload_json TEXT
                );

                CREATE TABLE IF NOT EXISTS idempotency_cache (
                    action_hash TEXT PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    action_id TEXT NOT NULL,
                    executed_at REAL NOT NULL,
                    status TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);
                CREATE INDEX IF NOT EXISTS idx_audit_task_id ON audit_records(task_id);
                CREATE INDEX IF NOT EXISTS idx_actions_task_id ON actions(task_id);
            """)

    def persist_task(self, task: OrchestrationTaskResult) -> None:
        """Persist or update task state transactionally."""
        now = time.time()
        err_json = json.dumps(task.error.model_dump()) if task.error else None
        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO tasks (task_id, execution_id, goal, state, is_success, duration_ms, error_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(task_id) DO UPDATE SET
                    execution_id=excluded.execution_id,
                    goal=excluded.goal,
                    state=excluded.state,
                    is_success=excluded.is_success,
                    duration_ms=excluded.duration_ms,
                    error_json=excluded.error_json,
                    updated_at=excluded.updated_at
            """, (
                task.task_id,
                task.execution_id,
                task.goal,
                task.state.value if isinstance(task.state, OrchestrationState) else str(task.state),
                1 if task.is_success else 0,
                task.duration_ms,
                err_json,
                now,
                now
            ))

    def persist_action(self, action: ExecutionAction, status: str = "PENDING") -> None:
        """Record a physical action dispatch definition."""
        now = time.time()
        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO actions (
                    action_id, task_id, execution_id, lease_id, action_type,
                    grounding_source, grounding_target, precondition, expected_postcondition,
                    status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(action_id) DO UPDATE SET
                    status=excluded.status,
                    updated_at=excluded.updated_at
            """, (
                action.action_id,
                action.task_id,
                action.execution_id,
                action.lease_id,
                action.action_type.value if isinstance(action.action_type, ActionType) else str(action.action_type),
                action.grounding.source.value if hasattr(action.grounding.source, "value") else str(action.grounding.source),
                action.grounding.target_identity,
                action.precondition,
                action.expected_postcondition,
                status,
                now,
                now
            ))

    def record_audit(self, record: ExecutionAuditRecord) -> None:
        """Append an immutable audit entry to the persistent journal."""
        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO audit_records (
                    record_id, task_id, execution_id, action_id, timestamp,
                    state_transition, worker, grounding_method, lease_status,
                    policy_result, precondition_result, observation_reference,
                    verification_result, recovery_event, final_state, payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record.record_id,
                record.task_id,
                record.execution_id,
                record.action_id,
                record.timestamp,
                record.state_transition,
                record.worker,
                record.grounding_method,
                record.lease_status,
                json.dumps(record.policy_result) if record.policy_result else None,
                json.dumps(record.precondition_result) if record.precondition_result else None,
                record.observation_reference,
                json.dumps(record.verification_result) if record.verification_result else None,
                record.recovery_event,
                record.final_state,
                json.dumps(record.payload) if record.payload else None
            ))

    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve stored task record by ID."""
        with self._get_connection() as conn:
            row = conn.execute("SELECT * FROM tasks WHERE task_id = ?", (task_id,)).fetchone()
            if not row:
                return None
            res = dict(row)
            if res.get("error_json"):
                res["error"] = json.loads(res["error_json"])
            return res

    def get_audit_trail(self, task_id: str) -> List[ExecutionAuditRecord]:
        """Fetch all audit records for a given task sorted chronologically."""
        records = []
        with self._get_connection() as conn:
            rows = conn.execute(
                "SELECT * FROM audit_records WHERE task_id = ? ORDER BY timestamp ASC",
                (task_id,)
            ).fetchall()
            for r in rows:
                row_dict = dict(r)
                records.append(ExecutionAuditRecord(
                    record_id=row_dict["record_id"],
                    task_id=row_dict["task_id"],
                    execution_id=row_dict["execution_id"],
                    action_id=row_dict["action_id"],
                    timestamp=row_dict["timestamp"],
                    state_transition=row_dict["state_transition"],
                    worker=row_dict["worker"],
                    grounding_method=row_dict["grounding_method"],
                    lease_status=row_dict["lease_status"],
                    policy_result=json.loads(row_dict["policy_result"]) if row_dict["policy_result"] else None,
                    precondition_result=json.loads(row_dict["precondition_result"]) if row_dict["precondition_result"] else None,
                    observation_reference=row_dict["observation_reference"],
                    verification_result=json.loads(row_dict["verification_result"]) if row_dict["verification_result"] else None,
                    recovery_event=row_dict["recovery_event"],
                    final_state=row_dict["final_state"],
                    payload=json.loads(row_dict["payload_json"]) if row_dict["payload_json"] else {}
                ))
        return records

    def get_interrupted_tasks(self) -> List[Dict[str, Any]]:
        """Discover all non-terminal tasks requiring restart-recovery reconciliation."""
        terminal_states = [
            OrchestrationState.COMPLETED.value,
            OrchestrationState.FAILED.value,
            OrchestrationState.CANCELLED.value,
            OrchestrationState.EMERGENCY_STOPPED.value
        ]
        placeholders = ",".join("?" for _ in terminal_states)
        with self._get_connection() as conn:
            rows = conn.execute(
                f"SELECT * FROM tasks WHERE state NOT IN ({placeholders}) ORDER BY created_at ASC",
                terminal_states
            ).fetchall()
            results = []
            for r in rows:
                d = dict(r)
                if d.get("error_json"):
                    d["error"] = json.loads(d["error_json"])
                results.append(d)
            return results

    def check_idempotency(self, action_hash: str) -> bool:
        """Return True if this action hash has already been successfully executed."""
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT 1 FROM idempotency_cache WHERE action_hash = ? AND status = 'COMPLETED'",
                (action_hash,)
            ).fetchone()
            return row is not None

    def record_idempotency(self, action_hash: str, task_id: str, action_id: str, status: str = "COMPLETED") -> None:
        """Record an executed action hash into the persistent idempotency store."""
        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO idempotency_cache (action_hash, task_id, action_id, executed_at, status)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(action_hash) DO UPDATE SET
                    status=excluded.status,
                    executed_at=excluded.executed_at
            """, (action_hash, task_id, action_id, time.time(), status))

    def validate_crash_consistency(self) -> Tuple[bool, List[Dict[str, Any]]]:
        """Audit database integrity for impossible or corrupted states.

        Returns (is_consistent, list of flagged inconsistencies):
        - Tasks marked COMPLETED without corresponding VERIFICATION audit record
        """
        inconsistencies = []
        with self._get_connection() as conn:
            completed_tasks = conn.execute(
                "SELECT task_id, state FROM tasks WHERE state = 'COMPLETED'"
            ).fetchall()
            for ct in completed_tasks:
                tid = ct["task_id"]
                ver_record = conn.execute(
                    "SELECT 1 FROM audit_records WHERE task_id = ? AND (state_transition LIKE '%VERIF%' OR state_transition = 'TASK_COMPLETED')",
                    (tid,)
                ).fetchone()
                if not ver_record:
                    inconsistencies.append({
                        "task_id": tid,
                        "error": "Task marked COMPLETED without corresponding verification audit entry."
                    })
        return len(inconsistencies) == 0, inconsistencies


    def clear(self) -> None:
        """Clear all tables (used exclusively in isolated tests)."""
        with self._get_connection() as conn:
            conn.execute("DELETE FROM audit_records;")
            conn.execute("DELETE FROM actions;")
            conn.execute("DELETE FROM tasks;")
            conn.execute("DELETE FROM idempotency_cache;")


# Singleton
execution_journal = ExecutionJournal()
