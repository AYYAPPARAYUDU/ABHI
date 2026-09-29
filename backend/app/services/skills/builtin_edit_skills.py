"""Phase 8 Stage 8.3 — Built-in Image Editing Skills Integration.

Registers:
- media.image.edit@1.0.0: Local image-to-image editing skill
- media.image.inpaint@1.0.0: Local inpainting skill with mask guidance
- media.image.outpaint@1.0.0: Local outpainting skill with directional canvas expansion
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
from backend.app.media.edit_models import (
    ImageEditRequest,
    ImageEditType,
    OutpaintBounds,
)
from backend.app.media.models import ImageFormat
from backend.app.media.edit_coordinator import image_edit_coordinator
from backend.app.runtime.resources.models import WorkloadPriority


async def _handle_media_image_edit(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    """Execute local image-to-image editing skill."""
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_img_edit")
    task_id = invocation_ctx.get("task_id")
    execution_id = invocation_ctx.get("execution_id")

    source_artifact_id = args.get("source_artifact_id")
    prompt = args.get("prompt")
    if not source_artifact_id or not isinstance(source_artifact_id, str):
        return SkillResult(
            is_success=False,
            skill_id="media.image.edit",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.INVALID_ARGUMENTS,
            error_message="Argument 'source_artifact_id' must be a valid non-empty string",
            duration_ms=0
        )

    if not prompt or not isinstance(prompt, str):
        return SkillResult(
            is_success=False,
            skill_id="media.image.edit",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.INVALID_ARGUMENTS,
            error_message="Argument 'prompt' must be a non-empty string",
            duration_ms=0
        )

    try:
        req = ImageEditRequest(
            source_artifact_id=source_artifact_id,
            operation=ImageEditType.IMAGE_TO_IMAGE,
            prompt=prompt,
            negative_prompt=args.get("negative_prompt"),
            model_id=args.get("model_id", "instruct-pix2pix-local"),
            strength=float(args.get("strength", 0.75)),
            steps=int(args.get("steps", 25)),
            seed=args.get("seed"),
            output_format=ImageFormat(args.get("output_format", "PNG").upper()),
            preferred_device=args.get("preferred_device", "GPU")
        )
    except Exception as e:
        return SkillResult(
            is_success=False,
            skill_id="media.image.edit",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.INVALID_ARGUMENTS,
            error_message=f"Invalid image edit arguments: {str(e)}",
            duration_ms=int((time.perf_counter() - start_ts) * 1000)
        )

    priority = WorkloadPriority.P1_INTERACTIVE_USER if invocation_ctx.get("interactive", True) else WorkloadPriority.P4_STANDARD_EXECUTION
    success, job, msg = image_edit_coordinator.submit_image_edit(
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
        elif "EDIT_ARTIFACT_INVALID" in (job.failure_reason or ""):
            failure_code = SkillFailureCode.VERIFICATION_FAILED
        elif "policy" in (job.failure_reason or "").lower():
            failure_code = SkillFailureCode.POLICY_DENIED

        return SkillResult(
            is_success=False,
            skill_id="media.image.edit",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=failure_code,
            error_message=job.failure_reason or msg,
            duration_ms=duration_ms,
            output_data={"job_id": job.job_id, "status": job.status.value}
        )

    return SkillResult(
        is_success=True,
        skill_id="media.image.edit",
        skill_version="1.0.0",
        action_id=action_id,
        output_data={
            "job_id": job.job_id,
            "artifact_id": job.artifact_id,
            "source_artifact_id": source_artifact_id,
            "path": job.output_path,
            "operation": "IMAGE_TO_IMAGE",
            "duration_ms": job.duration_ms,
            "device": job.device,
            "status": job.status.value,
        },
        observed_state={"artifact_created": True, "output_path": job.output_path},
        verification_passed=True,
        duration_ms=duration_ms
    )


async def _handle_media_image_inpaint(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    """Execute local inpainting skill with mask guidance."""
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_img_inpaint")
    task_id = invocation_ctx.get("task_id")
    execution_id = invocation_ctx.get("execution_id")

    source_artifact_id = args.get("source_artifact_id")
    mask_artifact_id = args.get("mask_artifact_id")
    prompt = args.get("prompt")

    if not source_artifact_id or not mask_artifact_id or not prompt:
        return SkillResult(
            is_success=False,
            skill_id="media.image.inpaint",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.INVALID_ARGUMENTS,
            error_message="Arguments 'source_artifact_id', 'mask_artifact_id', and 'prompt' are required",
            duration_ms=0
        )

    try:
        req = ImageEditRequest(
            source_artifact_id=source_artifact_id,
            operation=ImageEditType.INPAINTING,
            prompt=prompt,
            negative_prompt=args.get("negative_prompt"),
            model_id=args.get("model_id", "sdxl-inpainting-local"),
            mask_artifact_id=mask_artifact_id,
            steps=int(args.get("steps", 25)),
            seed=args.get("seed"),
            output_format=ImageFormat(args.get("output_format", "PNG").upper()),
            preferred_device=args.get("preferred_device", "GPU")
        )
    except Exception as e:
        return SkillResult(
            is_success=False,
            skill_id="media.image.inpaint",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.INVALID_ARGUMENTS,
            error_message=f"Invalid inpainting arguments: {str(e)}",
            duration_ms=int((time.perf_counter() - start_ts) * 1000)
        )

    priority = WorkloadPriority.P1_INTERACTIVE_USER if invocation_ctx.get("interactive", True) else WorkloadPriority.P4_STANDARD_EXECUTION
    success, job, msg = image_edit_coordinator.submit_image_edit(
        request=req,
        task_id=task_id,
        execution_id=execution_id,
        priority=priority
    )

    duration_ms = int((time.perf_counter() - start_ts) * 1000)

    if not success or job.status.value != "COMPLETED":
        return SkillResult(
            is_success=False,
            skill_id="media.image.inpaint",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.ACTION_FAILED,
            error_message=job.failure_reason or msg,
            duration_ms=duration_ms,
            output_data={"job_id": job.job_id, "status": job.status.value}
        )

    return SkillResult(
        is_success=True,
        skill_id="media.image.inpaint",
        skill_version="1.0.0",
        action_id=action_id,
        output_data={
            "job_id": job.job_id,
            "artifact_id": job.artifact_id,
            "source_artifact_id": source_artifact_id,
            "mask_artifact_id": mask_artifact_id,
            "path": job.output_path,
            "operation": "INPAINTING",
            "duration_ms": job.duration_ms,
            "status": job.status.value,
        },
        observed_state={"artifact_created": True, "output_path": job.output_path},
        verification_passed=True,
        duration_ms=duration_ms
    )


async def _handle_media_image_outpaint(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    """Execute local outpainting skill with directional padding bounds."""
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_img_outpaint")
    task_id = invocation_ctx.get("task_id")
    execution_id = invocation_ctx.get("execution_id")

    source_artifact_id = args.get("source_artifact_id")
    prompt = args.get("prompt")
    if not source_artifact_id or not prompt:
        return SkillResult(
            is_success=False,
            skill_id="media.image.outpaint",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.INVALID_ARGUMENTS,
            error_message="Arguments 'source_artifact_id' and 'prompt' are required",
            duration_ms=0
        )

    bounds_dict = args.get("outpaint_bounds", {"top": 64, "bottom": 64, "left": 64, "right": 64})
    try:
        bounds = OutpaintBounds(
            top=bounds_dict.get("top", 0),
            bottom=bounds_dict.get("bottom", 0),
            left=bounds_dict.get("left", 0),
            right=bounds_dict.get("right", 0),
        )
        req = ImageEditRequest(
            source_artifact_id=source_artifact_id,
            operation=ImageEditType.OUTPAINTING,
            prompt=prompt,
            negative_prompt=args.get("negative_prompt"),
            model_id=args.get("model_id", "sdxl-inpainting-local"),
            outpaint_bounds=bounds,
            steps=int(args.get("steps", 25)),
            seed=args.get("seed"),
            output_format=ImageFormat(args.get("output_format", "PNG").upper()),
            preferred_device=args.get("preferred_device", "GPU")
        )
    except Exception as e:
        return SkillResult(
            is_success=False,
            skill_id="media.image.outpaint",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.INVALID_ARGUMENTS,
            error_message=f"Invalid outpainting arguments: {str(e)}",
            duration_ms=int((time.perf_counter() - start_ts) * 1000)
        )

    priority = WorkloadPriority.P1_INTERACTIVE_USER if invocation_ctx.get("interactive", True) else WorkloadPriority.P4_STANDARD_EXECUTION
    success, job, msg = image_edit_coordinator.submit_image_edit(
        request=req,
        task_id=task_id,
        execution_id=execution_id,
        priority=priority
    )

    duration_ms = int((time.perf_counter() - start_ts) * 1000)

    if not success or job.status.value != "COMPLETED":
        return SkillResult(
            is_success=False,
            skill_id="media.image.outpaint",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.ACTION_FAILED,
            error_message=job.failure_reason or msg,
            duration_ms=duration_ms,
            output_data={"job_id": job.job_id, "status": job.status.value}
        )

    return SkillResult(
        is_success=True,
        skill_id="media.image.outpaint",
        skill_version="1.0.0",
        action_id=action_id,
        output_data={
            "job_id": job.job_id,
            "artifact_id": job.artifact_id,
            "source_artifact_id": source_artifact_id,
            "path": job.output_path,
            "operation": "OUTPAINTING",
            "duration_ms": job.duration_ms,
            "status": job.status.value,
        },
        observed_state={"artifact_created": True, "output_path": job.output_path},
        verification_passed=True,
        duration_ms=duration_ms
    )


def register_image_edit_skills(registry: Optional[SkillRegistry] = None) -> None:
    """Register image editing, inpainting, and outpainting skills into the central registry."""
    reg = registry or skill_registry

    # 1. media.image.edit@1.0.0
    reg.register(
        SkillDefinition(
            skill_id="media.image.edit",
            name="Edit Local Image",
            version="1.0.0",
            description="Perform strength-controlled local image-to-image editing conditioned on text prompt.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.MEDIUM,
            permissions=["LOCAL_STORAGE_WRITE", "GPU_INFERENCE"],
            input_schema={
                "type": "object",
                "properties": {
                    "source_artifact_id": {"type": "string", "description": "ID of registered source MediaArtifact"},
                    "prompt": {"type": "string", "description": "Transformation text prompt"},
                    "negative_prompt": {"type": "string"},
                    "model_id": {"type": "string", "default": "instruct-pix2pix-local"},
                    "strength": {"type": "number", "default": 0.75, "minimum": 0.05, "maximum": 1.0},
                    "steps": {"type": "integer", "default": 25},
                    "seed": {"type": "integer"},
                    "output_format": {"type": "string", "default": "PNG"},
                    "preferred_device": {"type": "string", "default": "GPU"}
                },
                "required": ["source_artifact_id", "prompt"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "artifact_id": {"type": "string"},
                    "path": {"type": "string"},
                    "operation": {"type": "string"},
                    "duration_ms": {"type": "integer"}
                }
            },
            supported_workers=["image_edit_worker", "local_image_diffusion"],
            verification_policy="ARTIFACT_EXISTS_AND_VALIDATED"
        ),
        _handle_media_image_edit,
        overwrite=True
    )

    # 2. media.image.inpaint@1.0.0
    reg.register(
        SkillDefinition(
            skill_id="media.image.inpaint",
            name="Inpaint Local Image",
            version="1.0.0",
            description="Replace a masked region of an existing local image with newly synthesized visual content.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.MEDIUM,
            permissions=["LOCAL_STORAGE_WRITE", "GPU_INFERENCE"],
            input_schema={
                "type": "object",
                "properties": {
                    "source_artifact_id": {"type": "string"},
                    "mask_artifact_id": {"type": "string"},
                    "prompt": {"type": "string"},
                    "negative_prompt": {"type": "string"},
                    "model_id": {"type": "string", "default": "sdxl-inpainting-local"},
                    "steps": {"type": "integer", "default": 25},
                    "seed": {"type": "integer"},
                    "output_format": {"type": "string", "default": "PNG"},
                    "preferred_device": {"type": "string", "default": "GPU"}
                },
                "required": ["source_artifact_id", "mask_artifact_id", "prompt"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "artifact_id": {"type": "string"},
                    "path": {"type": "string"},
                    "operation": {"type": "string"},
                    "duration_ms": {"type": "integer"}
                }
            },
            supported_workers=["image_edit_worker", "local_image_diffusion"],
            verification_policy="ARTIFACT_EXISTS_AND_VALIDATED"
        ),
        _handle_media_image_inpaint,
        overwrite=True
    )

    # 3. media.image.outpaint@1.0.0
    reg.register(
        SkillDefinition(
            skill_id="media.image.outpaint",
            name="Outpaint Local Image",
            version="1.0.0",
            description="Expand the canvas boundaries of an existing image and synthesize matching seamless surroundings.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.MEDIUM,
            permissions=["LOCAL_STORAGE_WRITE", "GPU_INFERENCE"],
            input_schema={
                "type": "object",
                "properties": {
                    "source_artifact_id": {"type": "string"},
                    "prompt": {"type": "string"},
                    "negative_prompt": {"type": "string"},
                    "model_id": {"type": "string", "default": "sdxl-inpainting-local"},
                    "outpaint_bounds": {
                        "type": "object",
                        "properties": {
                            "top": {"type": "integer", "default": 64},
                            "bottom": {"type": "integer", "default": 64},
                            "left": {"type": "integer", "default": 64},
                            "right": {"type": "integer", "default": 64}
                        }
                    },
                    "steps": {"type": "integer", "default": 25},
                    "seed": {"type": "integer"},
                    "output_format": {"type": "string", "default": "PNG"},
                    "preferred_device": {"type": "string", "default": "GPU"}
                },
                "required": ["source_artifact_id", "prompt"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "artifact_id": {"type": "string"},
                    "path": {"type": "string"},
                    "operation": {"type": "string"},
                    "duration_ms": {"type": "integer"}
                }
            },
            supported_workers=["image_edit_worker", "local_image_diffusion"],
            verification_policy="ARTIFACT_EXISTS_AND_VALIDATED"
        ),
        _handle_media_image_outpaint,
        overwrite=True
    )
    logger.info("ImageEditSkills: Registered media.image.edit@1.0.0, inpaint@1.0.0, outpaint@1.0.0")


# Auto-register
register_image_edit_skills()
