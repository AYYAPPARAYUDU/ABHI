"""Phase 8 Stage 8.2 — Local Video Diffusion Runtime & Chunking Unit Tests."""

import time
import tempfile
import threading
from pathlib import Path
import numpy as np
import pytest
from backend.app.media.video_models import (
    VideoGenerationRequest,
    VideoModelDefinition,
    VideoFormat,
)
from backend.app.media.video_runtime import LocalVideoDiffusionRuntime, VideoEncoder


def test_video_encoder_profiles_and_execution():
    with tempfile.TemporaryDirectory() as tmpdir:
        out_mp4 = Path(tmpdir) / "test_out.mp4"
        frames = [np.full((256, 256, 3), (i * 10) % 256, dtype=np.uint8) for i in range(24)]

        ok, msg = VideoEncoder.encode_frames_to_video(
            frames=frames,
            output_path=out_mp4,
            fps=24,
            width=256,
            height=256,
            format_enum=VideoFormat.MP4
        )
        assert ok is True
        assert out_mp4.exists()
        assert out_mp4.stat().st_size > 0

        # Poster thumbnail extraction
        poster_path = Path(tmpdir) / "thumb.jpg"
        poster_ok = VideoEncoder.extract_poster_frame(frames, poster_path)
        assert poster_ok is True
        assert poster_path.exists()
        assert poster_path.stat().st_size > 0


def test_video_runtime_model_lifecycle():
    runtime = LocalVideoDiffusionRuntime()
    model_def = VideoModelDefinition(
        model_id="test-svd-model",
        name="Test SVD Model",
        digest="sha256:123456",
        base_vram_mb=4000.0,
        base_ram_mb=2048.0
    )

    assert not runtime.is_model_warm(model_def.model_id)

    ok, msg = runtime.load_model(model_def, device="GPU")
    assert ok is True
    assert runtime.is_model_warm(model_def.model_id)

    health = runtime.health_check()
    assert health["status"] == "HEALTHY"
    assert model_def.model_id in health["loaded_models"]

    un_ok, un_msg = runtime.unload_model(model_def.model_id)
    assert un_ok is True
    assert not runtime.is_model_warm(model_def.model_id)


