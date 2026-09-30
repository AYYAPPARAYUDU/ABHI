"""Phase 8 Stage 8.4 — Built-in Multimodal Media Composer Skills.

Registers:
- audio.tts@1.0.0: Local text-to-speech synthesis generating registered AUDIO artifacts
- media.video.compose@1.0.0: Sandboxed video/audio composition generating COMPOSED VIDEO artifacts
- media.workflow.execute@1.0.0: Full media DAG workflow execution engine
"""

import os
import time
import uuid
import hashlib
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
from backend.app.perception.audio.tts import text_to_speech
from backend.app.media.storage import media_storage_manager
from backend.app.media.models import MediaArtifact, MediaType




async def _handle_audio_tts(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    """Execute local text-to-speech synthesis and register AUDIO artifact."""
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_audio_tts")
    task_id = invocation_ctx.get("task_id", "task_tts")

    text = args.get("text") or args.get("prompt")
    if not text or not isinstance(text, str):
        return SkillResult(
            is_success=False,
            skill_id="audio.tts",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.INVALID_ARGUMENTS,
            error_message="Argument 'text' must be a non-empty string",
            duration_ms=0,
        )

    voice = args.get("voice", "default_neutral")
    rate = float(args.get("rate", 1.0))
    backend = args.get("backend", "piper")

    try:
        synth_res = await text_to_speech.synthesize(
            text=text,
            voice=voice,
            rate=rate,
            force_backend=backend,
        )

        artifact_id = f"art_audio_{uuid.uuid4().hex[:12]}"
        storage_dir = os.path.join(media_storage_manager.base_dir, "audio")
        os.makedirs(storage_dir, exist_ok=True)
        file_path = os.path.join(storage_dir, f"{artifact_id}.wav")

        with open(file_path, "wb") as f:
            f.write(synth_res.audio_bytes)

        file_size = len(synth_res.audio_bytes)
        file_hash = hashlib.sha256(synth_res.audio_bytes).hexdigest()

        artifact = MediaArtifact(
            artifact_id=artifact_id,
            media_type=MediaType.AUDIO,
            file_path=file_path,
            file_size_bytes=file_size,
            sha256_hash=file_hash,
            metadata={
                "duration_seconds": synth_res.duration_seconds,
                "sample_rate": synth_res.sample_rate,
                "voice": voice,
                "engine": synth_res.engine_used,
                "text_snippet": text[:100],
            },
        )
        media_storage_manager.register_artifact(artifact)

        duration_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=True,
            skill_id="audio.tts",
            skill_version="1.0.0",
            action_id=action_id,
            output_data={
                "artifact_id": artifact_id,
                "path": file_path,
                "duration_seconds": synth_res.duration_seconds,
                "sample_rate": synth_res.sample_rate,
                "engine_used": synth_res.engine_used,
                "hash": file_hash,
            },
            observed_state={"artifact_created": True, "output_path": file_path},
            verification_passed=True,
            duration_ms=duration_ms,
        )
    except Exception as e:
        logger.error(f"Audio TTS skill error: {e}", exc_info=True)
        return SkillResult(
            is_success=False,
            skill_id="audio.tts",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.ACTION_FAILED,
            error_message=f"TTS synthesis failed: {str(e)}",
            duration_ms=int((time.perf_counter() - start_ts) * 1000),
        )


