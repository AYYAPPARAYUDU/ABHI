"""Memory Inspection, Search, Retrieval, Conflicts & Management API Endpoints (Stage 7.5)."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from backend.app.cognitive.memory.manager import personal_memory_manager
from backend.app.cognitive.memory.models import (
    DeletionType,
    MemoryContract,
    MemoryRetrievalQuery,
    MemorySource,
    MemoryStatus,
    MemoryType,
    PrivacyClassification,
)
from backend.app.services.memory.repository import memory_repo

router = APIRouter(prefix="/memory", tags=["Segmented Memory & Personal Knowledge"])


class CreateMemoryRequest(BaseModel):
    context_summary: str = Field(..., min_length=1)
    solution_summary: str = Field(..., min_length=1)
    task_id: Optional[str] = None
    category: str = "general"
    outcome: str = "SUCCESS"
    tags: Optional[str] = None
    memory_type: str = "EPISODIC"
    privacy: str = "PERSONAL"


class ProfileUpdateRequest(BaseModel):
    value: Dict[str, Any]


class PreferenceCreateRequest(BaseModel):
    key: str = Field(..., min_length=1)
    value: Any
    category: str = "general"
    source: str = "USER_EXPLICIT"
    confirmed: bool = True
    privacy: str = "PERSONAL"


class ConflictResolutionRequest(BaseModel):
    chosen_candidate: str = Field(..., description="'A' or 'B'")
    notes: str = ""


class DeleteMemoryRequest(BaseModel):
    deletion_type: str = "SOFT_DELETE"  # SOFT_DELETE, HARD_DELETE, PRIVACY_ERASURE


@router.get("", response_model=Dict[str, Any])
async def list_memories(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    category: Optional[str] = None,
    memory_type: Optional[str] = None,
    privacy: Optional[str] = None,
    status: Optional[str] = None,
    query: Optional[str] = None
):
    # Sync records from database repository if present
    db_records = await memory_repo.list_memories_paginated(limit=100, offset=0, category=category, search=query)
    for db_m in db_records:
        if db_m.memory_id not in personal_memory_manager.memories:
            privacy_enum = PrivacyClassification.PERSONAL if db_m.category == "preference" else PrivacyClassification.PRIVATE
            m_type = MemoryType.PREFERENCE if db_m.category == "preference" else MemoryType.EPISODIC
            contract = MemoryContract(
                memory_id=db_m.memory_id,
                memory_type=m_type,
                title=db_m.context_summary,
                summary=db_m.solution_summary,
                content={"context": db_m.context_summary, "solution": db_m.solution_summary, "outcome": db_m.outcome},
                source=MemorySource.USER_EXPLICIT if db_m.category == "preference" else MemorySource.EXECUTION_RESULT,
                confidence=1.0,
                privacy_classification=privacy_enum,
                status=MemoryStatus.ACTIVE,
                tags=db_m.tags.split(",") if db_m.tags else [db_m.category],
                source_reference=db_m.task_id,
                confirmed_by_user=True,
                created_at=db_m.created_at
            )
            personal_memory_manager.memories[db_m.memory_id] = contract

    all_memories = list(personal_memory_manager.memories.values())

    # Filter by memory_type
    if memory_type and memory_type.upper() != "ALL":
        try:
            mtype_enum = MemoryType(memory_type.upper())
            all_memories = [m for m in all_memories if m.memory_type == mtype_enum]
        except ValueError:
            pass

    # Filter by privacy
    if privacy and privacy.upper() != "ALL":
        try:
            priv_enum = PrivacyClassification(privacy.upper())
            all_memories = [m for m in all_memories if m.privacy_classification == priv_enum]
        except ValueError:
            pass

    # Filter by status
    if status and status.upper() != "ALL":
        try:
            stat_enum = MemoryStatus(status.upper())
            all_memories = [m for m in all_memories if m.status == stat_enum]
        except ValueError:
            pass

    # Filter by category
    if category and category.lower() != "all":
        all_memories = [
            m for m in all_memories
            if category.lower() in [t.lower() for t in m.tags] or category.lower() in m.summary.lower()
        ]

    # Filter by query
    if query:
        q_lower = query.lower()
        all_memories = [
            m for m in all_memories
            if q_lower in m.title.lower() or q_lower in m.summary.lower() or any(q_lower in t.lower() for t in m.tags)
        ]

    # Sort by created_at descending so newest memories are returned first
    all_memories.sort(key=lambda m: m.created_at.timestamp() if m.created_at else 0, reverse=True)
    total = len(all_memories)
    sliced = all_memories[offset:offset + limit]

    memory_list = []
    for m in sliced:
        privacy_class = "task_derived" if m.source_reference else ("user_provided" if m.memory_type == MemoryType.PREFERENCE else "system")
        memory_list.append({
            "memory_id": m.memory_id,
            "memory_type": m.memory_type.value,
            "title": m.title,
            "task_id": m.source_reference,
            "category": m.tags[1] if len(m.tags) > 1 else "general",
            "context_summary": m.title,
            "solution_summary": m.summary,
            "outcome": m.content.get("outcome", "SUCCESS") if isinstance(m.content, dict) else "SUCCESS",
            "tags": m.tags,
            "confidence": m.confidence,
            "privacy_class": privacy_class,
            "privacy_classification": m.privacy_classification.value,
            "status": m.status.value,
            "source": m.source.value,
            "confirmed_by_user": m.confirmed_by_user,
            "created_at": m.created_at.isoformat() if m.created_at else None,
            "updated_at": m.updated_at.isoformat() if m.updated_at else None
        })

    return {
        "memories": memory_list,
        "total": total,
        "limit": limit,
        "offset": offset,
        "category_filter": category,
        "categories": ["general", "browser", "desktop", "preference", "workflow", "system", "editor", "filesystem"]
    }


@router.get("/conflicts", response_model=List[Dict[str, Any]])
async def list_conflicts():
    """List detected memory contradictions and candidate values."""
    return [c.model_dump(mode="json") for c in personal_memory_manager.conflicts.values()]


@router.post("/conflicts/{conflict_id}/resolve", response_model=Dict[str, Any])
async def resolve_conflict(conflict_id: str, request: ConflictResolutionRequest):
    """Resolve a contradiction by selecting Candidate A or B."""
    success = personal_memory_manager.resolve_conflict(
        conflict_id=conflict_id,
        chosen_candidate=request.chosen_candidate.upper(),
        resolution_notes=request.notes
    )
    if not success:
        raise HTTPException(status_code=404, detail=f"Conflict '{conflict_id}' not found.")
    return {"status": "resolved", "conflict_id": conflict_id, "chosen": request.chosen_candidate}


@router.post("/retrieve", response_model=Dict[str, Any])
async def retrieve_task_context(query: MemoryRetrievalQuery):
    """Task-aware multi-factor memory retrieval with multilingual query mapping."""
    res = personal_memory_manager.retrieve_task_context(query)
    return res.model_dump(mode="json")


@router.post("/sweep", response_model=Dict[str, Any])
async def sweep_decayed_memories():
    """Trigger background decay and expiration sweep."""
    stale_count = personal_memory_manager.sweep_expired_and_decayed_memories()
    return {"status": "completed", "stale_memories_marked": stale_count}


@router.get("/working/{task_id}", response_model=Dict[str, Any])
async def get_working_memory(task_id: str):
    """Inspect active ephemeral working memory for a task."""
    wm = personal_memory_manager.get_working_memory(task_id)
    if not wm:
        raise HTTPException(status_code=404, detail=f"No active working memory for task '{task_id}'.")
    return wm.model_dump(mode="json")


@router.get("/audit", response_model=List[Dict[str, Any]])
async def get_memory_audit_logs(limit: int = 50):
    """Retrieve memory audit history."""
    entries = personal_memory_manager.audit_log[-limit:]
    return [e.model_dump(mode="json") for e in reversed(entries)]


@router.get("/profiles/all", response_model=List[Dict[str, Any]])
async def list_user_profiles():
    """List all stored user preferences and profile parameters."""
    profiles = await memory_repo.list_all_user_profiles()
    return [
        {
            "key": p.key,
            "value": p.value_json,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None
        }
        for p in profiles
    ]


@router.get("/profiles/{key}", response_model=Dict[str, Any])
async def get_user_profile(key: str):
    """Retrieve specific user profile preference key."""
    val = await memory_repo.get_user_profile(key)
    if val is None:
        raise HTTPException(status_code=404, detail=f"Profile key '{key}' not found.")
    return {"key": key, "value": val}


@router.post("/profiles/{key}", response_model=Dict[str, Any])
async def set_user_profile(key: str, request: ProfileUpdateRequest):
    """Set or update user preference key."""
    rec = await memory_repo.set_user_profile(key, request.value)
    # Sync with memory manager
    personal_memory_manager.set_preference(key=key, value=request.value, category="profile")
    return {
        "key": rec.key,
        "value": rec.value_json,
        "updated_at": rec.updated_at.isoformat() if rec.updated_at else None
    }


@router.get("/{memory_id}", response_model=Dict[str, Any])
async def get_memory_detail(memory_id: str):
    """Retrieve detailed memory contract record."""
    mem = personal_memory_manager.memories.get(memory_id)
    if mem:
        if mem.status == MemoryStatus.DELETED:
            raise HTTPException(status_code=404, detail=f"Memory '{memory_id}' not found or deleted.")
    if not mem:
        # Fallback to SQLite repo
        m = await memory_repo.get_episodic_memory(memory_id)
        if not m:
            raise HTTPException(status_code=404, detail=f"Memory '{memory_id}' not found.")
        privacy_class = "task_derived" if m.task_id else ("user_provided" if m.category == "preference" else "system")
        return {
            "memory_id": m.memory_id,
            "memory_type": "EPISODIC",
            "title": m.context_summary,
            "task_id": m.task_id,
            "category": m.category,
            "context_summary": m.context_summary,
            "solution_summary": m.solution_summary,
            "outcome": m.outcome,
            "tags": m.tags.split(",") if m.tags else [],
            "confidence": 1.0,
            "privacy_class": privacy_class,
            "privacy_classification": "PERSONAL",
            "status": "ACTIVE",
            "source": "EXECUTION_RESULT",
            "created_at": m.created_at.isoformat() if m.created_at else None
        }

    privacy_class = "task_derived" if mem.source_reference else ("user_provided" if mem.memory_type == MemoryType.PREFERENCE else "system")
    return {
        "memory_id": mem.memory_id,
        "memory_type": mem.memory_type.value,
        "title": mem.title,
        "task_id": mem.source_reference,
        "category": mem.tags[1] if len(mem.tags) > 1 else "general",
        "context_summary": mem.title,
        "solution_summary": mem.summary,
        "content": mem.content,
        "outcome": mem.content.get("outcome", "SUCCESS") if isinstance(mem.content, dict) else "SUCCESS",
        "tags": mem.tags,
        "confidence": mem.confidence,
        "privacy_class": privacy_class,
        "privacy_classification": mem.privacy_classification.value,
        "status": mem.status.value,
        "source": mem.source.value,
        "confirmed_by_user": mem.confirmed_by_user,
        "created_at": mem.created_at.isoformat() if mem.created_at else None,
        "updated_at": mem.updated_at.isoformat() if mem.updated_at else None
    }


@router.post("", response_model=Dict[str, Any])
async def create_episodic_memory(request: CreateMemoryRequest):
    """Persist new episodic memory record."""
    rec = await memory_repo.save_episodic_memory(
        context_summary=request.context_summary,
        solution_summary=request.solution_summary,
        task_id=request.task_id,
        category=request.category,
        outcome=request.outcome,
        tags=request.tags
    )
    # Sync with memory manager
    skill_seq = request.tags.split(",") if request.tags else []
    personal_memory_manager.record_episodic_experience(
        goal_summary=request.context_summary,
        plan_summary=request.solution_summary,
        skill_sequence=skill_seq,
        outcome=request.outcome,
        task_id=request.task_id
    )

    return {
        "status": "created",
        "memory_id": rec.memory_id,
        "task_id": rec.task_id,
        "category": rec.category,
        "context_summary": rec.context_summary,
        "solution_summary": rec.solution_summary,
        "outcome": rec.outcome,
        "tags": rec.tags.split(",") if rec.tags else [],
        "created_at": rec.created_at.isoformat() if rec.created_at else None
    }


@router.post("/{memory_id}/confirm", response_model=Dict[str, Any])
async def confirm_memory(memory_id: str):
    """Operator confirmation of a memory candidate."""
    confirmed = personal_memory_manager.confirm_memory(memory_id)
    if not confirmed:
        raise HTTPException(status_code=404, detail=f"Memory '{memory_id}' not found.")
    return {"status": "confirmed", "memory": confirmed.model_dump(mode="json")}


@router.post("/{memory_id}/reject", response_model=Dict[str, Any])
async def reject_memory(memory_id: str, reason: str = ""):
    """Operator rejection of a memory candidate."""
    rejected = personal_memory_manager.reject_memory(memory_id, reason=reason)
    if not rejected:
        raise HTTPException(status_code=404, detail=f"Memory '{memory_id}' not found.")
    return {"status": "rejected", "memory": rejected.model_dump(mode="json")}


@router.delete("/{memory_id}", response_model=Dict[str, Any])
async def delete_memory_endpoint(
    memory_id: str,
    deletion_type: str = Query(default="SOFT_DELETE")
):
    """Delete memory with explicit deletion semantics (SOFT_DELETE, HARD_DELETE, PRIVACY_ERASURE)."""
    try:
        del_enum = DeletionType(deletion_type.upper())
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid deletion type: {deletion_type}")

    manager_success = personal_memory_manager.delete_memory(memory_id, deletion_type=del_enum)
    repo_success = await memory_repo.delete_episodic_memory(memory_id)

    if not manager_success and not repo_success:
        raise HTTPException(status_code=404, detail=f"Memory '{memory_id}' not found or already deleted.")

    return {"status": "deleted", "memory_id": memory_id, "deletion_type": del_enum.value}
