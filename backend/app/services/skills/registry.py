"""Phase 7 Stage 7.1 — Deterministic Skill Registry with Version Pinning and Safety Guards."""

import asyncio
from typing import Any, Callable, Dict, List, Optional, Tuple
from backend.app.core.logging import logger
from backend.app.services.skills.models import (
    SkillCategory,
    SkillDefinition,
    SkillLifecycleState,
    SkillRiskLevel
)


class SkillRegistry:
    """Thread-safe central registry maintaining validated skills and execution handlers."""

    def __init__(self):
        self._skills: Dict[str, SkillDefinition] = {}  # key: skill_id@version -> SkillDefinition
        self._handlers: Dict[str, Callable] = {}  # key: skill_id@version -> handler function
        self._latest_versions: Dict[str, str] = {}  # key: skill_id -> latest version string
        self._lock = asyncio.Lock()

    def _make_key(self, skill_id: str, version: str) -> str:
        return f"{skill_id}@{version}"

    def register(
        self,
        skill: SkillDefinition,
        handler: Optional[Callable] = None,
        overwrite: bool = False
    ) -> None:
        """Register a validated skill definition and its execution handler."""
        key = self._make_key(skill.skill_id, skill.version)

        if key in self._skills and not overwrite:
            raise ValueError(f"Skill '{key}' is already registered. Overwrite must be explicitly requested.")

        # Ensure skill handler is non-null or provided
        self._skills[key] = skill
        if handler is not None:
            self._handlers[key] = handler

        # Update latest version tracking
        current_latest = self._latest_versions.get(skill.skill_id)
        if not current_latest or self._is_newer_version(skill.version, current_latest):
            self._latest_versions[skill.skill_id] = skill.version

        logger.info(f"Registered skill '{key}' [Category: {skill.category}, Risk: {skill.risk_level}]")

    def unregister(self, skill_id: str, version: Optional[str] = None) -> bool:
        """Unregister a skill by ID and optional version."""
        if version:
            key = self._make_key(skill_id, version)
            if key in self._skills:
                del self._skills[key]
                self._handlers.pop(key, None)
                if self._latest_versions.get(skill_id) == version:
                    remaining = [v for k, v in [(s.version, s) for s in self._skills.values() if s.skill_id == skill_id]]
                    self._latest_versions[skill_id] = remaining[-1] if remaining else None
                return True
            return False
        else:
            removed = False
            for key in list(self._skills.keys()):
                if self._skills[key].skill_id == skill_id:
                    del self._skills[key]
                    self._handlers.pop(key, None)
                    removed = True
            self._latest_versions.pop(skill_id, None)
            return removed

    def enable(self, skill_id: str, version: Optional[str] = None) -> bool:
        """Enable a skill."""
        skill = self.get(skill_id, version)
        if skill:
            skill.enabled = True
            skill.lifecycle_state = SkillLifecycleState.ENABLED
            return True
        return False

    def disable(self, skill_id: str, version: Optional[str] = None) -> bool:
        """Disable a skill from new executions."""
        skill = self.get(skill_id, version)
        if skill:
            skill.enabled = False
            skill.lifecycle_state = SkillLifecycleState.DISABLED
            return True
        return False

    def deprecate(self, skill_id: str, version: Optional[str] = None) -> bool:
        """Mark a skill as deprecated."""
        skill = self.get(skill_id, version)
        if skill:
            skill.lifecycle_state = SkillLifecycleState.DEPRECATED
            return True
        return False

    def get(self, skill_id: str, version: Optional[str] = None) -> Optional[SkillDefinition]:
        """Lookup a skill by ID and optional version (defaults to latest registered)."""
        target_ver = version or self._latest_versions.get(skill_id)
        if not target_ver:
            return None
        return self._skills.get(self._make_key(skill_id, target_ver))

    def get_handler(self, skill_id: str, version: Optional[str] = None) -> Optional[Callable]:
        """Lookup execution handler for a skill."""
        target_ver = version or self._latest_versions.get(skill_id)
        if not target_ver:
            return None
        return self._handlers.get(self._make_key(skill_id, target_ver))

    def list_skills(
        self,
        category: Optional[SkillCategory] = None,
        enabled_only: bool = True,
        risk_level: Optional[SkillRiskLevel] = None
    ) -> List[SkillDefinition]:
        """List registered skills filtered by category, enabled status, and risk level."""
        results = []
        for skill in self._skills.values():
            if enabled_only and (not skill.enabled or skill.lifecycle_state == SkillLifecycleState.DISABLED):
                continue
            if category and skill.category != category:
                continue
            if risk_level and skill.risk_level != risk_level:
                continue
            results.append(skill)
        return results

    def _is_newer_version(self, ver_a: str, ver_b: str) -> bool:
        """Simple semver comparison helper."""
        try:
            parts_a = [int(p) for p in ver_a.split(".")]
            parts_b = [int(p) for p in ver_b.split(".")]
            return parts_a > parts_b
        except Exception:
            return ver_a > ver_b


# Global singleton registry instance
skill_registry = SkillRegistry()
