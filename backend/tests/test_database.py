"""Unit tests for SQLite database initialization, WAL mode, and fast caching algorithms."""

import pytest
from sqlalchemy import text
from backend.app.services.memory.database import engine, init_db
from backend.app.db.sqlite_wal import (
    get_wal_connection,
    ensure_performance_indexes,
    LRUCache,
    SlidingWindowBuffer,
    lru_cache_with_ttl,
)


@pytest.mark.asyncio
async def test_database_initialization():
    await init_db()
    async with engine.connect() as conn:
        result = await conn.execute(text("PRAGMA journal_mode;"))
        mode = result.scalar()
        # In SQLite WAL mode, journal_mode returns 'wal'
        assert mode.lower() == "wal"

        result = await conn.execute(text("SELECT 1;"))
        assert result.scalar() == 1


def test_sqlite_wal_connection_and_pragmas(tmp_path):
    db_file = tmp_path / "test_wal.db"
    conn = get_wal_connection(db_file)
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA journal_mode;")
        journal_mode = cur.fetchone()[0]
        assert journal_mode.lower() == "wal"

        cur.execute("PRAGMA synchronous;")
        sync_mode = cur.fetchone()[0]
        # In SQLite: 0=OFF, 1=NORMAL, 2=FULL, 3=EXTRA
        assert sync_mode == 1

        cur.execute("PRAGMA cache_size;")
        cache_size = cur.fetchone()[0]
        assert cache_size == -64000

        # Test index creation
        cur.execute("CREATE TABLE tasks (task_id TEXT PRIMARY KEY, state TEXT, created_at REAL, execution_id TEXT)")
        ensure_performance_indexes(conn)
        cur.execute("PRAGMA index_list('tasks')")
        indexes = [row[1] for row in cur.fetchall()]
        assert "idx_tasks_state_created" in indexes
    finally:
        conn.close()


def test_lru_cache_and_sliding_buffer():
    # LRUCache test
    cache = LRUCache(capacity=2, default_ttl_seconds=10.0)
    cache.put("a", 1)
    cache.put("b", 2)
    assert cache.get("a") == 1
    cache.put("c", 3)  # should evict "b" because "a" was accessed
    assert cache.get("b") is None
    assert cache.get("a") == 1
    assert cache.get("c") == 3

    # SlidingWindowBuffer test
    buffer = SlidingWindowBuffer(maxlen=3)
    buffer.append("msg1")
    buffer.append("msg2")
    buffer.append("msg3")
    buffer.append("msg4")
    assert len(buffer) == 3
    assert buffer.get_recent() == ["msg2", "msg3", "msg4"]
    assert buffer.get_recent(limit=2) == ["msg3", "msg4"]

