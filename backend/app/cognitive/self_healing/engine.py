"""Self-Healing Engine coordinating detection, diagnosis, validation, patching, and verification."""

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from backend.app.cognitive.self_healing.models import (
    DefectReport, DiagnosisHypothesis, CodePatch, RepairRecord, RepairStatus, RepairRiskTier
)
from backend.app.cognitive.self_healing.detection import defect_detector
from backend.app.cognitive.self_healing.diagnosis import diagnosis_engine
from backend.app.cognitive.self_healing.patcher import safe_patcher
from backend.app.cognitive.self_healing.persistence import self_healing_repo
from backend.app.core.logging import logger


class SelfHealingEngine:
    """End-to-end coordinator for autonomous defect recovery and self-repair verification."""

    def __init__(self):
        self._pending_repairs: Dict[str, RepairRecord] = {}

    async def initialize(self):
        await self_healing_repo.initialize()

    async def initiate_repair_workflow(
        self,
        defect: DefectReport,
        candidate_files: Optional[List[str]] = None,
        override_patch: Optional[CodePatch] = None
    ) -> Tuple[RepairRecord, DiagnosisHypothesis]:
        """Perform diagnosis and generate repair proposal."""
        repair_id = f"REP-{uuid.uuid4().hex[:8]}"

        # 1. Diagnose root cause
        diagnosis = await diagnosis_engine.diagnose(defect, candidate_files)

        # 2. Formulate patch
        patches: List[CodePatch] = []
        if override_patch:
            patches.append(override_patch)
        elif diagnosis.affected_files:
            # Create patch placeholder if not provided
            pass

        record = RepairRecord(
            repair_id=repair_id,
            defect_id=defect.defect_id,
            status=RepairStatus.DIAGNOSED if not diagnosis.requires_approval else RepairStatus.PENDING_APPROVAL,
            risk_tier=diagnosis.risk_tier,
            defect_summary=f"[{defect.error_type}] {defect.message}",
            affected_files=diagnosis.affected_files,
            patches=patches,
            test_results={},
            rollback_available=True,
            backup_paths={},
            created_at=datetime.now(timezone.utc)
        )

        await self_healing_repo.save_record(record)
        self._pending_repairs[repair_id] = record
        return record, diagnosis

    async def execute_repair(
        self,
        repair_id: str,
        patch: CodePatch,
        test_command: Optional[str] = None,
        is_approved: bool = False
    ) -> RepairRecord:
        """Apply patch, validate safety, execute tests, and verify or rollback."""
        record = await self_healing_repo.get_record(repair_id) or self._pending_repairs.get(repair_id)
        if not record:
            raise ValueError(f"Repair record '{repair_id}' not found.")

        # Check safety & approval
        if record.risk_tier in [RepairRiskTier.MEDIUM, RepairRiskTier.PROTECTED] and not is_approved:
            record.status = RepairStatus.PENDING_APPROVAL
            record.error_message = f"Repair requires explicit approval due to {record.risk_tier.value} risk tier."
            await self_healing_repo.save_record(record)
            return record

        # Validate patch constraints
        is_safe, safety_err = safe_patcher.validate_patch_safety(patch, record.risk_tier)
        if not is_safe:
            record.status = RepairStatus.REJECTED
            record.error_message = safety_err
            await self_healing_repo.save_record(record)
            return record

        # Apply Patch
        record.status = RepairStatus.APPLYING
        applied, apply_err, backup_path = safe_patcher.apply_patch(patch, repair_id)
        if not applied or not backup_path:
            record.status = RepairStatus.FAILED
            record.error_message = f"Failed to apply patch: {apply_err}"
            await self_healing_repo.save_record(record)
            return record

        record.patches = [patch]
        record.backup_paths[patch.target_file] = str(backup_path)

        # Run Validation Tests
        cmd = test_command or patch.test_command
        if cmd:
            record.status = RepairStatus.VERIFYING
            test_ok, test_output = safe_patcher.run_validation_command(cmd)
            record.test_results = {"command": cmd, "passed": test_ok, "output": test_output[:1000]}

            if not test_ok:
                # Test failed -> Rollback immediately!
                logger.warning(f"Self-repair validation failed for [{repair_id}]. Output:\n{test_output}\nRolling back...")
                safe_patcher.rollback(patch.target_file, backup_path)
                record.status = RepairStatus.ROLLED_BACK
                record.error_message = f"Validation test failed. Changes safely rolled back. Output: {test_output[:200]}"
                record.resolved_at = datetime.now(timezone.utc)
                await self_healing_repo.save_record(record)
                return record

        # Validation passed
        record.status = RepairStatus.VERIFIED_SUCCESS
        record.resolved_at = datetime.now(timezone.utc)
        defect_detector.clear_resolved_defect(record.defect_id)
        await self_healing_repo.save_record(record)
        logger.info(f"Self-repair [{repair_id}] successfully VERIFIED.")
        return record

    async def rollback_repair(self, repair_id: str) -> bool:
        """Manually rollback an applied repair."""
        record = await self_healing_repo.get_record(repair_id)
        if not record or not record.backup_paths:
            return False

        all_ok = True
        for target_file, backup_str in record.backup_paths.items():
            ok = safe_patcher.rollback(target_file, Path(backup_str))
            if not ok:
                all_ok = False

        if all_ok:
            record.status = RepairStatus.ROLLED_BACK
            record.error_message = "Rolled back by operator."
            record.resolved_at = datetime.now(timezone.utc)
            await self_healing_repo.save_record(record)
        return all_ok


self_healing_engine = SelfHealingEngine()