async def _handle_media_video_compose(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    """Execute sandboxed video/audio composition."""
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_media_compose")
    task_id = invocation_ctx.get("task_id", "task_compose")

    video_art_id = args.get("video_artifact_id") or args.get("source_artifact_id")
    if not video_art_id:
        return SkillResult(
            is_success=False,
            skill_id="media.video.compose",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.INVALID_ARGUMENTS,
            error_message="Argument 'video_artifact_id' is required",
            duration_ms=0,
        )

    from backend.app.media.workflow_models import MediaCompositionRequest, MediaCompositionProfile
    from backend.app.media.composition_runtime import media_composition_runtime

    audio_art_id = args.get("audio_artifact_id")
    profile_str = args.get("profile", "VIDEO_PLUS_AUDIO" if audio_art_id else "VIDEO_ONLY")
    try:
        profile = MediaCompositionProfile(profile_str)
    except Exception:
        profile = MediaCompositionProfile.VIDEO_PLUS_AUDIO if audio_art_id else MediaCompositionProfile.VIDEO_ONLY

    req = MediaCompositionRequest(
        video_artifact_id=video_art_id,
        audio_artifact_id=audio_art_id,
        subtitle_artifact_id=args.get("subtitle_artifact_id"),
        watermark_image_id=args.get("watermark_image_id"),
        profile=profile,
        output_format=args.get("output_format", "MP4"),
        normalize_audio=args.get("normalize_audio", True),
        target_fps=args.get("target_fps"),
        target_resolution=args.get("target_resolution"),
    )

    try:
        success, artifact, msg = await media_composition_runtime.compose_video(req, task_id=task_id)
        duration_ms = int((time.perf_counter() - start_ts) * 1000)

        if not success or not artifact:
            return SkillResult(
                is_success=False,
                skill_id="media.video.compose",
                skill_version="1.0.0",
                action_id=action_id,
                failure_code=SkillFailureCode.ACTION_FAILED,
                error_message=msg or "Composition failed",
                duration_ms=duration_ms,
            )

        return SkillResult(
            is_success=True,
            skill_id="media.video.compose",
            skill_version="1.0.0",
            action_id=action_id,
            output_data={
                "artifact_id": artifact.artifact_id,
                "path": artifact.file_path,
                "media_type": artifact.media_type.value,
                "file_size_bytes": artifact.file_size_bytes,
                "sha256_hash": artifact.sha256_hash,
                "metadata": artifact.metadata,
            },
            observed_state={"artifact_created": True, "output_path": artifact.file_path},
            verification_passed=True,
            duration_ms=duration_ms,
        )
    except Exception as e:
        logger.error(f"Video compose skill error: {e}", exc_info=True)
        return SkillResult(
            is_success=False,
            skill_id="media.video.compose",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.ACTION_FAILED,
            error_message=f"Composition failed: {str(e)}",
            duration_ms=int((time.perf_counter() - start_ts) * 1000),
        )


async def _handle_media_workflow_execute(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    """Execute complete DAG media workflow."""
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_wf_exec")
    task_id = invocation_ctx.get("task_id", "task_wf")

    wf_dict = args.get("workflow")
    if not wf_dict:
        return SkillResult(
            is_success=False,
            skill_id="media.workflow.execute",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.INVALID_ARGUMENTS,
            error_message="Argument 'workflow' dictionary is required",
            duration_ms=0,
        )

    try:
        from backend.app.media.workflow_composer import media_workflow_composer
        wf = MediaWorkflow(**wf_dict)
        wf.task_id = task_id
        res = await media_workflow_composer.execute_workflow(wf)
        duration_ms = int((time.perf_counter() - start_ts) * 1000)

        if not res.is_success:
            return SkillResult(
                is_success=False,
                skill_id="media.workflow.execute",
                skill_version="1.0.0",
                action_id=action_id,
                failure_code=SkillFailureCode.ACTION_FAILED,
                error_message=res.error_message or "Workflow execution failed",
                duration_ms=duration_ms,
                output_data={"workflow_id": res.workflow_id, "status": res.status.value},
            )

        return SkillResult(
            is_success=True,
            skill_id="media.workflow.execute",
            skill_version="1.0.0",
            action_id=action_id,
            output_data={
                "workflow_id": res.workflow_id,
                "status": res.status.value,
                "primary_artifact_id": res.primary_artifact_id,
                "artifacts": res.artifacts,
                "executed_node_ids": res.executed_node_ids,
            },
            verification_passed=True,
            duration_ms=duration_ms,
        )
    except Exception as e:
        logger.error(f"Workflow execute skill error: {e}", exc_info=True)
        return SkillResult(
            is_success=False,
            skill_id="media.workflow.execute",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.ACTION_FAILED,
            error_message=f"Workflow failed: {str(e)}",
            duration_ms=int((time.perf_counter() - start_ts) * 1000),
        )


def register_composer_skills(registry: Optional[SkillRegistry] = None) -> None:
    """Register audio TTS, video compose, and workflow executor skills into registry."""
    reg = registry or skill_registry

    reg.register(
        SkillDefinition(
            skill_id="audio.tts",
            name="Text to Speech Neural Audio Synthesis",
            version="1.0.0",
            description="Synthesize speech audio from text using local Piper neural engine and register audio artifact.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.LOW,
            permissions=["LOCAL_STORAGE_WRITE"],
            input_schema={
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Text to synthesize"},
                    "voice": {"type": "string", "default": "default_neutral"},
                    "rate": {"type": "number", "default": 1.0},
                    "backend": {"type": "string", "default": "piper"},
                },
                "required": ["text"],
            },
            output_schema={
                "type": "object",
                "properties": {
                    "artifact_id": {"type": "string"},
                    "path": {"type": "string"},
                    "duration_seconds": {"type": "number"},
                    "hash": {"type": "string"},
                },
            },
            supported_workers=["tts_worker", "audio_synthesizer"],
            verification_policy="ARTIFACT_EXISTS_AND_VALIDATED",
        ),
        _handle_audio_tts,
        overwrite=True,
    )

    reg.register(
        SkillDefinition(
            skill_id="media.video.compose",
            name="Video and Audio Multiplexing Composition",
            version="1.0.0",
            description="Sandboxed composition of video, audio, subtitles, and watermarks using allowlisted profiles.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.LOW,
            permissions=["LOCAL_STORAGE_WRITE", "LOCAL_STORAGE_READ"],
            input_schema={
                "type": "object",
                "properties": {
                    "video_artifact_id": {"type": "string", "description": "Source video artifact ID"},
                    "audio_artifact_id": {"type": "string", "description": "Optional audio track artifact ID"},
                    "subtitle_artifact_id": {"type": "string"},
                    "watermark_image_id": {"type": "string"},
                    "profile": {"type": "string", "default": "VIDEO_PLUS_AUDIO"},
                    "output_format": {"type": "string", "default": "MP4"},
                },
                "required": ["video_artifact_id"],
            },
            output_schema={
                "type": "object",
                "properties": {
                    "artifact_id": {"type": "string"},
                    "path": {"type": "string"},
                    "file_size_bytes": {"type": "integer"},
                    "sha256_hash": {"type": "string"},
                },
            },
            supported_workers=["media_composer", "video_worker"],
            verification_policy="ARTIFACT_EXISTS_AND_VALIDATED",
        ),
        _handle_media_video_compose,
        overwrite=True,
    )

    reg.register(
        SkillDefinition(
            skill_id="media.workflow.execute",
            name="Multimodal Media Workflow DAG Executor",
            version="1.0.0",
            description="Execute validated acyclic multimodal media workflows with resource admission, checkpoints, and lineage.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.MEDIUM,
            permissions=["LOCAL_STORAGE_WRITE", "LOCAL_STORAGE_READ", "GPU_INFERENCE"],
            input_schema={
                "type": "object",
                "properties": {
                    "workflow": {"type": "object", "description": "MediaWorkflow schema dictionary"},
                },
                "required": ["workflow"],
            },
            output_schema={
                "type": "object",
                "properties": {
                    "workflow_id": {"type": "string"},
                    "status": {"type": "string"},
                    "primary_artifact_id": {"type": "string"},
                    "artifacts": {"type": "array"},
                },
            },
            supported_workers=["workflow_engine", "media_worker"],
            verification_policy="WORKFLOW_SUCCESS_CONTRACT",
        ),
        _handle_media_workflow_execute,
        overwrite=True,
    )

    logger.info("ComposerSkills: Registered audio.tts@1.0.0, media.video.compose@1.0.0, media.workflow.execute@1.0.0")


# Auto-register
register_composer_skills()
