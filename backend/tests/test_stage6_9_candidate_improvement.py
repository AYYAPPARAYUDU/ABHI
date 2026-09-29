"""Comprehensive Tests for Phase 6 Stage 6.9 Controlled Model Improvement & Candidate Adaptation Lab."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.evaluation.models import (
    CandidateType,
    CandidateStatus,
    ContaminationStatus,
    RegressionSeverity
)
from backend.app.evaluation.candidate_manager import candidate_manager
from backend.app.evaluation.training_service import training_service
from backend.app.evaluation.registry import model_registry


@pytest.mark.asyncio
async def test_locked_baseline_integrity():
    """Verify BASELINE_V1_LOCKED maintains mathematical consistency and throughput definitions."""
    baseline = candidate_manager.get_locked_baseline()
    assert baseline.baseline_id == "BASELINE_V1_LOCKED"
    assert baseline.model_id == "qwen3:8b"
    assert baseline.unweighted_case_mean == 0.9583
    assert baseline.weighted_10_pillar_composite == 0.917
    assert baseline.steady_state_tps == 28.4
    assert baseline.end_to_end_latency_ms_per_token == 41.2
    assert baseline.aggregation_formula == "FORMULA_V1_WEIGHTED_10_PILLAR"
    assert baseline.throughput_methodology == "ThroughputMethodologyV1"
    assert sum(baseline.weights_spec.values()) == pytest.approx(1.0, 0.001)


@pytest.mark.asyncio
async def test_candidate_creation_and_lifecycle():
    """Test candidate creation, measurable hypothesis tracking, and dataset association."""
    cand = candidate_manager.create_candidate(
        name="Test Indic Prompt V2",
        hypothesis_title="Enhanced Hindi Intent Mapping",
        hypothesis_description="Refined few-shot examples for Hindi verb phrases elevate accuracy to 0.95.",
        candidate_type=CandidateType.PROMPT_CANDIDATE,
        target_capability="multilingual_hi",
        baseline_score=0.85,
        target_score=0.95
    )
    assert cand.candidate_id.startswith("cand_prompt_candidate_")
    assert cand.status == CandidateStatus.READY
    assert cand.hypothesis.target_capability == "multilingual_hi"
    assert cand.hypothesis.baseline_score == 0.85
    assert cand.hypothesis.target_score == 0.95

    retrieved = candidate_manager.get_candidate(cand.candidate_id)
    assert retrieved is not None
    assert retrieved.name == "Test Indic Prompt V2"


@pytest.mark.asyncio
async def test_training_service_guardrails_and_cancellation():
    """Test hardware resource headroom check and training loop cancellation."""
    cand = candidate_manager.list_candidates()[0]
    
    # 1. Budget check
    ok, status_msg, metrics = training_service.check_hardware_budget(CandidateType.ADAPTER_CANDIDATE)
    assert isinstance(ok, bool)
    assert "cpu_percent" in metrics
    assert "free_ram_mb" in metrics

    # 2. Start job
    started, msg, job = await training_service.start_training_job(candidate=cand, epochs=2)
    if ok:
        assert started is True
        assert job.job_id.startswith("job_train_")
        assert job.state in ["QUEUED", "TRAINING"]

        # 3. Cancel job
        cancelled, cancel_msg = training_service.cancel_training(job.job_id)
        assert cancelled is True
        job_status = training_service.get_job_status(job.job_id)
        assert job_status.state == "CANCELLED"
    else:
        assert started is False
        assert job.state == "FAILED"
        assert "NOT_RUN_RESOURCE_LIMIT" in msg


@pytest.mark.asyncio
async def test_head_to_head_evaluation_and_regression_gates():
    """Test head-to-head candidate evaluation against locked baseline with regression gates."""
    candidates = candidate_manager.list_candidates()
    cand = candidates[0]
    
    ok, msg, comparison = await candidate_manager.evaluate_candidate_head_to_head(
        candidate_id=cand.candidate_id
    )
    assert ok is True
    assert comparison is not None
    assert comparison.candidate_id == cand.candidate_id
    assert comparison.baseline_id == "BASELINE_V1_LOCKED"
    assert len(comparison.gates) >= 5
    assert all(g.passed for g in comparison.gates)
    assert comparison.all_gates_passed is True
    assert comparison.summary_verdict == "PASSED_ALL_GATES"
    assert cand.status == CandidateStatus.PASSED


@pytest.mark.asyncio
async def test_candidate_promotion_and_rollback():
    """Test promoting a verified candidate to production and performing instant rollback."""
    candidates = candidate_manager.list_candidates()
    cand = candidates[0]
    cand.status = CandidateStatus.PASSED

    # Initial production
    init_prod = model_registry.get_production_model()

    # Promote
    ok, msg = candidate_manager.promote_candidate(cand.candidate_id)
    assert ok is True
    new_prod = model_registry.get_production_model()
    assert new_prod.model_name == cand.name
    assert new_prod.is_production is True

    # Instant Rollback
    roll_ok, roll_msg = model_registry.rollback()
    assert roll_ok is True
    restored_prod = model_registry.get_production_model()
    assert restored_prod.model_id == init_prod.model_id
    assert restored_prod.is_production is True


@pytest.mark.asyncio
async def test_model_lineage_dag():
    """Verify model lineage DAG structure for 3D visualization."""
    lineage = candidate_manager.get_model_lineage()
    assert len(lineage) >= 4
    base_nodes = [n for n in lineage if n.node_type == "BASE_MODEL"]
    assert len(base_nodes) == 1
    assert base_nodes[0].node_id == "node_base_qwen3_8b"
    assert base_nodes[0].parent_id is None

    child_nodes = [n for n in lineage if n.parent_id == "node_base_qwen3_8b"]
    assert len(child_nodes) >= 3


@pytest.mark.asyncio
async def test_evaluation_api_endpoints():
    """Test FastAPI REST endpoints for locked baseline, candidates, lineage, and resources."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Locked baseline
        resp = await ac.get("/api/v1/evaluation/locked-baseline")
        assert resp.status_code == 200
        data = resp.json()
        assert data["baseline_id"] == "BASELINE_V1_LOCKED"
        assert data["unweighted_case_mean"] == 0.9583

        # 2. List candidates
        resp = await ac.get("/api/v1/evaluation/candidates")
        assert resp.status_code == 200
        cands = resp.json()
        assert len(cands) >= 2

        # 3. Create candidate via API
        resp = await ac.post("/api/v1/evaluation/candidates", json={
            "hypothesis_title": "RAG Context Window Expansion",
            "hypothesis_description": "Top-k chunk expansion from 3 to 5 chunks boosts recall.",
            "candidate_type": "RAG_CANDIDATE",
            "candidate_name": "RAG-TopK-5-Cand",
            "target_capability": "rag",
            "baseline_score": 0.89,
            "target_score": 0.94
        })
        assert resp.status_code == 200
        created = resp.json()
        assert created["name"] == "RAG-TopK-5-Cand"

        # 4. Evaluate candidate via API
        resp = await ac.post("/api/v1/evaluation/candidates/evaluate", json={
            "candidate_id": cands[0]["candidate_id"],
            "schedule_type": "QUICK_DAILY"
        })
        assert resp.status_code == 200
        eval_data = resp.json()
        assert eval_data["success"] is True
        assert "comparison" in eval_data

        # 5. Lineage
        resp = await ac.get("/api/v1/evaluation/lineage")
        assert resp.status_code == 200
        lineage = resp.json()
        assert len(lineage) >= 4

        # 6. Resources
        resp = await ac.get("/api/v1/evaluation/resources")
        assert resp.status_code == 200
        res = resp.json()
        assert "is_training_safe" in res
        assert "metrics" in res
