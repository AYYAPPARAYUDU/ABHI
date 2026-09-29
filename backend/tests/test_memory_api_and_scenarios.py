"""API & Scenario Integration Tests for Personal & Procedural Memory (Stage 7.5)."""

import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.cognitive.memory.manager import personal_memory_manager
from backend.app.cognitive.memory.models import MemoryStatus, ProcedureStep


@pytest.mark.asyncio
async def test_memory_api_listing_and_filtering():
    """Test listing memories with multi-attribute filtering (type, privacy, category, query)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List all memories
        res = await client.get("/api/v1/memory")
        assert res.status_code == 200
        data = res.json()
        assert "memories" in data
        assert data["total"] >= 1

        # 2. Filter by memory_type PREFERENCE
        res_pref = await client.get("/api/v1/memory?memory_type=PREFERENCE")
        assert res_pref.status_code == 200
        data_pref = res_pref.json()
        assert all(m["memory_type"] == "PREFERENCE" for m in data_pref["memories"])

        # 3. Filter by query
        res_q = await client.get("/api/v1/memory?query=editor")
        assert res_q.status_code == 200
        data_q = res_q.json()
        assert any("editor" in m["title"].lower() or "editor" in m["tags"] for m in data_q["memories"])


@pytest.mark.asyncio
async def test_memory_retrieval_endpoint():
    """Test task-aware memory retrieval API."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "goal": "Launch my usual editor to write code",
            "current_app": "Desktop",
            "language": "en"
        }
        res = await client.post("/api/v1/memory/retrieve", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "formatted_context_for_planner" in data
        assert data["total_records"] >= 1
        assert "VS Code" in data["formatted_context_for_planner"]


@pytest.mark.asyncio
async def test_memory_confirm_and_reject_endpoints():
    """Test memory confirmation and rejection endpoints."""
    # Create candidate memory
    mem, _ = personal_memory_manager.set_semantic_fact(
        key="test_api_candidate",
        value="candidate_val",
        source="SYSTEM_OBSERVED",
        confidence=0.6
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Confirm
        res_conf = await client.post(f"/api/v1/memory/{mem.memory_id}/confirm")
        assert res_conf.status_code == 200
        assert res_conf.json()["status"] == "confirmed"
        assert res_conf.json()["memory"]["confirmed_by_user"] is True
        assert res_conf.json()["memory"]["confidence"] == 1.0

        # 2. Reject
        res_rej = await client.post(f"/api/v1/memory/{mem.memory_id}/reject", params={"reason": "incorrect"})
        assert res_rej.status_code == 200
        assert res_rej.json()["status"] == "rejected"
        assert res_rej.json()["memory"]["status"] == "REJECTED"


@pytest.mark.asyncio
async def test_memory_conflict_and_resolution_endpoints():
    """Test conflict listing and resolution endpoints."""
    # Create conflicting preferences
    mem1, _ = personal_memory_manager.set_preference("browser_zoom", 100)
    mem2, conf = personal_memory_manager.set_preference("browser_zoom", 125, confirmed=False)
    assert conf is not None

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List conflicts
        res_confs = await client.get("/api/v1/memory/conflicts")
        assert res_confs.status_code == 200
        confs = res_confs.json()
        assert any(c["conflict_id"] == conf.conflict_id for c in confs)

        # 2. Resolve conflict
        res_res = await client.post(
            f"/api/v1/memory/conflicts/{conf.conflict_id}/resolve",
            json={"chosen_candidate": "B", "notes": "User selected 125% zoom"}
        )
        assert res_res.status_code == 200
        assert res_res.json()["status"] == "resolved"


@pytest.mark.asyncio
async def test_working_memory_and_audit_endpoints():
    """Test working memory inspection and audit history."""
    personal_memory_manager.start_working_memory("task_audit_test", "Build project")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Working memory
        res_wm = await client.get("/api/v1/memory/working/task_audit_test")
        assert res_wm.status_code == 200
        assert res_wm.json()["current_goal"] == "Build project"

        # Audit logs
        res_aud = await client.get("/api/v1/memory/audit?limit=10")
        assert res_aud.status_code == 200
        assert len(res_aud.json()) >= 1


@pytest.mark.asyncio
async def test_procedural_memory_full_api_lifecycle():
    """Test procedural synthesis, validation, promotion, versioning, and plan translation APIs."""
    # 1. Record 2 successful episodes
    personal_memory_manager.record_episodic_experience(
        goal_summary="Automate PDF Export",
        plan_summary="Printed document to PDF",
        skill_sequence=["browser_navigate", "browser_print_pdf"],
        outcome="SUCCESS"
    )
    personal_memory_manager.record_episodic_experience(
        goal_summary="Automate PDF Export",
        plan_summary="Printed document to PDF",
        skill_sequence=["browser_navigate", "browser_print_pdf"],
        outcome="SUCCESS"
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Synthesize candidate
        synth_payload = {
            "procedure_name": "PDF Exporter",
            "description": "Export current page to PDF",
            "task_goal_filter": "PDF Export"
        }
        res_synth = await client.post("/api/v1/procedures/synthesize", json=synth_payload)
        assert res_synth.status_code == 200
        proc_data = res_synth.json()["procedure"]
        proc_id = proc_data["procedure_id"]
        assert proc_data["status"] == "CANDIDATE"

        # 2. Validate candidate
        res_val = await client.post(
            f"/api/v1/procedures/{proc_id}/validate",
            json={"registered_skill_ids": ["browser_navigate", "browser_print_pdf"]}
        )
        assert res_val.status_code == 200
        assert res_val.json()["is_valid"] is True

        # 3. Promote candidate
        res_prom = await client.post(f"/api/v1/procedures/{proc_id}/promote?validator_notes=Verified+OK")
        assert res_prom.status_code == 200
        assert res_prom.json()["procedure"]["status"] == "ACTIVE"

        # 4. Create new version 1.1.0
        new_version_payload = {
            "new_steps": [
                {"step_index": 1, "skill_id": "browser_navigate", "action_name": "navigate", "parameters": {}, "timeout_seconds": 30.0},
                {"step_index": 2, "skill_id": "browser_print_pdf", "action_name": "print", "parameters": {}, "timeout_seconds": 30.0},
                {"step_index": 3, "skill_id": "file_verify", "action_name": "verify", "parameters": {}, "timeout_seconds": 15.0}
            ],
            "reason": "Added file verification step",
            "version_bump": "minor"
        }
        res_ver = await client.post(f"/api/v1/procedures/{proc_id}/version", json=new_version_payload)
        assert res_ver.status_code == 200
        assert res_ver.json()["new_version"] == "1.1.0"

        # 5. Translate to workflow plan nodes
        res_trans = await client.post(
            f"/api/v1/procedures/{proc_id}/translate-plan",
            json={"parameter_values": {"target_url": "https://example.com"}}
        )
        assert res_trans.status_code == 200
        assert res_trans.json()["node_count"] == 3
        assert len(res_trans.json()["nodes"]) == 3

        # 6. Deprecate procedure
        res_dep = await client.post(
            f"/api/v1/procedures/{proc_id}/deprecate",
            json={"reason": "Superceded by native OS print"}
        )
        assert res_dep.status_code == 200
        assert res_dep.json()["procedure"]["status"] == "DEPRECATED"
