"""Phase 8 Stage 8.3 — Image Edit Resilience, Lineage & Recovery Tests."""

import os
import time
import pytest
import numpy as np
import cv2
from pathlib import Path
from backend.app.media.models import ImageFormat, QualityProfile
from backend.app.media.edit_models import (
    ImageEditRequest,
    ImageEditType,
    ArtifactLineageRecord,
    EditDifferenceEvidence,
    OutpaintBounds,
)
from backend.app.media.coordinator import media_coordinator
from backend.app.media.edit_coordinator import image_edit_coordinator
from backend.app.media.db_models import MaskArtifactRecord, ArtifactLineageRecord as DBLineageRecord


@pytest.fixture
def registered_source(tmp_path):
    img = np.full((512, 512, 3), 100, dtype=np.uint8)
    file_path = tmp_path / "img_root_source.png"
    cv2.imwrite(str(file_path), img)

    ok, art, msg = media_coordinator.storage.validate_and_register_artifact(
        file_path=file_path,
        job_id="job_root_lineage_seed",
        expected_format=ImageFormat.PNG,
        expected_width=512,
        expected_height=512,
        model_id="sd-turbo-local",
        parameters_hash="root_hash_001",
        prompt_preview="Root source image"
    )
    if art:
        media_coordinator.register_artifact(art)
    return art


def test_multi_generation_lineage_tracking(registered_source):
    """Test creating a multi-generation edit lineage: Root -> Edit v1 -> Inpaint v2."""
    root_art = registered_source

    # Generation 1: Image-to-Image Edit
    req1 = ImageEditRequest(
        source_artifact_id=root_art.artifact_id,
        operation=ImageEditType.IMAGE_TO_IMAGE,
        prompt="Generation 1 edit",
        model_id="instruct-pix2pix-local",
        strength=0.7,
        steps=10
    )
    ok1, job1, msg1 = image_edit_coordinator.submit_image_edit(req1)
    assert ok1 is True
    child1_art_id = job1.artifact_id

    # Check lineage of child 1
    lin1 = image_edit_coordinator.get_lineage(child1_art_id)
    assert lin1["parent_record"]["parent_artifact_id"] == root_art.artifact_id
    assert lin1["parent_record"]["child_artifact_id"] == child1_art_id

    # Generation 2: Outpaint child 1
    req2 = ImageEditRequest(
        source_artifact_id=child1_art_id,
        operation=ImageEditType.OUTPAINTING,
        prompt="Generation 2 outpaint",
        model_id="sdxl-inpainting-local",
        outpaint_bounds=OutpaintBounds(top=64, bottom=64, left=64, right=64),
        steps=10
    )
    ok2, job2, msg2 = image_edit_coordinator.submit_image_edit(req2)
    assert ok2 is True
    child2_art_id = job2.artifact_id

    # Check lineage of child 2
    lin2 = image_edit_coordinator.get_lineage(child2_art_id)
    assert lin2["parent_record"]["parent_artifact_id"] == child1_art_id
    assert lin2["parent_record"]["child_artifact_id"] == child2_art_id

    # Check root lineage children
    root_lin = image_edit_coordinator.get_lineage(root_art.artifact_id)
    assert root_lin["is_root"] is True
    assert len(root_lin["children"]) >= 1


def test_temp_directory_auto_cleanup(registered_source):
    """Test that job temporary directories are cleaned up upon completion."""
    root_art = registered_source
    req = ImageEditRequest(
        source_artifact_id=root_art.artifact_id,
        operation=ImageEditType.IMAGE_TO_IMAGE,
        prompt="Test sandbox cleanup",
        model_id="instruct-pix2pix-local",
        steps=10
    )
    ok, job, msg = image_edit_coordinator.submit_image_edit(req)
    assert ok is True

    # Temp dir must not exist after completion
    temp_dir = image_edit_coordinator.storage.temp_dir / f"edit_{job.job_id}"
    assert not temp_dir.exists()


def test_cancel_non_existent_job():
    """Test cancellation of unknown job returns False."""
    ok, msg = image_edit_coordinator.cancel_job("job_unknown_12345")
    assert ok is False
    assert "not found" in msg.lower()
