"""Evaluation & LLM Evolution Lab REST API Endpoints for Phase 6.7, 6.8 & 6.9."""

from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, List, Optional
from backend.app.evaluation.models import (
    RunEvaluationRequest,
    CandidateCreateRequest,
    LegacyCandidateCreateRequest,
    EvaluateCandidateRequest,
    StartTrainingRequest,
    PromoteCandidateRequest,
    RollbackRequest,
    ResearchIngestRequest,
    ResearchQuarantineRequest,
    EvaluationRun,
    EvaluationTimelineEvent,
    ResearchPaper,
    ModelRecord,
    ExperimentRecord,
    CandidateRecord,
    ModelLineageNode,
    LockedBaselineContract,
    TrainingJobStatus,
    HeadToHeadComparison,
    CandidateType
)
from backend.app.evaluation.engine import evaluation_engine
from backend.app.evaluation.registry import model_registry
from backend.app.evaluation.research import research_service
from backend.app.evaluation.runners import runner_manager
from backend.app.evaluation.scheduler import evaluation_scheduler
from backend.app.evaluation.candidate_manager import candidate_manager
from backend.app.evaluation.training_service import training_service

router = APIRouter(prefix="/evaluation", tags=["Evaluation & LLM Evolution Lab"])


@router.get("/status")
async def get_evaluation_status() -> Dict[str, Any]:
    """Get overall evaluation subsystem status, production model, locked baseline, and scheduler health."""
    prod_model = model_registry.get_production_model()
    runs = evaluation_engine.list_runs()
    latest_run = runs[-1] if runs else None
    baseline = candidate_manager.get_locked_baseline()
    
    return {
        "status": "OPERATIONAL",
        "production_model": prod_model,
        "locked_baseline": baseline,
        "total_evaluation_runs": len(runs),
        "latest_run": latest_run,
        "scheduler": evaluation_scheduler.get_status(),
        "total_research_papers": len(research_service.list_research()),
        "total_models": len(model_registry.list_models()),
        "total_candidates": len(candidate_manager.list_candidates())
    }


@router.get("/locked-baseline", response_model=LockedBaselineContract)
async def get_locked_baseline() -> LockedBaselineContract:
    """Retrieve the authoritative locked baseline contract (BASELINE_V1_LOCKED)."""
    return candidate_manager.get_locked_baseline()


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


@router.get("/lineage", response_model=List[ModelLineageNode])
async def get_model_lineage() -> List[ModelLineageNode]:
    """Retrieve model lineage graph nodes for 3D/2D interactive visualization."""
    return candidate_manager.get_model_lineage()


@router.get("/candidates", response_model=List[CandidateRecord])
async def list_candidates() -> List[CandidateRecord]:
    """List all candidate adaptation and model improvement records."""
    return candidate_manager.list_candidates()


@router.get("/candidates/{candidate_id}", response_model=CandidateRecord)
async def get_candidate(candidate_id: str) -> CandidateRecord:
    """Get specific candidate record by ID."""
    cand = candidate_manager.get_candidate(candidate_id)
    if not cand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Candidate {candidate_id} not found")
    return cand


@router.post("/candidates", response_model=CandidateRecord)
async def create_candidate(req: CandidateCreateRequest) -> CandidateRecord:
    """Register a new candidate adaptation record with a measurable hypothesis."""
    return candidate_manager.create_candidate(
        name=req.candidate_name,
        hypothesis_title=req.hypothesis_title,
        hypothesis_description=req.hypothesis_description,
        candidate_type=req.candidate_type,
        target_capability=req.target_capability,
        baseline_score=req.baseline_score,
        target_score=req.target_score,
        research_source_id=req.research_source_id,
        configuration_overrides=req.configuration_overrides
    )


@router.post("/candidate", response_model=ExperimentRecord)
async def create_candidate_legacy(req: LegacyCandidateCreateRequest) -> ExperimentRecord:
    """Legacy endpoint for candidate experiment creation."""
    return evaluation_engine.create_experiment(
        hypothesis=req.hypothesis,
        candidate_type=req.candidate_type,
        candidate_model_name=req.candidate_model_name,
        candidate_version=req.candidate_version,
        quantization=req.quantization or "Q4_K_M"
    )


@router.get("/training/capability")
async def get_training_capability() -> Dict[str, Any]:
    """Retrieve authoritative training capability status."""
    return {
        "status": "NOT_AVAILABLE",
        "full_fine_tuning_supported": False,
        "adapter_experimentation_supported": True,
        "reason": "Local single-GPU / CPU runtime configured for adapter experimentation. Full distributed backprop neural fine-tuning is NOT_AVAILABLE locally.",
        "supported_experiments": ["PROMPT_TUNING", "RAG_INDEX_REBUILD", "LORA_ADAPTER_SIMULATION"],
    }


@router.post("/candidates/train")
async def start_candidate_training(req: StartTrainingRequest) -> Dict[str, Any]:
    """Start isolated parameter adaptation or prompt/RAG index preparation job."""
    cand = candidate_manager.get_candidate(req.candidate_id)
    if not cand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Candidate {req.candidate_id} not found")

    ok, msg, job = await training_service.start_training_job(
        candidate=cand,
        epochs=req.epochs,
        batch_size=req.batch_size,
        learning_rate=req.learning_rate
    )
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return {"success": True, "message": msg, "job": job}


@router.get("/candidates/training/{job_id}", response_model=TrainingJobStatus)
async def get_training_status(job_id: str) -> TrainingJobStatus:
    """Get live training job status and resource metrics."""
    job = training_service.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found")
    return job


@router.post("/candidates/training/{job_id}/cancel")
async def cancel_training_job(job_id: str) -> Dict[str, Any]:
    """Cancel an active training job safely."""
    ok, msg = training_service.cancel_training(job_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return {"success": True, "message": msg}


@router.post("/candidates/evaluate")
async def evaluate_candidate(req: EvaluateCandidateRequest) -> Dict[str, Any]:
    """Execute head-to-head evaluation against local model and locked baseline."""
    ok, msg, comparison = await candidate_manager.evaluate_candidate_head_to_head(
        candidate_id=req.candidate_id,
        schedule_type=req.schedule_type
    )
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return {"success": True, "message": msg, "comparison": comparison}


@router.post("/candidates/promote")
@router.post("/promote")
async def promote_candidate(req: PromoteCandidateRequest) -> Dict[str, Any]:
    """Promote a passed candidate model to production."""
    if candidate_manager.get_candidate(req.candidate_id):
        ok, msg = candidate_manager.promote_candidate(
            candidate_id=req.candidate_id,
            override_reason=req.override_reason
        )
    else:
        ok, msg = model_registry.promote_candidate(
            candidate_id=req.candidate_id,
            override_reason=req.override_reason
        )
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return {"success": True, "message": msg}


@router.get("/benchmarks")
async def list_benchmarks() -> List[Dict[str, Any]]:
    """List all available and optional benchmark adapters."""
    return runner_manager.list_adapters_status()


@router.get("/resources")
async def get_resource_headroom() -> Dict[str, Any]:
    """Get real-time CPU, RAM, and GPU VRAM headroom for candidate experimentation."""
    ok, status_msg, metrics = training_service.check_hardware_budget(CandidateType.ADAPTER_CANDIDATE)
    return {
        "status": status_msg,
        "is_training_safe": ok,
        "metrics": metrics
    }


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


@router.post("/rollback")
async def rollback_model(req: RollbackRequest) -> Dict[str, Any]:
    """Instant rollback to previous known-good production model."""
    ok, message = model_registry.rollback(target_model_id=req.target_model_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return {"success": True, "message": message}
