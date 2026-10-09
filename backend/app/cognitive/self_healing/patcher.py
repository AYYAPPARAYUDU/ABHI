"""Safe patch generator, validator, executor, and rollback manager for Self-Healing Core."""

import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from backend.app.cognitive.self_healing.models import CodePatch, RepairRiskTier
from backend.app.cognitive.self_healing.sanitizer import sanitizer
from backend.app.core.logging import logger


class SafePatcher:
    """Safely applies scoped atomic code patches with automatic rollback capability."""

    def __init__(self, project_root: Optional[Path] = None):
        self.project_root = (project_root or Path(__file__).resolve().parent.parent.parent.parent.parent).resolve()
        self.backup_dir = self.project_root / "project_data" / "repair_backups"
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    def validate_patch_safety(self, patch: CodePatch, risk_tier: RepairRiskTier) -> Tuple[bool, Optional[str]]:
        """Verify that patch does not violate security constraints or modify protected files."""
        # 1. Check file path is relative and within project root
        target = Path(self.project_root / patch.target_file).resolve()
        try:
            target.relative_to(self.project_root)
        except ValueError:
            return False, "Target file lies outside project repository root."

        # 2. Check if file is protected
        if sanitizer.is_protected_path(patch.target_file):
            return False, f"Target file '{patch.target_file}' is in the PROTECTED security boundary and cannot be modified."

        # 3. Check if risk tier is PROTECTED
        if risk_tier == RepairRiskTier.PROTECTED:
            return False, "Autonomous modifications to PROTECTED tier subsystems are strictly forbidden."

        # 4. Check if target file exists
        if not target.exists():
            return False, f"Target file '{patch.target_file}' does not exist."

        # 5. Check original snippet exists in file
        content = target.read_text(encoding="utf-8", errors="replace")
        if patch.original_snippet not in content:
            return False, f"Original snippet not found in '{patch.target_file}'."

        return True, None

    def create_backup(self, rel_path: str, repair_id: str) -> Path:
        """Create a backup of the target file before applying changes."""
        source_file = self.project_root / rel_path
        backup_file = self.backup_dir / f"{repair_id}_{source_file.name}.bak"
        shutil.copy2(source_file, backup_file)
        return backup_file

    def apply_patch(self, patch: CodePatch, repair_id: str) -> Tuple[bool, Optional[str], Optional[Path]]:
        """Apply patch to file after creating backup."""
        target_file = self.project_root / patch.target_file
        backup_path = self.create_backup(patch.target_file, repair_id)

        try:
            content = target_file.read_text(encoding="utf-8")
            new_content = content.replace(patch.original_snippet, patch.replacement_snippet, 1)
            target_file.write_text(new_content, encoding="utf-8")
            logger.info(f"Applied patch [{patch.patch_id}] to {patch.target_file}")
            return True, None, backup_path
        except Exception as e:
            logger.error(f"Failed to write patch to {patch.target_file}: {e}")
            if backup_path.exists():
                shutil.copy2(backup_path, target_file)
            return False, str(e), None

    def rollback(self, rel_path: str, backup_path: Path) -> bool:
        """Roll back a modified file to its backup state."""
        target_file = self.project_root / rel_path
        if backup_path and backup_path.exists():
            try:
                shutil.copy2(backup_path, target_file)
                logger.info(f"Successfully rolled back {rel_path} from {backup_path}")
                return True
            except Exception as e:
                logger.error(f"Rollback failed for {rel_path}: {e}")
                return False
        return False

    def run_validation_command(self, command: str, timeout_seconds: int = 30) -> Tuple[bool, str]:
        """Run targeted validation test command."""
        import sys
        import shlex

        # Sanitize command to prevent shell injection
        if any(c in command for c in [";", "&&", "||", "|", "`", "$", ">", "<"]):
            return False, "Validation command contains disallowed shell operators."

        try:
            parts = shlex.split(command, posix=True)
        except Exception:
            parts = command.strip().split()

        if not parts:
            return True, "No validation command specified."

        runner = parts[0].lower()
        if runner in ["python", "python3"]:
            parts[0] = sys.executable
        elif runner in ["pytest"]:
            pytest_exe = str(Path(sys.executable).parent / "pytest.exe")
            if os.path.exists(pytest_exe):
                parts[0] = pytest_exe
            else:
                parts = [sys.executable, "-m", "pytest"] + parts[1:]
        elif runner not in ["npm", "npx"]:
            return False, f"Test runner '{runner}' is not permitted."

        try:
            res = subprocess.run(
                parts,
                cwd=str(self.project_root),
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                shell=False
            )
            output = res.stdout + "\n" + res.stderr
            return res.returncode == 0, sanitizer.sanitize_text(output)
        except subprocess.TimeoutExpired:
            return False, "Validation command timed out."
        except Exception as e:
            return False, f"Validation execution error: {str(e)}"


safe_patcher = SafePatcher()
