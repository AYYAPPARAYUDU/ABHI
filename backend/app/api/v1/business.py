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
from backend.app.business.treasury import sovereign_treasury
from backend.app.business.autonomous_ceo import autonomous_business_ceo

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


# =========================================================================
# TREASURY & COMMERCIAL SETTLEMENT (MAMU OFFICIAL SBI CHANNELS)
# =========================================================================

@router.get("/treasury/profile")
async def get_treasury_profile() -> Dict[str, Any]:
    """Retrieve Mamu's official State Bank of India settlement profile."""
    return sovereign_treasury.get_settlement_profile()


@router.get("/treasury/overview")
async def get_treasury_overview() -> Dict[str, Any]:
    """Retrieve cumulative settled revenue, pending invoices, and banking ledger."""
    return sovereign_treasury.get_treasury_overview()


@router.get("/treasury/invoices")
async def list_treasury_invoices(limit: int = Query(50, ge=1, le=200)) -> List[Dict[str, Any]]:
    """List commercial tax invoices with deliverable proofs and UPI links."""
    return sovereign_treasury.list_invoices(limit=limit)


@router.post("/treasury/invoices")
async def create_treasury_invoice(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Generate and record a commercial invoice settled directly to Mamu's SBI account."""
    client_name = payload.get("client_name", "Enterprise Client")
    service_description = payload.get("service_description", "Autonomous AI Engineering & System Optimization")
    amount_inr = float(payload.get("amount_inr", 25000.0))
    client_email = payload.get("client_email")
    client_org = payload.get("client_organization")
    service_ref = payload.get("service_ref")
    deliverable_hash = payload.get("deliverable_hash")
    mark_as_settled = payload.get("mark_as_settled", False)

    invoice = sovereign_treasury.generate_invoice(
        client_name=client_name,
        service_description=service_description,
        amount_inr=amount_inr,
        client_email=client_email,
        client_org=client_org,
        service_ref=service_ref,
        deliverable_hash=deliverable_hash,
        mark_as_settled=mark_as_settled,
    )
    from dataclasses import asdict
    return asdict(invoice)


# =========================================================================
# AUTONOMOUS CEO REVENUE ENGINE
# =========================================================================

@router.post("/ceo/revenue-cycle")
async def run_master_revenue_cycle() -> Dict[str, Any]:
    """Trigger the master autonomous CEO revenue generation cycle across all commercial streams."""
    return await autonomous_business_ceo.run_master_revenue_cycle()


@router.post("/ceo/audit-bounty")
async def run_audit_bounty(payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Execute Stream A: AST Static Analysis Code Audit & Bug Bounty fulfillment."""
    target_path = payload.get("target_path", "backend/app/automation/desktop/os_control_engine.py") if payload else "backend/app/automation/desktop/os_control_engine.py"
    client_name = payload.get("client_name", "FinTech Systems Ltd") if payload else "FinTech Systems Ltd"
    fee_inr = float(payload.get("service_fee_inr", 28500.0)) if payload else 28500.0

    return await autonomous_business_ceo.execute_code_audit_order(
        target_code_or_path=target_path,
        client_name=client_name,
        service_fee_inr=fee_inr,
    )


@router.post("/ceo/content-monetization")
async def run_content_monetization(payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Execute Stream B: Programmatic Video Script & Media Sponsorship fulfillment."""
    topic = payload.get("topic", "Autonomous Windows OS Agents with Quantum Swarm") if payload else "Autonomous Windows OS Agents with Quantum Swarm"
    sponsor = payload.get("sponsor_name", "Apex Developer Tools Inc") if payload else "Apex Developer Tools Inc"
    payout_inr = float(payload.get("payout_inr", 42000.0)) if payload else 42000.0

    return await autonomous_business_ceo.execute_content_monetization_cycle(
        topic=topic,
        sponsor_name=sponsor,
        payout_inr=payout_inr,
    )


@router.post("/ceo/b2b-outreach")
async def run_b2b_outreach(payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Execute Stream C: B2B Automated Enterprise Lead Generation and Proposal fulfillment."""
    industry = payload.get("target_industry", "E-Commerce & Digital Logistics") if payload else "E-Commerce & Digital Logistics"
    contract_val = float(payload.get("contract_value_inr", 75000.0)) if payload else 75000.0

    return await autonomous_business_ceo.execute_b2b_outreach_pipeline(
        target_industry=industry,
        contract_value_inr=contract_val,
    )

