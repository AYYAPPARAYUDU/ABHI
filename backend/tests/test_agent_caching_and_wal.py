"""Unit & Integration tests for ABHI SQLite WAL, PRAGMA Tuning, and LRU Cache / Sliding Window Optimizations."""

import pytest
import time
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.api.v1.agent import (
    _live_thoughts_cache,
    _live_thoughts_sliding_buffer,
    _biometrics_status_cache,
    _squad_channel_cache,
)
from backend.app.db.sqlite_wal import (
    get_wal_connection,
    ensure_performance_indexes,
    LRUCache,
    SlidingWindowBuffer,
    SQLITE_WAL_PRAGMAS,
)


@pytest.mark.asyncio
async def test_live_thoughts_caching_and_sliding_buffer():
    """Verify live thoughts LRU cache hit and sliding window buffer accumulation."""
    _live_thoughts_cache.clear()
    _live_thoughts_sliding_buffer.clear()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # First request populates cache
        res1 = await ac.get("/api/v1/agent/live-thoughts")
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["status"] == "synchronized"
        assert len(data1["thoughts"]) > 0

        # Cache should now be populated
        assert "live_thoughts" in _live_thoughts_cache
        assert len(_live_thoughts_sliding_buffer) > 0

        # Second request hits cache in O(1)
        res2 = await ac.get("/api/v1/agent/live-thoughts")
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["thoughts"] == data1["thoughts"]
        assert data2["telemetry"]["timestamp"] == data1["telemetry"]["timestamp"]


@pytest.mark.asyncio
async def test_biometrics_status_cache_and_invalidation():
    """Verify biometrics status caching and invalidation."""
    _biometrics_status_cache.clear()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res1 = await ac.get("/api/v1/agent/biometrics/status")
        assert res1.status_code == 200
        assert "status" in _biometrics_status_cache

        # Subsequent call hits cache
        res2 = await ac.get("/api/v1/agent/biometrics/status")
        assert res2.status_code == 200
        assert res2.json() == res1.json()

        # Invalidation
        _biometrics_status_cache.clear()
        assert "status" not in _biometrics_status_cache


@pytest.mark.asyncio
async def test_squad_channel_caching_and_invalidation():
    """Verify squad channel LRU cache hits and cache clearing upon posting message."""
    _squad_channel_cache.clear()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Fetch messages
        res1 = await ac.get("/api/v1/agent/live-chat/channels/squad-command?limit=10")
        assert res1.status_code == 200
        data1 = res1.json()
        assert data1["channel"] == "squad-command"
        assert ("squad-command", 10) in _squad_channel_cache

        # 2. Repeated fetch hits LRU cache
        res2 = await ac.get("/api/v1/agent/live-chat/channels/squad-command?limit=10")
        assert res2.status_code == 200
        assert res2.json()["count"] == data1["count"]

        # 3. Post new message invalidates squad channel cache
        post_res = await ac.post("/api/v1/agent/live-chat/send", json={
            "channel": "squad-command",
            "sender_id": "operator",
            "message": "Optimization verification: WAL and LRU cache active.",
        })
        assert post_res.status_code == 200
        assert len(_squad_channel_cache) == 0  # Invalidation verified


def test_sqlite_wal_pragmas_and_indexing(tmp_path):
    """Verify SQLite WAL mode, PRAGMA synchronous=NORMAL, cache_size=-64000, and performance indexes."""
    db_file = tmp_path / "system_perf.db"
    conn = get_wal_connection(db_file)
    try:
        cur = conn.cursor()
        
        # Verify PRAGMAs
        cur.execute("PRAGMA journal_mode;")
        assert cur.fetchone()[0].lower() == "wal"

        cur.execute("PRAGMA synchronous;")
        assert cur.fetchone()[0] == 1  # 1 = NORMAL

        cur.execute("PRAGMA cache_size;")
        assert cur.fetchone()[0] == -64000  # -64000 = ~64MB cache

        # Create core tables and ensure performance indexes
        cur.execute("CREATE TABLE tasks (task_id TEXT PRIMARY KEY, state TEXT, created_at REAL, execution_id TEXT)")
        cur.execute("CREATE TABLE actions (action_id TEXT PRIMARY KEY, task_id TEXT, execution_id TEXT, status TEXT)")
        cur.execute("CREATE TABLE audit_records (record_id TEXT PRIMARY KEY, task_id TEXT, timestamp REAL)")
        cur.execute("CREATE TABLE security_audit_log (id TEXT PRIMARY KEY, incident_type TEXT, timestamp REAL)")
        
        ensure_performance_indexes(conn)

        cur.execute("PRAGMA index_list('tasks')")
        tasks_indexes = [r[1] for r in cur.fetchall()]
        assert "idx_tasks_state_created" in tasks_indexes
        assert "idx_tasks_exec_id" in tasks_indexes

        cur.execute("PRAGMA index_list('actions')")
        actions_indexes = [r[1] for r in cur.fetchall()]
        assert "idx_actions_task_status" in actions_indexes

        cur.execute("PRAGMA index_list('security_audit_log')")
        sec_indexes = [r[1] for r in cur.fetchall()]
        assert "idx_security_audit_ts" in sec_indexes
    finally:
        conn.close()
