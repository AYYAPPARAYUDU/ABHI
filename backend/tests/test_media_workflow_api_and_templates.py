"""Phase 8 Stage 8.4 — Media Workflow API, Templates, and Composition Tests."""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_api_list_workflow_templates():
    """Verify GET /api/v1/media/workflows/templates returns built-in catalog."""
    resp = client.get("/api/v1/media/workflows/templates")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 4
    template_ids = [t["template_id"] for t in data]
    assert any("text_to_image" in tid for tid in template_ids)
    assert any("image_outpaint" in tid for tid in template_ids)
    assert any("image_to_video" in tid for tid in template_ids)
    assert any("narrated_clip" in tid for tid in template_ids)


def test_api_get_single_workflow_template():
    """Verify GET /api/v1/media/workflows/templates/{id} returns full template definition."""
    resp = client.get("/api/v1/media/workflows/templates/creative.text_to_image@1.0.0")
    assert resp.status_code == 200
    data = resp.json()
    assert data["template_id"] == "creative.text_to_image@1.0.0"
    assert "nodes" in data
    assert len(data["nodes"]) >= 1


def test_api_simulate_workflow_endpoint():
    """Verify POST /api/v1/media/workflows/simulate computes resource bounds accurately."""
    payload = {
        "workflow_id": "wf_api_sim_01",
        "title": "API Test Workflow",
        "goal": "Test simulation",
        "nodes": [
            {
                "node_id": "n1",
                "skill_id": "media.image.generate",
                "parameters": {"prompt": "Sunset on beach", "width": 512, "height": 512},
            },
            {
                "node_id": "n2",
                "skill_id": "media.video.generate",
                "parameters": {"duration_seconds": 2.0},
                "dependencies": ["n1"],
            }
        ],
        "edges": [
            {
                "source_node_id": "n1",
                "source_port": "artifact_id",
                "target_node_id": "n2",
                "target_port": "source_artifact_id",
                "port_type": "IMAGE"
            }
        ]
    }
    resp = client.post("/api/v1/media/workflows/simulate", json=payload)
    assert resp.status_code == 200
    sim = resp.json()
    assert "feasible" in sim
    assert sim["feasible"] is True
    assert sim["peak_vram_mb"] > 0
    assert sim["peak_ram_mb"] > 0


def test_api_execute_and_query_workflow():
    """Verify POST /api/v1/media/workflows/execute and GET /api/v1/media/workflows/{id}."""
    payload = {
        "workflow_id": "wf_api_exec_01",
        "task_id": "task_api_01",
        "title": "API Execute Workflow",
        "goal": "Generate single image",
        "nodes": [
            {
                "node_id": "n1_gen",
                "skill_id": "media.image.generate",
                "parameters": {"prompt": "Golden retriever puppy", "width": 512, "height": 512},
            }
        ],
        "edges": []
    }
    resp = client.post("/api/v1/media/workflows/execute", json=payload)
    assert resp.status_code == 201
    wf_data = resp.json()
    assert wf_data["workflow_id"] == "wf_api_exec_01"
    assert wf_data["status"] == "COMPLETED"
    assert wf_data["primary_artifact_id"] is not None

    # Query status
    get_resp = client.get("/api/v1/media/workflows/wf_api_exec_01")
    assert get_resp.status_code == 200
    assert get_resp.json()["workflow_id"] == "wf_api_exec_01"

    # Query manifest
    man_resp = client.get("/api/v1/media/workflows/wf_api_exec_01/manifest")
    assert man_resp.status_code == 200
    man_data = man_resp.json()
    assert man_data["workflow_id"] == "wf_api_exec_01"
    assert len(man_data["artifacts"]) >= 1


def test_api_workflow_export_and_import():
    """Verify POST /api/v1/media/workflows/export and POST /api/v1/media/workflows/import."""
    wf_def = {
        "workflow_id": "wf_export_01",
        "task_id": "task_export_01",
        "title": "Exportable Pipeline",
        "goal": "Test Export",
        "nodes": [
            {
                "node_id": "n1",
                "skill_id": "audio.tts",
                "parameters": {"text": "Hello world audio"},
            }
        ],
        "edges": []
    }

    exp_resp = client.post("/api/v1/media/workflows/export", json=wf_def)
    assert exp_resp.status_code == 200
    exported_data = exp_resp.json()
    assert "workflow_id" in exported_data or "workflow" in exported_data

    # Import
    imp_resp = client.post("/api/v1/media/workflows/import", json=exported_data)
    assert imp_resp.status_code == 200
    imported_wf = imp_resp.json()
    assert "n1" in imported_wf["nodes"]


def test_api_cancel_workflow():
    """Verify POST /api/v1/media/workflows/{id}/cancel."""
    resp = client.post("/api/v1/media/workflows/wf_nonexistent_999/cancel")
    # Nonexistent or completed returns 400 with detail
    assert resp.status_code in [400, 404]
