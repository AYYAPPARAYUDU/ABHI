"""Deterministic Confidence, Decay, Expiration & Conflict Detection Engine (Stage 7.5)."""

import math
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from backend.app.cognitive.memory.models import (
    MemoryConflict,
    MemoryContract,
    MemorySource,
    MemoryStatus,
    MemoryType,
)


class DeterministicConfidenceModel:
    """Computes transparent, deterministic confidence scores without heuristics."""

    INITIAL_SCORES: Dict[MemorySource, float] = {
        MemorySource.USER_EXPLICIT: 1.00,
        MemorySource.USER_CONFIRMED: 0.95,
        MemorySource.WORKFLOW_RESULT: 0.85,
        MemorySource.EXECUTION_RESULT: 0.75,
        MemorySource.DOCUMENT: 0.70,
        MemorySource.RAG: 0.65,
        MemorySource.SYSTEM_OBSERVED: 0.60,
    }

    REINFORCEMENT_DELTA = 0.05
    CONFLICT_PENALTY = 0.25
    MAX_CONFIDENCE = 1.00
    MIN_CONFIDENCE = 0.10

    @classmethod
    def get_initial_confidence(cls, source: MemorySource, confirmed: bool = False) -> float:
        """Assign initial deterministic confidence value based on provenance."""
        if confirmed:
            return cls.MAX_CONFIDENCE
        return cls.INITIAL_SCORES.get(source, 0.60)

    @classmethod
    def reinforce(cls, current_confidence: float, repetitions: int = 1) -> float:
        """Deterministically reinforce confidence based on repeated successful verifications."""
        boost = cls.REINFORCEMENT_DELTA * max(1, repetitions)
        return min(cls.MAX_CONFIDENCE, round(current_confidence + boost, 4))

    @classmethod
    def apply_conflict_penalty(cls, current_confidence: float) -> float:
        """Apply deterministic penalty when a contradiction is detected."""
        return max(cls.MIN_CONFIDENCE, round(current_confidence - cls.CONFLICT_PENALTY, 4))

    @classmethod
    def confirm(cls, current_confidence: float) -> float:
        """Boost confidence to ceiling upon explicit human operator confirmation."""
        return cls.MAX_CONFIDENCE


class MemoryDecayEngine:
    """Computes time-based confidence decay and identifies expired records."""

    # Half-lives in seconds
    HALF_LIVES: Dict[MemoryType, Optional[float]] = {
        MemoryType.WORKING: 900.0,              # 15 minutes
        MemoryType.EPISODIC: None,             # No decay for historical archive
        MemoryType.SEMANTIC: 2592000.0,        # 30 days
        MemoryType.PREFERENCE: 7776000.0,      # 90 days
        MemoryType.PROCEDURAL_CANDIDATE: 604800.0,  # 7 days
        MemoryType.PROCEDURAL: None,           # Governed by metrics instead of pure time
        MemoryType.KNOWLEDGE: 5184000.0,       # 60 days
    }

    @classmethod
    def calculate_decayed_confidence(
        cls,
        memory: MemoryContract,
        as_of: Optional[datetime] = None
    ) -> float:
        """Calculate confidence after applying deterministic exponential decay."""
        if memory.confirmed_by_user or memory.status != MemoryStatus.ACTIVE:
            return memory.confidence

        half_life = cls.HALF_LIVES.get(memory.memory_type)
        if half_life is None:
            return memory.confidence

        now = as_of or datetime.now(timezone.utc)
        ref_time = memory.last_accessed_at or memory.updated_at or memory.created_at
        if ref_time.tzinfo is None:
            ref_time = ref_time.replace(tzinfo=timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)

        elapsed_seconds = max(0.0, (now - ref_time).total_seconds())
        if elapsed_seconds <= 0:
            return memory.confidence

        decay_factor = math.exp(-0.693147 * (elapsed_seconds / half_life))
        decayed = max(0.1, round(memory.confidence * decay_factor, 4))
        return decayed

    @classmethod
    def is_expired(cls, memory: MemoryContract, as_of: Optional[datetime] = None) -> bool:
        """Return True if memory has passed its explicit expiration timestamp."""
        if not memory.expires_at:
            return False
        now = as_of or datetime.now(timezone.utc)
        exp = memory.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)
        return now >= exp


