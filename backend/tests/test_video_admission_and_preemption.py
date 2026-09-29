"""Phase 8 Stage 8.2 — Video Resource Budgeting, Admission & Preemption Unit Tests."""

import pytest
from backend.app.media.video_models import (
    VideoGenerationRequest,
    VideoModelDefinition,
    VideoFormat,
)
from backend.app.media.video_admission import VideoResourceAdmission
from backend.app.runtime.resources.models import DeviceType, WorkloadPriority, ResourceType
from backend.app.runtime.resources.manager import resource_manager


def test_video_resource_estimation():
    admission = VideoResourceAdmission()
    model_def = VideoModelDefinition(
        model_id="svd-xt-local",
        name="Stable Video Diffusion XT Local",
        digest="sha256:7e3d1a9b4c8f205e",
        base_vram_mb=4200.0,
        base_ram_mb=3072.0
    )

    req = VideoGenerationRequest(
        prompt="A robotic hand assembling a circuit board",
        width=512,
        height=512,
        fps=24,
        duration_seconds=2.0,
        chunk_duration_seconds=2.0,
        steps=25
    )

    profile = admission.estimate_resource_requirements(req, model_def)
    assert profile.vram_mb > 4200.0
    assert profile.vram_mb <= 6400.0  # Guardrail against exceeding 6501 MB usable limit
    assert profile.ram_mb >= 3072.0
    assert profile.gpu_compute_percent >= 75.0


def test_video_job_admission_and_lease_lifecycle():
    admission = VideoResourceAdmission()
    model_def = VideoModelDefinition(
        model_id="svd-xt-local",
        name="Stable Video Diffusion XT Local",
        digest="sha256:7e3d1a9b4c8f205e",
        base_vram_mb=4200.0,
        base_ram_mb=3072.0
    )

    req = VideoGenerationRequest(
        prompt="A high tech futuristic city at sunset",
        width=512,
        height=512,
        fps=24,
        duration_seconds=2.0,
        preferred_device="GPU"
    )

    admitted, lease_id, target_device, reason = admission.admit_video_job(
        job_id="job_adm_001",
        request=req,
        model_def=model_def,
        priority=WorkloadPriority.P1_INTERACTIVE_USER
    )

    assert admitted is True
    assert lease_id is not None
    assert target_device in [DeviceType.GPU, DeviceType.CPU]

    # Verify release
    admission.release_job_lease(lease_id, "job_adm_001")


def test_video_cpu_explicit_fallback():
    admission = VideoResourceAdmission()
    model_def = VideoModelDefinition(
        model_id="svd-xt-local",
        name="Stable Video Diffusion XT Local",
        digest="sha256:7e3d1a9b4c8f205e",
        base_vram_mb=4200.0,
        base_ram_mb=3072.0
    )

    req = VideoGenerationRequest(
        prompt="A running river in spring",
        width=256,
        height=256,
        fps=12,
        duration_seconds=1.0,
        preferred_device="CPU"
    )

    admitted, lease_id, target_device, reason = admission.admit_video_job(
        job_id="job_adm_cpu",
        request=req,
        model_def=model_def,
        priority=WorkloadPriority.P1_INTERACTIVE_USER
    )

    assert admitted is True
    assert target_device == DeviceType.CPU

    admission.release_job_lease(lease_id, "job_adm_cpu")


def test_video_candidate_model_isolation():
    admission = VideoResourceAdmission()
    cand_model = VideoModelDefinition(
        model_id="cogvideox-candidate",
        name="CogVideoX 2B (Candidate)",
        digest="sha256:3d7a1c9e8b2f4501",
        base_vram_mb=5600.0,
        base_ram_mb=4096.0,
        is_production=False,
        is_candidate=True
    )

    req = VideoGenerationRequest(
        prompt="Experimental candidate video generation test",
        model_id="cogvideox-candidate",
        width=512,
        height=512,
        duration_seconds=2.0
    )

    profile = admission.estimate_resource_requirements(req, cand_model)
    assert profile.vram_mb >= 5600.0

    admitted, lease_id, dev, reason = admission.admit_video_job(
        job_id="job_cand_eval",
        request=req,
        model_def=cand_model,
        priority=WorkloadPriority.P6_CANDIDATE_EXPERIMENT
    )
    # Candidate evaluation is admitted under lower priority
    if admitted and lease_id:
        admission.release_job_lease(lease_id, "job_cand_eval")


def test_video_admission_high_resolution_scaling():
    admission = VideoResourceAdmission()
    model_def = VideoModelDefinition(
        model_id="svd-xt-local",
        name="Stable Video Diffusion XT Local",
        digest="sha256:7e3d1a9b4c8f205e",
        base_vram_mb=4200.0,
        base_ram_mb=3072.0
    )

    req_low = VideoGenerationRequest(prompt="test", width=256, height=256, duration_seconds=1.0)
    req_high = VideoGenerationRequest(prompt="test", width=768, height=768, duration_seconds=2.0)

    p_low = admission.estimate_resource_requirements(req_low, model_def)
    p_high = admission.estimate_resource_requirements(req_high, model_def)

    assert p_high.vram_mb > p_low.vram_mb
    assert p_high.ram_mb > p_low.ram_mb
    assert p_high.vram_mb <= 6400.0  # Guardrail respected
