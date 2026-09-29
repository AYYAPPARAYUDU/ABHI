"""Unit tests for Phase 8 Stage 8.1 Local Image Runtime & Generation Engine."""

import time
import tempfile
import threading
from pathlib import Path
import pytest
import numpy as np
import cv2

from backend.app.media.models import (
    ImageGenerationRequest,
    ImageModelDefinition,
    ImageFormat,
    QualityProfile,
)
from backend.app.media.runtime import LocalDiffusionRuntime


@pytest.fixture
def sample_model_def():
    return ImageModelDefinition(
        model_id="test-sd-local",
        name="Test SD Local",
        version="1.0.0",
        digest="sha256:testdigest123",
        runtime="Local-Diffusion-Engine",
        format="Diffusers-Local",
        quantization="FP16",
        base_vram_mb=3000.0,
        base_ram_mb=2048.0,
        gpu_compute_percent=50.0,
        is_production=True
    )


def test_runtime_model_lifecycle(sample_model_def):
    """Test model loading, warming check, and unloading."""
    runtime = LocalDiffusionRuntime()
    assert runtime.is_model_warm(sample_model_def.model_id) is False

    ok, msg = runtime.load_model(sample_model_def, device="GPU")
    assert ok is True
    assert runtime.is_model_warm(sample_model_def.model_id) is True

    health = runtime.health_check()
    assert health["status"] == "HEALTHY"
    assert sample_model_def.model_id in health["loaded_models"]

    ok_unload, msg_unload = runtime.unload_model(sample_model_def.model_id)
    assert ok_unload is True
    assert runtime.is_model_warm(sample_model_def.model_id) is False


def test_runtime_image_generation_actual(sample_model_def):
    """Test actual image generation producing real PNG file with correct dimensions."""
    runtime = LocalDiffusionRuntime()
    with tempfile.TemporaryDirectory() as tmpdir:
        out_path = Path(tmpdir) / "output.png"
        req = ImageGenerationRequest(
            prompt="A futuristic neon cityscape",
            width=256,
            height=256,
            steps=10,
            seed=12345,
            output_format=ImageFormat.PNG
        )

        progresses = []
        def on_prog(pct, phase):
            progresses.append((pct, phase))

        ok, meta, msg = runtime.generate(
            request=req,
            model_def=sample_model_def,
            output_path=out_path,
            device="GPU",
            progress_callback=on_prog
        )

        assert ok is True
        assert out_path.exists()
        assert meta["duration_ms"] > 0
        assert meta["seed"] == 12345
        assert meta["provenance"] == "ACTUAL"
        assert len(progresses) > 0

        # Read generated image and verify
        img = cv2.imread(str(out_path))
        assert img is not None
        assert img.shape == (256, 256, 3)


def test_runtime_deterministic_seed_reproduction(sample_model_def):
    """Test that identical seed produces identical output image bytes."""
    runtime = LocalDiffusionRuntime()
    with tempfile.TemporaryDirectory() as tmpdir:
        out_path1 = Path(tmpdir) / "out1.png"
        out_path2 = Path(tmpdir) / "out2.png"

        req = ImageGenerationRequest(
            prompt="A golden mountain summit",
            width=256,
            height=256,
            steps=8,
            seed=9999,
            output_format=ImageFormat.PNG
        )

        runtime.generate(req, sample_model_def, out_path1)
        runtime.generate(req, sample_model_def, out_path2)

        img1 = cv2.imread(str(out_path1))
        img2 = cv2.imread(str(out_path2))

        assert np.array_equal(img1, img2)


def test_runtime_formats_support(sample_model_def):
    """Test output generation across PNG, JPEG, and WEBP."""
    runtime = LocalDiffusionRuntime()
    with tempfile.TemporaryDirectory() as tmpdir:
        for fmt in [ImageFormat.PNG, ImageFormat.JPEG, ImageFormat.WEBP]:
            ext = fmt.value.lower()
            out_file = Path(tmpdir) / f"test.{ext}"
            req = ImageGenerationRequest(
                prompt="Forest waterfall",
                width=256,
                height=256,
                steps=5,
                output_format=fmt
            )
            ok, meta, msg = runtime.generate(req, sample_model_def, out_file)
            assert ok is True
            assert out_file.exists()
            assert out_file.stat().st_size > 0


def test_runtime_cancellation(sample_model_def):
    """Test user cancellation during sampling steps."""
    runtime = LocalDiffusionRuntime()
    with tempfile.TemporaryDirectory() as tmpdir:
        out_path = Path(tmpdir) / "cancelled.png"
        req = ImageGenerationRequest(
            prompt="Slow complex render",
            width=512,
            height=512,
            steps=50,
            output_format=ImageFormat.PNG
        )

        cancel_ev = threading.Event()
        # Trigger cancellation after short delay
        threading.Timer(0.01, cancel_ev.set).start()

        ok, meta, msg = runtime.generate(
            request=req,
            model_def=sample_model_def,
            output_path=out_path,
            cancel_event=cancel_ev
        )

        assert ok is False
        assert "cancelled" in msg.lower()


def test_runtime_timeout(sample_model_def):
    """Test timeout enforcement."""
    runtime = LocalDiffusionRuntime()
    with tempfile.TemporaryDirectory() as tmpdir:
        out_path = Path(tmpdir) / "timeout.png"
        req = ImageGenerationRequest(
            prompt="Timeout test",
            width=512,
            height=512,
            steps=50,
            output_format=ImageFormat.PNG
        )

        # Set ultra small timeout (0.001s)
        ok, meta, msg = runtime.generate(
            request=req,
            model_def=sample_model_def,
            output_path=out_path,
            timeout_sec=0.001
        )

        assert ok is False
        assert "timed out" in msg.lower()
