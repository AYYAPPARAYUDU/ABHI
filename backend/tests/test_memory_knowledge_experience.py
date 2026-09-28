"""Unit & Integration Tests for Persistent Task, Memory & Knowledge Experience (Phase 6 Stage 6.6)."""

import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.services.memory.database import init_db
from backend.app.services.memory.repository import memory_repo
from backend.app.services.rag.vector_store import vector_store


@pytest.mark.asyncio
async def test_task_listing_and_filtering():
    """Test paginated task listing, status filtering, and goal search."""
    await init_db()

    tid1 = f"task_test_{uuid.uuid4().hex[:8]}"
    tid2 = f"task_test_{uuid.uuid4().hex[:8]}"

    # Create test tasks
    t1 = await memory_repo.create_task(goal="Open Notepad and write greetings", task_id=tid1)
    await memory_repo.update_task_state(task_id=tid1, state="COMPLETED", duration_ms=1250)

    t2 = await memory_repo.create_task(goal="Search weather in browser", task_id=tid2)
    await memory_repo.update_task_state(task_id=tid2, state="FAILED", error_message="Network timeout")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch all tasks
        res = await client.get("/api/v1/tasks?limit=10&offset=0")
        assert res.status_code == 200
        data = res.json()
        assert "tasks" in data
        assert data["total"] >= 2

        # 2. Filter by state
        res_comp = await client.get("/api/v1/tasks?state=COMPLETED")
        assert res_comp.status_code == 200
        data_comp = res_comp.json()
        assert any(t["task_id"] == tid1 for t in data_comp["tasks"])
        assert not any(t["task_id"] == tid2 for t in data_comp["tasks"])

        # 3. Filter by search query
        res_search = await client.get("/api/v1/tasks?query=Notepad")
        assert res_search.status_code == 200
        data_search = res_search.json()
        assert any(t["task_id"] == tid1 for t in data_search["tasks"])


@pytest.mark.asyncio
async def test_memory_crud_and_privacy_classification():
    """Test episodic memory creation, retrieval, search, privacy tag, and deletion."""
    await init_db()

    tid = f"task_test_{uuid.uuid4().hex[:8]}"
    # Save episodic memories
    m1 = await memory_repo.save_episodic_memory(
        task_id=tid,
        category="desktop",
        context_summary="User asked to write in notepad",
        solution_summary="Found Notepad window and typed text with UIA worker",
        tags="notepad,uia,desktop",
        outcome="SUCCESS"
    )

    m2 = await memory_repo.save_episodic_memory(
        task_id=None,
        category="preference",
        context_summary="User preferred dark theme layout",
        solution_summary="Applied dark mode setting to operator console",
        tags="theme,dark,preference",
        outcome="SUCCESS"
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List memories
        res = await client.get("/api/v1/memory?limit=20")
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 2
        assert "categories" in data

        # Check privacy classifications
        mem1 = next((m for m in data["memories"] if m["memory_id"] == m1.memory_id), None)
        assert mem1 is not None
        assert mem1["privacy_class"] == "task_derived"

        mem2 = next((m for m in data["memories"] if m["memory_id"] == m2.memory_id), None)
        assert mem2 is not None
        assert mem2["privacy_class"] == "user_provided"

        # 2. Query single memory detail
        res_det = await client.get(f"/api/v1/memory/{m1.memory_id}")
        assert res_det.status_code == 200
        assert res_det.json()["context_summary"] == "User asked to write in notepad"

        # 3. Search memories
        res_search = await client.get("/api/v1/memory?query=dark")
        assert res_search.status_code == 200
        assert any(m["memory_id"] == m2.memory_id for m in res_search.json()["memories"])

        # 4. Forget / Delete memory
        res_del = await client.delete(f"/api/v1/memory/{m1.memory_id}")
        assert res_del.status_code == 200
        assert res_del.json()["status"] == "deleted"

        # Verify 404 after deletion
        res_del_verify = await client.get(f"/api/v1/memory/{m1.memory_id}")
        assert res_del_verify.status_code == 404


@pytest.mark.asyncio
async def test_user_profile_preferences():
    """Test user profile key/value preference persistence."""
    await init_db()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Set profile preference
        res_set = await client.post(
            "/api/v1/memory/profiles/theme",
            json={"value": {"mode": "dark", "accent": "cyan", "avatar_mode": "interactive"}}
        )
        assert res_set.status_code == 200
        assert res_set.json()["key"] == "theme"

        # Get profile preference
        res_get = await client.get("/api/v1/memory/profiles/theme")
        assert res_get.status_code == 200
        assert res_get.json()["value"]["mode"] == "dark"

        # List all profiles
        res_all = await client.get("/api/v1/memory/profiles/all")
        assert res_all.status_code == 200
        assert any(p["key"] == "theme" for p in res_all.json())


@pytest.mark.asyncio
async def test_knowledge_rag_search_and_context():
    """Test LanceDB vector document ingestion, hybrid search, sources, and context retrieval."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Ingest test documentation
        doc_content = (
            "ABHI is a local-first autonomous AI operating system designed for privacy, "
            "security, and native Windows automation using deterministic DAG planning and visual grounding."
        )
        res_ingest = await client.post(
            "/api/v1/knowledge/ingest",
            json={
                "source": "abhi_architecture_guide.md",
                "content": doc_content,
                "tags": "architecture,local-first,windows"
            }
        )
        assert res_ingest.status_code == 200
        assert res_ingest.json()["chunks_created"] >= 1

        # 2. List sources
        res_sources = await client.get("/api/v1/knowledge/sources")
        assert res_sources.status_code == 200
        sources_data = res_sources.json()
        assert sources_data["total_chunks"] >= 1
        assert any(s["source"] == "abhi_architecture_guide.md" for s in sources_data["sources"])

        # 3. Hybrid search
        res_search = await client.post(
            "/api/v1/knowledge/search",
            json={"query": "deterministic DAG planning", "top_k": 3}
        )
        assert res_search.status_code == 200
        search_data = res_search.json()
        assert search_data["total_results"] >= 1
        assert "citation" in search_data["results"][0]
        assert search_data["results"][0]["score"] > 0.0

        # 4. Retrieval context for planning
        res_ctx = await client.get("/api/v1/knowledge/context?query=Windows+automation&top_k=2")
        assert res_ctx.status_code == 200
        ctx_data = res_ctx.json()
        assert "retrieved_context" in ctx_data
        assert len(ctx_data["retrieved_context"]) >= 1
