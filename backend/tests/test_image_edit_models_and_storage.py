"""Phase 8 Stage 8.3 — Image Edit Models, Mask Storage & Difference Evidence Tests."""

import os
import time
import pytest
import numpy as np
import cv2
from pathlib import Path
from backend.app.media.models import ImageFormat, QualityProfile, MediaType, MediaOperation
from backend.app.media.edit_models import (
    ImageEditType,
    MaskSemantics,
    OutpaintBounds,
    MaskArtifact,
    EditDifferenceEvidence,
    ImageEditRequest,
    ArtifactLineageRecord,
    ImageEditModelDefinition,
)
from backend.app.media.edit_storage import ImageEditStorageManager


@pytest.fixture
def edit_storage(tmp_path):
    media_dir = tmp_path / "media"
    return ImageEditStorageManager(base_media_dir=str(media_dir))


def test_outpaint_bounds_validation():
    """Test OutpaintBounds validation and pixel counting."""
    bounds = OutpaintBounds(top=64, bottom=128, left=32, right=0)
    assert bounds.top == 64
    assert bounds.bottom == 128
    assert bounds.left == 32
    assert bounds.right == 0
    assert bounds.total_added_pixels == 224
    assert not bounds.is_zero()

    zero_bounds = OutpaintBounds(top=0, bottom=0, left=0, right=0)
    assert zero_bounds.is_zero()

    with pytest.raises(ValueError, match="multiple of 8"):
        OutpaintBounds(top=7)


def test_mask_validation_and_storage(edit_storage):
    """Test mask binarization, dimension validation, and storage."""
    # Create a 512x512 dummy mask with a white circle in the center
    mask_canvas = np.zeros((512, 512), dtype=np.uint8)
    cv2.circle(mask_canvas, (256, 256), 80, 255, -1)

    _, encoded = cv2.imencode(".png", mask_canvas)
    mask_bytes = encoded.tobytes()

    ok, mask_art, msg = edit_storage.validate_and_register_mask(
        mask_bytes=mask_bytes,
        source_artifact_id="art_src_001",
        expected_width=512,
        expected_height=512,
        semantics=MaskSemantics.WHITE_EDIT_BLACK_PRESERVE
    )

    assert ok is True
    assert mask_art is not None
    assert mask_art.width == 512
    assert mask_art.height == 512
    assert mask_art.editable_pixel_count > 0
    assert 0.05 < mask_art.editable_ratio < 0.15
    assert len(mask_art.sha256) == 64

    # Verify file on disk
    file_path = (edit_storage.base_dir.parent / mask_art.path).resolve()
    assert file_path.exists()


def test_mask_empty_rejection(edit_storage):
    """Test that an all-black mask with 0 edit pixels is rejected as INVALID_MASK_EMPTY."""
    empty_canvas = np.zeros((512, 512), dtype=np.uint8)
    _, encoded = cv2.imencode(".png", empty_canvas)

    ok, mask_art, msg = edit_storage.validate_and_register_mask(
        mask_bytes=encoded.tobytes(),
        source_artifact_id="art_src_001",
        expected_width=512,
        expected_height=512
    )

    assert ok is False
    assert mask_art is None
    assert "INVALID_MASK_EMPTY" in msg


def test_mask_dimension_mismatch_rejection(edit_storage):
    """Test that mask dimensions mismatching the source are rejected."""
    mask_canvas = np.full((256, 256), 255, dtype=np.uint8)
    _, encoded = cv2.imencode(".png", mask_canvas)

    ok, mask_art, msg = edit_storage.validate_and_register_mask(
        mask_bytes=encoded.tobytes(),
        source_artifact_id="art_src_001",
        expected_width=512,
        expected_height=512
    )

    assert ok is False
    assert "INVALID_MASK_DIMENSIONS" in msg


def test_deterministic_outpaint_border_mask_generation(edit_storage):
    """Test synthetic border mask creation for outpainting."""
    bounds = OutpaintBounds(top=64, bottom=64, left=64, right=64)
    ok, mask_art, mask_img, msg = edit_storage.generate_outpaint_border_mask(
        source_artifact_id="art_src_001",
        source_width=512,
        source_height=512,
        bounds=bounds,
        job_id="job_test_outpaint"
    )

    assert ok is True
    assert mask_art is not None
    assert mask_img is not None
    assert mask_art.width == 640
    assert mask_art.height == 640

    # Verify interior (where source is placed) is 0 (preserve)
    assert mask_img[100, 100] == 0
    # Verify border is 255 (editable)
    assert mask_img[10, 10] == 255
    assert mask_img[630, 630] == 255


def test_technical_difference_evidence_calculation(edit_storage):
    """Test pixel diff and bounding box evidence calculation."""
    src = np.full((512, 512, 3), 100, dtype=np.uint8)
    edited = src.copy()
    # Draw a changed square
    edited[100:200, 100:200] = [200, 200, 200]

    mask = np.zeros((512, 512), dtype=np.uint8)
    mask[100:200, 100:200] = 255

    evidence = edit_storage.calculate_difference_evidence(
        source_image=src,
        edited_image=edited,
        operation=ImageEditType.INPAINTING,
        mask=mask
    )

    assert evidence.changed_pixel_count == 10000
    assert round(evidence.changed_pixel_ratio, 4) == round(10000 / (512 * 512), 4)
    assert evidence.bounding_box == [100, 100, 200, 200]
    assert evidence.mask_overlap_ratio == 1.0
    assert evidence.classification == "TECHNICAL_EVIDENCE"


def test_validate_and_register_edit_artifact(edit_storage, tmp_path):
    """Test 6-step cryptographic output validation."""
    test_img_path = tmp_path / "test_out.png"
    img = np.zeros((512, 512, 3), dtype=np.uint8)
    cv2.imwrite(str(test_img_path), img)

    ok, art, msg = edit_storage.validate_and_register_edit_artifact(
        file_path=test_img_path,
        job_id="job_edit_test",
        source_artifact_id="art_src_001",
        expected_format=ImageFormat.PNG,
        expected_width=512,
        expected_height=512,
        model_id="instruct-pix2pix-local",
        parameters_hash="test_hash_123"
    )

    assert ok is True
    assert art is not None
    assert art.width == 512
    assert art.height == 512
    assert art.size_bytes > 0
    assert len(art.sha256) == 64
