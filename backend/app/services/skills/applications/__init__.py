"""Phase 7 Stage 7.2 — Advanced Windows Application Skills & Adapters."""

from backend.app.services.skills.applications.models import (
    ApplicationCapability,
    ApplicationIdentity,
    ApplicationSession,
    ApplicationState
)
from backend.app.services.skills.applications.adapters.base import BaseApplicationAdapter
from backend.app.services.skills.applications.adapters.notepad import NotepadAdapter
from backend.app.services.skills.applications.adapters.explorer import ExplorerAdapter
from backend.app.services.skills.applications.adapters.calculator import CalculatorAdapter
from backend.app.services.skills.applications.adapters.settings import SettingsAdapter
from backend.app.services.skills.applications.adapters.terminal import TerminalAdapter
from backend.app.services.skills.applications.registry import ApplicationRegistry, application_registry

__all__ = [
    "ApplicationCapability",
    "ApplicationIdentity",
    "ApplicationSession",
    "ApplicationState",
    "BaseApplicationAdapter",
    "NotepadAdapter",
    "ExplorerAdapter",
    "CalculatorAdapter",
    "SettingsAdapter",
    "TerminalAdapter",
    "ApplicationRegistry",
    "application_registry"
]
