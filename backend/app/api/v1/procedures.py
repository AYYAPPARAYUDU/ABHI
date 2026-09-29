"""Procedural Memory & Workflow Reusability API Endpoints (Stage 7.5)."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from backend.app.cognitive.memory.manager import personal_memory_manager
from backend.app.cognitive.memory.models import (
    MemoryStatus,
    ProcedureModel,
    ProcedureStep,
)
from backend.app.cognitive.memory.procedural import ProceduralMemoryEngine

router = APIRouter(prefix="/procedures", tags=["Procedural Memory & Reusable Workflows"])


class SynthesizeProcedureRequest(BaseModel):
    procedure_name: str = Field(..., min_length=1)
    description: str = ""
    trigger_conditions: List[str] = Field(default_factory=list)
    episode_ids: Optional[List[str]] = None
    task_goal_filter: Optional[str] = None


class ValidateProcedureRequest(BaseModel):
    registered_skill_ids: Optional[List[str]] = None


class DeprecateProcedureRequest(BaseModel):
    reason: str = Field(..., min_length=1)


class NewVersionRequest(BaseModel):
    new_steps: List[ProcedureStep]
    reason: str = Field(..., min_length=1)
    version_bump: str = "minor"  # minor, major, patch


class TranslatePlanRequest(BaseModel):
    parameter_values: Dict[str, Any] = Field(default_factory=dict)


@router.get("", response_model=Dict[str, Any])
async def list_procedures(
    status: Optional[str] = None,
    skill_id: Optional[str] = None,
    query: Optional[str] = None
):
    """List stored procedural memory workflows with metrics and filter support."""
    stat_enum = None
    if status:
        try:
            stat_enum = MemoryStatus(status.upper())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    procs = personal_memory_manager.list_procedures(status=stat_enum, skill_id=skill_id)
    if query:
        q_lower = query.lower()
        procs = [
            p for p in procs
            if q_lower in p.name.lower() or q_lower in p.description.lower() or any(q_lower in t.lower() for t in p.trigger_conditions)
        ]

    return {
        "procedures": [p.model_dump(mode="json") for p in procs],
        "total": len(procs)
    }


@router.get("/{procedure_id}", response_model=Dict[str, Any])
async def get_procedure_detail(procedure_id: str):
    """Retrieve detailed procedural memory record."""
    proc = personal_memory_manager.get_procedure(procedure_id)
    if not proc:
        raise HTTPException(status_code=404, detail=f"Procedure '{procedure_id}' not found.")
    return proc.model_dump(mode="json")


@router.post("/synthesize", response_model=Dict[str, Any])
async def synthesize_procedure_from_episodes(request: SynthesizeProcedureRequest):
    """Synthesize a procedural candidate from completed episodic memory logs."""
    # Gather matching episodes
    episodes = []
    if request.episode_ids:
        for mid in request.episode_ids:
            mem = personal_memory_manager.memories.get(mid)
            if mem and mem.memory_type.value == "EPISODIC":
                from backend.app.cognitive.memory.models import EpisodicMemoryModel
                episodes.append(EpisodicMemoryModel(**mem.content))
    elif request.task_goal_filter:
        for mem in personal_memory_manager.memories.values():
            if mem.memory_type.value == "EPISODIC" and request.task_goal_filter.lower() in mem.summary.lower():
                from backend.app.cognitive.memory.models import EpisodicMemoryModel
                episodes.append(EpisodicMemoryModel(**mem.content))

    candidate, err = ProceduralMemoryEngine.create_candidate_from_episodes(
        episodes=episodes,
        procedure_name=request.procedure_name,
        description=request.description,
        trigger_conditions=request.trigger_conditions
    )
    if err:
        raise HTTPException(status_code=400, detail=err)

    personal_memory_manager.register_procedure(candidate)
    return {
        "status": "candidate_created",
        "procedure": candidate.model_dump(mode="json")
    }


@router.post("/{procedure_id}/validate", response_model=Dict[str, Any])
async def validate_procedure(procedure_id: str, request: ValidateProcedureRequest):
    """Validate candidate procedure against registered skill ecosystem and security policies."""
    proc = personal_memory_manager.get_procedure(procedure_id)
    if not proc:
        raise HTTPException(status_code=404, detail=f"Procedure '{procedure_id}' not found.")

    is_valid, errors = ProceduralMemoryEngine.validate_candidate(
        candidate=proc,
        registered_skill_ids=request.registered_skill_ids
    )
    return {
        "procedure_id": procedure_id,
        "is_valid": is_valid,
        "errors": errors
    }


@router.post("/{procedure_id}/promote", response_model=Dict[str, Any])
async def promote_procedure(procedure_id: str, validator_notes: str = ""):
    """Promote a validated procedural candidate to ACTIVE state."""
    proc = personal_memory_manager.get_procedure(procedure_id)
    if not proc:
        raise HTTPException(status_code=404, detail=f"Procedure '{procedure_id}' not found.")

    is_valid, errors = ProceduralMemoryEngine.validate_candidate(proc)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Cannot promote invalid procedure: {', '.join(errors)}")

    promoted = ProceduralMemoryEngine.promote_candidate(proc, validator_notes=validator_notes)
    personal_memory_manager.register_procedure(promoted)
    return {
        "status": "promoted",
        "procedure": promoted.model_dump(mode="json")
    }


@router.post("/{procedure_id}/deprecate", response_model=Dict[str, Any])
async def deprecate_procedure(procedure_id: str, request: DeprecateProcedureRequest):
    """Deprecate an existing procedure with an audit reason."""
    proc = personal_memory_manager.get_procedure(procedure_id)
    if not proc:
        raise HTTPException(status_code=404, detail=f"Procedure '{procedure_id}' not found.")

    deprecated = ProceduralMemoryEngine.deprecate_procedure(proc, reason=request.reason)
    personal_memory_manager.register_procedure(deprecated)
    return {
        "status": "deprecated",
        "procedure": deprecated.model_dump(mode="json")
    }


@router.post("/{procedure_id}/version", response_model=Dict[str, Any])
async def create_procedure_version(procedure_id: str, request: NewVersionRequest):
    """Create a new version of an existing procedure with immutable lineage tracking."""
    proc = personal_memory_manager.get_procedure(procedure_id)
    if not proc:
        raise HTTPException(status_code=404, detail=f"Procedure '{procedure_id}' not found.")

    updated_proc, snapshot_rec = ProceduralMemoryEngine.create_new_version(
        existing=proc,
        new_steps=request.new_steps,
        reason=request.reason,
        bump=request.version_bump
    )
    personal_memory_manager.register_procedure(updated_proc)
    return {
        "status": "versioned",
        "new_version": updated_proc.version,
        "snapshot": snapshot_rec.model_dump(mode="json"),
        "procedure": updated_proc.model_dump(mode="json")
    }


@router.post("/{procedure_id}/translate-plan", response_model=Dict[str, Any])
async def translate_procedure_to_plan(procedure_id: str, request: TranslatePlanRequest):
    """Dry-run translation of procedure into executable plan nodes."""
    proc = personal_memory_manager.get_procedure(procedure_id)
    if not proc:
        raise HTTPException(status_code=404, detail=f"Procedure '{procedure_id}' not found.")

    nodes = ProceduralMemoryEngine.translate_to_plan_nodes(proc, parameter_values=request.parameter_values)
    return {
        "procedure_id": procedure_id,
        "node_count": len(nodes),
        "nodes": nodes
    }
