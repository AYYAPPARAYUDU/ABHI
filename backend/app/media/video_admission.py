"""Phase 8 Stage 8.2 — Video Resource Budgeting & Admission Controller.

Governs:
- Dynamic VRAM / RAM requirement calculation for temporal chunking, resolution, and FPS
- Safe Admission Check against RTX 5050 8GB VRAM (6,501 MB usable) & 24GB RAM
- CPU Fallback Arbitration for Video Generation
- Integration with CentralResourceManager & ResourceLedger
- Time-bounded ResourceLease granting and safe release
"""

import time
from typing import Dict, List, Optional, Tuple, Any
from backend.app.core.logging import logger
from backend.app.media.video_models import VideoGenerationRequest, VideoModelDefinition
from backend.app.runtime.resources.models import (
    ResourceProfile,
    WorkloadPriority,
    WorkloadRequest,
    DeviceType,
    ResourceLease,
    DataProvenance,
)
from backend.app.runtime.resources.manager import resource_manager


class VideoResourceAdmission:
    """Manages resource profiles, admission budgeting, and lease lifecycle for video jobs."""

    def __init__(self):
        self.rm = resource_manager

    def estimate_resource_requirements(
        self,
        request: VideoGenerationRequest,
        model_def: VideoModelDefinition
    ) -> ResourceProfile:
        """Estimate dynamic VRAM, RAM, and GPU compute based on resolution, FPS, steps, and chunk size."""
        # Resolution scaling factor relative to 512x512 baseline
        pixel_count = request.width * request.height
        baseline_pixels = 512 * 512
        scale = pixel_count / baseline_pixels

        # Bounded chunk duration (e.g. 2.0s chunks) prevents full-duration VRAM explosion
        effective_chunk_duration = min(request.chunk_duration_seconds, request.duration_seconds)
        frames_per_chunk = int(round(effective_chunk_duration * request.fps))

        # VRAM Scaling Formula:
        # Base Model VRAM + (Scale * frames_per_chunk * 15 MB) + (Steps * 2.5 MB KV/Latent Buffer)
        est_vram_mb = model_def.base_vram_mb + (scale * frames_per_chunk * 15.0) + (request.steps * 2.5)
        est_vram_mb = round(min(est_vram_mb, 6400.0), 1)  # Strictly below 6,501 MB usable limit

        # RAM Scaling Formula (Encoding & Intermediate Frame Buffers)
        est_ram_mb = model_def.base_ram_mb + (scale * frames_per_chunk * 25.0) + (request.duration_seconds * 100.0)
        est_ram_mb = round(est_ram_mb, 1)

        # GPU Compute Estimation (percentage of GPU utilization)
        est_gpu_compute = min(98.0, model_def.gpu_compute_percent + (scale * 12.0))

        return ResourceProfile(
            vram_mb=est_vram_mb,
            ram_mb=est_ram_mb,
            cpu_cores=4,
            gpu_compute_percent=est_gpu_compute,
            provenance=DataProvenance.ESTIMATED
        )

    def admit_video_job(
        self,
        job_id: str,
        request: VideoGenerationRequest,
        model_def: VideoModelDefinition,
        priority: WorkloadPriority = WorkloadPriority.P1_INTERACTIVE_USER,
        timeout_sec: float = 180.0
    ) -> Tuple[bool, Optional[str], Optional[DeviceType], str]:
        """Request admission and resource lease for video generation job.

        Returns:
            (admitted: bool, lease_id: Optional[str], target_device: Optional[DeviceType], reason: str)
        """
        inventory = self.rm.hardware_engine.discover_inventory()
        profile = self.estimate_resource_requirements(request, model_def)

        # Check if user explicitly requested CPU or if GPU is unavailable
        prefer_cpu = request.preferred_device.upper() == "CPU" or not inventory.gpu_detected

        if prefer_cpu:
            # Shift VRAM requirement to RAM for CPU inference
            profile.ram_mb += profile.vram_mb
            profile.vram_mb = 0.0
            profile.gpu_compute_percent = 0.0

        workload_req = WorkloadRequest(
            owner_type="video_job",
            owner_id=job_id,
            workload_name=f"VideoGen_{job_id}",
            priority=priority,
            resource_profile=profile,
            timeout_sec=timeout_sec
        )

        admitted, leases, reason = self.rm.admission_controller.admit_workload(workload_req, inventory)
        if not admitted and not prefer_cpu and "VRAM" in reason:
            # Graceful CPU Fallback on VRAM constraint
            logger.info(f"VideoResourceAdmission: GPU admission unavailable ({reason}), attempting CPU fallback...")
            profile.ram_mb += profile.vram_mb
            profile.vram_mb = 0.0
            profile.gpu_compute_percent = 0.0
            workload_req.resource_profile = profile
            admitted, leases, reason = self.rm.admission_controller.admit_workload(workload_req, inventory)
            if admitted:
                prefer_cpu = True

        if not admitted:
            logger.warning(f"VideoResourceAdmission: Job {job_id} denied admission: {reason}")
            return False, None, None, reason

        lease_id = leases[0].lease_id if leases else None
        target_device = DeviceType.CPU if prefer_cpu or profile.vram_mb == 0.0 else DeviceType.GPU

        logger.info(
            f"VideoResourceAdmission: Job {job_id} admitted on {target_device.value} "
            f"(vram={profile.vram_mb}MB, ram={profile.ram_mb}MB, lease={lease_id})"
        )
        return True, lease_id, target_device, "Resource admission granted"

    def release_job_lease(self, lease_id: Optional[str], job_id: str) -> None:
        """Release granted resource lease for completed or cancelled job."""
        if lease_id:
            self.rm.ledger.release_lease(lease_id)
        self.rm.ledger.release_leases_by_owner(job_id)
        logger.info(f"VideoResourceAdmission: Released resource leases for video job {job_id}")


# Global singleton
video_resource_admission = VideoResourceAdmission()
