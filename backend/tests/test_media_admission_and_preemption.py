"""Unit tests for Phase 8 Stage 8.1 Media Resource Admission & Budgeting."""

import pytest
from backend.app.media.models import ImageGenerationRequest, ImageModelDefinition, ImageFormat
from backend.app.media.admission import MediaResourceAdmission
from backend.app.runtime.resources.manager import CentralResourceManager
from backend.app.runtime.resources.models import (
    OperatingMode,
    WorkloadPriority,
    DeviceType,
    ResourcePressureLevel,
)


@pytest.fixture
def admission_system():
    rm = CentralResourceManager()
    rm.startup()
    adm = MediaResourceAdmission()
    adm.rm = rm
    return adm, rm


@pytest.fixture
def sample_model_def():
    return ImageModelDefinition(
        model_id="sd-turbo-local",
        name="SD-Turbo Local",
        digest="sha256:testdigest",
        base_vram_mb=3200.0,
        base_ram_mb=2048.0,
        gpu_compute_percent=60.0
    )


def test_resource_estimation_scaling(admission_system, sample_model_def):
    """Test that dynamic resource estimation scales with resolution and batch size."""
    adm, rm = admission_system

    # 512x512, batch 1
    req_512 = ImageGenerationRequest(prompt="test", width=512, height=512, batch_size=1, steps=20)
    prof_512 = adm.estimate_resource_requirements(req_512, sample_model_def)

    # 1024x1024, batch 2
    req_1024 = ImageGenerationRequest(prompt="test", width=1024, height=1024, batch_size=2, steps=30)
    prof_1024 = adm.estimate_resource_requirements(req_1024, sample_model_def)

    assert prof_1024.vram_mb > prof_512.vram_mb
    assert prof_1024.ram_mb > prof_512.ram_mb


def test_admit_image_job_gpu_success(admission_system, sample_model_def):
    """Test successful admission and lease allocation on GPU."""
    adm, rm = admission_system
    req = ImageGenerationRequest(prompt="Cyberpunk car", width=512, height=512, batch_size=1)

    admitted, lease_id, device, reason = adm.admit_image_job(
        job_id="job_adm_1",
        request=req,
        model_def=sample_model_def,
        priority=WorkloadPriority.P1_INTERACTIVE_USER
    )

    assert admitted is True
    assert lease_id is not None
    assert device in [DeviceType.GPU, DeviceType.CPU]

    # Verify lease recorded in ledger
    leases = rm.ledger.get_active_leases()
    lease = next((l for l in leases if l.lease_id == lease_id), None)
    assert lease is not None
    assert lease.owner_id == "job_adm_1"

    # Clean release
    adm.release_job_lease(lease_id, "job_adm_1")
    leases_after = rm.ledger.get_active_leases()
    assert not any(l.lease_id == lease_id for l in leases_after)


def test_admit_image_job_cpu_fallback(admission_system, sample_model_def):
    """Test explicit CPU fallback admission."""
    adm, rm = admission_system
    req = ImageGenerationRequest(
        prompt="Pixel art tree",
        width=256,
        height=256,
        preferred_device="CPU"
    )

    admitted, lease_id, device, reason = adm.admit_image_job(
        job_id="job_cpu_1",
        request=req,
        model_def=sample_model_def
    )

    assert admitted is True
    assert device == DeviceType.CPU

    adm.release_job_lease(lease_id, "job_cpu_1")


def test_admit_image_job_denied_on_excessive_demand(admission_system):
    """Test admission denial when requested resource exceeds host memory capacity."""
    adm, rm = admission_system
    huge_model = ImageModelDefinition(
        model_id="gigantic-diffusion",
        name="Gigantic Diffusion",
        digest="sha256:huge",
        base_vram_mb=999999.0,  # Far exceeds 8GB RTX 5050
        base_ram_mb=999999.0
    )
    req = ImageGenerationRequest(prompt="Huge model render", width=1024, height=1024)

    admitted, lease_id, device, reason = adm.admit_image_job(
        job_id="job_excess_1",
        request=req,
        model_def=huge_model
    )

    assert admitted is False
    assert lease_id is None
    assert "denied" in reason.lower() or "insufficient" in reason.lower()
