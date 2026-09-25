"""Typed Schemas and Data Models for the Agent Registry."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AgentMetadata(BaseModel):
    """Canonical metadata defining a registered agent capability."""
    agent_id: str
    name: str
    version: str = "1.0.0"
    capabilities: List[str] = []
    risk_tier: str = Field(default="Tier 1", description="Tier 1 (Safe), Tier 2 (Cautious), Tier 3 (Critical)")
    timeout_seconds: int = 30
    execution_boundary: str = Field(default="in_process", description="in_process | subprocess_worker")
    description: str = ""
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    output_schema: Dict[str, Any] = Field(default_factory=dict)


class AgentTaskRequest(BaseModel):
    """Standardized request envelope for agent task execution."""
    task_id: str
    node_id: str
    action: str
    params: Dict[str, Any] = Field(default_factory=dict)
    context: Dict[str, Any] = Field(default_factory=dict)


class AgentTaskResult(BaseModel):
    """Standardized result envelope returned by an agent worker."""
    task_id: str
    node_id: str
    agent_id: str
    action: str
    success: bool
    data: Dict[str, Any] = Field(default_factory=dict)
    error_message: Optional[str] = None
    execution_duration_ms: int = 0
    observed_state: Dict[str, Any] = Field(default_factory=dict)
