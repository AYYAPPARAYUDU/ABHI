"""Phase 8 Stage 8.1 — Built-in Media Skills Integration.

Registers:
- media.image.generate@1.0.0: Bounded local image generation skill for DAG workflows
"""

import time
from typing import Any, Dict, Optional
from backend.app.core.logging import logger
from backend.app.services.skills.models import (
    SkillCategory,
    SkillDefinition,
    SkillFailureCode,
    SkillLifecycleState,
    SkillResult,
    SkillRiskLevel,
)
from backend.app.services.skills.registry import skill_registry, SkillRegistry
from backend.app.media.models import ImageGenerationRequest, ImageFormat, QualityProfile
from backend.app.media.coordinator import media_coordinator
from backend.app.runtime.resources.models import WorkloadPriority


async def _handle_media_image_generate(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    """Execute local image generation skill with resource admission and safety gating."""
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_media_gen")
    task_id = invocation_ctx.get("task_id")
    execution_id = invocation_ctx.get("execution_id")

    prompt = args.get("prompt")
    if not prompt or not isinstance(prompt, str):
        return SkillResult(
            is_success=False,
            skill_id="media.image.generate",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.INVALID_ARGUMENTS,
            error_message="Argument 'prompt' must be a non-empty string",
            duration_ms=0
        )

    try:
        # Build validated request
        req = ImageGenerationRequest(
            prompt=prompt,
            negative_prompt=args.get("negative_prompt"),
            model_id=args.get("model_id", "sd-turbo-local"),
            width=args.get("width", 512),
            height=args.get("height", 512),
            steps=args.get("steps", 20),
            guidance=args.get("guidance", 7.5),
            seed=args.get("seed"),
            batch_size=args.get("batch_size", 1),
            output_format=ImageFormat(args.get("output_format", "PNG").upper()),
            quality_profile=QualityProfile(args.get("quality_profile", "STANDARD").upper()),
            preferred_device=args.get("preferred_device", "GPU")
        )
    except Exception as e:
        return SkillResult(
            is_success=False,
            skill_id="media.image.generate",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.INVALID_ARGUMENTS,
            error_message=f"Invalid generation arguments: {str(e)}",
            duration_ms=int((time.perf_counter() - start_ts) * 1000)
        )

    # Submit to media coordinator
    priority = WorkloadPriority.P1_INTERACTIVE_USER if invocation_ctx.get("interactive", True) else WorkloadPriority.P4_STANDARD_EXECUTION
    success, job, msg = media_coordinator.submit_image_generation(
        request=req,
        task_id=task_id,
        execution_id=execution_id,
        priority=priority
    )

    duration_ms = int((time.perf_counter() - start_ts) * 1000)

    if not success or job.status.value != "COMPLETED":
        failure_code = SkillFailureCode.ACTION_FAILED
        if "RESOURCE_ADMISSION_DENIED" in (job.failure_reason or ""):
            failure_code = SkillFailureCode.LEASE_UNAVAILABLE
        elif "IMAGE_ARTIFACT_INVALID" in (job.failure_reason or ""):
            failure_code = SkillFailureCode.VERIFICATION_FAILED
        elif "policy" in (job.failure_reason or "").lower():
            failure_code = SkillFailureCode.POLICY_DENIED

        return SkillResult(
            is_success=False,
            skill_id="media.image.generate",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=failure_code,
            error_message=job.failure_reason or msg,
            duration_ms=duration_ms,
            output_data={"job_id": job.job_id, "status": job.status.value}
        )

    return SkillResult(
        is_success=True,
        skill_id="media.image.generate",
        skill_version="1.0.0",
        action_id=action_id,
        output_data={
            "job_id": job.job_id,
            "artifact_id": job.artifact_id,
            "path": job.output_path,
            "width": req.width,
            "height": req.height,
            "format": req.output_format.value,
            "duration_ms": job.duration_ms,
            "device": job.device,
            "status": job.status.value,
        },
        observed_state={"artifact_created": True, "output_path": job.output_path},
        verification_passed=True,
        duration_ms=duration_ms
    )


def register_media_skills(registry: Optional[SkillRegistry] = None) -> None:
    """Register media generation skill into the central registry."""
    reg = registry or skill_registry

    reg.register(
        SkillDefinition(
            skill_id="media.image.generate",
            name="Generate Local Image",
            version="1.0.0",
            description="Generate a high-quality local image from text prompt using local diffusion engine.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.LOW,
            permissions=["LOCAL_STORAGE_WRITE", "GPU_INFERENCE"],
            input_schema={
                "type": "object",
                "properties": {
                    "prompt": {"type": "string", "description": "Image description"},
                    "negative_prompt": {"type": "string"},
                    "model_id": {"type": "string", "default": "sd-turbo-local"},
                    "width": {"type": "integer", "default": 512},
                    "height": {"type": "integer", "default": 512},
                    "steps": {"type": "integer", "default": 20},
                    "seed": {"type": "integer"},
                    "output_format": {"type": "string", "default": "PNG"},
                    "preferred_device": {"type": "string", "default": "GPU"}
                },
                "required": ["prompt"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "artifact_id": {"type": "string"},
                    "path": {"type": "string"},
                    "width": {"type": "integer"},
                    "height": {"type": "integer"},
                    "format": {"type": "string"},
                    "duration_ms": {"type": "integer"}
                }
            },
            supported_workers=["media_worker", "local_diffusion"],
            verification_policy="ARTIFACT_EXISTS_AND_VALIDATED"
        ),
        _handle_media_image_generate,
        overwrite=True
    )
    logger.info("MediaSkills: Registered media.image.generate@1.0.0")


# Auto-register
register_media_skills()
