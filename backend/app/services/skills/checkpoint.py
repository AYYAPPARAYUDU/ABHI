"""Phase 7 Stage 7.1 — Execution Session Checkpoint Persistence."""

import time
import uuid
from typing import Any, Dict, List, Optional
from backend.app.core.logging import logger
from backend.app.services.skills.models import SessionCheckpoint


class CheckpointManager:
    """Manages in-memory and persistent storage of execution checkpoints."""

    def __init__(self):
        self._checkpoints: Dict[str, List[SessionCheckpoint]] = {}  # key: task_id -> list of checkpoints

    def save_checkpoint(
        self,
        task_id: str,
        session_id: str,
        node_id: str,
        skill_id: str,
        skill_version: str,
        action_id: str,
        result_summary: Dict[str, Any],
        verified: bool = True
    ) -> SessionCheckpoint:
        """Create and record a verified node completion checkpoint."""
        cp = SessionCheckpoint(
            checkpoint_id=f"cp_{uuid.uuid4().hex[:12]}",
            task_id=task_id,
            session_id=session_id,
            node_id=node_id,
            skill_id=skill_id,
            skill_version=skill_version,
            action_id=action_id,
            completed_at_ts=int(time.time() * 1000),
            node_status="COMPLETED" if verified else "FAILED",
            result_summary=result_summary,
            verified=verified
        )

        if task_id not in self._checkpoints:
            self._checkpoints[task_id] = []
        self._checkpoints[task_id].append(cp)

        logger.info(f"Saved checkpoint '{cp.checkpoint_id}' for task '{task_id}' node '{node_id}' [Verified: {verified}]")
        return cp

    def get_checkpoints(self, task_id: str) -> List[SessionCheckpoint]:
        """Return all checkpoints recorded for a task."""
        return self._checkpoints.get(task_id, [])

    def get_latest_checkpoint(self, task_id: str) -> Optional[SessionCheckpoint]:
        """Return the most recent verified checkpoint."""
        cps = self._checkpoints.get(task_id, [])
        return cps[-1] if cps else None

    def clear(self, task_id: Optional[str] = None):
        """Clear checkpoints for a task or globally."""
        if task_id:
            self._checkpoints.pop(task_id, None)
        else:
            self._checkpoints.clear()


# Global checkpoint manager singleton
checkpoint_manager = CheckpointManager()
