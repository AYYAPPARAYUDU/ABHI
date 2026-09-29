"""Procedural Memory Engine: Promotion, Versioning, Validation & Execution (Stage 7.5)."""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from backend.app.cognitive.memory.models import (
    EpisodicMemoryModel,
    MemoryStatus,
    ProcedureMetrics,
    ProcedureModel,
    ProcedureParameter,
    ProcedurePostcondition,
    ProcedurePrecondition,
    ProcedureStep,
    ProcedureVersionRecord,
)


class ProceduralMemoryEngine:
    """Manages creation, promotion, validation, versioning, and execution mapping of procedures."""

    MIN_EPISODES_FOR_PROMOTION = 2
    MIN_SUCCESS_RATE_THRESHOLD = 0.90
    DEPRECATION_THRESHOLD = 0.60

    @classmethod
    def create_candidate_from_episodes(
        cls,
        episodes: List[EpisodicMemoryModel],
        procedure_name: str,
        description: str = "",
        trigger_conditions: Optional[List[str]] = None
    ) -> Tuple[Optional[ProcedureModel], Optional[str]]:
        """
        Evaluate a sequence of completed episodic experiences and synthesize a procedural candidate.
        Requires repeated successful execution with matching stable skill sequences.
        """
        if len(episodes) < cls.MIN_EPISODES_FOR_PROMOTION:
            return None, f"Insufficient episodes: {len(episodes)} < {cls.MIN_EPISODES_FOR_PROMOTION} required."

        successful_episodes = [e for e in episodes if e.outcome == "SUCCESS"]
        success_rate = len(successful_episodes) / len(episodes)
        if success_rate < cls.MIN_SUCCESS_RATE_THRESHOLD:
            return None, f"Success rate {success_rate:.2f} below promotion threshold {cls.MIN_SUCCESS_RATE_THRESHOLD}."

        # Check skill sequence stability across successful episodes
        primary_seq = successful_episodes[0].skill_sequence
        if not primary_seq:
            return None, "Episodes contain empty skill sequence."

        for ep in successful_episodes[1:]:
            if ep.skill_sequence != primary_seq:
                return None, f"Inconsistent skill sequence across episodes ({primary_seq} vs {ep.skill_sequence})."

        # Build candidate steps
        steps: List[ProcedureStep] = []
        for idx, skill_id in enumerate(primary_seq):
            steps.append(
                ProcedureStep(
                    step_index=idx + 1,
                    skill_id=skill_id,
                    action_name=f"execute_{skill_id}",
                    parameters={},
                    expected_outcome=f"Skill {skill_id} executed successfully.",
                    timeout_seconds=30.0
                )
            )

        proc_id = f"proc_{uuid.uuid4().hex[:12]}"
        candidate = ProcedureModel(
            procedure_id=proc_id,
            name=procedure_name,
            description=description or f"Reusable procedure derived from {len(episodes)} task executions.",
            trigger_conditions=trigger_conditions or [procedure_name.lower()],
            required_skills=list(set(primary_seq)),
            parameters=[],
            steps=steps,
            preconditions=ProcedurePrecondition(
                required_apps=[],
                required_skills=list(set(primary_seq)),
                required_permissions=["local_execution"]
            ),
            postconditions=ProcedurePostcondition(
                expected_final_state={"status": "completed"},
                artifacts=[],
                verification_evidence=["task_completed"]
            ),
            metrics=ProcedureMetrics(
                invocation_count=len(episodes),
                success_count=len(successful_episodes),
                failure_count=len(episodes) - len(successful_episodes),
                success_rate=round(success_rate, 4),
                average_duration_ms=sum(e.duration_ms for e in episodes) / len(episodes) if episodes else 0.0,
                last_used_at=datetime.now(timezone.utc)
            ),
            version="1.0.0",
            confidence=0.90,
            status=MemoryStatus.CANDIDATE
        )
        return candidate, None

    @classmethod
    def validate_candidate(
        cls,
        candidate: ProcedureModel,
        registered_skill_ids: Optional[List[str]] = None
    ) -> Tuple[bool, List[str]]:
        """
        Validate candidate procedure against registered skill ecosystem and security policies.
        Returns (is_valid, validation_errors).
        """
        errors: List[str] = []

        if not candidate.name.strip():
            errors.append("Procedure name cannot be empty.")

        if not candidate.steps:
            errors.append("Procedure must contain at least one step.")

        if registered_skill_ids:
            reg_set = set(registered_skill_ids)
            for step in candidate.steps:
                if step.skill_id not in reg_set:
                    errors.append(f"Step {step.step_index} references unregistered skill '{step.skill_id}'.")

        # Security check: verify no arbitrary shell strings in step action or parameters
        for step in candidate.steps:
            raw = f"{step.action_name} {str(step.parameters)}"
            if "eval(" in raw or "exec(" in raw or "__import__" in raw:
                errors.append(f"Step {step.step_index} contains prohibited code injection patterns.")

        return len(errors) == 0, errors

    @classmethod
    def promote_candidate(
        cls,
        candidate: ProcedureModel,
        validator_notes: str = ""
    ) -> ProcedureModel:
        """Promote a validated procedural candidate to ACTIVE procedural memory."""
        candidate.status = MemoryStatus.ACTIVE
        candidate.confidence = min(1.0, candidate.confidence + 0.05)
        candidate.updated_at = datetime.now(timezone.utc)
        if validator_notes:
            candidate.description += f" [Validated: {validator_notes}]"
        return candidate

    @classmethod
    def create_new_version(
        cls,
        existing: ProcedureModel,
        new_steps: List[ProcedureStep],
        reason: str,
        bump: str = "minor"
    ) -> Tuple[ProcedureModel, ProcedureVersionRecord]:
        """
        Create a new versioned procedure with immutable lineage tracking.
        Does not rewrite historical versions in place.
        """
        # Parse current semver
        parts = [int(p) for p in existing.version.split(".")]
        if bump == "major":
            parts[0] += 1
            parts[1] = 0
            parts[2] = 0
        elif bump == "patch":
            parts[2] += 1
        else:  # minor
            parts[1] += 1
            parts[2] = 0
        new_version_str = ".".join(str(p) for p in parts)

        # Snapshot old version
        snapshot_rec = ProcedureVersionRecord(
            version_id=f"pver_{uuid.uuid4().hex[:12]}",
            procedure_id=existing.procedure_id,
            version=existing.version,
            derived_from=existing.derived_from,
            reason_for_change=existing.reason_for_change,
            snapshot=existing.model_dump(mode="json"),
            created_at=datetime.now(timezone.utc)
        )

        # Update existing to new version
        existing.derived_from = existing.version
        existing.version = new_version_str
        existing.reason_for_change = reason
        existing.steps = new_steps
        existing.required_skills = list(set(s.skill_id for s in new_steps))
        existing.updated_at = datetime.now(timezone.utc)

        return existing, snapshot_rec

    @classmethod
    def record_execution_outcome(
        cls,
        procedure: ProcedureModel,
        success: bool,
        duration_ms: float,
        recovered: bool = False,
        replanned: bool = False
    ) -> ProcedureModel:
        """Update procedure reliability metrics post-execution and detect degradation."""
        m = procedure.metrics
        m.invocation_count += 1
        if success:
            m.success_count += 1
        else:
            m.failure_count += 1

        m.success_rate = round(m.success_count / max(1, m.invocation_count), 4)

        # Update running average duration
        prev_total = m.average_duration_ms * (m.invocation_count - 1)
        m.average_duration_ms = round((prev_total + duration_ms) / m.invocation_count, 2)

        if recovered:
            m.recovery_rate = round(((m.recovery_rate * (m.invocation_count - 1)) + 1.0) / m.invocation_count, 4)
        if replanned:
            m.replan_rate = round(((m.replan_rate * (m.invocation_count - 1)) + 1.0) / m.invocation_count, 4)

        m.last_used_at = datetime.now(timezone.utc)
        procedure.updated_at = datetime.now(timezone.utc)

        # Automatic deprecation if degraded
        if m.invocation_count >= 3 and m.success_rate < cls.DEPRECATION_THRESHOLD:
            procedure.status = MemoryStatus.DEPRECATED
            procedure.reason_for_change = f"Auto-deprecated due to low success rate ({m.success_rate:.2f} < {cls.DEPRECATION_THRESHOLD})."

        return procedure

    @classmethod
    def deprecate_procedure(cls, procedure: ProcedureModel, reason: str) -> ProcedureModel:
        """Manually deprecate an unreliable or obsolete procedure."""
        procedure.status = MemoryStatus.DEPRECATED
        procedure.reason_for_change = reason
        procedure.updated_at = datetime.now(timezone.utc)
        return procedure

    @classmethod
    def translate_to_plan_nodes(
        cls,
        procedure: ProcedureModel,
        parameter_values: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Translate validated procedure steps into DAG PlanNode dictionaries ready for the Workflow Engine.
        Never invokes arbitrary code directly; goes through standard skill runtime channels.
        """
        nodes: List[Dict[str, Any]] = []
        param_vals = parameter_values or {}
        prev_node_id: Optional[str] = None

        for step in sorted(procedure.steps, key=lambda s: s.step_index):
            node_id = f"node_{procedure.procedure_id}_step_{step.step_index}"

            # Merge step parameters with user overrides
            merged_params = dict(step.parameters)
            for k, v in param_vals.items():
                if k in merged_params or any(p.name == k for p in procedure.parameters):
                    merged_params[k] = v

            node_def = {
                "node_id": node_id,
                "skill_id": step.skill_id,
                "action": step.action_name,
                "parameters": merged_params,
                "dependencies": [prev_node_id] if prev_node_id else [],
                "expected_outcome": step.expected_outcome,
                "timeout_seconds": step.timeout_seconds,
                "status": "PENDING"
            }
            nodes.append(node_def)
            prev_node_id = node_id

        return nodes
