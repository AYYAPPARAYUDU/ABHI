"""Phase 8 Stage 8.3 — Image Edit Workload Admission & Preemption Tests."""

import pytest
from backend.app.media.edit_models import (
    ImageEditRequest,
    ImageEditModelDefinition,
    ImageEditType,
    OutpaintBounds,
)
from backend.app.media.edit_admission import ImageEditResourceAdmission
from backend.app.runtime.resources.manager import resource_manager
from backend.app.runtime.resources.models import WorkloadPriority


@pytest.fixture
def admission():
    return ImageEditResourceAdmission()


@pytest.fixture
def edit_model():
    return ImageEditModelDefinition(
        model_id="test-edit-admission-model",
        name="Test Edit Model",
        version="1.0.0",
        digest="sha256:aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899",
        runtime="Local-ImageEdit-Diffusion-Engine",
        base_vram_mb=3500.0,
        base_ram_mb=2048.0,
        gpu_compute_percent=60.0,
        supported_operations=[ImageEditType.IMAGE_TO_IMAGE, ImageEditType.INPAINTING, ImageEditType.OUTPAINTING],
    )


def test_resource_estimation_scaling(admission, edit_model):
    """Test estimation for different operations, strengths, and resolutions."""
    req_base = ImageEditRequest(
        source_artifact_id="art_001",
        operation=ImageEditType.IMAGE_TO_IMAGE,
        prompt="A photo of a cybernetic cat",
        strength=0.75,
        steps=25
    )

    reqs_base = admission.calculate_resource_requirements(req_base, edit_model, 512, 512)
    assert 3000.0 < reqs_base["vram_mb"] < 4500.0
    assert reqs_base["target_width"] == 512
    assert reqs_base["target_height"] == 512

    # Inpainting estimation
    req_inpaint = ImageEditRequest(
        source_artifact_id="art_001",
        operation=ImageEditType.INPAINTING,
        prompt="A photo of a cybernetic cat",
        steps=25
    )
    reqs_inpaint = admission.calculate_resource_requirements(req_inpaint, edit_model, 512, 512)
    assert reqs_inpaint["vram_mb"] > reqs_base["vram_mb"]

    # Outpainting with expanded resolution
    req_outpaint = ImageEditRequest(
        source_artifact_id="art_001",
        operation=ImageEditType.OUTPAINTING,
        prompt="Expand landscape",
        outpaint_bounds=OutpaintBounds(top=64, bottom=64, left=64, right=64),
        steps=25
    )
    reqs_outpaint = admission.calculate_resource_requirements(req_outpaint, edit_model, 512, 512)
    assert reqs_outpaint["target_width"] == 640
    assert reqs_outpaint["target_height"] == 640
    assert reqs_outpaint["vram_mb"] > reqs_inpaint["vram_mb"]


def test_vram_hard_limit_fallback_to_cpu(admission, edit_model):
    """Test that oversized edit requests exceeding VRAM limit fall back to CPU."""
    # Create oversized model requiring > 6,400 MB VRAM
    huge_model = ImageEditModelDefinition(
        model_id="huge-edit-model",
        name="Huge Edit Model",
        version="1.0.0",
        digest="sha256:11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff",
        runtime="Local-ImageEdit-Diffusion-Engine",
        base_vram_mb=7000.0,  # Exceeds 6,400 MB
        base_ram_mb=3000.0,
        gpu_compute_percent=90.0,
    )

    req = ImageEditRequest(
        source_artifact_id="art_001",
        operation=ImageEditType.IMAGE_TO_IMAGE,
        prompt="Huge render",
        preferred_device="GPU"
    )

    admitted, msg, reqs = admission.evaluate_admission(req, huge_model, 512, 512)
    assert admitted is True
    # Device must fall back to CPU
    assert reqs["device"] == "CPU"


def test_lease_acquisition_and_release(admission, edit_model):
    """Test lease acquisition and release with central resource manager."""
    req = ImageEditRequest(
        source_artifact_id="art_001",
        operation=ImageEditType.IMAGE_TO_IMAGE,
        prompt="Test lease workflow",
        preferred_device="GPU"
    )

    reqs = admission.calculate_resource_requirements(req, edit_model, 512, 512)
    ok, lease, msg = admission.acquire_lease("job_lease_test_001", reqs, priority=WorkloadPriority.P1_INTERACTIVE_USER)

    assert ok is True
    assert lease is not None

    # Release lease
    admission.release_lease(lease)

