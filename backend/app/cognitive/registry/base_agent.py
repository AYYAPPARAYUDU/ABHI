"""Abstract Base Agent Interface and Contract."""

from abc import ABC, abstractmethod
import time
from typing import Any, Dict
from backend.app.cognitive.registry.models import AgentMetadata, AgentTaskRequest, AgentTaskResult
from backend.app.core.logging import logger


class BaseAgent(ABC):
    """Abstract base class for all specialized domain agents."""

    def __init__(self, metadata: AgentMetadata):
        self.metadata = metadata

    @property
    def agent_id(self) -> str:
        return self.metadata.agent_id

    @abstractmethod
    async def execute(self, request: AgentTaskRequest) -> AgentTaskResult:
        """Execute a domain action and return structured results."""
        pass

    async def safe_execute(self, request: AgentTaskRequest) -> AgentTaskResult:
        """Wrapper executing action with timing and error containment."""
        start_ts = time.perf_counter()
        try:
            logger.info(f"[{self.agent_id}] Executing action '{request.action}' on node '{request.node_id}'")
            result = await self.execute(request)
            result.execution_duration_ms = int((time.perf_counter() - start_ts) * 1000)
            return result
        except Exception as e:
            duration = int((time.perf_counter() - start_ts) * 1000)
            logger.error(f"[{self.agent_id}] Action '{request.action}' failed: {str(e)}")
            return AgentTaskResult(
                task_id=request.task_id,
                node_id=request.node_id,
                agent_id=self.agent_id,
                action=request.action,
                success=False,
                error_message=str(e),
                execution_duration_ms=duration
            )
