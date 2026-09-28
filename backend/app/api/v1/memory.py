"""Memory Inspection, Search & Management API Endpoints."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from backend.app.services.memory.repository import memory_repo

router = APIRouter(prefix="/memory", tags=["Segmented Memory & User Profiles"])


class CreateMemoryRequest(BaseModel):
    context_summary: str = Field(..., min_length=1)
    solution_summary: str = Field(..., min_length=1)
    task_id: Optional[str] = None
    category: str = "general"
    outcome: str = "SUCCESS"
    tags: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    value: Dict[str, Any]


@router.get("", response_model=Dict[str, Any])
async def list_memories(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    category: Optional[str] = None,
    query: Optional[str] = None
):
    """List episodic memories with pagination, category filtering, and semantic/keyword search."""
    memories = await memory_repo.list_memories_paginated(
        limit=limit,
        offset=offset,
        category=category,
        search=query
    )
    total = await memory_repo.count_memories(category=category, search=query)

    memory_list = []
    for m in memories:
        # Determine classification / privacy tier
        privacy_class = "task_derived" if m.task_id else ("user_provided" if m.category == "preference" else "system")
        memory_list.append({
            "memory_id": m.memory_id,
            "task_id": m.task_id,
            "category": m.category,
            "context_summary": m.context_summary,
            "solution_summary": m.solution_summary,
            "outcome": m.outcome,
            "tags": m.tags.split(",") if m.tags else [],
            "privacy_class": privacy_class,
            "created_at": m.created_at.isoformat() if m.created_at else None
        })

    return {
        "memories": memory_list,
        "total": total,
        "limit": limit,
        "offset": offset,
        "category_filter": category,
        "categories": ["general", "browser", "desktop", "preference", "workflow", "system"]
    }


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
    return {
        "key": rec.key,
        "value": rec.value_json,
        "updated_at": rec.updated_at.isoformat() if rec.updated_at else None
    }


@router.get("/{memory_id}", response_model=Dict[str, Any])
async def get_memory_detail(memory_id: str):
    """Retrieve detailed episodic memory record."""
    m = await memory_repo.get_episodic_memory(memory_id)
    if not m:
        raise HTTPException(status_code=404, detail=f"Memory '{memory_id}' not found.")

    privacy_class = "task_derived" if m.task_id else ("user_provided" if m.category == "preference" else "system")
    return {
        "memory_id": m.memory_id,
        "task_id": m.task_id,
        "category": m.category,
        "context_summary": m.context_summary,
        "solution_summary": m.solution_summary,
        "outcome": m.outcome,
        "tags": m.tags.split(",") if m.tags else [],
        "privacy_class": privacy_class,
        "created_at": m.created_at.isoformat() if m.created_at else None
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


@router.delete("/{memory_id}", response_model=Dict[str, Any])
async def forget_memory(memory_id: str):
    """Delete / forget an episodic memory record."""
    success = await memory_repo.delete_episodic_memory(memory_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Memory '{memory_id}' not found or already deleted.")
    return {"status": "deleted", "memory_id": memory_id}
