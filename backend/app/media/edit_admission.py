"""Phase 8 Stage 8.3 — Image Edit Workload Resource Admission & VRAM Protection.

Governs:
- Dynamic Resource Estimation for Image Editing, Inpainting & Outpainting
- Resolution, Strength, Steps, and Mask Scaling
- VRAM Hard Limits (RTX 5050 Laptop GPU <= 6,400 MB Ceiling)
- Automatic CPU Fallback Arbitration
- Integration with Central ResourceManager & ResourceLedger
"""

import math
from typing import Dict, Optional, Tuple, Any
from backend.app.core.logging import logger
from backend.app.media.edit_models import (
    ImageEditRequest,
    ImageEditModelDefinition,
    ImageEditType,
)
from backend.app.runtime.resources.models import (
    ResourceProfile,
    WorkloadPriority,
    WorkloadRequest,
    DeviceType,
    ResourceLease,
    DataProvenance,
)
from backend.app.runtime.resources.manager import resource_manager


class ImageEditResourceAdmission:
    """Evaluates and admits local image edit, inpaint, and outpaint workloads."""

    VRAM_HARD_LIMIT_MB = 6400.0  # Safe ceiling on 6,501 MB usable VRAM
    VRAM_HEADROOM_MB = 1200.0    # Required unallocated safety buffer

    def __init__(self):
        self.rm = resource_manager

    def calculate_resource_requirements(
        self,
        request: ImageEditRequest,
        model_def: ImageEditModelDefinition,
        source_width: int = 512,
        source_height: int = 512
    ) -> Dict[str, Any]:
        """Estimate VRAM, RAM, and GPU percentage for an image editing workload."""
        base_vram = model_def.base_vram_mb
        base_ram = model_def.base_ram_mb

        # Target resolution
        target_w = request.width or source_width
        target_h = request.height or source_height

        # If outpainting, add expansion pixels
        if request.operation == ImageEditType.OUTPAINTING and request.outpaint_bounds:
            target_w += request.outpaint_bounds.left + request.outpaint_bounds.right
            target_h += request.outpaint_bounds.top + request.outpaint_bounds.bottom

        base_pixels = 512.0 * 512.0
        target_pixels = float(target_w * target_h)
        res_scale = target_pixels / base_pixels

        step_factor = max(0.8, request.steps / 25.0)
        strength_factor = 0.9 + (request.strength * 0.2)

        operation_multiplier = 1.0
        if request.operation == ImageEditType.INPAINTING:
            operation_multiplier = 1.15
        elif request.operation == ImageEditType.OUTPAINTING:
            operation_multiplier = 1.25

        estimated_vram = base_vram * (1.0 + (res_scale - 1.0) * 0.5) * operation_multiplier * step_factor * strength_factor
        estimated_ram = base_ram * (1.0 + (res_scale - 1.0) * 0.4) * operation_multiplier
        gpu_compute = min(90.0, model_def.gpu_compute_percent * (target_pixels / base_pixels) ** 0.5)

        return {
            "vram_mb": round(estimated_vram, 2),
            "ram_mb": round(estimated_ram, 2),
            "gpu_percent": round(gpu_compute, 1),
            "device": request.preferred_device.upper(),
            "target_width": target_w,
            "target_height": target_h,
        }

    def evaluate_admission(
        self,
        request: ImageEditRequest,
        model_def: ImageEditModelDefinition,
        source_width: int = 512,
        source_height: int = 512
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """Determine if system resources allow executing the edit job safely."""
        reqs = self.calculate_resource_requirements(
            request, model_def, source_width=source_width, source_height=source_height
        )

        inv = self.rm.hardware_engine.discover_inventory()
        ledger_snap = self.rm.ledger.get_ledger_snapshot()
        preferred_device = reqs["device"]

        # GPU Admission Check
        if preferred_device == "GPU" and inv.gpu_detected:
            estimated_vram = reqs["vram_mb"]

            if estimated_vram > self.VRAM_HARD_LIMIT_MB:
                logger.warning(
                    f"EditAdmission: Workload requires {estimated_vram} MB VRAM, exceeding hard limit {self.VRAM_HARD_LIMIT_MB} MB. "
                    f"Forcing fallback to CPU."
                )
                reqs["device"] = "CPU"
            else:
                from backend.app.runtime.resources.models import ResourceType
                vram_entry = ledger_snap.get(ResourceType.VRAM)
                allocated_vram = vram_entry.allocated if vram_entry else 0.0
                total_vram = inv.gpu_vram_total_mb or self.VRAM_HARD_LIMIT_MB
                available_vram = total_vram - allocated_vram

                if available_vram - estimated_vram < self.VRAM_HEADROOM_MB:
                    logger.warning(
                        f"EditAdmission: Insufficient VRAM headroom ({available_vram - estimated_vram:.1f} MB < {self.VRAM_HEADROOM_MB} MB). "
                        f"Allocating on CPU fallback."
                    )
                    reqs["device"] = "CPU"
                else:
                    return True, "Admitted on GPU", reqs

        # CPU Admission Check
        reqs["device"] = "CPU"
        estimated_ram = reqs["ram_mb"]
        from backend.app.runtime.resources.models import ResourceType
        ram_entry = ledger_snap.get(ResourceType.RAM)
        allocated_ram = ram_entry.allocated if ram_entry else 0.0
        total_ram = getattr(inv, "host_ram_total_mb", None) or getattr(inv, "ram_total_mb", 24000.0)
        available_ram = total_ram - allocated_ram

        if available_ram < estimated_ram + 1024.0:
            msg = (
                f"RESOURCE_ADMISSION_DENIED: Insufficient host RAM for image editing. "
                f"Requires {estimated_ram} MB, available {available_ram:.1f} MB"
            )
            logger.error(f"EditAdmission: {msg}")
            return False, msg, reqs

        return True, "Admitted on CPU", reqs

    def acquire_lease(
        self,
        job_id: str,
        requirements: Dict[str, Any],
        priority: WorkloadPriority = WorkloadPriority.P1_INTERACTIVE_USER,
        timeout_sec: float = 60.0
    ) -> Tuple[bool, Optional[str], str]:
        """Acquire verified resource lease from ResourceManager."""
        device = requirements.get("device", "GPU")
        prefer_cpu = (device == "CPU")

        profile = ResourceProfile(
            vram_mb=requirements["vram_mb"] if not prefer_cpu else 0.0,
            ram_mb=requirements["ram_mb"] + (requirements["vram_mb"] if prefer_cpu else 0.0),
            gpu_compute_percent=requirements["gpu_percent"] if not prefer_cpu else 0.0,
            cpu_threads=2,
            process_count=0,
            storage_mb=100.0,
            model_id=f"edit_{job_id}",
            priority=priority,
            provenance=DataProvenance.MEASURED
        )

        inv = self.rm.hardware_engine.discover_inventory()
        workload_req = WorkloadRequest(
            owner_type="media_edit_job",
            owner_id=job_id,
            workload_name=f"ImageEdit_{job_id}",
            priority=priority,
            resource_profile=profile,
            timeout_sec=timeout_sec
        )

        admitted, leases, reason = self.rm.admission_controller.admit_workload(workload_req, inv)
        if not admitted and not prefer_cpu and "VRAM" in reason:
            logger.info(f"EditAdmission: GPU admission unavailable ({reason}), falling back to CPU...")
            profile.ram_mb += profile.vram_mb
            profile.vram_mb = 0.0
            profile.gpu_compute_percent = 0.0
            workload_req.resource_profile = profile
            admitted, leases, reason = self.rm.admission_controller.admit_workload(workload_req, inv)
            if admitted:
                requirements["device"] = "CPU"

        if not admitted:
            logger.warning(f"EditAdmission: Job {job_id} denied admission: {reason}")
            return False, None, reason

        lease_id = leases[0].lease_id if leases else None
        return True, lease_id, "Resource lease acquired successfully"

    def release_lease(self, lease_id: Optional[str], job_id: Optional[str] = None) -> None:
        """Release allocated resources back to the central manager."""
        if job_id:
            self.rm.ledger.release_leases_by_owner(job_id)
            logger.info(f"EditAdmission: Released all leases for owner {job_id}")
        elif lease_id:
            self.rm.ledger.release_lease(lease_id)
            logger.info(f"EditAdmission: Released lease {lease_id}")


# Global singleton
image_edit_admission = ImageEditResourceAdmission()
