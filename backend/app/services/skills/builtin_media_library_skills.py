"""
Phase 8 Stage 8.7: Built-in Media Library, Semantic Search, and Reuse Skills.

Registers:
- media.library.search@1.0.0: Hybrid search across local media assets
- media.library.inspect@1.0.0: Detailed technical and semantic understanding inspection
- media.library.similar@1.0.0: Find semantically and style-similar media assets
- media.library.reuse_candidate@1.0.0: Evaluate asset reuse compatibility and GPU savings
- media.library.analyze@1.0.0: Trigger multimodal analysis on a media artifact
- media.library.index@1.0.0: Queue or refresh indexing of artifacts/collections
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
from backend.app.media.understanding_models import (
    MediaSearchRequest,
    MediaReuseRequest,
    SearchMode,
)
from backend.app.media.indexing_queue import media_indexing_manager
from backend.app.media.reuse_engine import media_reuse_engine


async def _handle_library_search(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_search")
    try:
        req = MediaSearchRequest(
            query=args.get("query"),
            media_types=args.get("media_types"),
            languages=args.get("languages"),
            min_duration=args.get("min_duration"),
            max_duration=args.get("max_duration"),
            search_mode=SearchMode(args.get("search_mode", "HYBRID")),
            limit=args.get("limit", 10),
        )
        results = await media_indexing_manager.search_library(req)
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=True,
            skill_id="media.library.search",
            skill_version="1.0.0",
            action_id=action_id,
            output_data={"results": [r.model_dump(mode="json") for r in results], "count": len(results)},
            duration_ms=dur_ms,
        )
    except Exception as e:
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=False,
            skill_id="media.library.search",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.EXECUTION_FAILED,
            error_message=str(e),
            duration_ms=dur_ms,
        )


async def _handle_library_inspect(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_inspect")
    art_id = args.get("artifact_id", "")
    try:
        record = await media_indexing_manager.get_understanding(art_id)
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        if not record:
            return SkillResult(
                is_success=False,
                skill_id="media.library.inspect",
                skill_version="1.0.0",
                action_id=action_id,
                failure_code=SkillFailureCode.EXECUTION_FAILED,
                error_message=f"Artifact understanding record not found for {art_id}",
                duration_ms=dur_ms,
            )
        return SkillResult(
            is_success=True,
            skill_id="media.library.inspect",
            skill_version="1.0.0",
            action_id=action_id,
            output_data=record.model_dump(mode="json"),
            duration_ms=dur_ms,
        )
    except Exception as e:
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=False,
            skill_id="media.library.inspect",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.EXECUTION_FAILED,
            error_message=str(e),
            duration_ms=dur_ms,
        )


async def _handle_library_similar(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_similar")
    art_id = args.get("artifact_id", "")
    limit = args.get("limit", 5)
    try:
        record = await media_indexing_manager.get_understanding(art_id)
        if not record:
            dur_ms = int((time.perf_counter() - start_ts) * 1000)
            return SkillResult(
                is_success=False,
                skill_id="media.library.similar",
                skill_version="1.0.0",
                action_id=action_id,
                failure_code=SkillFailureCode.EXECUTION_FAILED,
                error_message=f"Source artifact not found for similarity search: {art_id}",
                duration_ms=dur_ms,
            )
        
        query_text = record.semantic_metadata.caption or " ".join(record.semantic_metadata.visual_tags)
        req = MediaSearchRequest(
            query=query_text,
            media_types=[record.media_type],
            search_mode=SearchMode.SIMILARITY,
            limit=limit + 1,
        )
        results = await media_indexing_manager.search_library(req)
        filtered = [r for r in results if r.artifact_id != art_id][:limit]
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=True,
            skill_id="media.library.similar",
            skill_version="1.0.0",
            action_id=action_id,
            output_data={"results": [r.model_dump(mode="json") for r in filtered], "count": len(filtered)},
            duration_ms=dur_ms,
        )
    except Exception as e:
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=False,
            skill_id="media.library.similar",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.EXECUTION_FAILED,
            error_message=str(e),
            duration_ms=dur_ms,
        )


async def _handle_library_reuse(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_reuse")
    try:
        req = MediaReuseRequest(
            target_media_type=args.get("target_media_type", "IMAGE"),
            target_concept=args.get("target_concept", ""),
            target_resolution=args.get("target_resolution"),
            target_aspect_ratio=args.get("target_aspect_ratio"),
            target_duration=args.get("target_duration"),
            target_language=args.get("target_language"),
            target_tags=args.get("target_tags", []),
            pipeline_id=args.get("pipeline_id"),
        )
        candidate_ids = args.get("candidate_artifact_ids")
        recs = await media_reuse_engine.evaluate_candidates(req, candidate_ids)
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=True,
            skill_id="media.library.reuse_candidate",
            skill_version="1.0.0",
            action_id=action_id,
            output_data={"recommendations": [r.model_dump(mode="json") for r in recs], "count": len(recs)},
            duration_ms=dur_ms,
        )
    except Exception as e:
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=False,
            skill_id="media.library.reuse_candidate",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.EXECUTION_FAILED,
            error_message=str(e),
            duration_ms=dur_ms,
        )


async def _handle_library_analyze(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_analyze")
    art_id = args.get("artifact_id", "")
    force = bool(args.get("force_reanalysis", False))
    try:
        record = await media_indexing_manager.index_artifact_direct(
            artifact_id=art_id,
            media_type=args.get("media_type", "IMAGE"),
            file_path=args.get("file_path", ""),
            pipeline_id=args.get("pipeline_id"),
            force_reanalysis=force,
        )
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=True,
            skill_id="media.library.analyze",
            skill_version="1.0.0",
            action_id=action_id,
            output_data=record.model_dump(mode="json"),
            duration_ms=dur_ms,
        )
    except Exception as e:
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=False,
            skill_id="media.library.analyze",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.EXECUTION_FAILED,
            error_message=str(e),
            duration_ms=dur_ms,
        )


async def _handle_library_index(args: Dict[str, Any], invocation_ctx: Dict[str, Any]) -> SkillResult:
    start_ts = time.perf_counter()
    action_id = invocation_ctx.get("action_id", "act_index")
    try:
        job = await media_indexing_manager.submit_analysis_job(
            artifact_id=args.get("artifact_id", ""),
            media_type=args.get("media_type", "IMAGE"),
            file_path=args.get("file_path", ""),
            pipeline_id=args.get("pipeline_id"),
            priority=args.get("priority", 20),
            force_reanalysis=bool(args.get("force_reanalysis", False)),
        )
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=True,
            skill_id="media.library.index",
            skill_version="1.0.0",
            action_id=action_id,
            output_data=job.model_dump(mode="json"),
            duration_ms=dur_ms,
        )
    except Exception as e:
        dur_ms = int((time.perf_counter() - start_ts) * 1000)
        return SkillResult(
            is_success=False,
            skill_id="media.library.index",
            skill_version="1.0.0",
            action_id=action_id,
            failure_code=SkillFailureCode.EXECUTION_FAILED,
            error_message=str(e),
            duration_ms=dur_ms,
        )


def register_media_library_skills(registry: Optional[SkillRegistry] = None) -> None:
    target_reg = registry or skill_registry

    # 1. media.library.search@1.0.0
    target_reg.register(
        SkillDefinition(
            skill_id="media.library.search",
            version="1.0.0",
            name="Media Library Search",
            description="Searches local media library using hybrid dense vectors, BM25 text overlap, and technical filters.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.LOW,
            input_schema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "media_types": {"type": "array", "items": {"type": "string"}},
                    "languages": {"type": "array", "items": {"type": "string"}},
                    "min_duration": {"type": "number"},
                    "max_duration": {"type": "number"},
                    "search_mode": {"type": "string"},
                    "limit": {"type": "integer"},
                },
            },
            output_schema={"type": "object"},
            lifecycle_state=SkillLifecycleState.ENABLED,
        ),
        handler=_handle_library_search,
        overwrite=True,
    )

    # 2. media.library.inspect@1.0.0
    target_reg.register(
        SkillDefinition(
            skill_id="media.library.inspect",
            version="1.0.0",
            name="Media Library Inspector",
            description="Inspects technical metadata, OCR, audio transcript, scene timeline, and provenance for a media asset.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.READ_ONLY,
            input_schema={
                "type": "object",
                "properties": {
                    "artifact_id": {"type": "string"},
                },
                "required": ["artifact_id"],
            },
            output_schema={"type": "object"},
            lifecycle_state=SkillLifecycleState.ENABLED,
        ),
        handler=_handle_library_inspect,
        overwrite=True,
    )

    # 3. media.library.similar@1.0.0
    target_reg.register(
        SkillDefinition(
            skill_id="media.library.similar",
            version="1.0.0",
            name="Media Library Similarity Finder",
            description="Finds semantically similar media assets based on embedding proximity and visual tags.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.READ_ONLY,
            input_schema={
                "type": "object",
                "properties": {
                    "artifact_id": {"type": "string"},
                    "limit": {"type": "integer"},
                },
                "required": ["artifact_id"],
            },
            output_schema={"type": "object"},
            lifecycle_state=SkillLifecycleState.ENABLED,
        ),
        handler=_handle_library_similar,
        overwrite=True,
    )

    # 4. media.library.reuse_candidate@1.0.0
    target_reg.register(
        SkillDefinition(
            skill_id="media.library.reuse_candidate",
            version="1.0.0",
            name="Media Reuse Candidate Evaluator",
            description="Evaluates whether an existing library asset can be reused for creative requirements with zero generation overhead.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.LOW,
            input_schema={
                "type": "object",
                "properties": {
                    "target_media_type": {"type": "string"},
                    "target_concept": {"type": "string"},
                    "target_resolution": {"type": "string"},
                    "target_aspect_ratio": {"type": "string"},
                    "target_duration": {"type": "number"},
                    "target_language": {"type": "string"},
                    "candidate_artifact_ids": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["target_media_type", "target_concept"],
            },
            output_schema={"type": "object"},
            lifecycle_state=SkillLifecycleState.ENABLED,
        ),
        handler=_handle_library_reuse,
        overwrite=True,
    )

    # 5. media.library.analyze@1.0.0
    target_reg.register(
        SkillDefinition(
            skill_id="media.library.analyze",
            version="1.0.0",
            name="Media Direct Analyzer",
            description="Directly analyzes and indexes a media artifact synchronously.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.LOW,
            input_schema={
                "type": "object",
                "properties": {
                    "artifact_id": {"type": "string"},
                    "media_type": {"type": "string"},
                    "file_path": {"type": "string"},
                    "pipeline_id": {"type": "string"},
                    "force_reanalysis": {"type": "boolean"},
                },
                "required": ["artifact_id", "media_type", "file_path"],
            },
            output_schema={"type": "object"},
            lifecycle_state=SkillLifecycleState.ENABLED,
        ),
        handler=_handle_library_analyze,
        overwrite=True,
    )

    # 6. media.library.index@1.0.0
    target_reg.register(
        SkillDefinition(
            skill_id="media.library.index",
            version="1.0.0",
            name="Media Library Index Queue",
            description="Submits a background indexing and understanding job for a media artifact.",
            category=SkillCategory.MEDIA,
            risk_level=SkillRiskLevel.LOW,
            input_schema={
                "type": "object",
                "properties": {
                    "artifact_id": {"type": "string"},
                    "media_type": {"type": "string"},
                    "file_path": {"type": "string"},
                    "pipeline_id": {"type": "string"},
                    "priority": {"type": "integer"},
                    "force_reanalysis": {"type": "boolean"},
                },
                "required": ["artifact_id", "media_type", "file_path"],
            },
            output_schema={"type": "object"},
            lifecycle_state=SkillLifecycleState.ENABLED,
        ),
        handler=_handle_library_index,
        overwrite=True,
    )


# Automatically register on module import
register_media_library_skills()
