"""Multi-Agent Framework Typed Models & Inter-Agent Envelope Specification.

Implements the Hub-and-Spoke 3-Squad Architecture and the standard JSON
negotiation envelope between the 9 specialized agents.
"""

from enum import Enum
import time
import uuid
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SquadType(str, Enum):
    COMMAND = "COMMAND"                         # Central Orchestrator & Lead Architect
    EXECUTION = "EXECUTION"                     # Browser, Comms, OS & Code
    INTELLIGENCE = "INTELLIGENCE"               # Researcher, ML Specialist, Strategist
    QUALITY_GOVERNANCE = "QUALITY_GOVERNANCE"   # QA Auditor (Critic) & Security Guard
    MOBILE = "MOBILE"                           # Mobile Device, Notification Intelligence & Wireless Automator


class EnvelopeType(str, Enum):
    PROPOSAL = "PROPOSAL"       # Proposed action, inputs, expected outcomes, risks
    CRITIQUE = "CRITIQUE"       # Identification of flaws, edge cases, permission blocks
    CHALLENGE = "CHALLENGE"     # Formal pushback requiring alternate proof
    CONSENSUS = "CONSENSUS"     # Negotiated agreed implementation before execution
    HANDOFF = "HANDOFF"         # State, completed steps, verified evidence, next action
    APPROVAL = "APPROVAL"       # Gatekeeper formal sign-off ("VERIFIED: PASS")
    REJECTION = "REJECTION"     # Quality gate formal rejection with fix guidance


class EnvelopeStatus(str, Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class AgentEnvelopePayload(BaseModel):
    summary: str
    artifacts_created: List[str] = Field(default_factory=list)
    evidence: Optional[str] = None
    step_index: Optional[int] = None
    confidence: Optional[float] = None
    diagnostics: Optional[Dict[str, Any]] = None
    reasons: Optional[List[str]] = None


class AgentEnvelope(BaseModel):
    """Standardized JSON message envelope exchanged between all 9 agents."""
    id: str = Field(default_factory=lambda: f"env_{uuid.uuid4().hex[:10]}")
    from_agent: str
    to_agent: str
    task_id: str
    type: EnvelopeType
    status: EnvelopeStatus
    payload: AgentEnvelopePayload
    next_required_action: Optional[str] = None
    timestamp: int = Field(default_factory=lambda: int(time.time() * 1000))


class AgentPersona(BaseModel):
    """Canonical specification and master prompt for a specialized agent persona."""
    agent_id: str
    agent_number: int
    name: str
    squad: SquadType
    role: str
    system_prompt: str
    operational_rules: List[str] = Field(default_factory=list)
    capabilities: List[str] = Field(default_factory=list)
    risk_tier: str = "Tier 1"
    color: str = "#00f0ff"
    icon: str = "⚡"
    suit_mark: str = "MARK 85"


class ExecutionLoopPhase(str, Enum):
    PHASE_1_INTENT_DECONSTRUCTION = "PHASE_1_INTENT_DECONSTRUCTION"
    PHASE_2_DYNAMIC_DECOMPOSITION = "PHASE_2_DYNAMIC_DECOMPOSITION"
    PHASE_3_TOOL_EXECUTION = "PHASE_3_TOOL_EXECUTION"
    PHASE_4_CLOSED_LOOP_VERIFICATION = "PHASE_4_CLOSED_LOOP_VERIFICATION"


class LoopExecutionTrace(BaseModel):
    """Structured record of the 4-Phase Autonomous Execution Loop for each user request."""
    trace_id: str = Field(default_factory=lambda: f"trace_{uuid.uuid4().hex[:12]}")
    task_id: str
    user_goal: str
    root_goal: str
    constraints: List[str] = Field(default_factory=list)
    active_phase: ExecutionLoopPhase
    envelopes: List[AgentEnvelope] = Field(default_factory=list)
    qa_sign_off: Optional[str] = None
    security_sign_off: Optional[str] = None
    verification_passed: bool = False
    evidence: Dict[str, Any] = Field(default_factory=dict)
    self_healing_attempts: int = 0
    final_result: Optional[Dict[str, Any]] = None
    created_at_ts: int = Field(default_factory=lambda: int(time.time() * 1000))
    completed_at_ts: Optional[int] = None

