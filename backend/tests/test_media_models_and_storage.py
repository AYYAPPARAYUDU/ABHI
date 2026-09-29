"""Unit tests for Phase 8 Stage 8.1 Media Domain Models & Storage Manager."""

import os
import shutil
import tempfile
from pathlib import Path
import pytest
import numpy as np
import cv2

from backend.app.media.models import (
    MediaType,
    MediaOperation,
    MediaJobStatus,
    ImageFormat,
    QualityProfile,
    ImageGenerationRequest,
    MediaArtifact,
    MediaJob,
    ImageModelDefinition,
)
from backend.app.media.storage import MediaStorageManager


def test_media_enums():
    """Verify media domain enums adhere to contracts."""
    assert MediaType.IMAGE.value == "IMAGE"
    assert MediaType.VIDEO.value == "VIDEO"
    assert MediaType.AUDIO.value == "AUDIO"

    assert MediaOperation.GENERATE.value == "GENERATE"
    assert MediaJobStatus.QUEUED.value == "QUEUED"
    assert MediaJobStatus.COMPLETED.value == "COMPLETED"
    assert MediaJobStatus.RESOURCE_DENIED.value == "RESOURCE_DENIED"

    assert ImageFormat.PNG.value == "PNG"
    assert ImageFormat.JPEG.value == "JPEG"
    assert ImageFormat.WEBP.value == "WEBP"


def test_image_generation_request_validation():
    """Test parameter alignment, limits, and hash calculation."""
    req = ImageGenerationRequest(
        prompt="A serene lake at dawn",
        width=512,
        height=512,
        steps=25,
        seed=42,
        batch_size=1,
        output_format=ImageFormat.PNG
    )
    assert req.width == 512
    assert req.height == 512

    # Deterministic hash
    h1 = req.compute_parameters_hash()
    h2 = req.compute_parameters_hash()
    assert h1 == h2
    assert len(h1) == 64

    # Dimension must be multiple of 64
    with pytest.raises(ValueError):
        ImageGenerationRequest(prompt="test", width=500, height=512)

    with pytest.raises(ValueError):
        ImageGenerationRequest(prompt="test", width=512, height=500)


def test_media_storage_path_sanitization():
    """Test safe filename generation and path traversal protections."""
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = MediaStorageManager(base_media_dir=tmpdir)

        # Normal generation
        full_path, rel_path = storage.generate_artifact_path("job_123", 0, ImageFormat.PNG)
        assert full_path.exists() is False
        assert full_path.name == "img_job_123_0.png"
        assert str(full_path).startswith(str(storage.images_dir))

        # Path traversal sanitized
        clean_name = storage.sanitize_filename_component("../../etc/passwd")
        assert ".." not in clean_name
        assert "/" not in clean_name

        # Reserved Windows name
        clean_con = storage.sanitize_filename_component("CON.png")
        assert clean_con == "safe_CON.png"


def test_media_storage_validation_and_registration():
    """Test actual image file verification, dimension check, and SHA-256 hashing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = MediaStorageManager(base_media_dir=tmpdir)
        full_path, rel_path = storage.generate_artifact_path("job_test", 0, ImageFormat.PNG)

        # Create a valid 256x256 test image
        img = np.zeros((256, 256, 3), dtype=np.uint8)
        img[:, :] = [100, 150, 200]
        cv2.imwrite(str(full_path), img)

        ok, artifact, msg = storage.validate_and_register_artifact(
            file_path=full_path,
            job_id="job_test",
            expected_format=ImageFormat.PNG,
            expected_width=256,
            expected_height=256,
            model_id="sd-turbo-local",
            parameters_hash="abc123hash",
            prompt_preview="Test preview",
            provenance="ACTUAL"
        )

        assert ok is True
        assert artifact is not None
        assert artifact.width == 256
        assert artifact.height == 256
        assert artifact.size_bytes > 0
        assert len(artifact.sha256) == 64
        assert artifact.provenance == "ACTUAL"


def test_media_storage_corrupt_file_rejection():
    """Test corrupt/invalid image file rejection."""
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = MediaStorageManager(base_media_dir=tmpdir)
        full_path, rel_path = storage.generate_artifact_path("job_corrupt", 0, ImageFormat.PNG)

        # Write corrupt text to image file
        with open(full_path, "w") as f:
            f.write("Not a real image file content")

        ok, artifact, msg = storage.validate_and_register_artifact(
            file_path=full_path,
            job_id="job_corrupt",
            expected_format=ImageFormat.PNG,
            expected_width=256,
            expected_height=256,
            model_id="sd-turbo-local",
            parameters_hash="abc123hash"
        )

        assert ok is False
        assert artifact is None
        assert "IMAGE_ARTIFACT_INVALID" in msg


def test_media_storage_delete():
    """Test safe file deletion within sandbox."""
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = MediaStorageManager(base_media_dir=tmpdir)
        full_path, rel_path = storage.generate_artifact_path("job_del", 0, ImageFormat.PNG)

        img = np.zeros((128, 128, 3), dtype=np.uint8)
        cv2.imwrite(str(full_path), img)
        assert full_path.exists()

        ok, msg = storage.delete_artifact(str(full_path))
        assert ok is True
        assert not full_path.exists()

        # Cannot delete outside media dir
        ok2, msg2 = storage.delete_artifact("C:/Windows/System32/drivers/etc/hosts")
        assert ok2 is False
        assert "Access denied" in msg2
