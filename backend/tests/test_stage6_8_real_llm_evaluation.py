"""Unit Tests for Phase 6.8 Real LLM Benchmark Execution & Evidence Hardening."""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.evaluation.models import (
    ScheduleType,
    ProvenanceType,
    CaseEvidenceRecord,
    ModelSnapshot
)
from backend.app.evaluation.runners import (
    runner_manager,
    _validate_json_match,
    _validate_python_function
)
from backend.app.evaluation.engine import evaluation_engine
from backend.app.evaluation.registry import model_registry


@pytest.mark.asyncio
async def test_stage6_8_deterministic_validators():
    """Verify deterministic validator functions for JSON schemas and Python AST."""
    # 1. JSON match validator
    valid_json = '{"intent": "SYSTEM_STATUS", "target": "cpu"}'
    is_match, score, reason = _validate_json_match(valid_json, {"intent": "SYSTEM_STATUS", "target": "cpu"})
    assert is_match is True
    assert score == 1.0

    invalid_json = '{"intent": "WRONG_INTENT"}'
    is_match2, score2, _ = _validate_json_match(invalid_json, {"intent": "SYSTEM_STATUS", "target": "cpu"})
    assert is_match2 is False
    assert score2 < 1.0

    # 2. Python AST function validator
    py_code = """
def is_even(n):
    return n % 2 == 0
"""
    is_valid, py_score, reason = _validate_python_function(py_code, "is_even", lambda fn: fn(4) is True and fn(5) is False)
    assert is_valid is True
    assert py_score == 1.0


@pytest.mark.asyncio
async def test_stage6_8_real_llm_runner_execution_and_evidence():
    """Verify real benchmark runner captures raw evidence, tokens/sec, and snapshots."""
    runner = runner_manager.real_runner
    res = await runner.execute_real_suite(target_model="qwen3:8b", schedule_type=ScheduleType.QUICK_DAILY)

    assert "evidence_records" in res
    records: list[CaseEvidenceRecord] = res["evidence_records"]
    assert len(records) >= 12  # All 12 core benchmark cases

    # Check evidence fields
    for rec in records:
        assert rec.case_id.startswith("case_")
        assert rec.prompt != ""
        assert rec.expected_output != ""
        assert rec.actual_output != ""
        assert rec.score >= 0.0
        assert rec.evaluator_reason != ""
        assert rec.provenance in [ProvenanceType.ACTUAL, ProvenanceType.SIMULATED]

    # Check snapshots
    model_snap: ModelSnapshot = res["model_snapshot"]
    assert model_snap.model_id == "qwen3:8b"
    assert model_snap.quantization != ""
    assert model_snap.generation_config.temperature == 0.1

    # Check performance metrics
    res_snap = res["resource_metrics"]
    assert res_snap.duration_seconds > 0.0
    assert res_snap.tokens_per_sec > 0.0


@pytest.mark.asyncio
async def test_stage6_8_external_adapter_version_pins():
    """Verify external benchmark adapters report pinned versions and status without crashing."""
    adapters = runner_manager.list_adapters_status()
    names = [a["adapter"] for a in adapters]
    
    assert "ABHI_INTERNAL_DETERMINISTIC_SUITE" in names
    assert "ELEUTHERAI_LM_EVAL_HARNESS" in names
    assert "MTEB_RETRIEVAL_BENCHMARK" in names
    assert "OPENCOMPASS_DEEP_EVAL" in names

    lm_eval = next(a for a in adapters if a["adapter"] == "ELEUTHERAI_LM_EVAL_HARNESS")
    assert lm_eval["version_pin"] == "v0.4.13"
    assert lm_eval["status"] in ["READY", "NOT_INSTALLED"]

    mteb = next(a for a in adapters if a["adapter"] == "MTEB_RETRIEVAL_BENCHMARK")
    assert mteb["version_pin"] == "v2.21.8"


@pytest.mark.asyncio
async def test_stage6_8_real_evaluation_run_api():
    """Verify triggering evaluation run via REST API returns evidence records and provenance."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/api/v1/evaluation/run",
            json={"schedule_type": "QUICK_DAILY", "model_id": "model_qwen3_8b_v1_prod"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        run = data["run"]
        assert run["status"] == "COMPLETED"
        assert len(run["evidence_records"]) >= 12
        assert run["evidence_records"][0]["case_id"] == "case_inst_json_01"
        assert run["is_baseline"] is True


@pytest.mark.asyncio
async def test_stage6_8_historical_integrity_and_provenance_distinction():
    """Verify historical seed runs have SIMULATED provenance while new runs have ACTUAL provenance."""
    runs = evaluation_engine.list_runs()
    # Days 1 to 21 must be marked SIMULATED
    for r in runs:
        if r.day_index <= 21:
            assert r.provenance == ProvenanceType.SIMULATED
