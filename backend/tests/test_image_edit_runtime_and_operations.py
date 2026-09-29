"""Phase 8 Stage 8.3 — Image Edit Runtime, Operations & Lifecycle Tests."""

import os
import time
import pytest
import threading
import numpy as np
import cv2
from pathlib import Path
from backend.app.media.models import ImageFormat
from backend.app.media.edit_models import (
    ImageEditRequest,
    ImageEditType,
    ImageEditModelDefinition,
    OutpaintBounds,
)
from backend.app.media.edit_runtime import LocalImageEditDiffusionRuntime


@pytest.fixture
def runtime():
    return LocalImageEditDiffusionRuntime()


@pytest.fixture
def edit_model():
    return ImageEditModelDefinition(
        model_id="test-edit-model",
        name="Test Edit Model",
        version="1.0.0",
        digest="sha256:11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
        runtime="Local-ImageEdit-Diffusion-Engine",
        base_vram_mb=3500.0,
        base_ram_mb=2000.0,
        gpu_compute_percent=60.0,
        supported_operations=[ImageEditType.IMAGE_TO_IMAGE, ImageEditType.INPAINTING, ImageEditType.OUTPAINTING],
    )


def test_runtime_model_lifecycle(runtime, edit_model):
    """Test loading, warming, and unloading of editing models."""
    assert not runtime.is_model_warm(edit_model.model_id)

    ok, msg = runtime.load_model(edit_model, device="GPU")
    assert ok is True
    assert runtime.is_model_warm(edit_model.model_id)

    health = runtime.health_check()
    assert health["status"] == "HEALTHY"
    assert edit_model.model_id in health["loaded_models"]

    ok_u, msg_u = runtime.unload_model(edit_model.model_id)
    assert ok_u is True
    assert not runtime.is_model_warm(edit_model.model_id)


def test_image_to_image_operation(runtime, edit_model, tmp_path):
    """Test image-to-image execution and strength modulation."""
    src = np.full((512, 512, 3), 128, dtype=np.uint8)
    out_file = tmp_path / "img2img_out.png"

    req = ImageEditRequest(
        source_artifact_id="art_src_001",
        operation=ImageEditType.IMAGE_TO_IMAGE,
        prompt="Make it a watercolor painting with vibrant colors",
        strength=0.8,
        steps=10,
        seed=42,
        output_format=ImageFormat.PNG
    )

    ok, meta, out_img, msg = runtime.execute_edit(
        request=req,
        model_def=edit_model,
        source_image=src,
        output_path=out_file,
        device="GPU"
    )

    assert ok is True
    assert out_img is not None
    assert out_file.exists()
    assert meta["operation"] == "IMAGE_TO_IMAGE"
    assert meta["seed"] == 42
    assert meta["width"] == 512
    assert meta["height"] == 512
    assert meta["provenance"] == "ACTUAL"


def test_inpainting_operation(runtime, edit_model, tmp_path):
    """Test inpainting operation preserving unmasked region."""
    src = np.full((512, 512, 3), 50, dtype=np.uint8)
    mask = np.zeros((512, 512), dtype=np.uint8)
    # Mask a central region (200:300, 200:300)
    mask[200:300, 200:300] = 255

    out_file = tmp_path / "inpaint_out.png"
    req = ImageEditRequest(
        source_artifact_id="art_src_001",
        operation=ImageEditType.INPAINTING,
        prompt="A golden trophy on a wooden table",
        steps=10,
        seed=100,
        output_format=ImageFormat.PNG
    )

    ok, meta, out_img, msg = runtime.execute_edit(
        request=req,
        model_def=edit_model,
        source_image=src,
        mask_image=mask,
        output_path=out_file,
        device="GPU"
    )

    assert ok is True
    assert out_img is not None
    assert out_file.exists()
    assert meta["operation"] == "INPAINTING"

    # Verify unmasked corner pixel is closely preserved (near original value 50)
    assert abs(int(out_img[10, 10, 0]) - 50) < 5


def test_outpainting_operation(runtime, edit_model, tmp_path):
    """Test outpainting canvas expansion and interior preservation."""
    src = np.full((512, 512, 3), 180, dtype=np.uint8)
    bounds = OutpaintBounds(top=64, bottom=64, left=64, right=64)

    out_file = tmp_path / "outpaint_out.png"
    req = ImageEditRequest(
        source_artifact_id="art_src_001",
        operation=ImageEditType.OUTPAINTING,
        prompt="A futuristic cityscape horizon extending in all directions",
        outpaint_bounds=bounds,
        steps=10,
        seed=200,
        output_format=ImageFormat.PNG
    )

    ok, meta, out_img, msg = runtime.execute_edit(
        request=req,
        model_def=edit_model,
        source_image=src,
        output_path=out_file,
        device="GPU"
    )

    assert ok is True
    assert out_img is not None
    assert out_file.exists()
    assert meta["width"] == 640
    assert meta["height"] == 640

    # Interior center pixel was placed at (256+64, 256+64) = (320, 320)
    assert abs(int(out_img[320, 320, 0]) - 180) < 5


def test_runtime_cancellation(runtime, edit_model, tmp_path):
    """Test that cancellation signal stops editing promptly."""
    src = np.zeros((512, 512, 3), dtype=np.uint8)
    out_file = tmp_path / "cancelled_out.png"

    cancel_event = threading.Event()
    cancel_event.set()  # Cancel immediately

    req = ImageEditRequest(
        source_artifact_id="art_src_001",
        operation=ImageEditType.IMAGE_TO_IMAGE,
        prompt="High steps render to cancel",
        steps=40,
    )

    ok, meta, out_img, msg = runtime.execute_edit(
        request=req,
        model_def=edit_model,
        source_image=src,
        output_path=out_file,
        cancel_event=cancel_event
    )

    assert ok is False
    assert "cancelled" in msg.lower()
