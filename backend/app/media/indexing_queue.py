"""Background Media Indexing Queue & Understanding Repository."""

import asyncio
import os
import uuid
import time
from typing import Any, Dict, List, Optional

from backend.app.core.logging import logger
from backend.app.media.understanding_models import (
    MediaAnalysisJob,
    MediaAnalysisStatus,
    MediaUnderstandingRecord,
    MediaSearchRequest,
    MediaSearchResult,
    MediaCollection,
    ProvenanceClass,
)
from backend.app.media.media_analyzer import media_analyzer
from backend.app.media.semantic_index import media_semantic_index


class MediaIndexingManager:
    """Manages asynchronous background media indexing, caching, and collections."""

    def __init__(self):
        self._jobs: Dict[str, MediaAnalysisJob] = {}
        self._understanding_records: Dict[str, MediaUnderstandingRecord] = {}
        self._collections: Dict[str, MediaCollection] = {}
        self._analysis_cache: Dict[str, MediaUnderstandingRecord] = {}
        self._lock = asyncio.Lock()

    def _get_cache_key(self, sha256: str, analysis_version: str, model_digest: Optional[str] = None) -> str:
        return f"{sha256}:{analysis_version}:{model_digest or 'default'}"

    async def submit_indexing_job(
        self,
        artifact_id: str,
        file_path: str,
        media_type: str,
        pipeline_id: Optional[str] = None,
        language: str = "en",
        prompt_hint: Optional[str] = None,
        model_id: Optional[str] = None,
        model_digest: Optional[str] = None,
        provenance_class: ProvenanceClass = ProvenanceClass.PROCEDURAL,
        force_reanalysis: bool = False,
    ) -> MediaAnalysisJob:
        """Submit or queue a media asset for background analysis and semantic indexing."""
        job_id = f"ajob_{uuid.uuid4().hex[:12]}"
        job = MediaAnalysisJob(
            job_id=job_id,
            artifact_id=artifact_id,
            media_type=media_type,
            status=MediaAnalysisStatus.QUEUED,
            progress_pct=0.0,
            current_phase="QUEUED",
        )
        self._jobs[job_id] = job
        # Run analysis (non-blocking task)
        asyncio.create_task(
            self._process_indexing_job(
                job=job,
                file_path=file_path,
                pipeline_id=pipeline_id,
                language=language,
                prompt_hint=prompt_hint,
                model_id=model_id,
                model_digest=model_digest,
                provenance_class=provenance_class,
                force_reanalysis=force_reanalysis,
            )
        )
        return job

    async def submit_analysis_job(self, **kwargs) -> MediaAnalysisJob:
        """Alias for submit_indexing_job."""
        return await self.submit_indexing_job(**kwargs)

    async def index_artifact_direct(
        self,
        artifact_id: str,
        file_path: str,
        media_type: str,
        pipeline_id: Optional[str] = None,
        language: str = "en",
        prompt_hint: Optional[str] = None,
        model_id: Optional[str] = None,
        model_digest: Optional[str] = None,
        provenance_class: ProvenanceClass = ProvenanceClass.PROCEDURAL,
        force_reanalysis: bool = False,
    ) -> MediaUnderstandingRecord:
        """Synchronously index and understand an artifact without queuing."""
        job = MediaAnalysisJob(
            job_id=f"ajob_{uuid.uuid4().hex[:12]}",
            artifact_id=artifact_id,
            media_type=media_type,
            status=MediaAnalysisStatus.QUEUED,
        )
        self._jobs[job.job_id] = job
        await self._process_indexing_job(
            job=job,
            file_path=file_path,
            pipeline_id=pipeline_id,
            language=language,
            prompt_hint=prompt_hint,
            model_id=model_id,
            model_digest=model_digest,
            provenance_class=provenance_class,
            force_reanalysis=force_reanalysis,
        )
        rec = self._understanding_records.get(artifact_id)
        if not rec:
            raise RuntimeError(f"Indexing failed for artifact {artifact_id}: {job.error_message}")
        return rec


    async def _process_indexing_job(
        self,
        job: MediaAnalysisJob,
        file_path: str,
        pipeline_id: Optional[str],
        language: str,
        prompt_hint: Optional[str],
        model_id: Optional[str],
        model_digest: Optional[str],
        provenance_class: ProvenanceClass,
        force_reanalysis: bool,
    ):
        """Execute analyzer, cache results, and index into LanceDB."""
        try:
            job.status = MediaAnalysisStatus.ANALYZING
            job.progress_pct = 25.0
            job.current_phase = "VALIDATING_AND_EXTRACTING_FEATURES"

            # Check cache if not forcing reanalysis
            cache_key = None
            if not force_reanalysis and os.path.exists(file_path):
                # Calculate simple file hash for cache lookup
                try:
                    import hashlib
                    with open(file_path, "rb") as f:
                        f_hash = hashlib.sha256(f.read()).hexdigest()
                    cache_key = self._get_cache_key(f_hash, job.analysis_version, model_digest)
                    if cache_key in self._analysis_cache:
                        logger.info(f"Reusing cached media understanding for artifact {job.artifact_id}")
                        record = self._analysis_cache[cache_key]
                        record.artifact_id = job.artifact_id
                        self._understanding_records[job.artifact_id] = record
                        job.status = MediaAnalysisStatus.READY
                        job.progress_pct = 100.0
                        job.current_phase = "COMPLETED_FROM_CACHE"
                        job.completed_at = int(time.time() * 1000)
                        return
                except Exception as e:
                    logger.warning(f"Cache check failed: {e}")

            # Run full analyzer
            job.progress_pct = 50.0
            job.current_phase = "MULTIMODAL_SEMANTIC_ANALYSIS"
            record = await media_analyzer.analyze_media(
                artifact_id=job.artifact_id,
                file_path=file_path,
                media_type=job.media_type,
                pipeline_id=pipeline_id,
                language=language,
                prompt_hint=prompt_hint,
                model_id=model_id,
                model_digest=model_digest,
                provenance_class=provenance_class,
            )

            job.progress_pct = 75.0
            job.current_phase = "SEMANTIC_VECTOR_INDEXING"

            # Index into LanceDB if not quarantined
            if not record.is_quarantined:
                searchable_text = f"{record.caption} {record.environment} {record.visual_style} {' '.join(record.visual_tags)} {record.ocr_text_full or ''} {record.audio_transcript_full or ''}"
                emb_record = await media_semantic_index.index_artifact_semantic(
                    artifact_id=job.artifact_id,
                    media_type=record.media_type,
                    searchable_text=searchable_text,
                    technical_meta=record.technical_metadata,
                    language=record.language,
                    pipeline_id=record.pipeline_id,
                    provenance_class=record.provenance_class.value,
                    tags=record.visual_tags,
                )
                record.embedding_references.append(emb_record.embedding_id)

                # Index individual scenes if video
                for scene in record.scenes:
                    scene_text = f"{scene.caption} {' '.join(scene.labels)} {' '.join(scene.tags)}"
                    s_id = await media_semantic_index.index_scene(
                        scene_id=scene.scene_id,
                        video_artifact_id=job.artifact_id,
                        start_time=scene.start_time,
                        end_time=scene.end_time,
                        searchable_text=scene_text,
                    )
                    scene.embedding_id = s_id

            # Save in understanding store & cache
            self._understanding_records[job.artifact_id] = record
            sha = record.technical_metadata.get("sha256")
            if sha:
                c_key = self._get_cache_key(sha, record.analysis_version, model_digest)
                self._analysis_cache[c_key] = record

            job.status = MediaAnalysisStatus.QUARANTINED if record.is_quarantined else MediaAnalysisStatus.READY
            job.progress_pct = 100.0
            job.current_phase = "QUARANTINED" if record.is_quarantined else "READY"
            job.completed_at = int(time.time() * 1000)

        except Exception as e:
            logger.error(f"Error analyzing artifact {job.artifact_id}: {e}", exc_info=True)
            job.status = MediaAnalysisStatus.FAILED
            job.error_message = str(e)
            job.current_phase = "FAILED"
            job.completed_at = int(time.time() * 1000)

    async def get_understanding(self, artifact_id: str) -> Optional[MediaUnderstandingRecord]:
        return self._understanding_records.get(artifact_id)

    async def list_understandings(self) -> List[MediaUnderstandingRecord]:
        return list(self._understanding_records.values())

    async def search_library(self, request: MediaSearchRequest) -> List[MediaSearchResult]:
        """Execute hybrid search using the semantic vector index + understanding records."""
        index_matches = await media_semantic_index.hybrid_search(request)
        results: List[MediaSearchResult] = []

        for match in index_matches:
            art_id = match["artifact_id"]
            und = self._understanding_records.get(art_id)

            caption = und.caption if und else match.get("searchable_text", "")
            dur = match.get("duration")
            w = match.get("width", 0)
            h = match.get("height", 0)
            res = [w, h] if w and h else None

            results.append(
                MediaSearchResult(
                    artifact_id=art_id,
                    score=match["score"],
                    media_type=match["media_type"],
                    filename=f"{art_id}.{match['media_type'].lower()}",
                    file_path=f"data/artifacts/{art_id}",
                    caption=caption,
                    duration=dur,
                    resolution=res,
                    language=match.get("language", "en"),
                    provenance=ProvenanceClass(match.get("provenance_class", "PROCEDURAL")),
                    pipeline_id=match.get("pipeline_id"),
                    match_reason=match.get("match_reason", "Semantic vector match"),
                    technical_metadata=und.technical_metadata if und else {},
                    tags=match.get("tags", []),
                    scenes_count=len(und.scenes) if und else 0,
                    created_at=match.get("created_at_ts", 0),
                )
            )

        return results

    async def list_jobs(self) -> List[MediaAnalysisJob]:
        return list(self._jobs.values())

    async def create_collection(self, title: str, description: Optional[str] = None, collection_type: str = "PROJECT", tags: Optional[List[str]] = None) -> MediaCollection:
        col = MediaCollection(
            collection_id=f"col_{uuid.uuid4().hex[:12]}",
            title=title,
            description=description,
            collection_type=collection_type,
            tags=tags or [],
        )
        self._collections[col.collection_id] = col
        return col

    async def list_collections(self) -> List[MediaCollection]:
        return list(self._collections.values())

    async def add_to_collection(self, collection_id: str, artifact_ids: List[str]) -> Optional[MediaCollection]:
        col = self._collections.get(collection_id)
        if not col:
            return None
        existing = set(col.artifact_ids)
        for aid in artifact_ids:
            if aid not in existing:
                col.artifact_ids.append(aid)
        col.updated_at = int(time.time() * 1000)
        return col


# Global media indexing manager singleton
media_indexing_manager = MediaIndexingManager()
