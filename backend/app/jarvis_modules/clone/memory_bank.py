import os
import json
import math
import time
import logging
from pathlib import Path
from typing import Any, Optional
from backend.app.config import settings
from backend.app.core.llm import ollama_client

logger = logging.getLogger(__name__)

class CloneMemoryBank:
    """High-performance vector and semantic memory engine for the user clone."""

    def __init__(self, storage_dir: Path = settings.CLONE_MEMORY_DIR):
        self.storage_dir = storage_dir
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.memories_file = self.storage_dir / "clone_vectors.json"
        self.daily_reflections_file = self.storage_dir / "daily_evolution.json"
        self.memories: list[dict[str, Any]] = self._load_memories()

    def _load_memories(self) -> list[dict[str, Any]]:
        if self.memories_file.exists():
            try:
                with open(self.memories_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load clone memories: {e}")
        return []

    def _save_memories(self):
        try:
            with open(self.memories_file, "w", encoding="utf-8") as f:
                json.dump(self.memories, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to save clone memories: {e}")

    @staticmethod
    def _cosine_similarity(v1: list[float], v2: list[float]) -> float:
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        dot = sum(a * b for a, b in zip(v1, v2))
        norm_a = math.sqrt(sum(a * a for a in v1))
        norm_b = math.sqrt(sum(b * b for b in v2))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    async def add_memory(self, content: str, category: str = "interaction", metadata: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        """Indexes user interaction into the clone vector memory bank."""
        content = content.strip()
        if not content:
            return {"status": "skipped"}

        # Generate embedding via Ollama or fast bag-of-words fallback
        embedding = await ollama_client.get_embedding(content)
        
        entry = {
            "id": f"mem_{int(time.time() * 1000)}",
            "content": content,
            "category": category,
            "embedding": embedding,
            "metadata": metadata or {},
            "timestamp": time.time()
        }
        self.memories.append(entry)
        # Cap memory to last 5,000 dense vectors for fast memory searches
        if len(self.memories) > 5000:
            self.memories = self.memories[-5000:]
        self._save_memories()
        return {"status": "saved", "id": entry["id"]}

    async def search_relevant_memories(self, query: str, limit: int = 5, min_score: float = 0.35) -> list[dict[str, Any]]:
        """Finds most relevant past user thoughts, preferences, and coding styles."""
        if not self.memories:
            return []

        query_emb = await ollama_client.get_embedding(query)
        if not query_emb:
            # Fallback to keyword matching
            q_words = set(query.lower().split())
            scored = []
            for m in self.memories:
                m_words = set(m["content"].lower().split())
                overlap = len(q_words & m_words) / max(len(q_words), 1)
                if overlap > 0.1:
                    scored.append({"content": m["content"], "category": m["category"], "score": overlap})
            scored.sort(key=lambda x: x["score"], reverse=True)
            return scored[:limit]

        scored_results = []
        for m in self.memories:
            emb = m.get("embedding")
            if emb:
                score = self._cosine_similarity(query_emb, emb)
                if score >= min_score:
                    scored_results.append({
                        "content": m["content"],
                        "category": m["category"],
                        "score": round(score, 4),
                        "timestamp": m.get("timestamp")
                    })

        scored_results.sort(key=lambda x: x["score"], reverse=True)
        return scored_results[:limit]

    def get_stats(self) -> dict[str, Any]:
        return {
            "total_memories": len(self.memories),
            "storage_path": str(self.storage_dir),
            "last_memory_time": self.memories[-1]["timestamp"] if self.memories else None
        }

clone_memory_bank = CloneMemoryBank()
