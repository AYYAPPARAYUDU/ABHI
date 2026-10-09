"""FastAPI Router for Business Sectors, Autonomous Operations & Revenue Integrity (Phase 9 Stage 3)."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from backend.app.business.models import (
    BusinessApproval,
    BusinessExecuteStepRequest,
    BusinessOpportunity,
    BusinessProject,
    BusinessProjectCreateRequest,
    BusinessProjectUpdateRequest,
    BusinessSector,
    FinancialSummaryResponse,
    OpportunityEvaluateRequest,
)
from backend.app.business.service import business_service

router = APIRouter(prefix="/business", tags=["Business Sectors & Operations"])


@router.get("/sectors", response_model=List[BusinessSector])
async def list_sectors() -> List[BusinessSector]:
    """List all 6 spatial business sectors with active project indicators."""
    return business_service.list_sectors()


@router.get("/sectors/{sector_id}", response_model=BusinessSector)
async def get_sector(sector_id: str) -> BusinessSector:
    """Retrieve details for a specific 3D business sector."""
    sector = business_service.get_sector(sector_id)
    if not sector:
        raise HTTPException(status_code=404, detail=f"Sector '{sector_id}' not found.")
    return sector


@router.get("/projects", response_model=List[BusinessProject])
async def list_projects(sector_id: Optional[str] = Query(None, description="Filter by sector ID")) -> List[BusinessProject]:
    """List all persisted business projects."""
    return business_service.list_projects(sector_id=sector_id)


@router.get("/projects/{project_id}", response_model=BusinessProject)
async def get_project(project_id: str) -> BusinessProject:
    """Retrieve full project specification, milestones, tasks, and ledger."""
    project = business_service.get_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")
    return project


@router.post("/projects", response_model=BusinessProject, status_code=status.HTTP_201_CREATED)
async def create_project(req: BusinessProjectCreateRequest) -> BusinessProject:
    """Create a new business project with configured autonomy boundary."""
    try:
        return business_service.create_project(
            sector_id=req.sector_id,
            name=req.name,
            objective=req.objective,
            autonomy_level=req.autonomy_level,
            autopilot_mode=req.autopilot_mode,
            budget_limit_usd=req.budget_limit_usd,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/projects/{project_id}", response_model=BusinessProject)
async def update_project(project_id: str, req: BusinessProjectUpdateRequest) -> BusinessProject:
    """Update project settings, autonomy level, or budget."""
    updated = business_service.update_project(
        project_id=project_id,
        name=req.name,
        objective=req.objective,
        autonomy_level=req.autonomy_level,
        autopilot_mode=req.autopilot_mode,
        status=req.status,
        budget_limit_usd=req.budget_limit_usd,
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")
    return updated


@router.post("/projects/{project_id}/execute-step")
async def execute_step(project_id: str, req: BusinessExecuteStepRequest) -> Dict[str, Any]:
    """Autonomously execute the next approved milestone or task within safety policy."""
    success, message, data = business_service.execute_next_step(
        project_id=project_id,
        override_stop_conditions=req.override_stop_conditions,
    )
    return {
        "success": success,
        "message": message,
        "data": data,
    }


@router.post("/projects/{project_id}/approvals/{approval_id}/resolve")
async def resolve_approval(project_id: str, approval_id: str, payload: Dict[str, bool]) -> Dict[str, Any]:
    """Approve or reject a policy-gated action."""
    approve = payload.get("approve", False)
    success, message = business_service.resolve_approval(
        project_id=project_id,
        approval_id=approval_id,
        approve=approve,
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message}


@router.get("/opportunities", response_model=List[BusinessOpportunity])
async def list_opportunities() -> List[BusinessOpportunity]:
    """List researched business opportunities."""
    return business_service.list_opportunities()


@router.post("/opportunities/evaluate", response_model=BusinessOpportunity)
async def evaluate_opportunity(req: OpportunityEvaluateRequest) -> BusinessOpportunity:
    """Evaluate and score a business opportunity using explicit multi-dimensional criteria."""
    try:
        return business_service.evaluate_opportunity(
            sector_id=req.sector_id,
            title=req.title,
            concept_description=req.concept_description,
            target_audience=req.target_audience,
            target_pricing_usd=req.target_pricing_usd,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/financials/summary", response_model=FinancialSummaryResponse)
@router.get("/financial-summary", response_model=FinancialSummaryResponse)
async def get_financial_summary() -> FinancialSummaryResponse:
    """Retrieve global financial summary with verified provenance classification."""
    return business_service.get_financial_summary()
