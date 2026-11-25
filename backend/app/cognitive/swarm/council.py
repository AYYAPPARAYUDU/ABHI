"""ABHI Multi-LLM Collaborative Intelligence Council & Consensus Engine.

Coordinates the 8 canonical specialist brains with the Master LLM (abhi:latest):
- Master Model (abhi:latest): Intent deconstruction & council convener
- Reasoning & Planning Model (qwen3:8b / Archon-Nexus): DAG & topological decomposition
- Code Implementation Model (qwen3:8b / Synthex): AST inspection & code generation
- Screen & Visual Grounding Model (Aura-Vision): Active window & DOM evidence
- Security & Permission Model (Sentinel-X / Aegis-Sentry): Boundary critique & killswitches
- Temporal & Workflow Model (Chronos): Task scheduling & execution lifecycle
- Memory & Context Model (Synapse-AI): UnifiedContext & LanceDB RAG retrieval

Enforces bounded multi-round negotiation (max 3 rounds) and supervisor arbitration.
Zero raw chain-of-thought exposure.
"""

import asyncio
import time
import uuid
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from backend.app.core.logging import logger
from backend.app.core.event_bus import event_bus, ABHIEvent, EventCategory
from backend.app.automation.orchestration.worker_lifecycle import (
    worker_lifecycle_manager,
    CancellationToken
)
from backend.app.intelligence.model_registry import model_capability_registry, ModelRole
from backend.app.intelligence.model_scheduler import model_resource_scheduler
from backend.app.intelligence.model_negotiation import ConsensusMetric
from backend.app.services.llm.ollama_client import ollama_client


class CouncilEventType(str, Enum):
    TASK_PROPOSAL = "TASK_PROPOSAL"
    PLAN = "PLAN"
    EVIDENCE = "EVIDENCE"
    CRITIQUE = "CRITIQUE"
    REVISION = "REVISION"
    APPROVAL = "APPROVAL"
    DISAGREEMENT = "DISAGREEMENT"
    FINAL_DECISION = "FINAL_DECISION"


class CouncilMessage(BaseModel):
    message_id: str = Field(default_factory=lambda: f"cmsg_{uuid.uuid4().hex[:8]}")
    session_id: str
    event_type: CouncilEventType
    sender_agent_id: str
    recipient: str = "COUNCIL_ALL"
    confidence_score: float = Field(ge=0.0, le=1.0, default=0.95)
    payload: Dict[str, Any] = Field(default_factory=dict)
    rationale: str
    timestamp_ms: int = Field(default_factory=lambda: int(time.time() * 1000))


class CouncilVote(BaseModel):
    agent_id: str
    approved: bool
    confidence: float
    objection_reason: Optional[str] = None
    suggested_mutation: Optional[Dict[str, Any]] = None


