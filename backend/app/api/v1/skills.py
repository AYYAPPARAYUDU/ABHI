"""Skill Ecosystem & Autonomous Execution REST API Endpoints."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend.app.services.skills import (
    SkillCategory,
    SkillDefinition,
    SkillDiscoveryCandidate,
    SkillInvocation,
    SkillResult,
    SkillRiskLevel,
    skill_discovery,
    skill_registry,
    skill_runtime
)

router = APIRouter(prefix="/skills", tags=["Skills & Autonomous Execution"])


class SkillDiscoveryRequest(BaseModel):
    goal: str = Field(..., min_length=1, description="Goal or intent query to match skills for")
    category: Optional[SkillCategory] = None
    max_risk: Optional[SkillRiskLevel] = None
    max_results: int = Field(default=5, ge=1, le=20)


class SkillExecuteRequest(BaseModel):
    task_id: str
    skill_id: str
    skill_version: str = "1.0.0"
    arguments: Dict[str, Any] = Field(default_factory=dict)
    user_consent_granted: bool = False


class SkillToggleRequest(BaseModel):
    enabled: bool


@router.get("", response_model=Dict[str, Any])
async def list_skills(
    category: Optional[SkillCategory] = None,
    risk_level: Optional[SkillRiskLevel] = None,
    enabled_only: bool = Query(default=True)
):
    """List all registered skills with schemas, risk levels, and version metadata."""
    skills = skill_registry.list_skills(category=category, risk_level=risk_level, enabled_only=enabled_only)
    return {
        "skills": [s.model_dump() for s in skills],
        "total": len(skills)
    }


@router.get("/{skill_id}", response_model=Dict[str, Any])
async def get_skill(skill_id: str, version: Optional[str] = None):
    """Retrieve details and schemas for a specific skill."""
    skill = skill_registry.get(skill_id, version)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found.")
    return skill.model_dump()


@router.post("/discovery", response_model=Dict[str, Any])
async def discover_skills(request: SkillDiscoveryRequest):
    """Discover candidate skills for a natural language goal or action intent."""
    candidates = skill_discovery.discover(
        goal=request.goal,
        category=request.category,
        max_risk=request.max_risk,
        max_results=request.max_results
    )
    return {
        "goal": request.goal,
        "candidates": [c.model_dump() for c in candidates],
        "total_matched": len(candidates)
    }


@router.post("/execute", response_model=Dict[str, Any])
async def execute_skill(request: SkillExecuteRequest):
    """Execute a single skill invocation under strict policy and lease control."""
    import uuid
    invocation = SkillInvocation(
        task_id=request.task_id,
        execution_id=f"exec_{uuid.uuid4().hex[:8]}",
        action_id=f"act_{uuid.uuid4().hex[:8]}",
        skill_id=request.skill_id,
        skill_version=request.skill_version,
        arguments=request.arguments,
        requested_by="OPERATOR_API"
    )

    result = await skill_runtime.execute_skill(
        invocation=invocation,
        user_consent_granted=request.user_consent_granted
    )
    return result.model_dump()


@router.post("/{skill_id}/toggle", response_model=Dict[str, Any])
async def toggle_skill(skill_id: str, request: SkillToggleRequest, version: Optional[str] = None):
    """Enable or disable a skill."""
    if request.enabled:
        ok = skill_registry.enable(skill_id, version)
    else:
        ok = skill_registry.disable(skill_id, version)

    if not ok:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found.")
    return {"skill_id": skill_id, "enabled": request.enabled, "status": "updated"}
