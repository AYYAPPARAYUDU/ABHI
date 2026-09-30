"""
Phase 8 Stage 8.6: Built-in Media Provenance, Attestation, and Replay Skills.

Registers:
- media.provenance.attest@1.0.0: Attests runtime execution authenticity and signs provenance metadata
- media.provenance.validate@1.0.0: Centralized technical validation of media file integrity and timing alignment
- media.replay.inspect@1.0.0: Replay inspection, model verification, and resource pre-simulation
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
from backend.app.media.provenance_models import ProvenanceClass
from backend.app.media.provenance_attestor import media_provenance_attestor
from backend.app.media.technical_validator import media_technical_validator
from backend.app.media.replay_engine import media_replay_engine


async def _handle_provenance_attest(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    """Creates a cryptographic runtime attestation."""
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_attest")

    op_id = args.get("operation_id", "op_unknown")
    art_id = args.get("artifact_id", "art_unknown")
    op_type = args.get("operation_type", "GENERATE")
    runtime = args.get("runtime_name", "LocalDiffusionEngine")
    model_id = args.get("model_id")
    model_digest = args.get("model_digest")
    claimed_prov = args.get("claimed_provenance")
    allow_candidate = bool(args.get("allow_candidate", False))

    try:
        prov_enum = ProvenanceClass(claimed_prov) if claimed_prov else None
        att = media_provenance_attestor.create_attestation(
            operation_id=op_id,
            artifact_id=art_id,
            operation_type=op_type,
            runtime_name=runtime,
            model_id=model_id,
            model_digest=model_digest,
            claimed_provenance=prov_enum,
            allow_candidate=allow_candidate,
            parameters=args.get("parameters", {}),
            input_hashes=args.get("input_hashes", []),
            output_hashes=args.get("output_hashes", []),
            seed=args.get("seed"),
        )
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=True,
            skill_id="media.provenance.attest",
            skill_version="1.0.0",
            action_id=action_id,
            output_data=att.model_dump(mode="json"),
            duration_ms=dur_ms,
        )
    except Exception as e:
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=False,
            skill_id="media.provenance.attest",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.EXECUTION_FAILED,
            error_message=str(e),
            duration_ms=dur_ms,
        )


async def _handle_provenance_validate(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    """Executes technical validation on a media file or subtitle track."""
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_validate")

    media_type = args.get("media_type", "IMAGE").upper()
    file_path = args.get("file_path", "")

    try:
        if media_type == "IMAGE":
            res = media_technical_validator.validate_image_file(
                file_path=file_path,
                expected_width=args.get("width"),
                expected_height=args.get("height"),
                expected_sha256=args.get("sha256"),
            )
        elif media_type == "VIDEO":
            res = media_technical_validator.validate_video_file(
                file_path=file_path,
                expected_fps=args.get("fps"),
                expected_duration_s=args.get("duration"),
                expected_sha256=args.get("sha256"),
            )
        elif media_type == "AUDIO":
            res = media_technical_validator.validate_audio_file(
                file_path=file_path,
                expected_duration_s=args.get("duration"),
                expected_sha256=args.get("sha256"),
            )
        elif media_type == "SUBTITLE":
            res = media_technical_validator.validate_subtitle_track(
                segments=args.get("segments", []),
                media_duration_s=float(args.get("duration", 10.0)),
            )
        else:
            raise ValueError(f"Unsupported media_type for validation: {media_type}")

        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=res.is_valid,
            skill_id="media.provenance.validate",
            skill_version="1.0.0",
            action_id=action_id,
            output_data=res.model_dump(mode="json"),
            duration_ms=dur_ms,
        )
    except Exception as e:
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=False,
            skill_id="media.provenance.validate",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.EXECUTION_FAILED,
            error_message=str(e),
            duration_ms=dur_ms,
        )


async def _handle_replay_inspect(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    """Inspects and pre-simulates replay execution."""
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_replay_inspect")

    project_data = args.get("project_data", {})
    simulate = bool(args.get("simulate", False))

    try:
        if simulate:
            inspection = media_replay_engine.simulate_replay(project_data)
        else:
            inspection = media_replay_engine.inspect_replay(project_data)

        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=inspection.is_safe_to_execute,
            skill_id="media.replay.inspect",
            skill_version="1.0.0",
            action_id=action_id,
            output_data=inspection.model_dump(mode="json"),
            duration_ms=dur_ms,
        )
    except Exception as e:
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=False,
            skill_id="media.replay.inspect",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.EXECUTION_FAILED,
            error_message=str(e),
            duration_ms=dur_ms,
        )


def register_builtin_provenance_skills(registry: Optional[SkillRegistry] = None) -> None:
    """Registers Phase 8.6 Provenance and Reliability Skills."""
    target_reg = registry or skill_registry

    # 1. media.provenance.attest@1.0.0
    target_reg.register(
        SkillDefinition(
            skill_id="media.provenance.attest",
            version="1.0.0",
            name="Media Runtime Provenance Attestation",
            description="Creates verifiable, signed attestation linking models, runtimes, parameters and hashes.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.LOW,
            input_schema={
                "type": "object",
                "properties": {
                    "operation_id": {"type": "string"},
                    "artifact_id": {"type": "string"},
                    "runtime_name": {"type": "string"},
                },
                "required": ["operation_id", "artifact_id", "runtime_name"],
            },
            output_schema={"type": "object"},
            lifecycle_state=SkillLifecycleState.ENABLED,
        ),
        handler=_handle_provenance_attest,
        overwrite=True,
    )

    # 2. media.provenance.validate@1.0.0
    target_reg.register(
        SkillDefinition(
            skill_id="media.provenance.validate",
            version="1.0.0",
            name="Media Technical Validator",
            description="Validates media file integrity, dimensions, codecs, frame rates, and checksums.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.LOW,
            input_schema={
                "type": "object",
                "properties": {
                    "media_type": {"type": "string"},
                    "file_path": {"type": "string"},
                },
                "required": ["media_type"],
            },
            output_schema={"type": "object"},
            lifecycle_state=SkillLifecycleState.ENABLED,
        ),
        handler=_handle_provenance_validate,
        overwrite=True,
    )

    # 3. media.replay.inspect@1.0.0
    target_reg.register(
        SkillDefinition(
            skill_id="media.replay.inspect",
            version="1.0.0",
            name="Media Replay Inspector",
            description="Inspects and validates replay safety, model digests and hardware feasibility before execution.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.LOW,
            input_schema={
                "type": "object",
                "properties": {
                    "project_data": {"type": "object"},
                    "simulate": {"type": "boolean"},
                },
                "required": ["project_data"],
            },
            output_schema={"type": "object"},
            lifecycle_state=SkillLifecycleState.ENABLED,
        ),
        handler=_handle_replay_inspect,
        overwrite=True,
    )


# Automatically register on module import
register_builtin_provenance_skills()
