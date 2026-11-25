"""Unified Personal AI Intelligence & Context Synthesizer.

Unifies all 7 layers of personal intelligence:
1. Multi-turn conversation history
2. Episodic memory (past actions, events, user instructions)
3. Semantic memory (facts, domain knowledge)
4. Procedural memory (multi-step operational routines)
5. RAG knowledge (project documents, technical specifications)
6. Approved user preferences (editor, theme, language, directory, response format)
7. Active application context (foremost window HWND, title, browser URL, media state)

Provides context compression, retrieval relevance ranking, and privacy sanitization.
"""

import math
import re
import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from backend.app.cognitive.memory.manager import personal_memory_manager
from backend.app.cognitive.memory.models import MemoryRetrievalQuery, PrivacyClassification
from backend.app.cognitive.memory.policy import SensitivityDetector
from backend.app.core.logging import logger
from backend.app.services.rag.vector_store import vector_store
from backend.app.services.memory.repository import memory_repo


class UnifiedContextResult(BaseModel):
    """Authoritative structured package of unified personal context."""
    query: str
    active_application: Optional[str] = None
    conversation_turns: List[Dict[str, str]] = Field(default_factory=list)
    preferences: Dict[str, Any] = Field(default_factory=dict)
    episodic_facts: List[str] = Field(default_factory=list)
    semantic_knowledge: List[str] = Field(default_factory=list)
    procedures: List[str] = Field(default_factory=list)
    rag_snippets: List[Dict[str, Any]] = Field(default_factory=list)
    synthesized_prompt_context: str = ""
    estimated_tokens: int = 0
    compressed: bool = False
    privacy_redacted: bool = False


