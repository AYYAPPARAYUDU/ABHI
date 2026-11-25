"""Permissioned Proactivity & Autonomous Assistance Engine.

Enforces clear separation between Observation, Recommendation, and Execution:
- Observation: Inspects system health, long-running tasks, and permitted workspace state.
- Recommendation: Formulates proactive guidance, warnings, and suggestions.
- Execution: Strictly gates actions behind permission tiers. Destructive or sensitive
  actions (file deletion, purchasing, messaging, security changes) NEVER execute silently
  without explicit human-in-the-loop authorization.
"""

import time
import uuid
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from backend.app.core.logging import logger
from backend.app.core.security import security_audit


class ProactivityMode(str, Enum):
    OFF = "OFF"
    OBSERVATION_ONLY = "OBSERVATION_ONLY"
    RECOMMENDATION_ONLY = "RECOMMENDATION_ONLY"
    PERMISSIONED_ASSIST = "PERMISSIONED_ASSIST"


class PermissionActionType(str, Enum):
    OBSERVE_SCREEN = "OBSERVE_SCREEN"
    CHECK_RESOURCE = "CHECK_RESOURCE"
    RECOMMEND_NEXT_STEP = "RECOMMEND_NEXT_STEP"
    RETRY_FAILED_STEP = "RETRY_FAILED_STEP"
    CREATE_FILE = "CREATE_FILE"
    OPEN_APPLICATION = "OPEN_APPLICATION"
    DELETE_FILE = "DELETE_FILE"
    SEND_MESSAGE = "SEND_MESSAGE"
    CHANGE_SETTINGS = "CHANGE_SETTINGS"
    FINANCIAL_ACTION = "FINANCIAL_ACTION"


class ProactiveRecommendation(BaseModel):
    """Structured proactive advice or notification item."""
    recommendation_id: str = Field(default_factory=lambda: f"rec_{uuid.uuid4().hex[:8]}")
    title: str
    description: str
    category: str  # "task_failure", "resource_pressure", "workflow_optimization", "security_notice"
    suggested_action: Optional[str] = None
    requires_human_approval: bool = True
    created_at: float = Field(default_factory=time.time)
    dismissed: bool = False
    approved: Optional[bool] = None


class ProactivitySettings(BaseModel):
    """User-controlled toggles and boundaries for proactive behavior."""
    mode: ProactivityMode = ProactivityMode.PERMISSIONED_ASSIST
    allow_screen_observation: bool = True
    allow_resource_monitoring: bool = True
    allow_proactive_recommendations: bool = True
    allow_auto_retry_transient_failures: bool = True
    prohibit_unapproved_file_deletions: bool = True
    prohibit_external_messaging: bool = True
    prohibit_financial_transactions: bool = True
    prohibit_silent_security_modifications: bool = True
    is_paused: bool = False


class ProactivityEngine:
    """Evaluates workspace events, detects blockers, and formulates safe, permissioned recommendations."""

    def __init__(self):
        self.settings = ProactivitySettings()
        self._active_recommendations: Dict[str, ProactiveRecommendation] = {}

    def update_settings(self, new_settings: ProactivitySettings) -> ProactivitySettings:
        """Update and persist proactive behavior configuration."""
        self.settings = new_settings
        security_audit.log_event(
            event_type="PROACTIVITY_SETTINGS_UPDATED",
            actor="OPERATOR",
            endpoint="/proactivity/settings",
            status="SUCCESS",
            details=new_settings.model_dump()
        )
        logger.info(f"ProactivityEngine: Settings updated (mode={new_settings.mode.value}, paused={new_settings.is_paused})")
        return self.settings

    def pause(self) -> None:
        """Temporarily suspend all proactive notifications and autonomous suggestions."""
        self.settings.is_paused = True
        logger.info("ProactivityEngine: Proactive assistance paused.")

    def resume(self) -> None:
        """Resume proactive assistance according to configured mode."""
        self.settings.is_paused = False
        logger.info("ProactivityEngine: Proactive assistance resumed.")

    def can_observe_system(self) -> bool:
        """Check if background telemetry and window observation are permitted."""
        if self.settings.is_paused or self.settings.mode == ProactivityMode.OFF:
            return False
        return self.settings.allow_resource_monitoring

    def check_execution_permission(self, action: PermissionActionType, target: str) -> Tuple[bool, str]:
        """Strictly evaluate if an action may proceed autonomously or requires human confirmation."""
        # Absolute hard prohibitions
        if action in [
            PermissionActionType.DELETE_FILE,
            PermissionActionType.SEND_MESSAGE,
            PermissionActionType.CHANGE_SETTINGS,
            PermissionActionType.FINANCIAL_ACTION
        ]:
            return False, f"Action '{action.value}' on '{target}' is classified as High Risk. Explicit operator authorization required."

        if self.settings.is_paused or self.settings.mode in [ProactivityMode.OFF, ProactivityMode.OBSERVATION_ONLY]:
            return False, "Proactive execution is disabled in current mode."

        if action in [PermissionActionType.CREATE_FILE, PermissionActionType.OPEN_APPLICATION, PermissionActionType.RETRY_FAILED_STEP]:
            if self.settings.mode == ProactivityMode.PERMISSIONED_ASSIST:
                return True, "Permitted low-risk reversible action under PERMISSIONED_ASSIST mode."

        return False, "Requires operator confirmation."

    def post_recommendation(
        self,
        title: str,
        description: str,
        category: str,
        suggested_action: Optional[str] = None,
        requires_human_approval: bool = True
    ) -> Optional[ProactiveRecommendation]:
        """Post a non-intrusive proactive suggestion for the operator."""
        if self.settings.is_paused or self.settings.mode == ProactivityMode.OFF:
            return None
        if not self.settings.allow_proactive_recommendations:
            return None

        rec = ProactiveRecommendation(
            title=title,
            description=description,
            category=category,
            suggested_action=suggested_action,
            requires_human_approval=requires_human_approval
        )
        self._active_recommendations[rec.recommendation_id] = rec
        logger.info(f"Proactive recommendation generated: '{title}' [{category}]")
        return rec

    def get_recommendations(self, include_dismissed: bool = False) -> List[ProactiveRecommendation]:
        """List active recommendations available for operator review."""
        if include_dismissed:
            return list(self._active_recommendations.values())
        return [r for r in self._active_recommendations.values() if not r.dismissed]

    def resolve_recommendation(self, rec_id: str, approved: bool) -> bool:
        """Operator approves or dismisses proactive recommendation."""
        rec = self._active_recommendations.get(rec_id)
        if not rec:
            return False
        rec.approved = approved
        rec.dismissed = True
        logger.info(f"Proactive recommendation '{rec_id}' resolved: approved={approved}")
        return True


# Global Singleton Instance
proactivity_engine = ProactivityEngine()
