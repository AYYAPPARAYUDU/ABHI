"""Defect detection and aggregation module for Self-Healing Core."""

import hashlib
import uuid
from typing import Dict, List, Optional
from datetime import datetime, timezone
from backend.app.cognitive.self_healing.models import DefectReport, DefectSource
from backend.app.cognitive.self_healing.sanitizer import sanitizer
from backend.app.core.logging import logger


class DefectDetector:
    """Detects, normalizes, sanitizes, and deduplicates application defects."""

    def __init__(self):
        self._active_defects: Dict[str, DefectReport] = {}
        self._defect_history: List[DefectReport] = []

    def _generate_fingerprint(self, error_type: str, message: str, component: str) -> str:
        """Create deterministic fingerprint to deduplicate identical recurring errors."""
        cleaned_msg = sanitizer.sanitize_text(message)
        # Normalize message by removing variable addresses / timestamps
        normalized_str = f"{error_type}:{component}:{cleaned_msg[:120]}"
        return hashlib.sha256(normalized_str.encode("utf-8")).hexdigest()[:16]

    def record_defect(
        self,
        source: DefectSource,
        error_type: str,
        message: str,
        stack_trace: Optional[str] = None,
        component: str = "unknown",
        reproduction_command: Optional[str] = None,
        context: Optional[Dict] = None
    ) -> DefectReport:
        """Record and deduplicate a runtime defect."""
        fingerprint = self._generate_fingerprint(error_type, message, component)
        clean_msg = sanitizer.sanitize_text(message)
        clean_stack = sanitizer.sanitize_text(stack_trace) if stack_trace else None
        clean_ctx = sanitizer.sanitize_dict(context or {})

        if fingerprint in self._active_defects:
            existing = self._active_defects[fingerprint]
            existing.occurrence_count += 1
            logger.info(f"Deduplicated recurring defect [{fingerprint}] count={existing.occurrence_count}")
            return existing

        report = DefectReport(
            defect_id=f"DEF-{fingerprint}",
            source=source,
            error_type=error_type,
            message=clean_msg,
            stack_trace=clean_stack,
            component=component,
            reproduction_command=reproduction_command,
            sanitized_context=clean_ctx,
            detected_at=datetime.now(timezone.utc),
            occurrence_count=1
        )
        self._active_defects[fingerprint] = report
        self._defect_history.append(report)
        logger.warning(f"Recorded new defect [{report.defect_id}]: {report.error_type} in {component}")
        return report

    def get_defect(self, defect_id: str) -> Optional[DefectReport]:
        for d in self._defect_history:
            if d.defect_id == defect_id:
                return d
        return None

    def list_active_defects(self) -> List[DefectReport]:
        return list(self._active_defects.values())

    def clear_resolved_defect(self, defect_id: str) -> bool:
        fingerprint = defect_id.replace("DEF-", "")
        if fingerprint in self._active_defects:
            del self._active_defects[fingerprint]
            return True
        return False


defect_detector = DefectDetector()
