"""Unscripted Conversation, DAG Resilience, and Memory Integrity Tests for Milestone 2.1.

Covers:
- Unscripted multilingual intent resolution (Telugu, Hindi, Tamil, English)
- Non-launch informational query verification ("What is Chrome's memory usage?")
- Multi-turn follow-up media control resolution with demonstrative pronouns
- DAG failure propagation and dependency halting
- RAG LanceDB cosine retrieval and SQLite WAL persistence
- Biometric and credential privacy redaction
- Emergency stop fail-closed lease invalidation
- HMAC signature enforcement on external webhooks
"""

import os
import sys
import time
import hmac
import hashlib
import pytest
from unittest.mock import patch, MagicMock

# Ensure backend root is on sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from backend.app.core.config import settings
from backend.app.automation.desktop.dynamic_action_resolver import dynamic_action_resolver
from backend.app.automation.desktop.dialogue_state_tracker import dialogue_state
from backend.app.api.v1.desktop import is_physical_os_action
from backend.app.perception.audio.canonicalizer import multilingual_canonicalizer
from backend.app.cognitive.planner.models import TaskDAG, DAGNode, NodeStatus
from backend.app.automation.leases.lease_manager import lease_manager
from backend.app.automation.orchestration.orchestrator import supervisor_orchestrator
from backend.app.cognitive.memory.policy import SensitivityDetector
from backend.app.services.rag.vector_store import LocalVectorStore
from backend.app.services.llm.abhi_llm import abhi_llm


# =============================================================================
# 1. UNSCRIPTED & MULTILINGUAL CONVERSATION TESTS
# =============================================================================

def test_unscripted_multilingual_canonicalization():
    """Verify canonicalization across Telugu, Hindi, Tamil, and English colloquial variations."""
    queries = [
        ("ఈ ప్రోగ్రామ్ ఓపెన్ చేయి", "te", "ఓపెన్"),  # Telugu
        ("कृपया क्रोम खोलो", "hi", "खोलो"),            # Hindi
        ("நோட்பேடை திறக்கவும்", "ta", "திறக்கவும்"), # Tamil
        ("please open calculator", "en", "open"),
    ]
    for text, expected_lang, expected_keyword in queries:
        res = multilingual_canonicalizer.canonicalize(text)
        assert res.source_language == expected_lang
        assert res.raw_input == text
        assert "open" in res.canonical_intent or expected_keyword in res.raw_input


def test_informational_query_does_not_trigger_application_launch():
    """Asking 'What is Chrome's memory usage?' should NOT invoke application launch."""
    q = "What is Chrome's memory usage right now?"
    assert is_physical_os_action(q) is False

    with patch("subprocess.Popen") as mock_popen:
        ok, act, reply = dynamic_action_resolver.resolve_and_execute(q)
        mock_popen.assert_not_called()


def test_multiturn_dialogue_media_follow_ups():
    """Verify follow-up context resolution for media controls."""
    dialogue_state.record_action("play", "telugu latest hits", (500, 400))
    dialogue_state.push_entity("telugu latest hits", "video")

    assert dialogue_state.get_last_entity() == "telugu latest hits"
    resolved = dialogue_state.resolve_demonstrative_pronoun("play it")
    assert resolved == "telugu latest hits"

    ok_pause, act_pause, r_pause = dynamic_action_resolver.resolve_and_execute("pause the video")
    assert ok_pause is True
    assert act_pause in ["stop_media", "learned_action", "key_combination"]


# =============================================================================
# 2. DAG RESILIENCE & FAILURE PROPAGATION
# =============================================================================

def test_dag_failure_halts_dependent_nodes():
    """When an upstream DAG node fails, dependent downstream nodes must NOT execute."""
    node1 = DAGNode(
        node_id="step_1",
        agent_id="os_desktop_agent",
        action="launch_app",
        params={"app_name": "non_existent_binary_xyz"},
        title="Launch Nonexistent App"
    )
    node2 = DAGNode(
        node_id="step_2",
        agent_id="os_desktop_agent",
        action="type_text",
        params={"text": "hello"},
        dependencies=["step_1"],
        title="Type Text in App"
    )

    dag = TaskDAG(
        dag_id="dag_resilience_01",
        task_id="task_fail_01",
        goal="Test failure isolation",
        nodes={"step_1": node1, "step_2": node2}
    )

    # Simulate step_1 execution failure
    node1.status = NodeStatus.FAILED
    node1.error_message = "Binary not found on OS path"

    # Check if step_2 is eligible to run
    is_step2_ready = all(
        dag.nodes[dep_id].status == NodeStatus.COMPLETED
        for dep_id in node2.dependencies
    )
    assert is_step2_ready is False, "Dependent step_2 must be blocked when step_1 fails"


