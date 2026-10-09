"""Unit & Integration Tests for Business Sectors, Autonomous Execution & Revenue Integrity (Phase 9 Stage 3)."""

import pytest
from fastapi.testclient import TestClient

from backend.app.business.models import (
    AutonomyLevel,
    AutopilotMode,
    EvidenceProvenanceType,
    ProjectStatus,
    RevenueCategory,
    RevenueProvenance,
)
from backend.app.business.service import business_service
from backend.app.main import app

client = TestClient(app)


def test_list_business_sectors():
    """Verify that all 6 3D-mapped business sectors are returned with 3D positions."""
    response = client.get("/api/v1/business/sectors")
    assert response.status_code == 200
    sectors = response.json()
    assert len(sectors) == 6
    sector_ids = [s["id"] for s in sectors]
    assert "automation_services" in sector_ids
    assert "digital_products" in sector_ids
    assert "media_studio" in sector_ids
    assert "software_tools" in sector_ids
    assert "research_products" in sector_ids
    assert "workflow_solutions" in sector_ids

    for s in sectors:
        assert "position_3d" in s
        assert "x" in s["position_3d"]
        assert "y" in s["position_3d"]
        assert "z" in s["position_3d"]


def test_create_and_update_business_project():
    """Verify project creation, validation, and autonomy settings."""
    payload = {
        "sector_id": "automation_services",
        "name": "Local Invoice Extraction Agent",
        "objective": "Process PDF receipts locally with OCR and schema mapping.",
        "autonomy_level": AutonomyLevel.LEVEL_3_BUILD_TEST,
        "autopilot_mode": AutopilotMode.LOCAL_BUILD_AUTOPILOT,
        "budget_limit_usd": 25.0,
    }
    response = client.post("/api/v1/business/projects", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == payload["name"]
    assert data["sector_id"] == "automation_services"
    assert data["autonomy_level"] == 3
    assert data["status"] == "PLANNING"
    proj_id = data["id"]

    # Update project
    update_res = client.patch(
        f"/api/v1/business/projects/{proj_id}",
        json={"budget_limit_usd": 75.0, "autonomy_level": 4},
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["budget_limit_usd"] == 75.0
    assert updated_data["autonomy_level"] == 4


def test_autonomy_level_0_observe_blocks_execution():
    """Verify that LEVEL 0 (OBSERVE ONLY) pauses automated execution."""
    proj = business_service.create_project(
        sector_id="digital_products",
        name="Observe Only Project",
        objective="Analyze competitors without generating artifacts.",
        autonomy_level=AutonomyLevel.LEVEL_0_OBSERVE,
    )
    success, message, result = business_service.execute_next_step(proj.id)
    assert not success
    assert "LEVEL 0" in message
    assert result["status"] == "PAUSED_POLICY"


def test_budget_limit_stop_condition():
    """Verify that exceeding budget stops autonomous execution."""
    proj = business_service.create_project(
        sector_id="research_products",
        name="Budget Constrained Project",
        objective="Data mining with strictly bounded spend.",
        budget_limit_usd=1.0,
    )
    proj.spent_usd = 2.50  # Over budget
    success, message, result = business_service.execute_next_step(proj.id)
    assert not success
    assert "Budget limit" in message
    assert result["status"] == "BUDGET_BLOCKED"


def test_level_5_action_requires_explicit_approval():
    """Verify that external publishing requires human approval and creates BusinessApproval record."""
    proj = business_service.create_project(
        sector_id="software_tools",
        name="Publishing Gated Tool",
        objective="Build and distribute a local utility.",
        autonomy_level=AutonomyLevel.LEVEL_3_BUILD_TEST,  # Less than Level 5
    )
    # Add a milestone that requires external publishing
    proj.milestones.append(
        business_service._projects[proj.id].milestones[0].model_copy(
            update={"id": "ms_pub", "title": "Publish release package to external portal"}
        )
    )
    # Mark all existing milestones completed so the publish milestone is next
    for m in proj.milestones[:-1]:
        m.status = "COMPLETED"

    success, message, result = business_service.execute_next_step(proj.id)
    assert not success
    assert result["status"] == "PAUSED_APPROVAL"
    assert "approval_id" in result

    # Resolve approval
    app_id = result["approval_id"]
    resolve_res = client.post(
        f"/api/v1/business/projects/{proj.id}/approvals/{app_id}/resolve",
        json={"approve": True},
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["success"] is True


def test_opportunity_evaluation_scoring():
    """Verify multi-dimension opportunity evaluation formula and evidence labeling."""
    payload = {
        "sector_id": "media_studio",
        "title": "Local Social Clip Generator",
        "concept_description": "Convert long webinars into short video teasers locally.",
        "target_audience": "Content Marketers",
        "target_pricing_usd": 49.0,
    }
    response = client.post("/api/v1/business/opportunities/evaluate", json=payload)
    assert response.status_code == 200
    opp = response.json()
    assert opp["total_score"] > 0.0
    assert len(opp["dimensions"]) >= 5

    dim_names = [d["dimension"] for d in opp["dimensions"]]
    assert "demand_evidence" in dim_names
    assert "required_capabilities" in dim_names
    assert "implementation_cost" in dim_names

    for d in opp["dimensions"]:
        assert d["provenance"] in [
            "OBSERVED",
            "SOURCED",
            "MEASURED",
            "ESTIMATED",
            "ASSUMED",
            "UNKNOWN",
        ]


def test_financial_summary_integrity():
    """Verify that financial summary accurately reports measured vs forecast and includes honest disclaimers."""
    response = client.get("/api/v1/business/financials/summary")
    assert response.status_code == 200
    data = response.json()
    assert "actual_revenue_received_usd" in data
    assert "operating_expenses_usd" in data
    assert "net_result_usd" in data
    assert "forecast_revenue_usd" in data
    assert "revenue_provenance" in data
    assert "disclaimer" in data
    assert "not actual earnings" in data["disclaimer"].lower()