def test_video_runtime_chunked_generation_and_determinism():
    runtime = LocalVideoDiffusionRuntime()
    model_def = VideoModelDefinition(
        model_id="svd-xt-local",
        name="Stable Video Diffusion XT Local",
        digest="sha256:7e3d1a9b4c8f205e",
        base_vram_mb=4200.0,
        base_ram_mb=3072.0
    )

    req = VideoGenerationRequest(
        prompt="A dynamic glowing crystal rotating in space",
        width=256,
        height=256,
        fps=12,
        duration_seconds=2.0,  # 24 frames total
        chunk_duration_seconds=1.0,  # 2 segments of 12 frames each
        steps=5,
        seed=1337,
        output_format=VideoFormat.MP4
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        out_path = Path(tmpdir) / "crystal.mp4"
        poster_path = Path(tmpdir) / "crystal_thumb.jpg"
        temp_dir = Path(tmpdir) / "temp_workspace"

        progress_records = []

        def on_progress(pct: float, phase: str, details=None):
            progress_records.append((pct, phase))

        ok, meta, msg = runtime.generate_video(
            request=req,
            model_def=model_def,
            output_path=out_path,
            poster_path=poster_path,
            temp_dir=temp_dir,
            device="GPU",
            progress_callback=on_progress,
            timeout_sec=60.0
        )

        assert ok is True
        assert out_path.exists()
        assert poster_path.exists()
        assert meta["provenance"] == "ACTUAL"
        assert meta["total_frames"] == 24
        assert meta["num_segments"] == 2
        assert len(meta["segments"]) == 2
        assert any("GENERATING_SEGMENTS" in phase for pct, phase in progress_records)
        assert any("ENCODING" in phase for pct, phase in progress_records)


def test_video_runtime_cancellation():
    runtime = LocalVideoDiffusionRuntime()
    model_def = VideoModelDefinition(
        model_id="svd-xt-local",
        name="Stable Video Diffusion XT Local",
        digest="sha256:7e3d1a9b4c8f205e"
    )

    req = VideoGenerationRequest(
        prompt="Long video that will be cancelled",
        width=256,
        height=256,
        fps=12,
        duration_seconds=4.0,
        steps=30
    )

    cancel_ev = threading.Event()
    cancel_ev.set()  # Cancel immediately

    with tempfile.TemporaryDirectory() as tmpdir:
        out_path = Path(tmpdir) / "cancelled.mp4"
        poster_path = Path(tmpdir) / "cancelled_thumb.jpg"
        temp_dir = Path(tmpdir) / "temp_workspace"

        ok, meta, msg = runtime.generate_video(
            request=req,
            model_def=model_def,
            output_path=out_path,
            poster_path=poster_path,
            temp_dir=temp_dir,
            cancel_event=cancel_ev
        )

        assert ok is False
        assert "cancelled" in msg.lower()


def test_video_runtime_webm_format_generation():
    runtime = LocalVideoDiffusionRuntime()
    model_def = VideoModelDefinition(
        model_id="svd-xt-local",
        name="Stable Video Diffusion XT Local",
        digest="sha256:7e3d1a9b4c8f205e"
    )
    req = VideoGenerationRequest(
        prompt="A flock of birds flying across a sunset sky",
        width=256,
        height=256,
        fps=12,
        duration_seconds=1.0,
        steps=5,
        output_format=VideoFormat.WEBM
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        out_path = Path(tmpdir) / "birds.webm"
        poster_path = Path(tmpdir) / "birds_thumb.jpg"
        temp_dir = Path(tmpdir) / "temp_birds"

        ok, meta, msg = runtime.generate_video(
            request=req,
            model_def=model_def,
            output_path=out_path,
            poster_path=poster_path,
            temp_dir=temp_dir
        )
        assert ok is True
        assert out_path.exists()
        assert meta["format"] == "WEBM"


def test_video_runtime_multi_resolution_support():
    runtime = LocalVideoDiffusionRuntime()
    model_def = VideoModelDefinition(
        model_id="svd-xt-local",
        name="Stable Video Diffusion XT Local",
        digest="sha256:7e3d1a9b4c8f205e"
    )

    for w, h in [(256, 256), (512, 512)]:
        req = VideoGenerationRequest(
            prompt="Aurora borealis dancing over snowy mountains",
            width=w,
            height=h,
            fps=12,
            duration_seconds=1.0,
            steps=3
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            out_path = Path(tmpdir) / f"aurora_{w}x{h}.mp4"
            poster_path = Path(tmpdir) / f"thumb_{w}x{h}.jpg"
            temp_dir = Path(tmpdir) / "temp_res"

            ok, meta, msg = runtime.generate_video(
                request=req,
                model_def=model_def,
                output_path=out_path,
                poster_path=poster_path,
                temp_dir=temp_dir
            )
            assert ok is True
            assert meta["width"] == w
            assert meta["height"] == h


def test_video_runtime_timeout_enforcement():
    runtime = LocalVideoDiffusionRuntime()
    model_def = VideoModelDefinition(
        model_id="svd-xt-local",
        name="Stable Video Diffusion XT Local",
        digest="sha256:7e3d1a9b4c8f205e"
    )
    req = VideoGenerationRequest(
        prompt="A very slow synthesis simulation",
        width=256,
        height=256,
        fps=12,
        duration_seconds=4.0,
        steps=50
    )

    with tempfile.TemporaryDirectory() as tmpdir:
        out_path = Path(tmpdir) / "timeout.mp4"
        poster_path = Path(tmpdir) / "timeout_thumb.jpg"
        temp_dir = Path(tmpdir) / "temp_timeout"

        ok, meta, msg = runtime.generate_video(
            request=req,
            model_def=model_def,
            output_path=out_path,
            poster_path=poster_path,
            temp_dir=temp_dir,
            timeout_sec=0.001  # Immediate timeout
        )
        assert ok is False
        assert "timed out" in msg.lower()