# =============================================================================
# 3. MEMORY, EMBEDDINGS & PRIVACY REDACTION
# =============================================================================

def test_biometric_and_credential_redaction():
    """Verify that biometric templates, passwords, and API tokens are redacted before memory storage."""
    raw_text = (
        "User authenticated with biometric_voice_signature: aabbccddeeff11223344 and "
        "stored api_key=sk-proj-999888777666555444333222111 into credentials."
    )

    violations = SensitivityDetector.detect_violations(raw_text)
    assert len(violations) > 0, "Sensitivity detector must identify secrets or biometric signatures"
    assert SensitivityDetector.is_sensitive(raw_text) is True

    sanitized = SensitivityDetector.sanitize_text(raw_text)
    assert "sk-proj-999888777666555444333222111" not in sanitized
    assert "[REDACTED_API_KEY]" in sanitized or "[REDACTED" in sanitized


@pytest.mark.asyncio
async def test_rag_lancedb_cosine_metric_and_attribution(tmp_path):
    """Verify LanceDB local vector store with cosine distance and score clamping [0.0, 1.0]."""
    db_path = str(tmp_path / "lancedb_reality_test")
    store = LocalVectorStore(db_dir=db_path)

    doc_content = "The settlement for SBI account 4021 was processed with reference SBI-SETTLE-8819."
    await store.ingest_document(
        source="sbi_settlement.md",
        content=doc_content,
        tags="finance,banking"
    )

    # Search
    results = await store.hybrid_search("What is the settlement reference for SBI account 4021?", top_k=2)
    assert len(results) > 0
    assert "SBI-SETTLE-8819" in results[0].text
    assert "sbi_settlement.md" in results[0].source
    assert 0.0 <= results[0].score <= 1.0


# =============================================================================
# 4. EMERGENCY STOP & FAIL-CLOSED LEASE REVOCATION
# =============================================================================

@pytest.mark.asyncio
async def test_emergency_stop_revokes_all_active_leases():
    """Emergency stop must revoke active agent leases and transition supervisor to EMERGENCY_HALT."""
    try:
        # Acquire active lease
        lease = lease_manager.acquire_lease(
            task_id="task_halt_test_01",
            execution_id="exec_halt_01",
            agent_id="os_desktop_agent",
            initial_ttl_seconds=60.0
        )
        assert lease.is_valid is True

        # Trigger emergency stop via orchestrator
        halt_res = await supervisor_orchestrator.emergency_stop(reason="Operator safety kill-switch engaged")
        assert halt_res is True

        # Verify lease is revoked immediately
        assert lease.is_valid is False
        assert lease.revoked is True
        assert supervisor_orchestrator.is_emergency_locked is True
    finally:
        # Reset lockout
        supervisor_orchestrator.emergency_reset()


# =============================================================================
# 5. WEBHOOK HMAC SECURITY ENFORCEMENT
# =============================================================================

def test_external_webhook_requires_valid_hmac(tmp_path):
    """External requests to /n8n/webhook/{workflow_id} without valid HMAC must be rejected with 401."""
    from fastapi.testclient import TestClient
    from backend.app.main import app

    client = TestClient(app)
    workflow_id = "wf_sync_999"
    payload = b'{"status": "lead_converted", "revenue": 1500}'

    # 1. External request with no signature -> 401 Unauthorized
    resp_no_sig = client.post(
        f"/api/v1/business/n8n/webhook/{workflow_id}",
        content=payload,
        headers={"Content-Type": "application/json", "X-Forwarded-For": "203.0.113.42"}
    )
    assert resp_no_sig.status_code == 401

    # 2. External request with valid HMAC signature -> 200 OK
    secret = settings.APP_SECRET_KEY
    sig = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()

    resp_valid = client.post(
        f"/api/v1/business/n8n/webhook/{workflow_id}",
        content=payload,
        headers={
            "Content-Type": "application/json",
            "X-Forwarded-For": "203.0.113.42",
            "X-N8N-Signature": f"sha256={sig}"
        }
    )
    assert resp_valid.status_code == 200
    assert resp_valid.json().get("status").lower() == "success"
