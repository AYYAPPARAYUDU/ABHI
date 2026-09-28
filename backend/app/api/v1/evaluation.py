"""Evaluation & LLM Evolution Lab REST API Endpoints for Phase 6.7."""

from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, List
from backend.app.evaluation.models import (
    RunEvaluationRequest,
    CandidateCreateRequest,
    PromoteCandidateRequest,
    RollbackRequest,
    ResearchIngestRequest,
    ResearchQuarantineRequest,
    EvaluationRun,
    EvaluationTimelineEvent,
    ResearchPaper,
    ModelRecord,
    ExperimentRecord
)
from backend.app.evaluation.engine import evaluation_engine
from backend.app.evaluation.registry import model_registry
from backend.app.evaluation.research import research_service
from backend.app.evaluation.runners import runner_manager
from backend.app.evaluation.scheduler import evaluation_scheduler

router = APIRouter(prefix="/evaluation", tags=["Evaluation & LLM Evolution Lab"])


@router.get("/status")
async def get_evaluation_status() -> Dict[str, Any]:
    """Get overall evaluation subsystem status, production model, and scheduler health."""
    prod_model = model_registry.get_production_model()
    runs = evaluation_engine.list_runs()
    latest_run = runs[-1] if runs else None
    
    return {
        "status": "OPERATIONAL",
        "production_model": prod_model,
        "total_evaluation_runs": len(runs),
        "latest_run": latest_run,
        "scheduler": evaluation_scheduler.get_status(),
        "total_research_papers": len(research_service.list_research()),
        "total_models": len(model_registry.list_models())
    }


@router.get("/runs", response_model=List[EvaluationRun])
async def list_evaluation_runs() -> List[EvaluationRun]:
    """List all historical evaluation runs."""
    return evaluation_engine.list_runs()


@router.get("/runs/{run_id}", response_model=EvaluationRun)
async def get_evaluation_run(run_id: str) -> EvaluationRun:
    """Retrieve detailed evaluation run by run_id."""
    run = evaluation_engine.get_run(run_id)
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Run {run_id} not found")
    return run


@router.get("/timeline", response_model=List[EvaluationTimelineEvent])
async def get_evaluation_timeline() -> List[EvaluationTimelineEvent]:
    """Retrieve chronological timeline events for frontend replay engine."""
    return evaluation_engine.get_timeline()


@router.get("/models", response_model=List[ModelRecord])
async def list_models() -> List[ModelRecord]:
    """List all models registered in the versioned model registry."""
    return model_registry.list_models()


@router.get("/benchmarks")
async def list_benchmarks() -> List[Dict[str, Any]]:
    """List all available and optional benchmark adapters."""
    return runner_manager.list_adapters_status()


@router.get("/research", response_model=List[ResearchPaper])
async def list_research_papers() -> List[ResearchPaper]:
    """List discovered and ingested research papers."""
    return research_service.list_research()


@router.get("/research/{source_id}", response_model=ResearchPaper)
async def get_research_paper(source_id: str) -> ResearchPaper:
    """Get detailed research paper provenance and metadata."""
    paper = research_service.get_research_item(source_id)
    if not paper:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Research item {source_id} not found")
    return paper


@router.post("/research/ingest")
async def ingest_research_paper(req: ResearchIngestRequest) -> Dict[str, Any]:
    """Approve and ingest verified research paper into local knowledge vector store."""
    ok, message = research_service.ingest_paper_to_knowledge(req.source_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return {"success": True, "message": message}


@router.post("/research/quarantine")
async def quarantine_research_paper(req: ResearchQuarantineRequest) -> Dict[str, Any]:
    """Quarantine unverified or adversarial research paper."""
    ok, message = research_service.quarantine_paper(req.source_id, req.reason)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return {"success": True, "message": message}


@router.get("/experiments", response_model=List[ExperimentRecord])
async def list_experiments() -> List[ExperimentRecord]:
    """List candidate evolution experiments."""
    return evaluation_engine.list_experiments()


@router.post("/run")
async def trigger_evaluation_run(req: RunEvaluationRequest) -> Dict[str, Any]:
    """Trigger a local evaluation run (QUICK_DAILY, STANDARD_DAILY, DEEP_MANUAL)."""
    ok, run = await evaluation_engine.execute_daily_evaluation(
        schedule_type=req.schedule_type,
        model_id=req.model_id
    )
    if not ok:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Evaluation run failed")
    return {"success": True, "run": run}


@router.post("/candidate", response_model=ExperimentRecord)
async def create_candidate_experiment(req: CandidateCreateRequest) -> ExperimentRecord:
    """Register a new candidate model experiment."""
    return evaluation_engine.create_experiment(
        hypothesis=req.hypothesis,
        candidate_type=req.candidate_type,
        candidate_model_name=req.candidate_model_name,
        candidate_version=req.candidate_version,
        quantization=req.quantization or "Q4_K_M"
    )


@router.post("/promote")
async def promote_candidate(req: PromoteCandidateRequest) -> Dict[str, Any]:
    """Promote a candidate model to production after passing regression gates."""
    ok, message = model_registry.promote_candidate(
        candidate_id=req.candidate_id,
        override_reason=req.override_reason
    )
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return {"success": True, "message": message}


@router.post("/rollback")
async def rollback_model(req: RollbackRequest) -> Dict[str, Any]:
    """Instant rollback to previous known-good production model."""
    ok, message = model_registry.rollback(target_model_id=req.target_model_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return {"success": True, "message": message}
