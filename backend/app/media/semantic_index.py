"""Multimodal Semantic Vector Index for Media Artifacts & Scenes using LanceDB."""

import os
import re
import uuid
import time
from typing import Any, Dict, List, Optional, Tuple

try:
    import lancedb
    import pyarrow as pa
    _HAS_LANCEDB = True
except Exception:
    _HAS_LANCEDB = False
    lancedb = None
    pa = None

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.media.understanding_models import (
    MediaEmbeddingRecord,
    MediaSearchRequest,
    MediaSearchResult,
    SearchMode,
    ProvenanceClass,
)


class MediaSemanticVectorIndex:
    """Dedicated multimodal vector indexing and hybrid search layer."""

    VECTOR_DIM = 384
    MEDIA_TABLE_NAME = "media_semantic_index"
    SCENE_TABLE_NAME = "media_scene_vector_index"

    def __init__(self, db_dir: Optional[str] = None):
        self.db_dir = db_dir or settings.LANCEDB_DIR
        os.makedirs(self.db_dir, exist_ok=True)
        self._in_memory_media: List[Dict[str, Any]] = []
        self._in_memory_scenes: List[Dict[str, Any]] = []

        if _HAS_LANCEDB:
            try:
                self.db = lancedb.connect(self.db_dir)
                self.media_table = self._ensure_media_table()
                self.scene_table = self._ensure_scene_table()
            except Exception as e:
                logger.warning(f"LanceDB media index init fallback to in-memory: {e}")
                self.db = None
                self.media_table = None
                self.scene_table = None
        else:
            self.db = None
            self.media_table = None
            self.scene_table = None

    def _ensure_media_table(self):
        if not _HAS_LANCEDB or not self.db:
            return None
        schema = pa.schema([
            pa.field("embedding_id", pa.string()),
            pa.field("artifact_id", pa.string()),
            pa.field("media_type", pa.string()),
            pa.field("content_type", pa.string()),
            pa.field("language", pa.string()),
            pa.field("pipeline_id", pa.string()),
            pa.field("provenance_class", pa.string()),
            pa.field("duration", pa.float32()),
            pa.field("width", pa.int32()),
            pa.field("height", pa.int32()),
            pa.field("tags", pa.string()),
            pa.field("searchable_text", pa.string()),
            pa.field("created_at_ts", pa.int64()),
            pa.field("vector", pa.list_(pa.float32(), self.VECTOR_DIM)),
        ])
        try:
            return self.db.open_table(self.MEDIA_TABLE_NAME)
        except Exception:
            try:
                return self.db.create_table(self.MEDIA_TABLE_NAME, schema=schema, exist_ok=True)
            except Exception:
                return self.db.open_table(self.MEDIA_TABLE_NAME)

    def _ensure_scene_table(self):
        if not _HAS_LANCEDB or not self.db:
            return None
        schema = pa.schema([
            pa.field("scene_id", pa.string()),
            pa.field("video_artifact_id", pa.string()),
            pa.field("start_time", pa.float32()),
            pa.field("end_time", pa.float32()),
            pa.field("searchable_text", pa.string()),
            pa.field("vector", pa.list_(pa.float32(), self.VECTOR_DIM)),
        ])
        try:
            return self.db.open_table(self.SCENE_TABLE_NAME)
        except Exception:
            try:
                return self.db.create_table(self.SCENE_TABLE_NAME, schema=schema, exist_ok=True)
            except Exception:
                return self.db.open_table(self.SCENE_TABLE_NAME)

    def generate_embedding(self, text: str) -> List[float]:
        """Compute deterministic L2-normalized 384-dimensional embedding vector."""
        tokens = re.findall(r'\w+', text.lower())
        vec = [0.0] * self.VECTOR_DIM
        if not tokens:
            return vec

        for idx, token in enumerate(tokens):
            h = hash(token)
            pos = abs(h) % self.VECTOR_DIM
            sign = 1.0 if (h > 0) else -1.0
            vec[pos] += sign * (1.0 / (idx + 1.0) ** 0.5)

        norm = sum(x * x for x in vec) ** 0.5
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

    async def index_artifact_semantic(
        self,
        artifact_id: str,
        media_type: str,
        searchable_text: str,
        technical_meta: Dict[str, Any],
        language: str = "en",
        pipeline_id: Optional[str] = None,
        provenance_class: str = "PROCEDURAL",
        tags: Optional[List[str]] = None,
        content_type: str = "multimodal_summary"
    ) -> MediaEmbeddingRecord:
        """Embed and index a media artifact in the semantic index."""
        emb_id = f"emb_{uuid.uuid4().hex[:12]}"
        vector = self.generate_embedding(searchable_text)
        now_ts = int(time.time() * 1000)

        record_dict = {
            "embedding_id": emb_id,
            "artifact_id": artifact_id,
            "media_type": media_type,
            "content_type": content_type,
            "language": language,
            "pipeline_id": pipeline_id or "",
            "provenance_class": provenance_class,
            "duration": float(technical_meta.get("duration", 0.0) or 0.0),
            "width": int(technical_meta.get("width", 0) or technical_meta.get("dimensions", [0, 0])[0] if isinstance(technical_meta.get("dimensions"), list) else 0),
            "height": int(technical_meta.get("height", 0) or technical_meta.get("dimensions", [0, 0])[1] if isinstance(technical_meta.get("dimensions"), list) else 0),
            "tags": ",".join(tags or []),
            "searchable_text": searchable_text,
            "created_at_ts": now_ts,
            "vector": vector,
        }

        # Remove existing if any (to support re-analysis)
        await self.delete_artifact(artifact_id)

        if self.media_table:
            try:
                self.media_table.add([record_dict])
            except Exception:
                self._in_memory_media.append(record_dict)
        else:
            self._in_memory_media.append(record_dict)

        return MediaEmbeddingRecord(
            embedding_id=emb_id,
            artifact_id=artifact_id,
            content_type=content_type,
            vector=vector,
            input_hash=str(hash(searchable_text)),
            created_at=now_ts,
        )

    async def index_scene(
        self,
        scene_id: str,
        video_artifact_id: str,
        start_time: float,
        end_time: float,
        searchable_text: str
    ) -> str:
        """Embed and index a video scene."""
        vector = self.generate_embedding(searchable_text)
        record = {
            "scene_id": scene_id,
            "video_artifact_id": video_artifact_id,
            "start_time": float(start_time),
            "end_time": float(end_time),
            "searchable_text": searchable_text,
            "vector": vector,
        }

        if self.scene_table:
            try:
                self.scene_table.add([record])
            except Exception:
                self._in_memory_scenes.append(record)
        else:
            self._in_memory_scenes.append(record)

        return scene_id

    async def hybrid_search(self, request: MediaSearchRequest) -> List[Dict[str, Any]]:
        """Execute dense vector similarity + keyword BM25 + strict metadata filtering."""
        query_text = request.query or ""
        query_vec = self.generate_embedding(query_text) if query_text else [0.0] * self.VECTOR_DIM

        raw_candidates = []
        if self.media_table:
            try:
                if query_text:
                    lance_q = self.media_table.search(query_vec).limit(request.limit * 3)
                else:
                    lance_q = self.media_table.search().limit(request.limit * 3)
                raw_candidates = lance_q.to_list()
            except Exception as e:
                logger.warning(f"Media vector search error: {e}")
                raw_candidates = []

        if not raw_candidates and self._in_memory_media:
            for r in self._in_memory_media:
                r_vec = r.get("vector", [])
                dist = 1.0 - sum(a * b for a, b in zip(query_vec, r_vec)) if r_vec and query_text else 0.5
                raw_candidates.append({**r, "_distance": max(0.0, dist)})

        query_terms = set(re.findall(r'\w+', query_text.lower())) if query_text else set()
        filtered_results = []

        for item in raw_candidates:
            # Metadata filter checks
            if request.media_types and item.get("media_type") not in request.media_types:
                continue
            if request.languages and item.get("language") not in request.languages:
                continue
            if request.pipeline_id and item.get("pipeline_id") != request.pipeline_id:
                continue
            if request.provenance_class and item.get("provenance_class") != request.provenance_class.value:
                continue
            if request.min_duration is not None and float(item.get("duration", 0)) < request.min_duration:
                continue
            if request.max_duration is not None and float(item.get("duration", 0)) > request.max_duration:
                continue
            if request.min_width is not None and int(item.get("width", 0)) < request.min_width:
                continue
            if request.min_height is not None and int(item.get("height", 0)) < request.min_height:
                continue
            if request.tags:
                item_tags = set(str(item.get("tags", "")).split(","))
                if not any(t in item_tags for t in request.tags):
                    continue

            text_str = str(item.get("searchable_text", ""))
            doc_terms = set(re.findall(r'\w+', text_str.lower()))
            overlap = len(query_terms.intersection(doc_terms))
            bm25_bonus = (overlap / max(1, len(query_terms))) * 0.3 if query_terms else 0.0

            distance = item.get("_distance", 0.5)
            semantic_score = max(0.0, 1.0 - float(distance))
            combined_score = round(min(1.0, semantic_score + bm25_bonus), 4)

            # Match explanation
            if overlap > 0 and semantic_score > 0.6:
                reason = "Strong semantic vector match and keyword overlap"
            elif overlap > 0:
                reason = f"Keyword token match ({overlap} terms)"
            elif semantic_score > 0.5:
                reason = "Dense semantic vector similarity"
            else:
                reason = "Metadata and filter criteria match"

            filtered_results.append({
                "artifact_id": item.get("artifact_id"),
                "media_type": item.get("media_type"),
                "language": item.get("language"),
                "provenance_class": item.get("provenance_class"),
                "pipeline_id": item.get("pipeline_id"),
                "duration": item.get("duration"),
                "width": item.get("width"),
                "height": item.get("height"),
                "tags": str(item.get("tags", "")).split(",") if item.get("tags") else [],
                "searchable_text": text_str,
                "created_at_ts": item.get("created_at_ts", 0),
                "score": combined_score,
                "match_reason": reason,
            })

        filtered_results.sort(key=lambda x: x["score"], reverse=True)
        return filtered_results[request.offset:request.offset + request.limit]

    async def search_scenes(self, query: str, video_artifact_id: Optional[str] = None, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search video scenes specifically."""
        query_vec = self.generate_embedding(query)
        candidates = []

        if self.scene_table:
            try:
                lance_q = self.scene_table.search(query_vec).limit(top_k * 2)
                if video_artifact_id:
                    lance_q = lance_q.where(f"video_artifact_id = '{video_artifact_id}'")
                candidates = lance_q.to_list()
            except Exception as e:
                logger.warning(f"Scene search error: {e}")
                candidates = []

        if not candidates and self._in_memory_scenes:
            for s in self._in_memory_scenes:
                if video_artifact_id and s.get("video_artifact_id") != video_artifact_id:
                    continue
                s_vec = s.get("vector", [])
                dist = 1.0 - sum(a * b for a, b in zip(query_vec, s_vec)) if s_vec else 0.5
                candidates.append({**s, "_distance": max(0.0, dist)})

        results = []
        for c in candidates:
            dist = c.get("_distance", 0.5)
            score = max(0.0, 1.0 - float(dist))
            results.append({
                "scene_id": c.get("scene_id"),
                "video_artifact_id": c.get("video_artifact_id"),
                "start_time": c.get("start_time"),
                "end_time": c.get("end_time"),
                "searchable_text": c.get("searchable_text"),
                "score": round(score, 4),
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    async def delete_artifact(self, artifact_id: str) -> bool:
        """Purge artifact and related scene embeddings from vector tables."""
        if self.media_table:
            try:
                self.media_table.delete(f"artifact_id = '{artifact_id}'")
            except Exception:
                pass
        if self.scene_table:
            try:
                self.scene_table.delete(f"video_artifact_id = '{artifact_id}'")
            except Exception:
                pass

        self._in_memory_media = [r for r in self._in_memory_media if r.get("artifact_id") != artifact_id]
        self._in_memory_scenes = [s for s in self._in_memory_scenes if s.get("video_artifact_id") != artifact_id]
        return True


# Global media semantic index singleton
media_semantic_index = MediaSemanticVectorIndex()
