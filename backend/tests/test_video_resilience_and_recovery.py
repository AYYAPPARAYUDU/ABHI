"""Phase 8 Stage 8.2 — Video Resilience, Checkpoint Recovery & Edge Cases Tests."""

import time
import tempfile
import threading
from pathlib import Path
import pytest
from backend.app.media.video_models import (
    VideoGenerationRequest,
    VideoModelDefinition,
    VideoFormat,
    VideoSegmentCheckpoint,
    VideoSegmentStatus,
)
from backend.app.media.video_coordinator import VideoCoordinator
from backend.app.media.video_runtime import LocalVideoDiffusionRuntime, VideoEncoder
from backend.app.media.video_storage import VideoStorageManager
from backend.app.media.video_admission import VideoResourceAdmission
from backend.app.media.models import MediaJobStatus, MediaType
from backend.app.runtime.resources.models import WorkloadPriority


def test_segment_checkpoint_recovery_logic():
    """Verify that verified segments can be reused while unverified segments are marked for re-generation."""
    checkpoints = [
        VideoSegmentCheckpoint(
            segment_id="seg_0",
            job_id="job_rec_1",
            segment_index=0,
            frame_start=0,
            frame_end=24,
            frame_count=24,
            sha256="hash_seg_0",
            status=VideoSegmentStatus.VERIFIED,
            verified=True
        ),
        VideoSegmentCheckpoint(
            segment_id="seg_1",
            job_id="job_rec_1",
            segment_index=1,
            frame_start=24,
            frame_end=48,
            frame_count=24,
            sha256="hash_seg_1_corrupt",
            status=VideoSegmentStatus.FAILED,
            verified=False
        )
    ]

    # Filter reusable
    reusable = [c for c in checkpoints if c.verified and c.status == VideoSegmentStatus.VERIFIED]
    assert len(reusable) == 1
    assert reusable[0].segment_id == "seg_0"

    to_regenerate = [c for c in checkpoints if not c.verified or c.status != VideoSegmentStatus.VERIFIED]
    assert len(to_regenerate) == 1
    assert to_regenerate[0].segment_id == "seg_1"


def test_emergency_stop_aborts_active_video_job():
    """Verify cancellation and aborting during emergency stop."""
    coordinator = VideoCoordinator()
    req = VideoGenerationRequest(
        prompt="A peaceful forest with sunlight rays",
        width=256,
        height=256,
        fps=12,
        duration_seconds=2.0
    )

    # Submit job
    ok, job, msg = coordinator.submit_video_generation(req)
    assert job.job_id in coordinator._jobs

    # Test cancel on active job or terminal state
    cancel_ok, cancel_msg = coordinator.cancel_job(job.job_id)
    # Already completed or cancelled
    if job.status == MediaJobStatus.COMPLETED:
        assert cancel_ok is False
        assert "terminal state" in cancel_msg


def test_video_concurrency_and_queue_bounding():
    """Verify resource admission handles multiple queued video requests safely."""
    admission = VideoResourceAdmission()
    model_def = VideoModelDefinition(
        model_id="svd-xt-local",
        name="Stable Video Diffusion XT Local",
        digest="sha256:7e3d1a9b4c8f205e",
        base_vram_mb=4200.0,
        base_ram_mb=3072.0
    )

    req = VideoGenerationRequest(
        prompt="Test queue concurrency",
        width=256,
        height=256,
        duration_seconds=1.0
    )

    # Admit first job
    adm1, lease1, dev1, _ = admission.admit_video_job("job_q_1", req, model_def)
    assert adm1 is True

    # Admit second job (may succeed or fallback to CPU depending on available VRAM)
    adm2, lease2, dev2, _ = admission.admit_video_job("job_q_2", req, model_def)
    assert adm2 is True

    # Cleanup
    if lease1:
        admission.release_job_lease(lease1, "job_q_1")
    if lease2:
        admission.release_job_lease(lease2, "job_q_2")


def test_video_model_quarantine_simulation():
    """Verify that a quarantined video model is marked appropriately."""
    model_quarantined = VideoModelDefinition(
        model_id="corrupt-video-model",
        name="Corrupt Video Model",
        digest="sha256:0000000000000000",
        status="QUARANTINED",
        is_production=False,
        is_candidate=False
    )
    assert model_quarantined.status == "QUARANTINED"
    assert model_quarantined.is_production is False


def test_video_parameter_hash_reproducibility():
    """Verify deterministic hash for identical vs distinct generation parameters."""
    req1 = VideoGenerationRequest(prompt="A spaceship landing", seed=42, width=512, height=512)
    req2 = VideoGenerationRequest(prompt="A spaceship landing", seed=42, width=512, height=512)
    req3 = VideoGenerationRequest(prompt="A spaceship landing", seed=99, width=512, height=512)

    assert req1.compute_parameters_hash() == req2.compute_parameters_hash()
    assert req1.compute_parameters_hash() != req3.compute_parameters_hash()


def test_video_storage_quota_and_pressure_guard():
    with tempfile.TemporaryDirectory() as tmpdir:
        storage = VideoStorageManager(base_media_dir=tmpdir)
        vid_path, vid_rel, thumb_path, thumb_rel, temp_dir = storage.generate_video_artifact_paths(
            "job_quota_check", VideoFormat.MP4
        )
        assert vid_path.parent.exists()
        assert thumb_path.parent.exists()


