import asyncio
import logging
from typing import Any, Optional
from backend.app.clone.memory_bank import clone_memory_bank
from backend.app.clone.persona_engine import persona_engine
from backend.app.clone.learner import clone_learner
from backend.app.core.llm import ollama_client

logger = logging.getLogger(__name__)

class CloneService:
    """Core AI Digital Clone Engine and Microservice."""

    async def generate_clone_response(self, user_query: str, conversation_id: str = "main_session") -> dict[str, Any]:
        """Generates response speaking purely in the user's authentic cognitive style."""
        # 1. Search vector memory for relevant past user thoughts/preferences
        relevant_memories = await clone_memory_bank.search_relevant_memories(user_query, limit=4)
        context_texts = [m["content"] for m in relevant_memories]

        # 2. Build personalized clone prompt
        system_prompt = persona_engine.generate_clone_system_prompt(context_texts)

        # 3. Call GPU LLM
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_query}
        ]
        res = await ollama_client.chat(messages, temperature=0.3)
        clone_content = res.get("content", "Clone cognitive process online.")

        # 4. Trigger continuous learning ingestion in background
        asyncio.create_task(clone_learner.ingest_user_interaction(user_query, clone_content))

        return {
            "response": clone_content,
            "clone_persona": persona_engine.persona.get("name", "User Digital Clone"),
            "evolution_score": persona_engine.persona.get("evolution_score", 95.0),
            "memories_utilized": len(relevant_memories),
            "model": ollama_client.default_model
        }

    def get_profile(self) -> dict[str, Any]:
        """Returns the full dynamic self-learning profile."""
        return {
            "persona": persona_engine.persona,
            "memory_stats": clone_memory_bank.get_stats(),
            "status": "online_evolving"
        }

    async def trigger_reflection(self) -> dict[str, Any]:
        """Triggers a daily self-evolution checkpoint."""
        return await clone_learner.perform_daily_reflection()

clone_service = CloneService()
