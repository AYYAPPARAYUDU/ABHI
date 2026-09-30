"""Phase 8 Stage 8.5 — FastAPI Integration Tests for Creative Pipeline Router Endpoints."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_api_list_and_get_creative_templates():
    response = client.get("/api/v1/media/creative/templates")
    assert response.status_code == 200
    templates = response.json()
    assert len(templates) >= 6

    tmpl_id = templates[0]["template_id"]
    get_res = client.get(f"/api/v1/media/creative/templates/{tmpl_id}")
    assert get_res.status_code == 200
    assert get_res.json()["template_id"] == tmpl_id

    # 404 for unknown
    res_404 = client.get("/api/v1/media/creative/templates/nonexistent_template_999")
    assert res_404.status_code == 404


def test_api_create_and_get_creative_pipeline():
    payload = {
        "title": "API Promo Clip",
        "description": "Short promo video created via API",
        "style": "Cyberpunk Neon",
        "language": "en",
        "duration": 5.0,
    }
    create_res = client.post("/api/v1/media/creative/pipelines", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    pipe_id = created["pipeline_id"]
    assert pipe_id.startswith("pipe_")

    get_res = client.get(f"/api/v1/media/creative/pipelines/{pipe_id}")
    assert get_res.status_code == 200
    assert get_res.json()["pipeline_id"] == pipe_id

    list_res = client.get("/api/v1/media/creative/pipelines")
    assert list_res.status_code == 200
    assert any(p["pipeline_id"] == pipe_id for p in list_res.json())


def test_api_simulate_creative_pipeline():
    payload = {
        "title": "Simulated Promo",
        "description": "Simulation test",
        "duration": 4.0,
    }
    create_res = client.post("/api/v1/media/creative/pipelines", json=payload)
    pipe_id = create_res.json()["pipeline_id"]

    sim_res = client.post(f"/api/v1/media/creative/pipelines/{pipe_id}/simulate")
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["feasible"] is True
    assert sim_data["peak_vram_mb"] > 0


def test_api_execute_and_manifest_creative_pipeline():
    payload = {
        "title": "Executable Promo",
        "description": "Full execution test",
        "duration": 4.0,
    }
    create_res = client.post("/api/v1/media/creative/pipelines", json=payload)
    pipe_id = create_res.json()["pipeline_id"]

    exec_res = client.post(f"/api/v1/media/creative/pipelines/{pipe_id}/execute")
    assert exec_res.status_code == 200
    exec_data = exec_res.json()
    assert exec_data["status"] == "COMPLETED"
    assert len(exec_data["outputs"]) > 0

    man_res = client.get(f"/api/v1/media/creative/pipelines/{pipe_id}/manifest")
    assert man_res.status_code == 200
    manifest = man_res.json()
    assert manifest["pipeline_id"] == pipe_id
    assert manifest["verification_passed"] is True


def test_api_revise_and_cancel_creative_pipeline():
    payload = {
        "title": "Revision Pipeline",
        "description": "Testing revisions",
        "duration": 6.0,
    }
    create_res = client.post("/api/v1/media/creative/pipelines", json=payload)
    pipe_id = create_res.json()["pipeline_id"]
    scenes = create_res.json()["scenes"]
    scene_id = scenes[0]["scene_id"]

    rev_res = client.post(
        f"/api/v1/media/creative/pipelines/{pipe_id}/revise",
        json={"scene_id": scene_id, "new_prompt": "Revised prompt for scene 1"},
    )
    assert rev_res.status_code == 200
    assert rev_res.json()["status"] == "REVISED"

    cancel_res = client.post(f"/api/v1/media/creative/pipelines/{pipe_id}/cancel")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"


def test_api_export_and_import_project():
    payload = {
        "title": "Exportable Clip",
        "description": "Testing project export/import",
        "duration": 4.0,
    }
    create_res = client.post("/api/v1/media/creative/pipelines", json=payload)
    pipe_id = create_res.json()["pipeline_id"]
    client.post(f"/api/v1/media/creative/pipelines/{pipe_id}/execute")

    exp_res = client.post("/api/v1/media/creative/pipelines/export", json={"pipeline_id": pipe_id})
    assert exp_res.status_code == 200
    exp_data = exp_res.json()
    assert exp_data["pipeline_id"] == pipe_id

    imp_res = client.post("/api/v1/media/creative/pipelines/import", json=exp_data)
    assert imp_res.status_code == 200
    imp_data = imp_res.json()
    assert imp_data["creative_brief"]["title"] == "Exportable Clip"
