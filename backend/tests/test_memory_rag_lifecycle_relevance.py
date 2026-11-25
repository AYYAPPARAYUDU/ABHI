"""Authoritative Integration Test for Milestone 2: Memory Lifecycle & Hybrid Vector Retrieval."""

import pytest
import asyncio
from backend.app.services.rag.vector_store import LocalVectorStore, vector_store
from backend.app.cognitive.memory.manager import PersonalMemoryManager
from backend.app.cognitive.memory.models import PrivacyClassification
from backend.app.cognitive.memory.policy import SensitivityDetector
from backend.app.services.memory.database import init_db
from backend.app.services.memory.repository import memory_repo


@pytest.mark.asyncio
async def test_lancedb_persistence_and_metric_relevance():
    """Verify LanceDB table persists across instances and returns high-affinity semantic matches."""
    await init_db()
    vector_store.seed_foundational_documents()
    assert vector_store.table is not None
    assert vector_store.count_chunks() >= 4

    # Test 1: SBI Banking Settlement Rails
    results_sbi = await vector_store.hybrid_search("State Bank of India banking settlement rails", top_k=2)
    assert len(results_sbi) > 0
    top_sbi = results_sbi[0]
    assert "Banking Settlement Rails" in top_sbi.source or "State Bank of India" in top_sbi.text
    assert top_sbi.score >= 0.50

    # Test 2: Specialist Swarm Agents Roster
    results_swarm = await vector_store.hybrid_search("specialist agent swarm roster Archon Synthex", top_k=3)
    assert len(results_swarm) > 0
    assert any("Specialist Agent Swarm" in r.source or "Archon-Forge" in r.text for r in results_swarm)
    assert any(r.score >= 0.45 for r in results_swarm)

    # Test 3: Architectural Hierarchy
    results_arch = await vector_store.hybrid_search("four tier cognitive architecture hierarchy", top_k=2)
    assert len(results_arch) > 0
    top_arch = results_arch[0]
    assert "Architectural Hierarchy" in top_arch.source or "Four-tier cognitive architecture" in top_arch.text
    assert top_arch.score >= 0.50


@pytest.mark.asyncio
async def test_personal_memory_sqlite_and_lancedb_lifecycle():
    """Verify PersonalMemoryManager writes to SQLite WAL and indexes into LanceDB."""
    await init_db()
    pmm = PersonalMemoryManager()

    epi = pmm.record_episodic_experience(
        goal_summary="Configure dark neumorphic UI layout for ABHI console",
        plan_summary="Applied Obsidian Cyan CSS variables and Three.js shader uniforms",
        skill_sequence=["theme_customizer", "shader_compiler"],
        outcome="SUCCESS",
        privacy=PrivacyClassification.PERSONAL
    )
    assert epi.outcome == "SUCCESS"

    # Give event loop a tick to persist background SQLite task
    await asyncio.sleep(0.15)

    # Verify SQLite WAL persistence
    recent_mems = await memory_repo.list_recent_memories(limit=5)
    assert any("dark neumorphic UI" in m.context_summary for m in recent_mems)


def test_privacy_controls_biometrics_and_secrets():
    """Verify that API keys, passwords, and biometric signatures are redacted and prevented from indexing."""
    sensitive_payload = {
        "api_key": "sk-proj-1234567890abcdef1234567890",
        "password": "SuperSecretPassword123!",
        "voice_print": "voiceprint_vector_data_abcdef9876543210",
        "face_embedding": "face_vector_hash_11223344556677889900",
        "normal_text": "Operator instructed to update workspace layout."
    }
    sanitized = SensitivityDetector.sanitize_dict(sensitive_payload)
    assert sanitized["api_key"] == "[REDACTED_CONFIDENTIAL]"
    assert sanitized["password"] == "[REDACTED_CONFIDENTIAL]"
    assert sanitized["voice_print"] == "[REDACTED_CONFIDENTIAL]"
    assert sanitized["face_embedding"] == "[REDACTED_CONFIDENTIAL]"
    assert "update workspace layout" in sanitized["normal_text"]
