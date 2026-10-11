"""Central Agent Registry Singleton."""

from typing import Dict, List, Optional
from backend.app.cognitive.registry.base_agent import BaseAgent
from backend.app.cognitive.registry.models import AgentMetadata, AgentTaskRequest, AgentTaskResult
from backend.app.core.logging import logger


class AgentRegistry:
    """Singleton registry managing agent discovery, capability indexing, and dispatching."""

    def __init__(self):
        self._agents: Dict[str, BaseAgent] = {}

    def _ensure_defaults_registered(self) -> None:
        """Lazily ensure built-in and grounded agents are loaded."""
        if not self._agents:
            try:
                from backend.app.cognitive.registry.builtin_agents import register_builtin_agents
                register_builtin_agents()
            except Exception as e:
                logger.warning(f"Auto-registration of builtin agents notice: {e}")
            try:
                from backend.app.automation.orchestration.agents import register_grounded_agents
                register_grounded_agents()
            except Exception as e:
                logger.debug(f"Auto-registration of grounded agents notice: {e}")

    def register(self, agent: BaseAgent) -> None:
        """Register a specialized agent."""
        self._agents[agent.agent_id] = agent
        logger.info(f"Registered agent '{agent.agent_id}' ({agent.metadata.name} v{agent.metadata.version})")

    def get_agent(self, agent_id: str) -> Optional[BaseAgent]:
        """Retrieve an agent by ID with canonical resolution."""
        self._ensure_defaults_registered()
        agent = self._agents.get(agent_id)
        if not agent:
            # Canonical alias fallback (e.g. desktop_agent -> os_desktop_agent)
            aliases = {
                "desktop_agent": "os_desktop_agent",
                "os_agent": "os_desktop_agent",
                "desktop": "os_desktop_agent",
                "calculator_agent": "os_desktop_agent",
                "notepad_agent": "os_desktop_agent",
                "explorer_agent": "os_desktop_agent",
                "file_agent": "coding_agent",
                "code_agent": "coding_agent",
                "knowledge_agent": "rag_agent",
                "episodic_agent": "memory_agent",
                "repair_agent": "engineering_repair_agent",
                "self_healing_agent": "engineering_repair_agent"
            }
            canonical_id = aliases.get(agent_id.lower())
            if canonical_id:
                agent = self._agents.get(canonical_id)
        return agent

    def list_agents(self) -> List[AgentMetadata]:
        """List metadata for all registered agents."""
        self._ensure_defaults_registered()
        return [agent.metadata for agent in self._agents.values()]

    async def dispatch(self, request: AgentTaskRequest, agent_id: str) -> AgentTaskResult:
        """Dispatch a task request to the target registered agent."""
        agent = self.get_agent(agent_id)
        if not agent:
            logger.error(f"Agent '{agent_id}' not found in registry.")
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=agent_id,
                action=request.action,
                success=False,
                error_message=f"Agent '{agent_id}' is not registered in the system."
            )

        return await agent.safe_execute(request)


# Global agent registry instance
agent_registry = AgentRegistry()

