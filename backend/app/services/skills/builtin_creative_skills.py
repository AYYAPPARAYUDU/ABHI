"""Phase 8 Stage 8.5 — Built-in Creative Pipeline Production Skills.

Registers:
- media.creative.pipeline@1.0.0: High-level creative brief decomposition and production pipeline execution
- media.creative.revise@1.0.0: Partial scene revision and dependency invalidation for minimal rebuilds
- media.subtitles.generate@1.0.0: Subtitle track synthesis (SRT / WebVTT) from narration script
"""

import os
import time
import uuid
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
from backend.app.media.creative_models import (
    CreativeBrief,
    CreativePipeline,
    SubtitleTrack,
    SubtitleSegment,
    SubtitleFormat,
    generate_srt_content,
    generate_vtt_content,
)

_orchestrator: Optional[Any] = None


def get_creative_orchestrator() -> Any:
    """Returns singleton instance of CreativePipelineOrchestrator."""
    global _orchestrator
    if _orchestrator is None:
        from backend.app.media.creative_orchestrator import CreativePipelineOrchestrator, creative_orchestrator
        _orchestrator = creative_orchestrator or CreativePipelineOrchestrator()
    return _orchestrator


async def _handle_creative_pipeline(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    """Execute high-level creative pipeline from brief."""
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_creative_pipe")
    task_id = invocation_ctx.get("task_id", "task_creative")

    title = args.get("title") or "Creative Production Video"
    description = args.get("description") or args.get("prompt") or "Generate creative promotional clip"
    style = args.get("style", "Cinematic")
    language = args.get("language", "en")
    duration = float(args.get("duration", 10.0))

    try:
        brief = CreativeBrief(
            title=title,
            description=description,
            style=style,
            language=language,
            duration=duration,
        )

        orch = get_creative_orchestrator()
        pipeline = orch.create_pipeline(brief, task_id=task_id)
        executed = orch.execute_pipeline(pipeline.pipeline_id)

        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=(executed.status.value == "COMPLETED"),
            skill_id="media.creative.pipeline",
            skill_version="1.0.0",
            action_id=action_id,
            output_data={
                "pipeline_id": executed.pipeline_id,
                "status": executed.status.value,
                "pipeline_hash": executed.pipeline_hash,
                "outputs": executed.outputs,
                "scenes_count": len(executed.scenes),
                "quality_report": executed.quality_report.model_dump() if executed.quality_report else None,
            },
            duration_ms=dur_ms,
        )
    except Exception as e:
        logger.error(f"Creative pipeline skill failed: {e}")
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=False,
            skill_id="media.creative.pipeline",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.EXECUTION_FAILED,
            error_message=str(e),
            duration_ms=dur_ms,
        )


async def _handle_creative_revise(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    """Revise a single scene in a pipeline and compute invalidation."""
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_creative_revise")

    pipeline_id = args.get("pipeline_id")
    scene_id = args.get("scene_id")
    new_prompt = args.get("new_prompt")

    if not pipeline_id or not scene_id or not new_prompt:
        return SkillResult(
            is_success=False,
            skill_id="media.creative.revise",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.INVALID_ARGUMENTS,
            error_message="Arguments 'pipeline_id', 'scene_id', and 'new_prompt' are required.",
            duration_ms=0,
        )

    try:
        orch = get_creative_orchestrator()
        pipeline, invalidation = orch.revise_pipeline_scene(
            pipeline_id=pipeline_id,
            scene_id=scene_id,
            new_prompt=new_prompt,
        )
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=True,
            skill_id="media.creative.revise",
            skill_version="1.0.0",
            action_id=action_id,
            output_data={
                "pipeline_id": pipeline.pipeline_id,
                "status": pipeline.status.value,
                "invalidation_plan": invalidation.model_dump(),
            },
            duration_ms=dur_ms,
        )
    except Exception as e:
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=False,
            skill_id="media.creative.revise",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.EXECUTION_FAILED,
            error_message=str(e),
            duration_ms=dur_ms,
        )


