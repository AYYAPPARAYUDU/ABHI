"""Local Serverless Vector Storage & Hybrid RAG Engine using LanceDB."""

import os
import re
import uuid
import time
import json
from typing import Any, Dict, List, Optional
try:
    import lancedb
    import pyarrow as pa
    _HAS_LANCEDB = True
except Exception as _e:
    _HAS_LANCEDB = False
    lancedb = None
    pa = None

from pydantic import BaseModel, Field
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.services.rag.embeddings import embedding_generator


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
    """Serverless hybrid vector store powered by LanceDB and Apache Arrow with in-memory fallback."""

    VECTOR_DIM = 384
    TABLE_NAME = "knowledge_chunks"

    def __init__(self, db_dir: Optional[str] = None):
        self.db_dir = db_dir or settings.LANCEDB_DIR
        os.makedirs(self.db_dir, exist_ok=True)
        self._in_memory_records: List[Dict[str, Any]] = []
        if _HAS_LANCEDB:
            try:
                self.db = lancedb.connect(self.db_dir)
                self.table = self._ensure_table()
                self.seed_foundational_documents()
            except Exception as e:
                logger.warning(f"LanceDB init failed, falling back to in-memory store: {e}")
                self.db = None
                self.table = None
        else:
            self.db = None
            self.table = None
        self._seed_from_project_intelligence()

    def _seed_from_project_intelligence(self):
        """Seed vector knowledge from project_data/intelligence/vector_store.json if store is empty."""
        try:
            if self.count_chunks() > 0:
                return
            candidates = [
                os.path.join(os.getcwd(), "project_data", "intelligence", "vector_store.json"),
                os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "project_data", "intelligence", "vector_store.json"),
                os.path.join(r"c:\Users\AYYAPPA RAYUDU\OneDrive\Desktop\ABHI", "project_data", "intelligence", "vector_store.json")
            ]
            seed_file = next((p for p in candidates if os.path.exists(p)), None)
            if not seed_file:
                return

            with open(seed_file, "r", encoding="utf-8") as f:
                raw_docs = json.load(f)

            seed_limit = int(os.environ.get("ABHI_VECTOR_SEED_LIMIT", "100"))
            docs_to_seed = raw_docs[:seed_limit] if (seed_limit > 0 and len(raw_docs) > seed_limit) else raw_docs

            chunks = []
            now_ts = int(time.time() * 1000)
            valid_docs = [d for d in docs_to_seed if d.get("content", "").strip()]
            texts_to_embed = [d.get("content", "") for d in valid_docs]
            vectors = embedding_generator.embed_batch(texts_to_embed)

            for idx, doc in enumerate(valid_docs):
                text = doc.get("content", "")
                cid = doc.get("doc_id", f"chk_seed_{idx}")
                source = doc.get("title", "Project Knowledge")
                tags = doc.get("category", "SYSTEM")
                vec = vectors[idx] if idx < len(vectors) else self._generate_embedding(text)
                chunks.append({
                    "chunk_id": cid,
                    "source": source,
                    "text": text,
                    "tags": tags,
                    "created_at_ts": now_ts,
                    "vector": vec
                })

            if chunks:
                if self.table:
                    try:
                        self.table.add(chunks)
                    except Exception:
                        self._in_memory_records.extend(chunks)
                else:
                    self._in_memory_records.extend(chunks)
                logger.info(f"Seeded {len(chunks)} knowledge chunks from '{seed_file}' into vector store.")
        except Exception as e:
            logger.warning(f"Failed to seed vector store from project data: {e}")

    def seed_foundational_documents(self) -> int:
        """Ensure foundational ABHI domain documents are indexed in LanceDB."""
        foundational = [
            {
                "chunk_id": "doc_sbi_settlement",
                "source": "Authoritative Banking Settlement Rails",
                "text": "Operator: Ravuvai Ayyapparayudu (Mamu). Bank: State Bank of India. Account: 41130645649. IFSC: SBIN0020507. UPI: ayyapparayudu.5@ybl. Email: ayyapparayudu.ravuvari@gmail.com.",
                "tags": "TREASURY,BANKING,SETTLEMENT"
            },
            {
                "chunk_id": "doc_specialist_agents",
                "source": "Specialist Agent Swarm Roster",
                "text": "Commander, Synthex-Web (Scraping/Affiliate), Nexus-Comms (Email/WhatsApp), Archon-Forge (Coding/Refactor), Aura-Research (Deep RAG/Docs), Synapse-ML (Deep Learning), Chronos-Plan (Task DAG), Aegis-Critic (Security AST Review), Sentinel-Guard (Zero-CVE OS), Droidmark-Mobile (ADB).",
                "tags": "SWARM,AGENTS,ARCHITECTURE"
            },
            {
                "chunk_id": "doc_core_architecture",
                "source": "ABHI Sovereign Architectural Hierarchy",
                "text": "Four-tier cognitive architecture: Tier 1 LLM (Local Standalone & Ollama), Tier 2 RAG (Vector retrieval), Tier 3 AI Agent (LLM + Tools in loop), Tier 4 Agentic AI (Multi-agent swarm orchestrator).",
                "tags": "ARCHITECTURE,FOUR_TIER,COGNITIVE"
            },
            {
                "chunk_id": "doc_affiliate_networks",
                "source": "Affiliate Marketing Networks & Verified Credentials",
                "text": "Active affiliate programs: Amazon Associates India (tag: ayyappa-21), ClickBank (account: ayyapparayudu), Impact.com (ayyapparayudu.ravuvari@gmail.com), Digistore24 (ayyappa_ai). Direct bank deposit to SBI.",
                "tags": "BUSINESS,AFFILIATE,TREASURY"
            }
        ]
        existing_ids = set()
        if self.table:
            try:
                for r in self.table.to_arrow().to_pylist():
                    existing_ids.add(r.get("chunk_id"))
            except Exception:
                pass
        else:
            for r in self._in_memory_records:
                existing_ids.add(r.get("chunk_id"))

        to_insert = [d for d in foundational if d["chunk_id"] not in existing_ids]
        if not to_insert:
            return 0

        now_ts = int(time.time() * 1000)
        chunks = []
        texts = [d["text"] for d in to_insert]
        vectors = embedding_generator.embed_batch(texts)

        for d, vec in zip(to_insert, vectors):
            chunks.append({
                "chunk_id": d["chunk_id"],
                "source": d["source"],
                "text": d["text"],
                "tags": d["tags"],
                "created_at_ts": now_ts,
                "vector": vec
            })

        if chunks:
            if self.table:
                try:
                    self.table.add(chunks)
                except Exception:
                    self._in_memory_records.extend(chunks)
            else:
                self._in_memory_records.extend(chunks)
            logger.info(f"Indexed {len(chunks)} foundational domain documents into vector store.")
        return len(chunks)

    def _ensure_table(self):
        """Create or connect to the LanceDB knowledge table."""
        if not _HAS_LANCEDB or not self.db:
            return None
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
        """Generate a deterministic 384-dimensional normalized embedding vector."""
        return embedding_generator.embed_text(text)

    async def _generate_embedding_async(self, text: str) -> List[float]:
        """Generate a deterministic 384-dimensional normalized embedding vector asynchronously."""
        return await embedding_generator.embed_text_async(text)

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
        chunk_texts: List[str] = []
        chunk_ids: List[str] = []

        now_ts = int(time.time() * 1000)

        step = max(1, chunk_size - chunk_overlap)
        for i in range(0, len(words), step):
            chunk_words = words[i:i + chunk_size]
            chunk_text = " ".join(chunk_words)
            if not chunk_text.strip():
                continue
            chunk_texts.append(chunk_text)
            chunk_ids.append(f"chk_{uuid.uuid4().hex[:12]}")

        if not chunk_texts:
            return []

        vectors = await embedding_generator.embed_batch_async(chunk_texts)
        chunks: List[Dict[str, Any]] = []
        for cid, chunk_text, vec in zip(chunk_ids, chunk_texts, vectors):
            chunks.append({
                "chunk_id": cid,
                "source": source,
                "text": chunk_text,
                "tags": tags,
                "created_at_ts": now_ts,
                "vector": vec
            })

        if chunks:
            if self.table:
                try:
                    self.table.add(chunks)
                except Exception:
                    self._in_memory_records.extend(chunks)
            else:
                self._in_memory_records.extend(chunks)
            logger.info(f"Ingested {len(chunks)} chunks from source '{source}' into vector store.")

        return chunk_ids

    async def hybrid_search(
        self,
        query: str,
        top_k: int = 5,
        source_filter: Optional[str] = None
    ) -> List[SearchResult]:
        """Perform hybrid vector semantic search and BM25 keyword matching."""
        raw_results = []
        query_vec = await self._generate_embedding_async(query)

        if self.table:
            lance_query = self.table.search(query_vec).metric("cosine").limit(top_k * 2)

            if source_filter:
                lance_query = lance_query.where(f"source = '{source_filter}'")

            try:
                raw_results = lance_query.to_list()
            except Exception as e:
                logger.warning(f"Vector search error: {str(e)}")
                raw_results = []

        if not raw_results and self._in_memory_records:
            # In-memory search fallback
            for r in self._in_memory_records:
                if source_filter and r.get("source") != source_filter:
                    continue
                r_vec = r.get("vector", [])
                dist = 1.0 - sum(a * b for a, b in zip(query_vec, r_vec)) if r_vec else 1.0
                raw_results.append({**r, "_distance": max(0.0, dist)})

        if not raw_results:
            return []

        query_terms = set(re.findall(r'\w+', query.lower()))
        search_results: List[SearchResult] = []

        for item in raw_results:
            text_str = str(item.get("text", ""))
            doc_terms = set(re.findall(r'\w+', text_str.lower()))
            overlap = len(query_terms.intersection(doc_terms))
            bm25_bonus = (overlap / max(1, len(query_terms))) * 0.3

            distance = float(item.get("_distance", 1.0))
            # LanceDB cosine distance is 1.0 - cosine_similarity. Invert cleanly:
            semantic_score = max(0.0, min(1.0, 1.0 - distance))
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

    def count_chunks(self) -> int:
        """Return total count of indexed vector chunks."""
        if self.table:
            try:
                if hasattr(self.table, "count_rows"):
                    return self.table.count_rows()
                return len(self.table)
            except Exception:
                try:
                    return len(self.table.to_arrow())
                except Exception:
                    pass
        return len(self._in_memory_records)

    def list_sources(self) -> List[Dict[str, Any]]:
        """List distinct sources and chunk distributions."""
        records = []
        if self.table:
            try:
                arrow_tbl = self.table.to_arrow()
                records = arrow_tbl.to_pylist()
            except Exception as e:
                logger.warning(f"Error listing vector sources from table: {str(e)}")
        if not records:
            records = self._in_memory_records

        source_counts: Dict[str, int] = {}
        for r in records:
            src = str(r.get("source", "unknown"))
            source_counts[src] = source_counts.get(src, 0) + 1

        return [
            {"source": src, "chunk_count": count}
            for src, count in sorted(source_counts.items(), key=lambda x: x[1], reverse=True)
        ]

    def get_all_chunks(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """Retrieve indexed chunks with pagination."""
        records = []
        if self.table:
            try:
                arrow_tbl = self.table.to_arrow()
                records = arrow_tbl.to_pylist()
            except Exception as e:
                logger.warning(f"Error retrieving vector chunks from table: {str(e)}")
        if not records:
            records = self._in_memory_records

        sliced = records[offset:offset + limit]
        return [
            {
                "chunk_id": str(r.get("chunk_id", "")),
                "source": str(r.get("source", "")),
                "text": str(r.get("text", "")),
                "tags": str(r.get("tags", "")).split(",") if r.get("tags") else [],
                "created_at_ts": r.get("created_at_ts", 0)
            }
            for r in sliced
        ]


# Global vector store singleton
vector_store = LocalVectorStore()

