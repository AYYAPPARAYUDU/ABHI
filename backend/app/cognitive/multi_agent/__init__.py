"""Autonomous Multi-Agent Architecture Package for ABHI."""

from backend.app.cognitive.multi_agent.models import (
    AgentEnvelope,
    AgentEnvelopePayload,
    AgentPersona,
    EnvelopeStatus,
    EnvelopeType,
    ExecutionLoopPhase,
    LoopExecutionTrace,
    SquadType,
)
from backend.app.cognitive.multi_agent.prompts import (
    MASTER_AGENTIC_OPERATING_FRAMEWORK,
    get_persona,
    list_all_personas,
)
from backend.app.cognitive.multi_agent.orchestrator import (
    AutonomousMultiAgentOrchestrator,
    multi_agent_orchestrator,
)

__all__ = [
    "SquadType",
    "EnvelopeType",
    "EnvelopeStatus",
    "AgentEnvelopePayload",
    "AgentEnvelope",
    "AgentPersona",
    "ExecutionLoopPhase",
    "LoopExecutionTrace",
    "MASTER_AGENTIC_OPERATING_FRAMEWORK",
    "get_persona",
    "list_all_personas",
    "AutonomousMultiAgentOrchestrator",
    "multi_agent_orchestrator",
]

