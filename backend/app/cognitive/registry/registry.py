"""Central Agent Registry Singleton."""

from typing import Dict, List, Optional
from backend.app.cognitive.registry.base_agent import BaseAgent
from backend.app.cognitive.registry.models import AgentMetadata, AgentTaskRequest, AgentTaskResult
from backend.app.core.logging import logger


class AgentRegistry:
    """Singleton registry managing agent discovery, capability indexing, and dispatching."""

    def __init__(self):
        self._agents: Dict[str, BaseAgent] = {}

    def register(self, agent: BaseAgent) -> None:
        """Register a specialized agent."""
        self._agents[agent.agent_id] = agent
        logger.info(f"Registered agent '{agent.agent_id}' ({agent.metadata.name} v{agent.metadata.version})")

    def get_agent(self, agent_id: str) -> Optional[BaseAgent]:
        """Retrieve an agent by ID."""
        return self._agents.get(agent_id)

    def list_agents(self) -> List[AgentMetadata]:
        """List metadata for all registered agents."""
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
