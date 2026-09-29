"""Phase 7 Stage 7.2 — Application Registry & Skill Synchronization."""

import asyncio
from typing import Any, Dict, List, Optional, Tuple
from backend.app.core.logging import logger
from backend.app.services.skills.applications.adapters.base import BaseApplicationAdapter
from backend.app.services.skills.applications.adapters.calculator import CalculatorAdapter
from backend.app.services.skills.applications.adapters.explorer import ExplorerAdapter
from backend.app.services.skills.applications.adapters.notepad import NotepadAdapter
from backend.app.services.skills.applications.adapters.settings import SettingsAdapter
from backend.app.services.skills.applications.adapters.terminal import TerminalAdapter
from backend.app.services.skills.applications.models import (
    ApplicationCapability,
    ApplicationIdentity,
    ApplicationSession,
    ApplicationState
)
from backend.app.services.skills.registry import skill_registry, SkillRegistry


class ApplicationRegistry:
    """Thread-safe central registry for Windows application adapters and capability sync."""

    def __init__(self, target_skill_registry: Optional[SkillRegistry] = None):
        self._adapters: Dict[str, BaseApplicationAdapter] = {}  # application_id -> BaseApplicationAdapter
        self._skill_registry = target_skill_registry or skill_registry
        self._lock = asyncio.Lock()

    def register_adapter(self, adapter: BaseApplicationAdapter, sync_skills: bool = True) -> None:
        """Register an application adapter and optionally synchronize its capabilities into SkillRegistry."""
        identity = adapter.get_identity()
        app_id = identity.application_id

        if app_id in self._adapters:
            logger.info(f"Overwriting existing application adapter '{app_id}'")

        self._adapters[app_id] = adapter

        if sync_skills and self._skill_registry:
            for skill_def, handler in adapter.export_skill_definitions():
                self._skill_registry.register(skill_def, handler=handler, overwrite=True)

        logger.info(f"Registered application adapter '{app_id}' with {len(adapter.get_capabilities())} capabilities.")

    def unregister_adapter(self, application_id: str, remove_skills: bool = True) -> bool:
        """Unregister an application adapter."""
        if application_id not in self._adapters:
            return False
        adapter = self._adapters.pop(application_id)
        if remove_skills and self._skill_registry:
            for cap in adapter.get_capabilities():
                self._skill_registry.unregister(cap.skill_id)
        return True

    def get_adapter(self, application_id: str) -> Optional[BaseApplicationAdapter]:
        """Lookup an adapter by application identifier."""
        return self._adapters.get(application_id)

    def list_adapters(self) -> List[BaseApplicationAdapter]:
        """List all registered application adapters."""
        return list(self._adapters.values())

    def list_applications(self) -> List[Dict[str, Any]]:
        """Return serialized metadata for all supported applications."""
        result = []
        for adapter in self._adapters.values():
            ident = adapter.get_identity()
            caps = adapter.get_capabilities()
            state = adapter.get_state()
            result.append({
                "application_id": ident.application_id,
                "display_name": ident.display_name,
                "executable_names": ident.executable_names,
                "icon_name": ident.icon_name,
                "description": ident.description,
                "enabled": adapter.enabled,
                "state": state.value,
                "capabilities_count": len(caps),
                "capabilities": [
                    {
                        "capability_name": c.capability_name,
                        "skill_id": c.skill_id,
                        "risk_level": c.risk_level.value,
                        "description": c.description
                    }
                    for c in caps
                ]
            })
        return result

    def enable_adapter(self, application_id: str) -> bool:
        """Enable an adapter and re-enable its skills."""
        adapter = self.get_adapter(application_id)
        if not adapter:
            return False
        adapter.enabled = True
        if self._skill_registry:
            for cap in adapter.get_capabilities():
                self._skill_registry.enable(cap.skill_id)
        return True

    def disable_adapter(self, application_id: str) -> bool:
        """Disable an adapter and its skills."""
        adapter = self.get_adapter(application_id)
        if not adapter:
            return False
        adapter.enabled = False
        if self._skill_registry:
            for cap in adapter.get_capabilities():
                self._skill_registry.disable(cap.skill_id)
        return True

    def register_builtin_adapters(self) -> None:
        """Register all default foundational Windows application adapters."""
        self.register_adapter(NotepadAdapter(), sync_skills=True)
        self.register_adapter(ExplorerAdapter(), sync_skills=True)
        self.register_adapter(CalculatorAdapter(), sync_skills=True)
        self.register_adapter(SettingsAdapter(), sync_skills=True)
        self.register_adapter(TerminalAdapter(), sync_skills=True)
        logger.info("Initialized and synchronized foundational Windows application adapters.")


# Global singleton instance
application_registry = ApplicationRegistry()
application_registry.register_builtin_adapters()