class MemoryConflictDetector:
    """Detects contradictions between memory records without silent overwrites."""

    @staticmethod
    def _extract_keys_and_values(memory: MemoryContract) -> Dict[str, Any]:
        """Extract comparable normalized key-value representations."""
        extracted: Dict[str, Any] = {}
        content = memory.content
        if "key" in content and "value" in content:
            extracted[str(content["key"]).lower().strip()] = content["value"]
        else:
            for k, v in content.items():
                if k not in ["category", "tags", "metadata"]:
                    extracted[str(k).lower().strip()] = v
        return extracted

    @classmethod
    def detect_conflict(
        cls,
        new_memory: MemoryContract,
        existing_memories: List[MemoryContract]
    ) -> Optional[MemoryConflict]:
        """
        Check if new memory directly contradicts any existing active memory.
        Returns MemoryConflict object if contradiction found, else None.
        """
        # Only semantic facts and preferences undergo direct contradiction checks
        if new_memory.memory_type not in [MemoryType.SEMANTIC, MemoryType.PREFERENCE]:
            return None

        new_kv = cls._extract_keys_and_values(new_memory)
        if not new_kv:
            return None

        for existing in existing_memories:
            if existing.memory_id == new_memory.memory_id:
                continue
            if existing.status != MemoryStatus.ACTIVE:
                continue
            if existing.memory_type != new_memory.memory_type:
                continue

            existing_kv = cls._extract_keys_and_values(existing)
            for k, v in new_kv.items():
                if k in existing_kv:
                    # If same key but different value -> CONFLICT
                    if str(existing_kv[k]).strip().lower() != str(v).strip().lower():
                        conflict_id = f"conf_{uuid.uuid4().hex[:12]}"
                        return MemoryConflict(
                            conflict_id=conflict_id,
                            memory_id_a=existing.memory_id,
                            memory_id_b=new_memory.memory_id,
                            key=k,
                            candidate_a={
                                "memory_id": existing.memory_id,
                                "value": existing_kv[k],
                                "source": existing.source.value,
                                "confidence": existing.confidence,
                                "updated_at": existing.updated_at.isoformat()
                            },
                            candidate_b={
                                "memory_id": new_memory.memory_id,
                                "value": v,
                                "source": new_memory.source.value,
                                "confidence": new_memory.confidence,
                                "updated_at": new_memory.updated_at.isoformat()
                            },
                            status="UNRESOLVED"
                        )
        return None


class MemoryDeduplicator:
    """Identifies semantic duplicates to prevent memory store bloat."""

    @staticmethod
    def _tokenize(text: str) -> set:
        """Tokenize text into lowercase alpha words."""
        return set(re.findall(r'\w+', text.lower()))

    @classmethod
    def compute_similarity(cls, text_a: str, text_b: str) -> float:
        """Compute Jaccard token overlap between two summaries."""
        tokens_a = cls._tokenize(text_a)
        tokens_b = cls._tokenize(text_b)
        if not tokens_a or not tokens_b:
            return 0.0
        intersection = len(tokens_a.intersection(tokens_b))
        union = len(tokens_a.union(tokens_b))
        return intersection / max(1, union)

    @classmethod
    def find_duplicate(
        cls,
        candidate: MemoryContract,
        existing_memories: List[MemoryContract],
        threshold: float = 0.85
    ) -> Optional[MemoryContract]:
        """Return matching duplicate memory if similarity exceeds threshold."""
        for ex in existing_memories:
            if ex.memory_id == candidate.memory_id:
                continue
            if ex.memory_type != candidate.memory_type:
                continue
            if ex.status != MemoryStatus.ACTIVE:
                continue

            sim = cls.compute_similarity(candidate.summary, ex.summary)
            if sim >= threshold:
                return ex
        return None
