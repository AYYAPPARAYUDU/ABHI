"""Data Models and State Representations for the Task DAG Planner."""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class NodeStatus(str, Enum):
    PENDING = "PENDING"
    WAITING_CONSENT = "WAITING_CONSENT"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class DAGNode(BaseModel):
    """An individual execution node within a Task DAG."""
    node_id: str
    title: str
    agent_id: str
    action: str
    params: Dict[str, Any] = Field(default_factory=dict)
    dependencies: List[str] = Field(default_factory=list, description="IDs of prerequisite nodes")
    status: NodeStatus = Field(default=NodeStatus.PENDING)
    risk_tier: str = Field(default="Tier 1", description="Tier 1 (Safe), Tier 2 (Cautious), Tier 3 (Critical)")
    retry_count: int = 0
    max_retries: int = 3
    result_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    execution_duration_ms: int = 0


class TaskDAG(BaseModel):
    """Directed Acyclic Graph representing a decomposed multi-step plan."""
    dag_id: str
    task_id: str
    goal: str
    nodes: Dict[str, DAGNode] = Field(default_factory=dict)
    created_at_ts: int = 0

    @property
    def is_complete(self) -> bool:
        """Return True if all nodes are successfully completed or skipped."""
        if not self.nodes:
            return False
        return all(node.status in [NodeStatus.COMPLETED, NodeStatus.SKIPPED] for node in self.nodes.values())

    @property
    def is_failed(self) -> bool:
        """Return True if any node failed and exceeded retry budget."""
        return any(node.status == NodeStatus.FAILED for node in self.nodes.values())

    def get_runnable_nodes(self) -> List[DAGNode]:
        """Return all nodes whose dependencies have successfully completed."""
        runnable = []
        for node in self.nodes.values():
            if node.status != NodeStatus.PENDING:
                continue

            # Check if all prerequisite dependencies are COMPLETED
            deps_met = all(
                self.nodes[dep_id].status == NodeStatus.COMPLETED
                for dep_id in node.dependencies
                if dep_id in self.nodes
            )
            if deps_met:
                runnable.append(node)
        return runnable

    def update_node_status(
        self,
        node_id: str,
        status: NodeStatus,
        result_data: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
        duration_ms: int = 0
    ) -> None:
        """Update node status and record results."""
        if node_id in self.nodes:
            node = self.nodes[node_id]
            node.status = status
            if result_data is not None:
                node.result_data = result_data
            if error_message is not None:
                node.error_message = error_message
            if duration_ms > 0:
                node.execution_duration_ms = duration_ms
