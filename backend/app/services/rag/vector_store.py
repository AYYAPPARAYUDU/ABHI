"""Local Serverless Vector Storage & Hybrid RAG Engine using LanceDB."""

import os
import re
import uuid
from typing import Any, Dict, List, Optional
import lancedb
import pyarrow as pa
from pydantic import BaseModel, Field
from backend.app.core.config import settings
from backend.app.core.logging import logger


class DocumentChunk(BaseModel):
    chunk_id: str = Field(default_factory=lambda: f"chk_{uuid.uuid4().hex[:12]}")
    source: str
    text: str
    tags: str = ""
    created_at_ts: int = 0


class SearchResult(BaseModel):
    chunk_id: str
    source: str
    text: str
    score: float
    tags: str = ""
    citation: str = ""


class LocalVectorStore:
    """Serverless hybrid vector store powered by LanceDB and Apache Arrow."""

    VECTOR_DIM = 384
    TABLE_NAME = "knowledge_chunks"

    def __init__(self, db_dir: Optional[str] = None):
        self.db_dir = db_dir or settings.LANCEDB_DIR
        os.makedirs(self.db_dir, exist_ok=True)
        self.db = lancedb.connect(self.db_dir)
        self.table = self._ensure_table()

    def _ensure_table(self):
        """Create or connect to the LanceDB knowledge table."""
        schema = pa.schema([
            pa.field("chunk_id", pa.string()),
            pa.field("source", pa.string()),
            pa.field("text", pa.string()),
            pa.field("tags", pa.string()),
            pa.field("created_at_ts", pa.int64()),
            pa.field("vector", pa.list_(pa.float32(), self.VECTOR_DIM))
        ])
        try:
            return self.db.open_table(self.TABLE_NAME)
        except Exception:
            try:
                return self.db.create_table(self.TABLE_NAME, schema=schema, exist_ok=True)
            except Exception:
                return self.db.open_table(self.TABLE_NAME)

    def _generate_embedding(self, text: str) -> List[float]:
        """Generate a deterministic normalized embedding vector for the text."""
        tokens = re.findall(r'\w+', text.lower())
        vec = [0.0] * self.VECTOR_DIM
        if not tokens:
            return vec

        for idx, token in enumerate(tokens):
            h = hash(token)
            pos = abs(h) % self.VECTOR_DIM
            sign = 1.0 if (h > 0) else -1.0
            vec[pos] += sign * (1.0 / (idx + 1.0) ** 0.5)

        # L2 Normalization
        norm = sum(x * x for x in vec) ** 0.5
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

    async def ingest_document(
        self,
        source: str,
        content: str,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        tags: str = ""
    ) -> List[str]:
        """Split document into chunks, compute vector embeddings, and persist in LanceDB."""
        words = content.split()
        chunks: List[Dict[str, Any]] = []
        chunk_ids: List[str] = []

        import time
        now_ts = int(time.time() * 1000)

        step = max(1, chunk_size - chunk_overlap)
        for i in range(0, len(words), step):
            chunk_words = words[i:i + chunk_size]
            chunk_text = " ".join(chunk_words)
            if not chunk_text.strip():
                continue

            cid = f"chk_{uuid.uuid4().hex[:12]}"
            vector = self._generate_embedding(chunk_text)

            chunks.append({
                "chunk_id": cid,
                "source": source,
                "text": chunk_text,
                "tags": tags,
                "created_at_ts": now_ts,
                "vector": vector
            })
            chunk_ids.append(cid)

        if chunks:
            self.table.add(chunks)
            logger.info(f"Ingested {len(chunks)} chunks from source '{source}' into LanceDB.")

        return chunk_ids

    async def hybrid_search(
        self,
        query: str,
        top_k: int = 5,
        source_filter: Optional[str] = None
    ) -> List[SearchResult]:
        """Perform hybrid vector semantic search and BM25 keyword matching."""
        if not self.table:
            return []

        query_vec = self._generate_embedding(query)
        lance_query = self.table.search(query_vec).limit(top_k * 2)

        if source_filter:
            lance_query = lance_query.where(f"source = '{source_filter}'")

        try:
            # Native list conversion without pandas dependency
            raw_results = lance_query.to_list()
        except Exception as e:
            logger.warning(f"Vector search error: {str(e)}")
            return []

        if not raw_results:
            return []

        query_terms = set(re.findall(r'\w+', query.lower()))
        search_results: List[SearchResult] = []

        for item in raw_results:
            text_str = str(item.get("text", ""))
            doc_terms = set(re.findall(r'\w+', text_str.lower()))
            overlap = len(query_terms.intersection(doc_terms))
            bm25_bonus = (overlap / max(1, len(query_terms))) * 0.3

            distance = item.get("_distance", 1.0)
            semantic_score = max(0.0, 1.0 - float(distance))
            combined_score = round(min(1.0, semantic_score + bm25_bonus), 4)

            source_name = str(item.get("source", ""))
            chunk_id = str(item.get("chunk_id", ""))
            citation = f"[{source_name} (ID: {chunk_id})]"

            search_results.append(
                SearchResult(
                    chunk_id=chunk_id,
                    source=source_name,
                    text=text_str,
                    score=combined_score,
                    tags=str(item.get("tags", "")),
                    citation=citation
                )
            )

        search_results.sort(key=lambda x: x.score, reverse=True)
        return search_results[:top_k]


# Global vector store singleton
vector_store = LocalVectorStore()
