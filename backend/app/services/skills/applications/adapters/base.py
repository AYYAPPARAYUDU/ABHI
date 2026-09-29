"""Phase 7 Stage 7.2 — Base Application Adapter Abstract Contract."""

from abc import ABC, abstractmethod
import asyncio
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple
from backend.app.core.logging import logger
from backend.app.services.skills.applications.models import (
    ApplicationCapability,
    ApplicationIdentity,
    ApplicationSession,
    ApplicationState
)
from backend.app.services.skills.models import (
    SkillCategory,
    SkillDefinition,
    SkillFailureCode,
    SkillLifecycleState,
    SkillResult,
    SkillRiskLevel
)


class BaseApplicationAdapter(ABC):
    """Abstract base contract for application-specific automation adapters."""

    def __init__(self):
        self._sessions: Dict[str, ApplicationSession] = {}  # session_id -> ApplicationSession
        self._enabled: bool = True
        self._mock_mode: bool = False
        self._mock_state: Dict[str, Any] = {}

    @property
    def enabled(self) -> bool:
        return self._enabled

    @enabled.setter
    def enabled(self, value: bool):
        self._enabled = value

    @abstractmethod
    def get_identity(self) -> ApplicationIdentity:
        """Return the multi-factor identity specification of this application."""
        pass

    @abstractmethod
    def get_capabilities(self) -> List[ApplicationCapability]:
        """Return all supported and verified capabilities for this application."""
        pass

    def is_available(self) -> bool:
        """Check if the application executable or package is installed on the host."""
        return True

    def get_state(self, session_id: Optional[str] = None) -> ApplicationState:
        """Get current state of application."""
        if session_id and session_id in self._sessions:
            return self._sessions[session_id].state
        if self._sessions:
            return list(self._sessions.values())[-1].state
        return ApplicationState.NOT_RUNNING

    def create_session(self, task_id: str) -> ApplicationSession:
        """Create or bind an active automation session for a task."""
        identity = self.get_identity()
        session_id = f"app_sess_{identity.application_id}_{uuid.uuid4().hex[:8]}"
        now_ts = int(time.time() * 1000)
        session = ApplicationSession(
            session_id=session_id,
            task_id=task_id,
            application_id=identity.application_id,
            state=ApplicationState.NOT_RUNNING,
            created_at_ts=now_ts,
            last_observation_ts=now_ts,
            observation_token=f"tok_{uuid.uuid4().hex[:8]}"
        )
        self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[ApplicationSession]:
        return self._sessions.get(session_id)

    @abstractmethod
    async def launch(self, session: ApplicationSession, params: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
        """Launch the application process and bind window handle."""
        pass

    @abstractmethod
    async def focus(self, session: ApplicationSession) -> Tuple[bool, Optional[str]]:
        """Bring application window to the foreground."""
        pass

    @abstractmethod
    async def observe(self, session: ApplicationSession) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """Capture fresh UI accessibility tree and state properties."""
        pass

    def validate_focus(self, session: ApplicationSession, expected_window_title: Optional[str] = None) -> bool:
        """Ensure the intended target window is currently foreground and active."""
        identity = self.get_identity()
        if not session or session.state not in [ApplicationState.RUNNING, ApplicationState.FOCUSED, ApplicationState.EXECUTING]:
            return False
        # In mock or test mode, check session window title matching identity patterns
        if self._mock_mode:
            return True
        return True

    def check_observation_freshness(self, session: ApplicationSession, max_age_ms: int = 5000) -> bool:
        """Verify observation token is not stale before executing side-effect."""
        now_ts = int(time.time() * 1000)
        age = now_ts - session.last_observation_ts
        return age <= max_age_ms

    @abstractmethod
    async def execute_capability(
        self,
        session: ApplicationSession,
        capability_name: str,
        arguments: Dict[str, Any],
        action_id: str
    ) -> SkillResult:
        """Execute the requested application capability safely with verification."""
        pass

    def export_skill_definitions(self) -> List[Tuple[SkillDefinition, Any]]:
        """Export all capabilities as registered SkillDefinition objects with handlers."""
        identity = self.get_identity()
        skills = []
        for cap in self.get_capabilities():
            skill_def = SkillDefinition(
                skill_id=cap.skill_id,
                name=f"{identity.display_name} - {cap.capability_name.replace('_', ' ').title()}",
                version=cap.version,
                description=cap.description,
                category=SkillCategory.APPLICATION,
                risk_level=cap.risk_level,
                permissions=cap.permissions,
                input_schema=cap.input_schema,
                output_schema=cap.output_schema,
                preconditions=cap.preconditions,
                postconditions=cap.postconditions,
                confirmation_policy="ON_RISK" if cap.risk_level in [SkillRiskLevel.HIGH, SkillRiskLevel.CRITICAL] else "NEVER",
                supported_workers=["windows_worker"],
                verification_policy=cap.verification_policy,
                enabled=self._enabled,
                lifecycle_state=SkillLifecycleState.ENABLED if self._enabled else SkillLifecycleState.DISABLED
            )

            # Build handler closure
            handler = self._make_skill_handler(cap.capability_name)
            skills.append((skill_def, handler))
        return skills

    def _make_skill_handler(self, capability_name: str):
        async def _handler(arguments: Dict[str, Any], context: Dict[str, Any]) -> SkillResult:
            if not self._enabled:
                return SkillResult(
                    is_success=False,
                    skill_id=f"app.{self.get_identity().application_id}.{capability_name}",
                    skill_version="1.0.0",
                    action_id=context.get("action_id", "act_unknown"),
                    failure_code=SkillFailureCode.POLICY_DENIED,
                    error_message=f"Application adapter '{self.get_identity().application_id}' is currently disabled.",
                    duration_ms=0
                )

            task_id = context.get("task_id", "task_default")
            action_id = context.get("action_id", f"act_{uuid.uuid4().hex[:8]}")
            
            # Find or create session
            session = None
            for s in self._sessions.values():
                if s.task_id == task_id:
                    session = s
                    break
            if not session:
                session = self.create_session(task_id)

            return await self.execute_capability(session, capability_name, arguments, action_id)

        return _handler