class UnifiedContextSynthesizer:
    """Master synthesizer combining conversation, memories, RAG, and live OS context."""

    def __init__(self):
        self.memory_manager = personal_memory_manager
        self.vector_db = vector_store
        self.repo = memory_repo

    async def synthesize(
        self,
        query: str,
        current_app: Optional[str] = None,
        active_window_title: Optional[str] = None,
        max_tokens: int = 1500,
        include_rag: bool = True
    ) -> UnifiedContextResult:
        """Synthesize unified multi-layer context bounded by token budget."""
        start_ts = time.perf_counter()
        query_clean = SensitivityDetector.sanitize_text(query)

        # Ensure persisted memories from SQLite are loaded in async context
        if hasattr(self.memory_manager, "ensure_loaded"):
            await self.memory_manager.ensure_loaded()

        # 1. Retrieve user preferences
        prefs: Dict[str, Any] = {}
        for m in self.memory_manager.memories.values():
            m_type = m.memory_type.value.lower() if hasattr(m.memory_type, "value") else str(m.memory_type).lower()
            m_status = m.status.value.lower() if hasattr(m.status, "value") else str(m.status).lower()
            if m_type == "preference" and m_status == "active":
                if isinstance(m.content, dict) and "key" in m.content:
                    prefs[m.content["key"]] = m.content.get("value")

        # 2. Retrieve structured memories via Multi-factor Rank
        retrieval_query = MemoryRetrievalQuery(
            goal=query_clean,
            current_app=current_app or (active_window_title or ""),
            min_confidence=0.5
        )
        mem_result = self.memory_manager.retrieve_task_context(retrieval_query)

        episodic_facts: List[str] = []
        semantic_facts: List[str] = []
        for mem in mem_result.memories:
            sanitized_summary = SensitivityDetector.sanitize_text(mem.summary)
            m_t = mem.memory_type.value.lower() if hasattr(mem.memory_type, "value") else str(mem.memory_type).lower()
            if m_t == "episodic":
                episodic_facts.append(f"{mem.title}: {sanitized_summary}")
            elif m_t in ["semantic", "knowledge"]:
                semantic_facts.append(f"{mem.title}: {sanitized_summary}")

        # 3. Retrieve procedural workflows
        procedures: List[str] = [
            f"{p.name} (v{p.version}): {p.description}"
            for p in mem_result.relevant_procedures
        ]

        # 4. Retrieve RAG vector knowledge
        rag_snippets: List[Dict[str, Any]] = []
        if include_rag and self.vector_db:
            try:
                rag_matches = await self.vector_db.hybrid_search(query=query_clean, top_k=3)
                for match in rag_matches:
                    if isinstance(match, dict):
                        title = match.get("metadata", {}).get("title") or match.get("source") or match.get("id", "Doc")
                        raw_text = match.get("text", "")
                        score = float(match.get("score", 0.0))
                        citation = match.get("citation", "")
                    else:
                        title = getattr(match, "source", None) or getattr(match, "chunk_id", "Doc")
                        raw_text = getattr(match, "text", "")
                        score = float(getattr(match, "score", 0.0))
                        citation = getattr(match, "citation", "")
                    rag_snippets.append({
                        "title": title,
                        "text": SensitivityDetector.sanitize_text(raw_text[:250]),
                        "score": round(score, 3),
                        "citation": citation,
                    })
            except Exception as e:
                logger.debug(f"RAG search notice: {e}")

        # 5. Retrieve recent conversation history
        conversation_turns: List[Dict[str, str]] = []
        try:
            db_convos = await self.repo.list_conversations(limit=4)
            for c in reversed(db_convos):
                conversation_turns.append({
                    "role": "user",
                    "content": SensitivityDetector.sanitize_text(c.user_message[:150])
                })
                conversation_turns.append({
                    "role": "assistant",
                    "content": SensitivityDetector.sanitize_text(c.assistant_response[:150])
                })
        except Exception:
            pass

        # 6. Format and compress context into coherent block
        lines: List[str] = ["[UNIFIED PERSONAL INTELLIGENCE CONTEXT]"]

        # Active OS context
        if active_window_title or current_app:
            lines.append(f"• Active Window / App: {active_window_title or current_app}")

        # User preferences
        if prefs:
            pref_str = ", ".join(f"{k}={v}" for k, v in prefs.items())
            lines.append(f"• User Preferences: {pref_str}")

        # Episodic facts
        if episodic_facts:
            lines.append("• Relevant User History & Experiences:")
            for ef in episodic_facts[:4]:
                lines.append(f"  - {ef}")

        # Semantic facts
        if semantic_facts:
            lines.append("• Semantic Domain Knowledge:")
            for sf in semantic_facts[:3]:
                lines.append(f"  - {sf}")

        # Procedures
        if procedures:
            lines.append("• Available Procedures:")
            for pr in procedures[:2]:
                lines.append(f"  - {pr}")

        # RAG documents
        if rag_snippets:
            lines.append("• Grounded Project Documents (RAG):")
            for r in rag_snippets[:2]:
                lines.append(f"  - [{r['title']}] {r['text']}")

        full_text = "\n".join(lines)
        token_estimate = max(1, len(full_text.split()) * 4 // 3)

        compressed = False
        if token_estimate > max_tokens:
            # Context compression: truncate long lines and eliminate lower priority facts
            compressed = True
            full_text = full_text[: max_tokens * 3] + "\n...[Context compressed to budget]"
            token_estimate = max_tokens

        logger.info(f"Synthesized unified context for '{query_clean[:30]}' ({token_estimate} tokens, compressed={compressed}) in {(time.perf_counter() - start_ts)*1000:.1f}ms")

        return UnifiedContextResult(
            query=query_clean,
            active_application=current_app or active_window_title,
            conversation_turns=conversation_turns,
            preferences=prefs,
            episodic_facts=episodic_facts,
            semantic_knowledge=semantic_facts,
            procedures=procedures,
            rag_snippets=rag_snippets,
            synthesized_prompt_context=full_text,
            estimated_tokens=token_estimate,
            compressed=compressed,
            privacy_redacted=True
        )


# Global Singleton Instance
unified_context_synthesizer = UnifiedContextSynthesizer()
