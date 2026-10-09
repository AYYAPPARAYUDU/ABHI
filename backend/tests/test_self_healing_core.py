"""Comprehensive integration test suite for ABHI Self-Healing Engineering Core."""

import pytest
import os
import tempfile
from pathlib import Path
from backend.app.cognitive.self_healing.models import (
    DefectSource, RepairRiskTier, RepairStatus, CodePatch
)
from backend.app.cognitive.self_healing.sanitizer import sanitizer
from backend.app.cognitive.self_healing.detection import defect_detector
from backend.app.cognitive.self_healing.diagnosis import diagnosis_engine
from backend.app.cognitive.self_healing.patcher import safe_patcher
from backend.app.cognitive.self_healing.persistence import self_healing_repo
from backend.app.cognitive.self_healing.engine import self_healing_engine


@pytest.mark.asyncio
async def test_sanitizer_masks_secrets():
    """Verify sanitizer redacts API keys, bearer tokens, passwords, and emails."""
    raw = "Error connecting with api_key=sk-abcdef1234567890123456 and token: ghp_12345678901234567890 for user admin@abhi.local"
    clean = sanitizer.sanitize_text(raw)
    assert "sk-" not in clean
    assert "ghp_" not in clean
    assert "[REDACTED" in clean
    assert "admin@abhi.local" not in clean


@pytest.mark.asyncio
async def test_protected_paths_cannot_be_targeted():
    """Verify security policies and critical files are protected from autonomous modification."""
    assert sanitizer.is_protected_path(".env")
    assert sanitizer.is_protected_path("backend/app/core/security.py")
    assert sanitizer.is_protected_path("system.db")

    patch = CodePatch(
        patch_id="patch-01",
        defect_id="DEF-001",
        target_file=".env",
        original_snippet="SECRET_KEY=123",
        replacement_snippet="SECRET_KEY=456",
        reasoning="Test disallowed modification"
    )
    is_safe, err = safe_patcher.validate_patch_safety(patch, RepairRiskTier.LOW)
    assert not is_safe
    assert "PROTECTED" in err


@pytest.mark.asyncio
async def test_defect_detection_and_deduplication():
    """Verify defect detector deduplicates identical recurring errors."""
    d1 = defect_detector.record_defect(
        source=DefectSource.BACKEND_EXCEPTION,
        error_type="ZeroDivisionError",
        message="division by zero in math_service.py",
        component="math_service"
    )
    assert d1.occurrence_count == 1

    d2 = defect_detector.record_defect(
        source=DefectSource.BACKEND_EXCEPTION,
        error_type="ZeroDivisionError",
        message="division by zero in math_service.py",
        component="math_service"
    )
    assert d2.defect_id == d1.defect_id
    assert d2.occurrence_count == 2


@pytest.mark.asyncio
async def test_self_healing_successful_repair_lifecycle():
    """Test full cycle: defect -> diagnosis -> patch -> test validation -> verified success."""
    await self_healing_engine.initialize()

    # 1. Create a temporary sandbox test file within project_data
    sandbox_dir = Path(__file__).resolve().parent.parent.parent / "project_data" / "sandbox_test"
    sandbox_dir.mkdir(parents=True, exist_ok=True)
    (sandbox_dir / "__init__.py").write_text("", encoding="utf-8")
    target_rel = "project_data/sandbox_test/calc_bug.py"
    target_abs = sandbox_dir / "calc_bug.py"
    target_abs.write_text("def calculate_tax(amount):\n    return amount / 0  # Bug: ZeroDivision\n", encoding="utf-8")

    # Create verification test file
    test_file = sandbox_dir / "test_calc.py"
    test_file.write_text("""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from calc_bug import calculate_tax

def test_tax():
    assert calculate_tax(100) == 10.0

if __name__ == '__main__':
    test_tax()
""", encoding="utf-8")

    # 2. Record defect
    defect = defect_detector.record_defect(
        source=DefectSource.TEST_FAILURE,
        error_type="ZeroDivisionError",
        message="division by zero in calculate_tax",
        component="sandbox_test",
        reproduction_command="python project_data/sandbox_test/test_calc.py"
    )

    # 3. Diagnose
    record, diagnosis = await self_healing_engine.initiate_repair_workflow(defect, candidate_files=[target_rel])
    assert diagnosis.risk_tier == RepairRiskTier.LOW
    assert record.status in [RepairStatus.DIAGNOSED, RepairStatus.PENDING_APPROVAL]

    # 4. Create scoped patch
    patch = CodePatch(
        patch_id="patch-fix-calc",
        defect_id=defect.defect_id,
        target_file=target_rel,
        original_snippet="return amount / 0  # Bug: ZeroDivision",
        replacement_snippet="return amount * 0.1  # Fixed tax rate",
        reasoning="Fix division by zero bug"
    )

    # 5. Execute repair with validation test
    valid_test_cmd = "python project_data/sandbox_test/test_calc.py"
    updated_record = await self_healing_engine.execute_repair(
        repair_id=record.repair_id,
        patch=patch,
        test_command=valid_test_cmd,
        is_approved=True
    )

    assert updated_record.status == RepairStatus.VERIFIED_SUCCESS
    assert "return amount * 0.1" in target_abs.read_text(encoding="utf-8")

    # Verify persistence
    persisted = await self_healing_repo.get_record(record.repair_id)
    assert persisted is not None
    assert persisted.status == RepairStatus.VERIFIED_SUCCESS


@pytest.mark.asyncio
async def test_self_healing_failed_repair_triggers_safe_rollback():
    """Test that a patch failing validation tests is automatically rolled back safely."""
    await self_healing_engine.initialize()

    # 1. Create a test file
    sandbox_dir = Path(__file__).resolve().parent.parent.parent / "project_data" / "sandbox_test"
    sandbox_dir.mkdir(parents=True, exist_ok=True)
    target_rel = "project_data/sandbox_test/broken_app.py"
    target_abs = sandbox_dir / "broken_app.py"
    original_code = "def get_status():\n    return 'OK'\n"
    target_abs.write_text(original_code, encoding="utf-8")

    defect = defect_detector.record_defect(
        source=DefectSource.TEST_FAILURE,
        error_type="AssertionError",
        message="Status assertion failed",
        component="broken_app"
    )

    record, _ = await self_healing_engine.initiate_repair_workflow(defect, candidate_files=[target_rel])

    # 2. Formulate a patch that intentionally introduces syntax/runtime error
    bad_patch = CodePatch(
        patch_id="bad-patch-01",
        defect_id=defect.defect_id,
        target_file=target_rel,
        original_snippet="return 'OK'",
        replacement_snippet="return 1 / 0  # Flawed fix",
        reasoning="Flawed fix"
    )

    # Create test verification file
    test_file = sandbox_dir / "test_broken.py"
    test_file.write_text("""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from broken_app import get_status

def test_status():
    assert get_status() == 'OK'

if __name__ == '__main__':
    test_status()
""", encoding="utf-8")

    # 3. Test command that will fail on bad patch
    failing_test_cmd = "python project_data/sandbox_test/test_broken.py"
    updated_record = await self_healing_engine.execute_repair(
        repair_id=record.repair_id,
        patch=bad_patch,
        test_command=failing_test_cmd,
        is_approved=True
    )

    # 4. Must be rolled back and original code restored
    assert updated_record.status == RepairStatus.ROLLED_BACK
    assert target_abs.read_text(encoding="utf-8") == original_code
