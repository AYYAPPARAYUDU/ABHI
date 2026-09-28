"""Specialized Grounded Agents bridging Cognitive DAG nodes with Stage 5 Automation."""

from typing import Any, Dict
from backend.app.automation.models.actions import ActionType
from backend.app.automation.orchestration.orchestrator import supervisor_orchestrator, SupervisorOrchestrator
from backend.app.cognitive.registry.base_agent import BaseAgent
from backend.app.cognitive.registry.models import AgentMetadata, AgentTaskRequest, AgentTaskResult
from backend.app.cognitive.registry.registry import agent_registry


class GroundedDesktopAgent(BaseAgent):
    """Specialized Agent executing verified Windows OS actions via Supervisor Orchestrator."""

    def __init__(self, orchestrator: SupervisorOrchestrator = supervisor_orchestrator):
        super().__init__(
            AgentMetadata(
                agent_id="os_desktop_agent",
                name="Grounded OS & Desktop Automation Agent",
                capabilities=["click_element", "type_text", "launch_application", "focus_window", "coordinate_click", "visual_action"],
                risk_tier="Tier 2",
                execution_boundary="subprocess_worker",
                description="Controls Windows OS applications and accessibility interfaces with dual-state verification."
            )
        )
        self.orchestrator = orchestrator

    async def execute(self, request: AgentTaskRequest) -> AgentTaskResult:
        action_name = request.action
        params = request.params
        target = params.get("target_name") or params.get("target") or params.get("app_name") or "main_window"
        precondition = params.get("precondition") or f"target '{target}' is accessible"
        expected_postcondition = params.get("expected_postcondition") or f"action '{action_name}' on '{target}' completed"
        risk_tier = params.get("risk_tier", "Tier 2")
        consent_granted = params.get("user_consent_granted", False)

        # Map action string to canonical ActionType
        action_map = {
            "click_element": ActionType.CLICK_ELEMENT,
            "type_text": ActionType.TYPE_TEXT,
            "launch_application": ActionType.LAUNCH_APPLICATION,
            "focus_window": ActionType.FOCUS_WINDOW,
            "key_combination": ActionType.KEY_COMBINATION,
            "scroll": ActionType.SCROLL,
            "coordinate_click": ActionType.CLICK_ELEMENT,
            "visual_action": ActionType.CLICK_ELEMENT
        }
        canonical_type = action_map.get(action_name, ActionType.CLICK_ELEMENT)

        res = await self.orchestrator.execute_desktop_intent(
            task_id=request.task_id,
            target_name=target,
            action_type=canonical_type,
            precondition=precondition,
            expected_postcondition=expected_postcondition,
            parameters=params,
            risk_tier=risk_tier,
            user_consent_granted=consent_granted
        )

        return AgentTaskResult(
            task_id=request.task_id,
            node_id=request.node_id,
            agent_id=self.agent_id,
            action=action_name,
            success=res.is_success,
            data={
                "state": res.state.value,
                "duration_ms": res.duration_ms,
                "executed_actions_count": len(res.executed_actions)
            },
            observed_state={
                "target": target,
                "verified": res.is_success,
                "state": res.state.value
            },
            error_message=res.error.message if res.error else None
        )


class GroundedBrowserAgent(BaseAgent):
    """Specialized Agent executing verified Playwright browser actions via Supervisor Orchestrator."""

    def __init__(self, orchestrator: SupervisorOrchestrator = supervisor_orchestrator):
        super().__init__(
            AgentMetadata(
                agent_id="browser_agent",
                name="Grounded Browser Automation Agent",
                capabilities=["browser_click", "browser_fill", "browser_navigate", "browser_check", "browser_select", "coordinate_click", "visual_action"],
                risk_tier="Tier 2",
                execution_boundary="playwright_driver",
                description="Controls local browser sites via Playwright semantic locators and visual grounding with dual-state verification."
            )
        )
        self.orchestrator = orchestrator

    async def execute(self, request: AgentTaskRequest) -> AgentTaskResult:
        action_name = request.action
        params = request.params
        target = params.get("target_name") or params.get("target") or params.get("selector") or "body"
        precondition = params.get("precondition") or f"element '{target}' is present in DOM"
        expected_postcondition = params.get("expected_postcondition") or f"browser action '{action_name}' on '{target}' completed"
        role = params.get("role")
        risk_tier = params.get("risk_tier", "Tier 2")
        consent_granted = params.get("user_consent_granted", False)

        action_map = {
            "browser_click": ActionType.BROWSER_CLICK,
            "browser_fill": ActionType.BROWSER_FILL,
            "browser_navigate": ActionType.BROWSER_NAVIGATE,
            "browser_check": ActionType.BROWSER_CHECK,
            "browser_select": ActionType.BROWSER_SELECT_OPTION,
            "browser_press_key": ActionType.BROWSER_PRESS_KEY,
            "coordinate_click": ActionType.BROWSER_CLICK,
            "visual_action": ActionType.BROWSER_CLICK
        }
        canonical_type = action_map.get(action_name, ActionType.BROWSER_CLICK)

        res = await self.orchestrator.execute_browser_intent(
            task_id=request.task_id,
            target_name=target,
            action_type=canonical_type,
            precondition=precondition,
            expected_postcondition=expected_postcondition,
            role=role,
            parameters=params,
            risk_tier=risk_tier,
            user_consent_granted=consent_granted
        )

        return AgentTaskResult(
            task_id=request.task_id,
            node_id=request.node_id,
            agent_id=self.agent_id,
            action=action_name,
            success=res.is_success,
            data={
                "state": res.state.value,
                "duration_ms": res.duration_ms,
                "executed_actions_count": len(res.executed_actions)
            },
            observed_state={
                "target": target,
                "verified": res.is_success,
                "state": res.state.value
            },
            error_message=res.error.message if res.error else None
        )


def register_grounded_agents():
    """Register grounded automation agents in the central registry."""
    agent_registry.register(GroundedDesktopAgent())
    agent_registry.register(GroundedBrowserAgent())
