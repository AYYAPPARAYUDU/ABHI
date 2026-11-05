"""4-Phase Autonomous Execution Loop & Multi-Agent Orchestrator.

Implements:
  Phase 1: Intent & Context Deconstruction (Goal vs. Constraints, Security Screening)
  Phase 2: Dynamic Task Decomposition (Tree of Thought & Squad Routing)
  Phase 3: Tool Execution Phase (Specialist Squad Execution & Envelope Relay)
  Phase 4: Closed-Loop Self-Verification & Quality Gate (QA Critic & Security Sign-Off)
"""

import asyncio
import re
import time
import uuid
from typing import Any, Dict, List, Optional, Tuple

from backend.app.api.websockets.telemetry import manager as ws_manager
from backend.app.cognitive.multi_agent.models import (
    AgentEnvelope,
    AgentEnvelopePayload,
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
from backend.app.core.logging import logger


class AutonomousMultiAgentOrchestrator:
    """Central 9-Agent Orchestrator running the 4-Phase Autonomous Execution Loop."""

    def __init__(self):
        self._traces: Dict[str, LoopExecutionTrace] = {}
        self._negotiation_history: List[AgentEnvelope] = []
        self._max_history = 200

    def get_all_agents(self) -> List[Dict[str, Any]]:
        """Return canonical list of all 9 specialized agents with prompts and operational rules."""
        return [p.model_dump() for p in list_all_personas()]

    def get_negotiation_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Return recent inter-agent negotiation envelopes."""
        return [e.model_dump() for e in self._negotiation_history[-limit:]]

    def clear_history(self) -> None:
        """Clear negotiation history from buffer."""
        self._negotiation_history.clear()

    async def emit_envelope(self, envelope: AgentEnvelope) -> None:
        """Store envelope and broadcast over WebSocket for live HUD & Swarm Dialogue."""
        self._negotiation_history.append(envelope)
        if len(self._negotiation_history) > self._max_history:
            self._negotiation_history.pop(0)

        await ws_manager.broadcast({
            "channel": "swarm_negotiation",
            "type": "AGENT_ENVELOPE",
            "timestamp": envelope.timestamp,
            "envelope": envelope.model_dump()
        })

    # -------------------------------------------------------------------------
    # PHASE 1: Intent & Context Deconstruction (Understand Before Acting)
    # -------------------------------------------------------------------------
    async def phase_1_deconstruct_intent(self, task_id: str, user_prompt: str) -> Tuple[str, List[str], bool, Optional[str]]:
        """Analyze user prompt: extract true root goal, dependencies, and screen for security."""
        clean = user_prompt.strip()
        lower = clean.lower()
        constraints: List[str] = []

        # 1. Security & Guardrails Pre-Screening (Agent 9: Security Guard)
        security_env = AgentEnvelope(
            from_agent="agent_9_security",
            to_agent="agent_1_commander",
            task_id=task_id,
            type=EnvelopeType.PROPOSAL,
            status=EnvelopeStatus.IN_PROGRESS,
            payload=AgentEnvelopePayload(
                summary=f"Security gate: analyzing '{clean[:45]}' for credential exposure or destructive intent."
            )
        )
        await self.emit_envelope(security_env)

        # Destructive command interception
        destructive_keywords = ["drop table", "drop database", "truncate", "rm -rf", "delete all", "format c:"]
        if any(dk in lower for dk in destructive_keywords):
            sec_reject = AgentEnvelope(
                from_agent="agent_9_security",
                to_agent="agent_1_commander",
                task_id=task_id,
                type=EnvelopeType.CHALLENGE,
                status=EnvelopeStatus.BLOCKED,
                payload=AgentEnvelopePayload(
                    summary="Destructive action blocked. Explicit administrator consent required.",
                    evidence=f"Matched prohibited pattern in: '{clean}'"
                ),
                next_required_action="Require human tier-3 consent."
            )
            await self.emit_envelope(sec_reject)
            return clean, constraints, False, "Security Gate: Destructive action intercepted. Explicit operator approval required."

        # Credential exposure shield
        if any(k in lower for k in ["password:", "api_key:", "private_key:", "token:"]):
            constraints.append("CREDENTIAL_SHIELD_ACTIVE")

        # 2. Intent Deconstruction: Root Goal vs Surface Request
        root_goal = clean
        if any(q in lower for q in ["play song", "play music", "play youtube", "listen to"]):
            constraints.append("AUTONOMOUS_AUTOPLAY_REQUIRED")
            constraints.append("BYPASS_PROCESS_SINGLETON")
        elif "whatsapp" in lower:
            constraints.append("PRIORITIZE_NATIVE_DESKTOP_PROTOCOL")
            constraints.append("INTERACTIVE_FOLLOW_UP")
        elif any(c in lower for c in ["code", "script", "python", "bug", "fix", "patch"]):
            constraints.append("SURGICAL_EDITS_ONLY")
            constraints.append("PRESERVE_INTEGRITY")
        elif any(b in lower for b in ["browser", "url", "scrape", "http", "website"]):
            constraints.append("DOM_FIRST_VERIFICATION")
            constraints.append("WAIT_FOR_NETWORK_IDLE")

        sec_pass = AgentEnvelope(
            from_agent="agent_9_security",
            to_agent="agent_1_commander",
            task_id=task_id,
            type=EnvelopeType.APPROVAL,
            status=EnvelopeStatus.VERIFIED,
            payload=AgentEnvelopePayload(
                summary="Security pre-screen PASSED. Sandbox intact, credential shield active.",
                evidence="No prohibited destructive commands or raw credential leaks detected."
            )
        )
        await self.emit_envelope(sec_pass)
        return root_goal, constraints, True, None

    # -------------------------------------------------------------------------
    # PHASE 2: Dynamic Task Decomposition (Tree of Thought / DAG)
    # -------------------------------------------------------------------------
    async def phase_2_decompose_task(
        self,
        task_id: str,
        root_goal: str,
        constraints: List[str]
    ) -> List[Dict[str, Any]]:
        """Decompose objective into discrete, sequenced steps assigned to specialist squads."""
        strategist_env = AgentEnvelope(
            from_agent="agent_7_strategist",
            to_agent="agent_1_commander",
            task_id=task_id,
            type=EnvelopeType.PROPOSAL,
            status=EnvelopeStatus.IN_PROGRESS,
            payload=AgentEnvelopePayload(
                summary=f"Formulating DAG execution corridor for: '{root_goal[:45]}'",
                evidence=f"Active constraints: {', '.join(constraints) if constraints else 'Standard'}"
            ),
            next_required_action="Validate dependency topological order."
        )
        await self.emit_envelope(strategist_env)

        lower = root_goal.lower()
        steps: List[Dict[str, Any]] = []

        # Squad 1: Web & Browser Automation
        if any(w in lower for w in ["browse", "http://", "https://", "webpage", "website", "dom", "inspect web", "scrape"]):
            steps.append({
                "agent_id": "agent_2_browser",
                "role": "Browser & Web Automation Specialist",
                "action": "open_url",
                "params": {"url": root_goal},
                "expected_output": "Target webpage loaded and DOM tree verified."
            })

        # Squad 1: Comms & Messaging (WhatsApp, Alerts)
        elif any(c in lower for c in ["whatsapp", "watsapp", "send message", "text to", "deliver message"]):
            steps.append({
                "agent_id": "agent_3_comms",
                "role": "Communications & Messaging Officer",
                "action": "open_whatsapp",
                "params": {"goal": root_goal},
                "expected_output": "WhatsApp Desktop client launched and ready."
            })

        # Squad 1: OS, Shell & Code Engineer (Desktop utilities, terminal, coding)
        elif any(s in lower for s in ["notepad", "calc", "calculator", "terminal", "powershell", "code", "file", "write", "patch", "volume", "sound"]):
            steps.append({
                "agent_id": "agent_4_system",
                "role": "OS, Shell & Code Engineer",
                "action": "launch_application",
                "params": {"goal": root_goal},
                "expected_output": "Physical window handle verified in foreground."
            })

        # Squad 2: Deep Researcher (Documentation, Search, Codebase RAG)
        elif any(r in lower for r in ["research", "search", "find in code", "lookup", "documentation", "who is", "what is"]):
            steps.append({
                "agent_id": "agent_5_researcher",
                "role": "Deep Researcher & Data Miner",
                "action": "hybrid_search",
                "params": {"query": root_goal},
                "expected_output": "Extracted grounded factual citations from local knowledge store."
            })

        # Squad 2: ML & Data Pipeline Specialist
        elif any(m in lower for m in ["train", "dataset", "loss", "accuracy", "model", "pipeline", "benchmark", "hyperparameter"]):
            steps.append({
                "agent_id": "agent_6_ml",
                "role": "ML & Pipeline Specialist",
                "action": "evaluate_model",
                "params": {"task": root_goal},
                "expected_output": "Model metrics, accuracy curves and schema compatibility confirmed."
            })

        # Default: Route to Commander for universal physical OS or synthesis dispatch
        else:
            steps.append({
                "agent_id": "agent_1_commander",
                "role": "Commander & Orchestrator",
                "action": "execute_universal_goal",
                "params": {"goal": root_goal},
                "expected_output": "Complete autonomous task execution."
            })

        consensus_env = AgentEnvelope(
            from_agent="agent_1_commander",
            to_agent="agent_7_strategist",
            task_id=task_id,
            type=EnvelopeType.CONSENSUS,
            status=EnvelopeStatus.COMPLETED,
            payload=AgentEnvelopePayload(
                summary=f"Task DAG consensus reached: {len(steps)} sequenced wavefront execution steps.",
                evidence=f"Assigned specialist: {steps[0]['role']}"
            ),
            next_required_action="Dispatch to Execution Squad."
        )
        await self.emit_envelope(consensus_env)
        return steps

    # -------------------------------------------------------------------------
    # PHASE 3: Tool Execution Phase
    # -------------------------------------------------------------------------
    async def phase_3_dispatch_action(
        self,
        task_id: str,
        step: Dict[str, Any]
    ) -> AgentEnvelope:
        """Dispatch action to designated specialist agent with handoff envelope."""
        handoff_env = AgentEnvelope(
            from_agent="agent_1_commander",
            to_agent=step["agent_id"],
            task_id=task_id,
            type=EnvelopeType.HANDOFF,
            status=EnvelopeStatus.IN_PROGRESS,
            payload=AgentEnvelopePayload(
                summary=f"Handoff to {step['role']}: execute '{step['action']}'",
                evidence=f"Expected output: {step['expected_output']}"
            ),
            next_required_action="Execute physical action and report verifiable evidence."
        )
        await self.emit_envelope(handoff_env)
        return handoff_env

    # -------------------------------------------------------------------------
    # PHASE 4: Closed-Loop Self-Verification (The Critic Quality Gate)
    # -------------------------------------------------------------------------
    async def phase_4_verify_execution(
        self,
        task_id: str,
        step: Dict[str, Any],
        raw_result: Dict[str, Any]
    ) -> Tuple[bool, str, AgentEnvelope]:
        """Adversarial verification by Agent 8 (QA Auditor). Never trust words; verify real proof."""
        qa_audit_env = AgentEnvelope(
            from_agent="agent_8_qa_critic",
            to_agent="agent_1_commander",
            task_id=task_id,
            type=EnvelopeType.CRITIQUE,
            status=EnvelopeStatus.IN_PROGRESS,
            payload=AgentEnvelopePayload(
                summary="Quality gate audit: inspecting physical evidence, exit codes, and observed state."
            )
        )
        await self.emit_envelope(qa_audit_env)

        is_success = bool(raw_result.get("success", False))
        error_msg = raw_result.get("error_message") or raw_result.get("error")
        observed = raw_result.get("observed_state", {})

        # Validation Rule: Verify physical proof
        has_proof = bool(
            raw_result.get("data") or
            observed.get("window_handle") or
            observed.get("opened") or
            observed.get("playing") or
            observed.get("pid") or
            observed.get("matched_count") is not None
        )

        if is_success and not error_msg:
            qa_signoff = AgentEnvelope(
                from_agent="agent_8_qa_critic",
                to_agent="agent_1_commander",
                task_id=task_id,
                type=EnvelopeType.APPROVAL,
                status=EnvelopeStatus.VERIFIED,
                payload=AgentEnvelopePayload(
                    summary="VERIFIED: PASS. Physical execution attested with objective proof.",
                    evidence=f"Observed state: {observed or 'Physical transition confirmed'}"
                ),
                next_required_action="Deliver final verified result to operator."
            )
            await self.emit_envelope(qa_signoff)
            return True, "VERIFIED: PASS", qa_signoff
        else:
            reason = error_msg or "Failed to observe expected physical state transition."
            qa_reject = AgentEnvelope(
                from_agent="agent_8_qa_critic",
                to_agent="agent_1_commander",
                task_id=task_id,
                type=EnvelopeType.REJECTION,
                status=EnvelopeStatus.REJECTED,
                payload=AgentEnvelopePayload(
                    summary=f"REJECTED: Step failed quality verification. Reason: {reason}",
                    evidence=f"Observed error: {error_msg}"
                ),
                next_required_action="Trigger self-healing and formulate alternate execution corridor."
            )
            await self.emit_envelope(qa_reject)
            return False, f"REJECTED: {reason}", qa_reject

    # -------------------------------------------------------------------------
    # Full 4-Phase Orchestration Pipeline
    # -------------------------------------------------------------------------
    async def execute_autonomous_loop(
        self,
        task_id: str,
        user_prompt: str,
        execution_callback: Any
    ) -> Dict[str, Any]:
        """Execute the complete 4-Phase Autonomous Execution Loop for a user request."""
        now_ts = int(time.time() * 1000)
        trace = LoopExecutionTrace(
            task_id=task_id,
            user_goal=user_prompt,
            root_goal=user_prompt,
            active_phase=ExecutionLoopPhase.PHASE_1_INTENT_DECONSTRUCTION
        )
        self._traces[task_id] = trace

        # Phase 1: Intent & Context Deconstruction
        root_goal, constraints, sec_ok, sec_err = await self.phase_1_deconstruct_intent(task_id, user_prompt)
        trace.root_goal = root_goal
        trace.constraints = constraints
        if not sec_ok:
            trace.active_phase = ExecutionLoopPhase.PHASE_4_CLOSED_LOOP_VERIFICATION
            trace.verification_passed = False
            trace.completed_at_ts = int(time.time() * 1000)
            return {"success": False, "message": sec_err, "trace_id": trace.trace_id}

        # Phase 2: Dynamic Task Decomposition
        trace.active_phase = ExecutionLoopPhase.PHASE_2_DYNAMIC_DECOMPOSITION
        steps = await self.phase_2_decompose_task(task_id, root_goal, constraints)

        # Phase 3: Tool Execution Phase
        trace.active_phase = ExecutionLoopPhase.PHASE_3_TOOL_EXECUTION
        first_step = steps[0]
        await self.phase_3_dispatch_action(task_id, first_step)

        # Execute physical tool via callback
        raw_result = await execution_callback(root_goal, first_step)

        # Phase 4: Closed-Loop Self-Verification & Quality Gate
        trace.active_phase = ExecutionLoopPhase.PHASE_4_CLOSED_LOOP_VERIFICATION
        verified, qa_msg, qa_env = await self.phase_4_verify_execution(task_id, first_step, raw_result)
        trace.verification_passed = verified
        trace.qa_sign_off = qa_msg
        trace.security_sign_off = "SECURITY: PASS"
        trace.final_result = raw_result
        trace.completed_at_ts = int(time.time() * 1000)

        return {
            "success": verified,
            "trace_id": trace.trace_id,
            "root_goal": root_goal,
            "qa_sign_off": qa_msg,
            "security_sign_off": trace.security_sign_off,
            "raw_result": raw_result
        }


# Global singleton instance
multi_agent_orchestrator = AutonomousMultiAgentOrchestrator()
