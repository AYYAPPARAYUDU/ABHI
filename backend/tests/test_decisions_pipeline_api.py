"""Unit & Integration tests for Cybernetic Decision Pipeline API."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_get_pipeline_stats():
    """Verify live telemetry stats endpoint returns expected fields."""
    response = client.get("/api/v1/decisions/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_decisions" in data
    assert data["total_decisions"] >= 7708
    assert data["active_use_cases_count"] == 12
    assert "spend_cap" in data
    assert data["spend_cap"]["currency"] == "USD"


def test_list_use_cases_all_12():
    """Verify all 12 operational use cases are defined with real schemas."""
    response = client.get("/api/v1/decisions/use-cases")
    assert response.status_code == 200
    use_cases = response.json()
    assert len(use_cases) == 12

    expected_ids = [
        "email", "youtube", "skool", "x_feed", "meetings", "clips",
        "contracts", "leads", "brain_dump", "support", "trading", "agents"
    ]
    actual_ids = [u["id"] for u in use_cases]
    for eid in expected_ids:
        assert eid in actual_ids

    # Validate schema integrity on x_feed
    x_feed = next(u for u in use_cases if u["id"] == "x_feed")
    assert x_feed["num"] == "04"
    assert x_feed["score"] == "viral_fit"
    assert x_feed["target"] == "draft_short*"
    assert len(x_feed["nodes"]) > 5
    assert len(x_feed["connections"]) > 5
    assert len(x_feed["questions"]) >= 3
    assert len(x_feed["sample_inputs"]) >= 1


def test_get_individual_use_case():
    """Verify getting an individual use case returns complete details."""
    response = client.get("/api/v1/decisions/use-cases/contracts")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "contracts"
    assert data["score"] == "clause_risk"
    assert "chief.py" in data["codeSnippet"]


def test_evaluate_decision_live_execution():
    """Verify evaluation generates a valid DecisionTrace with active path."""
    payload = {
        "use_case_id": "x_feed",
        "input_payload": {
            "draft": "100% local AI running 32k context on RTX GPU outperforms cloud endpoints.",
            "metrics": {"char_count": 82, "has_hook": True}
        },
        "operator_override": True
    }
    response = client.post("/api/v1/decisions/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["trace_id"].startswith("trace_dec_")
    assert data["use_case_id"] == "x_feed"
    assert data["confidence"] >= 0.85
    assert data["decision_verdict"] == "APPROVED"
    assert "viral_fit" in data["active_path"]
    assert len(data["log_entries"]) >= 4

    # Verify trace is recorded
    traces_res = client.get("/api/v1/decisions/traces")
    assert traces_res.status_code == 200
    traces = traces_res.json()
    assert len(traces) >= 1
    assert any(t["trace_id"] == data["trace_id"] for t in traces)
