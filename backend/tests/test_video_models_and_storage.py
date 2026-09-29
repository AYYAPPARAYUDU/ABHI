"""Phase 8 Stage 8.2 — Video Domain Models & Storage Validation Unit Tests."""

import os
import tempfile
import pytest
from pathlib import Path
import numpy as np
import cv2
from pydantic import ValidationError
from backend.app.media.video_models import (
    VideoGenerationRequest,
    VideoModelDefinition,
    VideoArtifact,
    VideoFormat,
    VideoType,
    VideoSegmentCheckpoint,
    VideoSegmentStatus,
)
from backend.app.media.video_storage import VideoStorageManager


def test_video_generation_request_validations():
    # 1. Valid request
    req = VideoGenerationRequest(
        prompt="A serene waterfall with lush green foliage",
        width=512,
        height=512,
        fps=24,
        duration_seconds=2.0,
        steps=25,
        output_format=VideoFormat.MP4
    )
    assert req.total_frame_count == 48
    assert len(req.compute_parameters_hash()) == 64

    # 2. Invalid dimensions (not divisible by 64)
    with pytest.raises(ValidationError):
        VideoGenerationRequest(prompt="Test", width=500, height=512)

    # 3. Invalid FPS
    with pytest.raises(ValidationError):
        VideoGenerationRequest(prompt="Test", fps=25)

    # 4. Out of bounds duration
    with pytest.raises(ValidationError):
        VideoGenerationRequest(prompt="Test", duration_seconds=15.0)


def test_video_storage_path_sanitization_and_sandboxing():
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = VideoStorageManager(base_media_dir=tmpdir)

        vid_path, vid_rel, thumb_path, thumb_rel, temp_dir = storage.generate_video_artifact_paths(
            "job_test_123", VideoFormat.MP4
        )

        assert vid_path.name == "vid_job_test_123.mp4"
        assert thumb_path.name == "thumb_job_test_123.jpg"
        assert "videos" in vid_rel
        assert "thumbnails" in thumb_rel
        assert str(vid_path).startswith(str(storage.videos_dir))

        # Path traversal prevention
        clean = storage.sanitize_filename_component("../../etc/passwd")
        assert ".." not in clean
        assert "/" not in clean
        assert "\\" not in clean


def test_video_artifact_validation_and_registration():
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = VideoStorageManager(base_media_dir=tmpdir)

        vid_path, vid_rel, thumb_path, thumb_rel, temp_dir = storage.generate_video_artifact_paths(
            "job_val_001", VideoFormat.MP4
        )

        # Create a valid test MP4 video using OpenCV
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(str(vid_path), fourcc, 24.0, (512, 512), isColor=True)
        for i in range(48):
            frame = np.full((512, 512, 3), (i * 5) % 256, dtype=np.uint8)
            writer.write(frame)
        writer.release()

        # Create valid thumbnail
        cv2.imwrite(str(thumb_path), np.zeros((512, 512, 3), dtype=np.uint8))

        ok, artifact, msg = storage.validate_and_register_video_artifact(
            file_path=vid_path,
            poster_path=thumb_path,
            job_id="job_val_001",
            expected_format=VideoFormat.MP4,
            expected_width=512,
            expected_height=512,
            expected_fps=24,
            expected_duration_seconds=2.0,
            model_id="svd-xt-local",
            parameters_hash="test_hash_123",
            prompt_preview="A waterfall",
            provenance="ACTUAL"
        )

        assert ok is True
        assert artifact is not None
        assert artifact.fps == 24
        assert artifact.frame_count == 48
        assert artifact.width == 512
        assert artifact.height == 512
        assert len(artifact.sha256) == 64
        assert artifact.provenance == "ACTUAL"


def test_video_corrupt_file_rejection():
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = VideoStorageManager(base_media_dir=tmpdir)
        corrupt_file = Path(tmpdir) / "videos" / "corrupt.mp4"
        corrupt_file.parent.mkdir(parents=True, exist_ok=True)
        corrupt_file.write_bytes(b"NOT_A_REAL_VIDEO_HEADER_1234567890")

        ok, artifact, msg = storage.validate_and_register_video_artifact(
            file_path=corrupt_file,
            poster_path=None,
            job_id="job_corrupt",
            expected_format=VideoFormat.MP4,
            expected_width=512,
            expected_height=512,
            expected_fps=24,
            expected_duration_seconds=2.0,
            model_id="svd-xt-local",
            parameters_hash="hash"
        )

        assert ok is False
        assert "VIDEO_ARTIFACT_INVALID" in msg
        assert artifact is None


def test_video_temp_workspace_cleanup():
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = VideoStorageManager(base_media_dir=tmpdir)
        temp_dir = storage.temp_dir / "job_temp_test"
        temp_dir.mkdir(parents=True, exist_ok=True)
        (temp_dir / "seg_0.mp4").write_bytes(b"temp_data")

        assert temp_dir.exists()
        storage.cleanup_temp_workspace(temp_dir)
        assert not temp_dir.exists()