async def _handle_subtitles_generate(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    """Generates timed SRT/VTT subtitle tracks from input segments."""
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_subtitles_gen")

    segments_data = args.get("segments", [])
    fmt = args.get("format", "SRT").upper()
    lang = args.get("language", "en")

    if not segments_data or not isinstance(segments_data, list):
        return SkillResult(
            is_success=False,
            skill_id="media.subtitles.generate",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.INVALID_ARGUMENTS,
            error_message="Argument 'segments' must be a non-empty list of subtitle entries.",
            duration_ms=0,
        )

    try:
        segments = []
        for i, s in enumerate(segments_data):
            segments.append(
                SubtitleSegment(
                    index=i + 1,
                    start_time=float(s.get("start_time", 0.0)),
                    end_time=float(s.get("end_time", 1.0)),
                    text=str(s.get("text", "")),
                )
            )

        track = SubtitleTrack(
            language=lang,
            format=SubtitleFormat(fmt) if fmt in ["SRT", "WEBVTT"] else SubtitleFormat.SRT,
            segments=segments,
        )

        content = generate_vtt_content(track) if track.format == SubtitleFormat.WEBVTT else generate_srt_content(track)
        track.raw_content = content

        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=True,
            skill_id="media.subtitles.generate",
            skill_version="1.0.0",
            action_id=action_id,
            output_data={
                "track_id": track.track_id,
                "language": track.language,
                "format": track.format.value,
                "segment_count": len(track.segments),
                "raw_content": content,
            },
            duration_ms=dur_ms,
        )
    except Exception as e:
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=False,
            skill_id="media.subtitles.generate",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.EXECUTION_FAILED,
            error_message=str(e),
            duration_ms=dur_ms,
        )


def register_builtin_creative_skills(registry: Optional[SkillRegistry] = None) -> None:
    """Registers Phase 8.5 Creative Pipeline Skills."""
    target_reg = registry or skill_registry

    # 1. media.creative.pipeline@1.0.0
    target_reg.register(
        SkillDefinition(
            skill_id="media.creative.pipeline",
            version="1.0.0",
            name="Creative Production Pipeline",
            description="Executes end-to-end multimodal production pipeline from creative brief.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.LOW,
            input_schema={
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "style": {"type": "string"},
                    "language": {"type": "string"},
                    "duration": {"type": "number"},
                },
                "required": ["title", "description"],
            },
            output_schema={
                "type": "object",
                "properties": {
                    "pipeline_id": {"type": "string"},
                    "status": {"type": "string"},
                    "outputs": {"type": "array"},
                },
            },
            lifecycle_state=SkillLifecycleState.ENABLED,
        ),
        handler=_handle_creative_pipeline,
        overwrite=True,
    )

    # 2. media.creative.revise@1.0.0
    target_reg.register(
        SkillDefinition(
            skill_id="media.creative.revise",
            version="1.0.0",
            name="Creative Pipeline Scene Revision",
            description="Revises scene in creative pipeline with dependency invalidation for minimal rebuilds.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.LOW,
            input_schema={
                "type": "object",
                "properties": {
                    "pipeline_id": {"type": "string"},
                    "scene_id": {"type": "string"},
                    "new_prompt": {"type": "string"},
                },
                "required": ["pipeline_id", "scene_id", "new_prompt"],
            },
            output_schema={
                "type": "object",
                "properties": {
                    "pipeline_id": {"type": "string"},
                    "status": {"type": "string"},
                    "invalidation_plan": {"type": "object"},
                },
            },
            lifecycle_state=SkillLifecycleState.ENABLED,
        ),
        handler=_handle_creative_revise,
        overwrite=True,
    )

    # 3. media.subtitles.generate@1.0.0
    target_reg.register(
        SkillDefinition(
            skill_id="media.subtitles.generate",
            version="1.0.0",
            name="Subtitle Track Generator",
            description="Generates synchronized SRT and WebVTT subtitle tracks from narration script.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.LOW,
            input_schema={
                "type": "object",
                "properties": {
                    "segments": {"type": "array"},
                    "format": {"type": "string"},
                    "language": {"type": "string"},
                },
                "required": ["segments"],
            },
            output_schema={
                "type": "object",
                "properties": {
                    "track_id": {"type": "string"},
                    "raw_content": {"type": "string"},
                },
            },
            lifecycle_state=SkillLifecycleState.ENABLED,
        ),
        handler=_handle_subtitles_generate,
        overwrite=True,
    )


# Automatically register on module import
register_builtin_creative_skills()
