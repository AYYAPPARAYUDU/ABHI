import re
import json
import time
import asyncio
import logging
from datetime import date
from pathlib import Path
from typing import Any
from backend.app.config import settings
from backend.app.clone.memory_bank import clone_memory_bank
from backend.app.clone.persona_engine import persona_engine
from backend.app.core.llm import ollama_client

logger = logging.getLogger(__name__)

class ContinuousCloneLearner:
    """Self-learning loop that analyzes interactions and evolves the clone daily."""

    def __init__(self, storage_dir: Path = settings.CLONE_MEMORY_DIR):
        self.storage_dir = storage_dir
        self.evolution_file = self.storage_dir / "daily_evolution.json"

    async def ingest_user_interaction(self, user_text: str, assistant_response: str, tools_used: list[dict[str, Any]] = None):
        """Processes interaction in background to extract memory vectors and update persona traits."""
        if not user_text or len(user_text.strip()) < 3:
            return

        try:
            # 1. Add interaction into vector memory
            combined = f"User Request: {user_text}\nClone Resolution: {assistant_response[:300]}"
            await clone_memory_bank.add_memory(
                content=combined,
                category="conversation",
                metadata={"tools": [t.get("tool") for t in (tools_used or [])], "time": time.time()}
            )

            # 2. Extract keywords & patterns
            text_lower = user_text.lower()
            detected_topics = []
            if any(w in text_lower for w in ["docker", "container", "compose", "image"]):
                detected_topics.append("Docker & Containerization")
            if any(w in text_lower for w in ["gpu", "cuda", "ollama", "qwen", "llm"]):
                detected_topics.append("GPU LLM Optimization")
            if any(w in text_lower for w in ["controller", "volume", "brightness", "whatsapp", "app", "action"]):
                detected_topics.append("Native OS Controllers")
            if any(w in text_lower for w in ["ml", "dl", "algorithm", "learn", "clone"]):
                detected_topics.append("Self-Learning Clone Architecture")
            if any(w in text_lower for w in ["ui", "3js", "three", "hologram", "4k"]):
                detected_topics.append("4K Three.js Visual Systems")

            # 3. Update persona engine
            if detected_topics:
                persona_engine.record_learning_event(
                    patterns_found=[f"Frequently initiates workflows in: {', '.join(detected_topics)}"],
                    topics_found=detected_topics
                )

        except Exception as e:
            logger.warning(f"Error in continuous learning ingestion: {e}")

    async def perform_daily_reflection(self) -> dict[str, Any]:
        """Synthesizes memory vectors and generates a daily self-evolution checkpoint."""
        today_str = date.today().isoformat()
        recent_memories = clone_memory_bank.memories[-30:] if clone_memory_bank.memories else []
        
        if not recent_memories:
            return {
                "date": today_str,
                "status": "baseline_active",
                "evolution_score": persona_engine.persona.get("evolution_score", 95.0),
                "summary": "Clone baseline active with zero drift."
            }

        sample_texts = "\n".join([f"- {m['content'][:150]}" for m in recent_memories[:10]])
        prompt = f"""Synthesize the following recent user interactions into a 2-sentence cognitive reflection of what the user clone learned today:
{sample_texts}
Return a concise 2-sentence summary."""

        reflection_res = await ollama_client.chat(
            messages=[
                {"role": "system", "content": "You are a cognitive evolution compressor."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )
        summary = reflection_res.get("content", "Continuous self-learning nominal.").strip()

        evolution_record = {
            "date": today_str,
            "timestamp": time.time(),
            "evolution_score": persona_engine.persona.get("evolution_score", 95.0),
            "memories_processed": len(recent_memories),
            "summary": summary
        }

        # Save to daily evolution history
        history = []
        if self.evolution_file.exists():
            try:
                with open(self.evolution_file, "r", encoding="utf-8") as f:
                    history = json.load(f)
            except Exception:
                history = []

        history.append(evolution_record)
        # Keep last 60 days
        history = history[-60:]
        with open(self.evolution_file, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2, ensure_ascii=False)

        return evolution_record

clone_learner = ContinuousCloneLearner()