def test_video_artifact_delete():
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = VideoStorageManager(base_media_dir=tmpdir)
        vid_path, vid_rel, thumb_path, thumb_rel, temp_dir = storage.generate_video_artifact_paths(
            "job_del", VideoFormat.MP4
        )
        vid_path.write_bytes(b"dummy_video_data")
        thumb_path.write_bytes(b"dummy_thumb_data")

        assert vid_path.exists()
        assert thumb_path.exists()

        ok, msg = storage.delete_video_artifact(str(vid_path))
        assert ok is True
        assert not vid_path.exists()


def test_video_model_definitions_catalog():
    model_prod = VideoModelDefinition(
        model_id="svd-xt-local",
        name="Stable Video Diffusion XT Local",
        digest="sha256:7e3d1a9b4c8f205e",
        runtime="Local-Video-Diffusion-Engine",
        format="Diffusers-Video",
        quantization="FP16",
        base_vram_mb=4200.0,
        per_second_vram_mb=280.0,
        base_ram_mb=3072.0,
        gpu_compute_percent=75.0,
        is_production=True,
        is_candidate=False
    )
    assert model_prod.is_production is True
    assert model_prod.is_candidate is False
    assert 24 in model_prod.supported_fps

    model_cand = VideoModelDefinition(
        model_id="cogvideox-candidate",
        name="CogVideoX 2B (Candidate)",
        digest="sha256:3d7a1c9e8b2f4501",
        quantization="INT8",
        base_vram_mb=5600.0,
        is_production=False,
        is_candidate=True
    )
    assert model_cand.is_candidate is True
    assert model_cand.quantization == "INT8"


def test_video_segment_checkpoint_model():
    chk = VideoSegmentCheckpoint(
        segment_id="seg_0_0_24",
        job_id="job_chk_1",
        segment_index=0,
        frame_start=0,
        frame_end=24,
        frame_count=24,
        status=VideoSegmentStatus.PENDING
    )
    assert chk.verified is False
    assert chk.frame_count == 24
    chk.status = VideoSegmentStatus.VERIFIED
    chk.verified = True
    assert chk.status == VideoSegmentStatus.VERIFIED


def test_video_path_traversal_adversarial():
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = VideoStorageManager(base_media_dir=tmpdir)
        # Attempt null bytes and traversal tokens
        sanitized = storage.sanitize_filename_component("job\0_evil/../CON/secret.mp4")
        assert "\0" not in sanitized
        assert ".." not in sanitized
        assert "/" not in sanitized
        assert not sanitized.startswith("CON")


def test_video_empty_and_zero_frame_handling():
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = VideoStorageManager(base_media_dir=tmpdir)
        empty_file = Path(tmpdir) / "empty.mp4"
        empty_file.touch()

        ok, art, msg = storage.validate_and_register_video_artifact(
            file_path=empty_file,
            poster_path=None,
            job_id="job_empty",
            expected_format=VideoFormat.MP4,
            expected_width=512,
            expected_height=512,
            expected_fps=24,
            expected_duration_seconds=2.0,
            model_id="svd-xt-local",
            parameters_hash="hash"
        )
        assert ok is False
        assert "empty" in msg.lower() or "0 bytes" in msg.lower()


def test_video_generation_quality_profiles():
    req1 = VideoGenerationRequest(prompt="Test HD", quality_profile="HD")
    assert req1.quality_profile == "HD"

    req2 = VideoGenerationRequest(prompt="Test Draft", quality_profile="DRAFT")
    assert req2.quality_profile == "DRAFT"


def test_video_supported_operations_in_model_def():
    model = VideoModelDefinition(
        model_id="test-vid-ops",
        name="Test Operations Model",
        digest="sha256:ops123",
        supported_operations=["TEXT_TO_VIDEO"]
    )
    assert "TEXT_TO_VIDEO" in model.supported_operations
    assert "IMAGE_TO_VIDEO" not in model.supported_operations


def test_video_total_frame_count_property():
    req12 = VideoGenerationRequest(prompt="Test 12fps", fps=12, duration_seconds=3.0)
    assert req12.total_frame_count == 36

    req30 = VideoGenerationRequest(prompt="Test 30fps", fps=30, duration_seconds=2.0)
    assert req30.total_frame_count == 60


def test_video_artifact_provenance_marking():
    art = VideoArtifact(
        artifact_id="art_prov_1",
        job_id="job_prov_1",
        path="media/videos/2026/09/vid_test.mp4",
        filename="vid_test.mp4",
        format=VideoFormat.MP4,
        width=512,
        height=512,
        fps=24,
        duration_seconds=2.0,
        frame_count=48,
        size_bytes=500000,
        sha256="abcdef",
        model_id="svd-xt-local",
        generation_parameters_hash="param_hash",
        provenance="ACTUAL"
    )
    assert art.provenance == "ACTUAL"
    assert art.media_type == "VIDEO"
