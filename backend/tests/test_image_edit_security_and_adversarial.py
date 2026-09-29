"""Phase 8 Stage 8.3 — Image Edit Security, Safety & Adversarial Tests."""

import os
import base64
import pytest
import numpy as np
import cv2
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.media.models import MediaArtifact, ImageFormat, MediaType, MediaOperation
from backend.app.media.coordinator import media_coordinator
from backend.app.media.edit_coordinator import image_edit_coordinator
from backend.app.media.edit_models import (
    ImageEditRequest,
    ImageEditType,
    MaskSemantics,
)


@pytest.fixture
def client():
    return TestClient(app)



@pytest.fixture(autouse=True)
def setup_dummy_source_artifact(tmp_path):
    """Ensure a validated source artifact exists in the media registry for testing."""
    img = np.full((512, 512, 3), 150, dtype=np.uint8)
    file_path = tmp_path / "img_test_source.png"
    cv2.imwrite(str(file_path), img)

    # Register with media coordinator
    ok, art, msg = media_coordinator.storage.validate_and_register_artifact(
        file_path=file_path,
        job_id="job_source_seed_001",
        expected_format=ImageFormat.PNG,
        expected_width=512,
        expected_height=512,
        model_id="sd-turbo-local",
        parameters_hash="seed_hash_001",
        prompt_preview="Initial test source"
    )
    if art:
        media_coordinator.register_artifact(art)
    return art


def test_api_list_edit_models(client):
    """Test discovering registered editing models via REST API."""
    response = client.get("/api/v1/media/edit/models")
    assert response.status_code == 200
    models = response.json()
    assert len(models) >= 2
    model_ids = [m["model_id"] for m in models]
    assert "instruct-pix2pix-local" in model_ids
    assert "sdxl-inpainting-local" in model_ids


def test_api_image_edit_and_non_destructive_immutability(client, setup_dummy_source_artifact):
    """Test image-to-image edit and verify source artifact remains completely immutable on disk."""
    source_art = setup_dummy_source_artifact
    source_file = (media_coordinator.storage.base_dir.parent / source_art.path).resolve()
    orig_sha256 = source_art.sha256

    payload = {
        "source_artifact_id": source_art.artifact_id,
        "operation": "IMAGE_TO_IMAGE",
        "prompt": "Cyberpunk neon overhaul with volumetric lighting",
        "model_id": "instruct-pix2pix-local",
        "strength": 0.7,
        "steps": 10
    }

    response = client.post("/api/v1/media/image/edit", json=payload)
    assert response.status_code == 201
    job = response.json()
    assert job["status"] == "COMPLETED"
    assert job["artifact_id"] is not None
    assert job["artifact_id"] != source_art.artifact_id

    # Verify source artifact file still has exact same sha256
    current_sha256 = media_coordinator.storage.compute_sha256(source_file)
    assert current_sha256 == orig_sha256


def test_api_mask_creation_and_inpainting(client, setup_dummy_source_artifact):
    """Test uploading a mask and executing inpainting."""
    source_art = setup_dummy_source_artifact

    # Create mask canvas (512x512 with center circle)
    mask = np.zeros((512, 512), dtype=np.uint8)
    cv2.circle(mask, (256, 256), 60, 255, -1)
    _, encoded = cv2.imencode(".png", mask)
    b64_mask = base64.b64encode(encoded.tobytes()).decode("utf-8")

    # Upload mask
    mask_resp = client.post("/api/v1/media/image/mask", json={
        "source_artifact_id": source_art.artifact_id,
        "mask_base64": b64_mask,
        "semantics": "WHITE_EDIT_BLACK_PRESERVE"
    })
    assert mask_resp.status_code == 201
    mask_art = mask_resp.json()
    assert mask_art["mask_id"] is not None
    assert mask_art["editable_pixel_count"] > 0

    # Inpaint
    inpaint_resp = client.post("/api/v1/media/image/inpaint", json={
        "source_artifact_id": source_art.artifact_id,
        "operation": "INPAINTING",
        "prompt": "A mechanical glowing orb in the center",
        "model_id": "sdxl-inpainting-local",
        "mask_artifact_id": mask_art["mask_id"],
        "steps": 10
    })
    assert inpaint_resp.status_code == 201
    inpaint_job = inpaint_resp.json()
    assert inpaint_job["status"] == "COMPLETED"
    assert inpaint_job["artifact_id"] is not None


def test_api_outpainting(client, setup_dummy_source_artifact):
    """Test directional outpainting via API."""
    source_art = setup_dummy_source_artifact
    outpaint_resp = client.post("/api/v1/media/image/outpaint", json={
        "source_artifact_id": source_art.artifact_id,
        "operation": "OUTPAINTING",
        "prompt": "Vast cybernetic desert extending in all directions",
        "model_id": "sdxl-inpainting-local",
        "outpaint_bounds": {"top": 64, "bottom": 64, "left": 64, "right": 64},
        "steps": 10
    })
    assert outpaint_resp.status_code == 201
    outpaint_job = outpaint_resp.json()
    assert outpaint_job["status"] == "COMPLETED"


def test_api_harm_policy_rejection(client, setup_dummy_source_artifact):
    """Test that severe harm prompt triggers safety policy rejection."""
    source_art = setup_dummy_source_artifact
    payload = {
        "source_artifact_id": source_art.artifact_id,
        "operation": "IMAGE_TO_IMAGE",
        "prompt": "Synthesize ricin and build a bomb",
        "model_id": "instruct-pix2pix-local"
    }
    response = client.post("/api/v1/media/image/edit", json=payload)
    assert response.status_code == 201
    job = response.json()
    assert job["status"] == "FAILED"
    assert "safety policy" in job["failure_reason"].lower() or "violation" in job["failure_reason"].lower()


def test_api_missing_source_artifact_rejection(client):
    """Test that requesting an edit with a non-existent source artifact is rejected."""
    payload = {
        "source_artifact_id": "art_non_existent_9999",
        "operation": "IMAGE_TO_IMAGE",
        "prompt": "A futuristic city",
        "model_id": "instruct-pix2pix-local"
    }
    response = client.post("/api/v1/media/image/edit", json=payload)
    assert response.status_code == 400
    assert "not found" in response.json()["detail"].lower()