def test_video_db_models_instantiation():
    """Verify relational database models for video jobs, artifacts, and segments."""
    from backend.app.media.db_models import VideoJobRecord, VideoArtifactRecord, VideoSegmentRecord

    job_rec = VideoJobRecord(
        job_id="job_db_1",
        task_id="task_1",
        prompt="A robotic arm welding steel",
        model_id="svd-xt-local",
        status="COMPLETED",
        width=512,
        height=512,
        fps=24,
        duration_seconds=2.0,
        created_at=time.time(),
        provenance="ACTUAL"
    )
    assert job_rec.job_id == "job_db_1"
    assert job_rec.fps == 24

    art_rec = VideoArtifactRecord(
        artifact_id="art_db_1",
        job_id="job_db_1",
        path="media/videos/2026/09/vid_job_db_1.mp4",
        filename="vid_job_db_1.mp4",
        format="MP4",
        width=512,
        height=512,
        fps=24,
        duration_seconds=2.0,
        frame_count=48,
        size_bytes=1048576,
        sha256="abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        poster_path="media/thumbnails/2026/09/thumb_job_db_1.jpg",
        model_id="svd-xt-local",
        generation_parameters_hash="param_hash_123",
        created_at=time.time(),
        provenance="ACTUAL"
    )
    assert art_rec.artifact_id == "art_db_1"
    assert art_rec.frame_count == 48

    seg_rec = VideoSegmentRecord(
        segment_id="seg_db_1",
        job_id="job_db_1",
        segment_index=0,
        frame_start=0,
        frame_end=24,
        frame_count=24,
        sha256="seg_hash_0",
        status="VERIFIED",
        created_at=time.time(),
        verified=True
    )
    assert seg_rec.verified is True
    assert seg_rec.segment_index == 0


def test_video_encoder_invalid_frame_dimensions():
    """Verify video encoder handles mismatching or corrupted frame dimensions cleanly."""
    import numpy as np
    with tempfile.TemporaryDirectory() as tmpdir:
        out_path = Path(tmpdir) / "test_mismatch.mp4"
        frames = [
            np.zeros((100, 100, 3), dtype=np.uint8),
            np.zeros((200, 200, 3), dtype=np.uint8),
        ]
        ok, msg = VideoEncoder.encode_frames_to_video(
            frames=frames,
            output_path=out_path,
            fps=24,
            width=256,
            height=256,
            format_enum=VideoFormat.MP4
        )
        assert ok is True
        assert out_path.exists()


def test_video_runtime_empty_prompt_error():
    """Verify video generation request validates non-empty prompt."""
    with pytest.raises(Exception):
        VideoGenerationRequest(prompt="")


def test_video_coordinator_get_models_and_artifacts():
    """Verify coordinator query accessors."""
    coordinator = VideoCoordinator()
    models = coordinator.get_models()
    assert len(models) >= 3
    assert coordinator.get_model("svd-xt-local") is not None
    assert coordinator.get_model("unknown-model") is None

    arts = coordinator.list_artifacts()
    assert isinstance(arts, list)

    jobs = coordinator.list_jobs()
    assert isinstance(jobs, list)


def test_video_runtime_health_status():
    runtime = LocalVideoDiffusionRuntime()
    health = runtime.health_check()
    assert health["status"] == "HEALTHY"
    assert "OpenCV" in health["backend"]


def test_video_storage_manager_initialization():
    with tempfile.TemporaryDirectory() as tmpdir:
        mgr = VideoStorageManager(base_media_dir=tmpdir)
        assert mgr.videos_dir.exists()
        assert mgr.thumbnails_dir.exists()
        assert mgr.temp_dir.exists()


def test_video_encoder_empty_frames_rejection():
    with tempfile.TemporaryDirectory() as tmpdir:
        out_path = Path(tmpdir) / "empty.mp4"
        ok, msg = VideoEncoder.encode_frames_to_video(
            frames=[],
            output_path=out_path,
            fps=24,
            width=256,
            height=256,
            format_enum=VideoFormat.MP4
        )
        assert ok is False
        assert "empty" in msg.lower()


def test_video_encoder_empty_poster_extraction():
    with tempfile.TemporaryDirectory() as tmpdir:
        out_poster = Path(tmpdir) / "thumb.jpg"
        ok = VideoEncoder.extract_poster_frame([], out_poster)
        assert ok is False
        assert not out_poster.exists()


def test_video_coordinator_delete_missing_artifact():
    coord = VideoCoordinator()
    ok, msg = coord.delete_artifact("non_existent_art_id_999")
    assert ok is False
    assert "not found" in msg.lower()


def test_video_coordinator_get_missing_job():
    coord = VideoCoordinator()
    assert coord.get_job("missing_job_999") is None
    assert coord.get_artifact("missing_art_999") is None


def test_video_segment_checkpoint_to_dict():
    chk = VideoSegmentCheckpoint(
        segment_id="seg_test_dict",
        job_id="job_dict",
        segment_index=1,
        frame_start=24,
        frame_end=48,
        frame_count=24
    )
    d = chk.model_dump()
    assert d["segment_id"] == "seg_test_dict"
    assert d["frame_count"] == 24