class CouncilSessionRecord(BaseModel):
    session_id: str = Field(default_factory=lambda: f"csess_{uuid.uuid4().hex[:8]}")
    task_id: str
    goal: str
    status: str = "DELIBERATING"  # DELIBERATING, CONSENSUS_REACHED, DEADLOCKED, RATIFIED
    lead_agent_id: str = "master_orchestrator"
    round_number: int = 1
    max_rounds: int = 3
    event_history: List[CouncilMessage] = Field(default_factory=list)
    votes: Dict[str, CouncilVote] = Field(default_factory=dict)
    ratified_plan: Optional[Dict[str, Any]] = None
    arbitrated_by: Optional[str] = None
    fallback_used: bool = False
    fallback_reason: Optional[str] = None
    consensus_metric: Optional[ConsensusMetric] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MultiLLMCouncil:
    """Authoritative negotiation council coordinating multi-model consensus and disagreement resolution."""

    def __init__(self, max_rounds: int = 3, timeout_sec: float = 30.0):
        self.max_rounds = max_rounds
        self.timeout_sec = timeout_sec
        self._sessions: Dict[str, CouncilSessionRecord] = {}

    async def _invoke_council_model(
        self,
        model_name: str,
        prompt: str,
        system: str,
        fallback_text: str,
        ollama_online: bool,
    ) -> Dict[str, Any]:
        """Run a bounded sequential Ollama /api/generate call for a council member."""
        constraints = model_resource_scheduler.get_execution_constraints(model_name)
        num_ctx = min(2048, int(constraints.get("num_ctx", 2048)))
        t0 = time.perf_counter()

        if not ollama_online:
            return {
                "text": fallback_text,
                "latency_ms": int((time.perf_counter() - t0) * 1000),
                "eval_count": 0,
                "prompt_eval_count": 0,
                "fallback_used": True,
                "fallback_reason": "Ollama daemon unreachable",
                "num_ctx": num_ctx,
            }

        try:
            resp = await asyncio.wait_for(
                ollama_client.generate(
                    prompt=prompt,
                    system=system,
                    model=model_name,
                    stream=False,
                    options={"num_ctx": num_ctx, "num_predict": 220, "temperature": 0.3},
                ),
                timeout=self.timeout_sec,
            )
            latency_ms = int((time.perf_counter() - t0) * 1000)
            text = (resp.response or "").strip()
            if not text:
                return {
                    "text": fallback_text,
                    "latency_ms": latency_ms,
                    "eval_count": resp.eval_count or 0,
                    "prompt_eval_count": resp.prompt_eval_count or 0,
                    "fallback_used": True,
                    "fallback_reason": f"Empty response from {model_name}",
                    "num_ctx": num_ctx,
                }
            return {
                "text": text[:500],
                "latency_ms": latency_ms,
                "eval_count": int(resp.eval_count or len(text.split())),
                "prompt_eval_count": int(resp.prompt_eval_count or len(prompt.split())),
                "fallback_used": False,
                "fallback_reason": None,
                "num_ctx": num_ctx,
            }
        except asyncio.TimeoutError:
            latency_ms = int((time.perf_counter() - t0) * 1000)
            logger.warning(f"Council model {model_name} timed out after {self.timeout_sec}s")
            return {
                "text": fallback_text,
                "latency_ms": latency_ms,
                "eval_count": 0,
                "prompt_eval_count": 0,
                "fallback_used": True,
                "fallback_reason": f"Timeout after {self.timeout_sec}s calling {model_name}",
                "num_ctx": num_ctx,
            }
        except Exception as exc:
            latency_ms = int((time.perf_counter() - t0) * 1000)
            logger.warning(f"Council model {model_name} error: {exc}")
            return {
                "text": fallback_text,
                "latency_ms": latency_ms,
                "eval_count": 0,
                "prompt_eval_count": 0,
                "fallback_used": True,
                "fallback_reason": f"{model_name} error: {exc}",
                "num_ctx": num_ctx,
            }

    async def deliberate_goal(
        self,
        task_id: str,
        goal: str,
        context: Optional[Dict[str, Any]] = None,
        cancellation_token: Optional[CancellationToken] = None
    ) -> CouncilSessionRecord:
        """Run full sequential council deliberation round on a complex user request."""
        session = CouncilSessionRecord(
            task_id=task_id,
            goal=goal,
            lead_agent_id="abhi:master"
        )
        self._sessions[session.session_id] = session

        if cancellation_token and cancellation_token.is_cancelled:
            session.status = "CANCELLED"
            return session

        master_model = model_capability_registry.get_model_for_role(ModelRole.MASTER_MODEL) or "abhi:latest"
        reasoning_model = model_capability_registry.get_model_for_role(ModelRole.REASONING_MODEL) or "qwen3:8b"
        allow_concurrent = model_resource_scheduler.is_safe_for_concurrent_inference(master_model)
        ollama_online = await ollama_client.is_healthy()
        ctx_snippet = str(context or {})[:300]
        fallback_reasons: List[str] = []
        latencies_ms: Dict[str, int] = {}
        total_tokens = 0

        # -------------------------------------------------------------
        # ROUND 1: TASK PROPOSAL (abhi:latest) & TECHNICAL PLAN (qwen3:8b)
        # -------------------------------------------------------------
        res_prop = await self._invoke_council_model(
            model_name=master_model,
            prompt=f"Propose a 2-sentence task decomposition for:\nGoal: {goal}\nContext: {ctx_snippet}",
            system="You are abhi:master, council convener. Respond concisely without chain-of-thought.",
            fallback_text=f"Fallback proposal for '{goal}': Decompose into context fetch, execution, and verification.",
            ollama_online=ollama_online,
        )
        latencies_ms[f"abhi:master:{master_model}"] = res_prop["latency_ms"]
        total_tokens += res_prop["eval_count"] + res_prop["prompt_eval_count"]
        if res_prop["fallback_used"] and res_prop["fallback_reason"]:
            fallback_reasons.append(res_prop["fallback_reason"])

        msg_prop = CouncilMessage(
            session_id=session.session_id,
            event_type=CouncilEventType.TASK_PROPOSAL,
            sender_agent_id="abhi:master",
            confidence_score=0.65 if res_prop["fallback_used"] else 0.94,
            rationale=res_prop["text"],
            payload={
                "model": master_model,
                "num_ctx": res_prop["num_ctx"],
                "latency_ms": res_prop["latency_ms"],
                "eval_count": res_prop["eval_count"],
                "prompt_eval_count": res_prop["prompt_eval_count"],
                "fallback_used": res_prop["fallback_used"],
                "fallback_reason": res_prop["fallback_reason"],
            },
        )
        session.event_history.append(msg_prop)
        await self._broadcast_message(session, msg_prop)

        if cancellation_token and cancellation_token.is_cancelled:
            session.status = "CANCELLED"
            return session

        res_plan = await self._invoke_council_model(
            model_name=reasoning_model,
            prompt=f"Build a concise DAG execution plan for:\nGoal: {goal}\nProposal: {msg_prop.rationale}",
            system="You are qwen3:archon-nexus. Provide a concise 2-sentence DAG plan without thinking tags.",
            fallback_text="Fallback DAG plan: Wave 0 (Context fetch), Wave 1 (Execution), Wave 2 (DualStateVerification).",
            ollama_online=ollama_online,
        )
        latencies_ms[f"qwen3:archon-nexus:{reasoning_model}"] = res_plan["latency_ms"]
        total_tokens += res_plan["eval_count"] + res_plan["prompt_eval_count"]
        if res_plan["fallback_used"] and res_plan["fallback_reason"]:
            fallback_reasons.append(res_plan["fallback_reason"])

        msg_plan = CouncilMessage(
            session_id=session.session_id,
            event_type=CouncilEventType.PLAN,
            sender_agent_id="qwen3:archon-nexus",
            confidence_score=0.65 if res_plan["fallback_used"] else 0.95,
            rationale=res_plan["text"],
            payload={
                "model": reasoning_model,
                "num_ctx": res_plan["num_ctx"],
                "latency_ms": res_plan["latency_ms"],
                "eval_count": res_plan["eval_count"],
                "prompt_eval_count": res_plan["prompt_eval_count"],
                "fallback_used": res_plan["fallback_used"],
                "fallback_reason": res_plan["fallback_reason"],
                "allow_concurrent": allow_concurrent,
            },
        )
        session.event_history.append(msg_plan)
        await self._broadcast_message(session, msg_plan)

        # -------------------------------------------------------------
        # ROUND 2: SAFETY & VERIFICATION CRITIQUE (qwen3:8b)
        # -------------------------------------------------------------
        if cancellation_token and cancellation_token.is_cancelled:
            session.status = "CANCELLED"
            return session

        res_critique = await self._invoke_council_model(
            model_name=reasoning_model,
            prompt=f"Perform a concise 1-2 sentence safety & verification critique of this plan:\n{msg_plan.rationale}",
            system="You are sentinel-x, security & verification critic. State safety guards concisely.",
            fallback_text="Fallback safety critique: Enforce sandboxed execution and DualStateVerifier postcondition check.",
            ollama_online=ollama_online,
        )
        latencies_ms[f"sentinel-x:{reasoning_model}"] = res_critique["latency_ms"]
        total_tokens += res_critique["eval_count"] + res_critique["prompt_eval_count"]
        if res_critique["fallback_used"] and res_critique["fallback_reason"]:
            fallback_reasons.append(res_critique["fallback_reason"])

        msg_critique = CouncilMessage(
            session_id=session.session_id,
            event_type=CouncilEventType.CRITIQUE,
            sender_agent_id="sentinel-x",
            confidence_score=0.65 if res_critique["fallback_used"] else 0.96,
            rationale=res_critique["text"],
            payload={
                "model": reasoning_model,
                "num_ctx": res_critique["num_ctx"],
                "latency_ms": res_critique["latency_ms"],
                "eval_count": res_critique["eval_count"],
                "prompt_eval_count": res_critique["prompt_eval_count"],
                "fallback_used": res_critique["fallback_used"],
                "fallback_reason": res_critique["fallback_reason"],
            },
        )
        session.event_history.append(msg_critique)
        await self._broadcast_message(session, msg_critique)

        # -------------------------------------------------------------
        # ROUND 3: REVISION (abhi:latest), VOTING & RATIFICATION
        # -------------------------------------------------------------
        res_rev = await self._invoke_council_model(
            model_name=master_model,
            prompt=f"Synthesize the final revised plan incorporating critique.\nPlan: {msg_plan.rationale}\nCritique: {msg_critique.rationale}",
            system="You are abhi:synthesizer. Produce a concise final ratified summary in 1-2 sentences.",
            fallback_text="Fallback revision: Adopted DualStateVerifier and sandboxed execution guard.",
            ollama_online=ollama_online,
        )
        latencies_ms[f"abhi:synthesizer:{master_model}"] = res_rev["latency_ms"]
        total_tokens += res_rev["eval_count"] + res_rev["prompt_eval_count"]
        if res_rev["fallback_used"] and res_rev["fallback_reason"]:
            fallback_reasons.append(res_rev["fallback_reason"])

        dag_plan_id = f"dag_{uuid.uuid4().hex[:8]}"
        msg_revision = CouncilMessage(
            session_id=session.session_id,
            event_type=CouncilEventType.REVISION,
            sender_agent_id="qwen3:synthex",
            confidence_score=0.65 if res_rev["fallback_used"] else 0.97,
            rationale=res_rev["text"],
            payload={
                "dag_plan_id": dag_plan_id,
                "model": master_model,
                "num_ctx": res_rev["num_ctx"],
                "latency_ms": res_rev["latency_ms"],
                "eval_count": res_rev["eval_count"],
                "prompt_eval_count": res_rev["prompt_eval_count"],
                "fallback_used": res_rev["fallback_used"],
                "fallback_reason": res_rev["fallback_reason"],
                "verified": not res_rev["fallback_used"],
            },
        )
        session.event_history.append(msg_revision)
        await self._broadcast_message(session, msg_revision)

        # Real Specialist Votes derived from model execution outcomes
        step_map = [
            ("abhi:master", res_prop),
            ("qwen3:archon-nexus", res_plan),
            ("sentinel-x", res_critique),
            ("qwen3:synthex", res_rev),
        ]
        for agent_id, step_res in step_map:
            approved = not step_res["fallback_used"]
            session.votes[agent_id] = CouncilVote(
                agent_id=agent_id,
                approved=approved,
                confidence=0.95 if approved else 0.5,
                objection_reason=step_res["fallback_reason"],
            )

        affirmative_votes = sum(1 for v in session.votes.values() if v.approved)
        total_votes = len(session.votes)
        objection_count = total_votes - affirmative_votes
        consensus_ratio = round(affirmative_votes / max(1, total_votes), 3)
        any_fallback = bool(fallback_reasons)
        deduped_reason = "; ".join(dict.fromkeys(fallback_reasons)) if fallback_reasons else None

        consensus_metric = ConsensusMetric(
            total_specialist_votes=total_votes,
            affirmative_votes=affirmative_votes,
            objection_count=objection_count,
            consensus_ratio=consensus_ratio,
            unanimous=(affirmative_votes == total_votes),
            arbitration_applied=any_fallback or (affirmative_votes < total_votes),
            agreement_rationale=(
                "Live council models reached consensus."
                if not any_fallback
                else f"Council fallback used ({deduped_reason})."
            ),
        )

        # -------------------------------------------------------------
        # SUPERVISOR FINAL DECISION
        # -------------------------------------------------------------
        session.round_number = 3
        session.status = "RATIFIED" if affirmative_votes >= 2 else "DEADLOCKED"
        session.arbitrated_by = "CentralSupervisor"
        session.fallback_used = any_fallback
        session.fallback_reason = deduped_reason
        session.consensus_metric = consensus_metric
        session.metadata = {
            "total_tokens": total_tokens,
            "latencies_ms": latencies_ms,
            "allow_concurrent": allow_concurrent,
            "num_ctx": 2048,
            "fallback_used": any_fallback,
            "fallback_reason": deduped_reason,
        }
        session.ratified_plan = {
            **msg_revision.payload,
            "summary": msg_revision.rationale,
            "fallback_used": any_fallback,
            "fallback_reason": deduped_reason,
        }

        msg_decision = CouncilMessage(
            session_id=session.session_id,
            event_type=CouncilEventType.FINAL_DECISION,
            sender_agent_id="CentralSupervisor",
            confidence_score=consensus_ratio,
            rationale=f"Council finished (votes={affirmative_votes}/{total_votes}, fallback_used={any_fallback}).",
            payload={
                "ratified_plan": session.ratified_plan,
                "consensus_metric": consensus_metric.model_dump(),
                "total_tokens": total_tokens,
                "latencies_ms": latencies_ms,
                "fallback_used": any_fallback,
                "fallback_reason": deduped_reason,
            },
        )
        session.event_history.append(msg_decision)
        await self._broadcast_message(session, msg_decision, category=EventCategory.AGENT)

        return session

    async def _broadcast_message(
        self,
        session: CouncilSessionRecord,
        msg: CouncilMessage,
        category: EventCategory = EventCategory.MODEL,
    ) -> None:
        """Publish council message to the shared event bus for backend and frontend telemetry."""
        evt = ABHIEvent(
            category=category,
            event_type=f"council_{msg.event_type.value.lower()}",
            source=msg.sender_agent_id,
            correlation_id=session.task_id,
            data={
                "session_id": session.session_id,
                "message_id": msg.message_id,
                "event_type": msg.event_type.value,
                "sender": msg.sender_agent_id,
                "confidence": msg.confidence_score,
                "rationale": msg.rationale,
                "payload": msg.payload,
                "timestamp_ms": msg.timestamp_ms,
                "fallback_used": msg.payload.get("fallback_used", False),
                "fallback_reason": msg.payload.get("fallback_reason"),
                "latency_ms": msg.payload.get("latency_ms", 0),
                "eval_count": msg.payload.get("eval_count", 0),
                "prompt_eval_count": msg.payload.get("prompt_eval_count", 0),
            }
        )
        await event_bus.publish(evt)

    def get_session(self, session_id: str) -> Optional[CouncilSessionRecord]:
        return self._sessions.get(session_id)


# Global singleton
multi_llm_council = MultiLLMCouncil()
