"""
Test Suite: Media Provenance, Validation, and Replay REST API (Phase 8 Stage 8.6).
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_api_create_and_get_attestation():
    payload = {
        "operation_id": "op_api_test",
        "artifact_id": "art_api_test_01",
        "operation_type": "TEXT_TO_IMAGE",
        "runtime_name": "LocalDiffusionEngine",
        "model_id": "sd-turbo-local",
        "claimed_provenance": "ACTUAL_MODEL_INFERENCE",
        "parameters": {"steps": 20},
    }

    response = client.post("/api/v1/media/provenance/attestations", json=payload)
    assert response.status_code == 201
    data = response.json()
    att_id = data["attestation_id"]
    assert att_id.startswith("att_")
    assert data["provenance_class"] == "ACTUAL_MODEL_INFERENCE"

    # Fetch by ID
    get_res = client.get(f"/api/v1/media/provenance/attestations/{att_id}")
    assert get_res.status_code == 200
    assert get_res.json()["attestation_id"] == att_id

    # Fetch by Artifact ID
    art_res = client.get("/api/v1/media/provenance/artifact/art_api_test_01")
    assert art_res.status_code == 200
    assert art_res.json()["artifact_id"] == "art_api_test_01"


def test_api_validate_subtitles():
    payload = {
        "media_type": "SUBTITLE",
        "expected_duration_s": 10.0,
        "segments": [
            {"start_time_s": 0.0, "end_time_s": 3.0, "text": "Segment 1"},
            {"start_time_s": 3.5, "end_time_s": 7.0, "text": "Segment 2"},
        ],
    }

    response = client.post("/api/v1/media/provenance/validate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["is_valid"] is True
    assert data["subtitle_segment_count"] == 2


def test_api_quality_evaluate():
    payload = {
        "prompt": "Neon cyberpunk city at night",
        "script_text": "A futuristic glowing cyberpunk city under neon rain",
        "video_duration_s": 6.0,
        "audio_duration_s": 6.1,
    }

    response = client.post("/api/v1/media/quality/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["audio_alignment"] == "PASS"
    assert data["visual_coherence"] == "NOT_EVALUATED"


def test_api_replay_inspect_and_simulate():
    project = {
        "pipeline_id": "cpipe_api_replay",
        "scenes": [{"scene_id": "scn_1", "visual_prompt": "Drone shot", "duration": 5.0}],
        "assets": [],
    }

    # Inspect
    insp_res = client.post("/api/v1/media/replay/inspect", json=project)
    assert insp_res.status_code == 200
    assert insp_res.json()["mode"] == "INSPECT"
    assert insp_res.json()["is_safe_to_execute"] is True

    # Simulate
    sim_res = client.post("/api/v1/media/replay/simulate", json=project)
    assert sim_res.status_code == 200
    assert sim_res.json()["mode"] == "SIMULATE"
    assert sim_res.json()["resource_feasible"] is True
