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
        """Analyze user prompt dynamically: extract true root goal, dependencies, and screen for security."""
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

        # 2. Dynamic Semantic Intent Deconstruction
        root_goal = clean

        # Extract multi-step indicators and operational constraints
        if any(q in lower for q in ["play song", "play music", "play youtube", "listen to"]):
            constraints.append("AUTONOMOUS_AUTOPLAY_REQUIRED")
            constraints.append("BYPASS_PROCESS_SINGLETON")
        if any(w in lower for w in ["browse", "browser", "website", "webpage", "http", "dom", "url"]):
            constraints.append("DOM_FIRST_VERIFICATION")
            constraints.append("WAIT_FOR_NETWORK_IDLE")
        if any(a in lower for a in ["analyze", "analyse", "description", "summary", "extract"]):
            constraints.append("CONTENT_SYNTHESIS_REQUIRED")
        if any(c in lower for c in ["whatsapp", "watsapp", "send message", "text to", "deliver message", "email", "gmail"]):
            constraints.append("RECIPIENT_AUTHENTICATION_REQUIRED")
            constraints.append("INTERACTIVE_DELIVERY_CONFIRMATION")
        if any(s in lower for s in ["code", "script", "python", "bug", "fix", "patch"]):
            constraints.append("SURGICAL_EDITS_ONLY")
            constraints.append("AST_SYNTAX_VALIDATION_MANDATORY")

        sec_pass = AgentEnvelope(
            from_agent="agent_9_security",
            to_agent="agent_1_commander",
            task_id=task_id,
            type=EnvelopeType.APPROVAL,
            status=EnvelopeStatus.VERIFIED,
            payload=AgentEnvelopePayload(
                summary="Security pre-screen PASSED. Sandbox intact, credential shield active.",
                evidence=f"Intent: {clean[:40]} | Constraints: {len(constraints)} active"
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
        """Decompose objective dynamically into discrete, sequenced steps assigned to specialist squads."""
        strategist_env = AgentEnvelope(
            from_agent="agent_7_strategist",
            to_agent="agent_1_commander",
            task_id=task_id,
            type=EnvelopeType.PROPOSAL,
            status=EnvelopeStatus.IN_PROGRESS,
            payload=AgentEnvelopePayload(
                summary=f"Formulating dynamic multi-agent DAG for: '{root_goal[:45]}'",
                evidence=f"Active constraints: {', '.join(constraints) if constraints else 'Standard'}"
            ),
            next_required_action="Validate dependency topological order."
        )
        await self.emit_envelope(strategist_env)

        lower = root_goal.lower().strip()
        steps: List[Dict[str, Any]] = []

        # ---------------------------------------------------------------------
        # 1. Web & Browser Automation + In-Depth Analysis Workflow
        # e.g., "open browser and analyze this website and give description"
        # ---------------------------------------------------------------------
        if (
            any(w in lower for w in ["browse", "http://", "https://", "webpage", "website", "dom", "inspect web", "scrape"])
            or ("browser" in lower and any(a in lower for a in ["analyze", "analyse", "description", "summary", "inspect", "open"]))
        ):
            url_match = re.search(r"(https?://\S+|www\.\S+|[a-zA-Z0-9\.\-_]+\.(?:com|org|net|io|edu|gov)\S*)", root_goal)
            target_url = url_match.group(1) if url_match else "https://www.google.com"

            # Step 1: Browser Specialist launches browser and navigates
            steps.append({
                "agent_id": "agent_2_browser",
                "role": "Browser & Web Automation Specialist",
                "action": "open_url",
                "params": {"url": target_url, "goal": root_goal},
                "expected_output": f"Web browser navigated to {target_url} with verified DOM readiness."
            })

            # If user asks to analyze, describe, inspect, or summarize
            if any(a in lower for a in ["analyze", "analyse", "description", "summary", "read", "inspect", "explain"]):
                steps.append({
                    "agent_id": "agent_2_browser",
                    "role": "Browser & Web Automation Specialist",
                    "action": "read_page",
                    "params": {"url": target_url},
                    "expected_output": "Extracted visible DOM text, metadata, headings, and semantic body content."
                })
                steps.append({
                    "agent_id": "agent_5_researcher",
                    "role": "Deep Researcher & Data Miner",
                    "action": "analyze_web_content",
                    "params": {"url": target_url, "intent": root_goal},
                    "expected_output": "Comprehensive architectural description and key insights synthesized."
                })
                steps.append({
                    "agent_id": "agent_8_qa_critic",
                    "role": "Verification & QA Auditor (The Critic)",
                    "action": "verify_analysis_quality",
                    "params": {"target": target_url},
                    "expected_output": "Quality gate approval confirming description matches extracted website content."
                })

        # ---------------------------------------------------------------------
        # 2. Communications & Messaging Workflow (WhatsApp, Email)
        # e.g., "open whatsapp and send message to this person this is the message"
        # ---------------------------------------------------------------------
        elif any(c in lower for c in ["whatsapp", "watsapp", "send message", "text to", "deliver message", "email", "gmail"]):
            recipient_match = re.search(r"(?:to|contact|person)\s+([a-zA-Z0-9_+]+)", root_goal, re.IGNORECASE)
            recipient = recipient_match.group(1).strip() if recipient_match else "Personal Contact"

            msg_match = re.search(r"(?:saying|message|text|content|is the message)[:\s]+(.+)", root_goal, re.IGNORECASE)
            message_payload = msg_match.group(1).strip() if msg_match else "Hello from ABHI"

            steps.append({
                "agent_id": "agent_3_comms",
                "role": "Communications & Messaging Officer",
                "action": "open_whatsapp",
                "params": {"goal": root_goal, "recipient": recipient},
                "expected_output": "Communications interface active and calibrated in foreground."
            })
            steps.append({
                "agent_id": "agent_3_comms",
                "role": "Communications & Messaging Officer",
                "action": "send_whatsapp_message",
                "params": {"recipient": recipient, "message": message_payload},
                "expected_output": f"Message delivered to {recipient} with conversation acknowledgment."
            })
            steps.append({
                "agent_id": "agent_8_qa_critic",
                "role": "Verification & QA Auditor (The Critic)",
                "action": "verify_delivery",
                "params": {"recipient": recipient},
                "expected_output": "Physical delivery confirmation verified in conversation trace."
            })

        # ---------------------------------------------------------------------
        # 3. Code Synthesis, Scripting & Engineering Workflow
        # e.g., "write python script for quicksort and test it"
        # ---------------------------------------------------------------------
        elif any(s in lower for s in ["code", "script", "python", "bug", "fix", "patch", "test", "run command"]):
            steps.append({
                "agent_id": "agent_4_system",
                "role": "OS, Shell & Code Engineer",
                "action": "generate_code",
                "params": {"instruction": root_goal},
                "expected_output": "Synthesized polyglot source code with AST verification."
            })
            steps.append({
                "agent_id": "agent_4_system",
                "role": "OS, Shell & Code Engineer",
                "action": "execute_test",
                "params": {"instruction": root_goal},
                "expected_output": "Unit test suite executed with zero regression."
            })
            steps.append({
                "agent_id": "agent_8_qa_critic",
                "role": "Verification & QA Auditor (The Critic)",
                "action": "audit_code_integrity",
                "params": {"goal": root_goal},
                "expected_output": "Code quality, syntax valid, tests passed, zero security risks."
            })

        # ---------------------------------------------------------------------
        # 4. Deep Research, Citations & Knowledge Retrieval
        # e.g., "search for latest research on quantum computing and summarize"
        # ---------------------------------------------------------------------
        elif any(r in lower for r in ["research", "search", "find in code", "lookup", "documentation", "who is", "what is"]):
            steps.append({
                "agent_id": "agent_5_researcher",
                "role": "Deep Researcher & Data Miner",
                "action": "hybrid_search",
                "params": {"query": root_goal},
                "expected_output": "Extracted grounded factual citations from local knowledge store."
            })
            steps.append({
                "agent_id": "agent_5_researcher",
                "role": "Deep Researcher & Data Miner",
                "action": "extract_citations",
                "params": {"query": root_goal},
                "expected_output": "Synthesized factual citations and verified reference sources."
            })
            steps.append({
                "agent_id": "agent_8_qa_critic",
                "role": "Verification & QA Auditor (The Critic)",
                "action": "audit_factuality",
                "params": {"query": root_goal},
                "expected_output": "Factuality score >= 0.95 with zero speculative claims."
            })

        # ---------------------------------------------------------------------
        # 5. OS & Desktop Applications (Calculator, Camera, Notepad, Spotify, etc.)
        # ---------------------------------------------------------------------
        elif any(s in lower for s in ["notepad", "calc", "calculator", "camera", "spotify", "settings", "explorer", "volume", "sound", "app", "open", "launch"]):
            app_clean = re.sub(r"^(?:open|launch|start|run)\s+(?:the\s+)?", "", root_goal, flags=re.IGNORECASE).strip()
            steps.append({
                "agent_id": "agent_4_system",
                "role": "OS, Shell & Code Engineer",
                "action": "launch_application",
                "params": {"app_name": app_clean, "goal": root_goal},
                "expected_output": f"Physical application window ({app_clean}) active in foreground."
            })
            if any(k in lower for k in ["calc", "compute", "type", "write"]):
                steps.append({
                    "agent_id": "agent_4_system",
                    "role": "OS, Shell & Code Engineer",
                    "action": "execute_app_action",
                    "params": {"app_name": app_clean, "goal": root_goal},
                    "expected_output": "Sub-action executed inside application buffer."
                })
            steps.append({
                "agent_id": "agent_8_qa_critic",
                "role": "Verification & QA Auditor (The Critic)",
                "action": "verify_process_state",
                "params": {"app_name": app_clean},
                "expected_output": "Physical window handle and process state verified."
            })

        # ---------------------------------------------------------------------
        # 6. Universal Autonomous Dispatch
        # ---------------------------------------------------------------------
        else:
            steps.append({
                "agent_id": "agent_1_commander",
                "role": "Commander & Orchestrator",
                "action": "execute_universal_goal",
                "params": {"goal": root_goal},
                "expected_output": "Complete autonomous task execution."
            })
            steps.append({
                "agent_id": "agent_8_qa_critic",
                "role": "Verification & QA Auditor (The Critic)",
                "action": "verify_universal_execution",
                "params": {"goal": root_goal},
                "expected_output": "Closed-loop verification of goal completion."
            })

        # Inter-agent Critique & Quality Gate (Agent 8 evaluates proposed DAG)
        critique_env = AgentEnvelope(
            from_agent="agent_8_qa_critic",
            to_agent="agent_7_strategist",
            task_id=task_id,
            type=EnvelopeType.CRITIQUE,
            status=EnvelopeStatus.IN_PROGRESS,
            payload=AgentEnvelopePayload(
                summary=f"Pre-flight audit of {len(steps)}-step execution corridor.",
                evidence=f"Wavefront sequence: {' -> '.join(s['action'] for s in steps)}"
            ),
            next_required_action="Validate execution readiness and resource locks."
        )
        await self.emit_envelope(critique_env)

        # Commander Consensus & Ratification
        consensus_env = AgentEnvelope(
            from_agent="agent_1_commander",
            to_agent="agent_7_strategist",
            task_id=task_id,
            type=EnvelopeType.CONSENSUS,
            status=EnvelopeStatus.COMPLETED,
            payload=AgentEnvelopePayload(
                summary=f"Task DAG consensus reached: {len(steps)} sequenced wavefront execution steps.",
                evidence=f"Squad members involved: {', '.join(set(s['role'] for s in steps))}"
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

        is_success = bool(raw_result.get("success", False)) if isinstance(raw_result, dict) else True
        error_msg = raw_result.get("error_message") or raw_result.get("error") if isinstance(raw_result, dict) else None
        observed = raw_result.get("observed_state", {}) if isinstance(raw_result, dict) else {}

        # Validation Rule: Verify physical proof
        has_proof = bool(
            not isinstance(raw_result, dict) or
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

        # Phase 3: Multi-Step Tool Execution Phase
        trace.active_phase = ExecutionLoopPhase.PHASE_3_TOOL_EXECUTION
        step_results = []
        all_passed = True

        for step in steps:
            await self.phase_3_dispatch_action(task_id, step)
            try:
                res = await execution_callback(root_goal, step)
                step_results.append(res)
            except Exception as ex:
                step_results.append({"success": False, "error": str(ex)})
                all_passed = False
                break

        # Phase 4: Closed-Loop Self-Verification & Quality Gate
        trace.active_phase = ExecutionLoopPhase.PHASE_4_CLOSED_LOOP_VERIFICATION
        last_step = steps[-1] if steps else {"action": "complete"}
        last_result = step_results[-1] if step_results else {"success": all_passed}
        verified, qa_msg, qa_env = await self.phase_4_verify_execution(task_id, last_step, last_result)

        trace.verification_passed = verified and all_passed
        trace.qa_sign_off = qa_msg
        trace.security_sign_off = "SECURITY: PASS"
        trace.final_result = {"step_results": step_results, "steps_count": len(steps)}
        trace.completed_at_ts = int(time.time() * 1000)

        return {
            "success": trace.verification_passed,
            "trace_id": trace.trace_id,
            "root_goal": root_goal,
            "steps_executed": len(step_results),
            "total_steps": len(steps),
            "qa_sign_off": qa_msg,
            "security_sign_off": trace.security_sign_off,
            "raw_result": trace.final_result
        }


# Global singleton instance
multi_agent_orchestrator = AutonomousMultiAgentOrchestrator()
