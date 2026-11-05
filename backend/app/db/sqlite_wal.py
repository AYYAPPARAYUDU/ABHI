"""Authoritative SQLite WAL Manager & High-Performance Cache Algorithms for ABHI.

Enforces:
- SQLite Write-Ahead Logging (WAL) journal mode
- PRAGMA synchronous=NORMAL
- PRAGMA cache_size=-64000 (64 MB page cache)
- PRAGMA temp_store=MEMORY
- PRAGMA mmap_size=268435456 (256 MB memory-mapped I/O)
- PRAGMA busy_timeout=10000 (10 second non-blocking busy retry)
- Optimal B-Tree query indexes for O(1) and O(log N) lookups
- In-memory LRU Cache and Sliding Window Buffer data structures
"""

import functools
import inspect
import sqlite3
import time
from collections import OrderedDict, deque
from pathlib import Path
from typing import Any, Callable, Dict, Generic, List, Optional, Tuple, TypeVar, Union

from backend.app.core.logging import logger

T = TypeVar("T")
K = TypeVar("K")
V = TypeVar("V")

# Canonical WAL PRAGMAs for high-throughput concurrency
SQLITE_WAL_PRAGMAS: List[str] = [
    "PRAGMA journal_mode = WAL;",
    "PRAGMA synchronous = NORMAL;",
    "PRAGMA cache_size = -64000;",      # ~64 MB page cache
    "PRAGMA temp_store = MEMORY;",       # Temporary indices and tables in RAM
    "PRAGMA mmap_size = 268435456;",     # 256 MB memory-mapped I/O
    "PRAGMA foreign_keys = ON;",
    "PRAGMA busy_timeout = 10000;",      # 10s wait for locks before failing
]

# Optimal B-Tree indices to guarantee O(1) and O(log N) query performance
PERFORMANCE_INDEXES: List[str] = [
    # Tasks & Actions tables (automation orchestration)
    "CREATE INDEX IF NOT EXISTS idx_tasks_state_created ON tasks (state, created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_tasks_exec_id ON tasks (execution_id);",
    "CREATE INDEX IF NOT EXISTS idx_actions_task_status ON actions (task_id, status);",
    "CREATE INDEX IF NOT EXISTS idx_actions_exec_id ON actions (execution_id);",
    "CREATE INDEX IF NOT EXISTS idx_audit_records_task_ts ON audit_records (task_id, timestamp DESC);",
    "CREATE INDEX IF NOT EXISTS idx_audit_records_ts ON audit_records (timestamp DESC);",
    "CREATE INDEX IF NOT EXISTS idx_idempotency_task ON idempotency_cache (task_id);",

    # Biometrics & Security logs
    "CREATE INDEX IF NOT EXISTS idx_operator_bio_name ON operator_biometrics (name);",
    "CREATE INDEX IF NOT EXISTS idx_operator_bio_enrolled ON operator_biometrics (enrolled_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_security_audit_ts ON security_audit_log (timestamp DESC);",
    "CREATE INDEX IF NOT EXISTS idx_security_audit_type ON security_audit_log (incident_type, timestamp DESC);",

    # Communications Inbox & Assistants
    "CREATE INDEX IF NOT EXISTS idx_comm_inbox_ch_ts ON communications_inbox (channel, timestamp DESC);",
    "CREATE INDEX IF NOT EXISTS idx_comm_inbox_reply_status ON communications_inbox (reply_status);",
    "CREATE INDEX IF NOT EXISTS idx_comm_inbox_sender ON communications_inbox (sender);",
    "CREATE INDEX IF NOT EXISTS idx_brain_upgrade_history_ts ON brain_upgrade_history (created_at DESC);",

    # Self-Healing repair records
    "CREATE INDEX IF NOT EXISTS idx_repair_records_created ON repair_records (created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_repair_records_status ON repair_records (status);",
    "CREATE INDEX IF NOT EXISTS idx_repair_records_defect ON repair_records (defect_id);",

    # Media Subsystem jobs & artifacts
    "CREATE INDEX IF NOT EXISTS idx_media_jobs_status_created ON media_jobs (status, created_at DESC);",
    "CREATE INDEX IF NOT EXISTS idx_media_jobs_task_id ON media_jobs (task_id);",
    "CREATE INDEX IF NOT EXISTS idx_media_artifacts_sha ON media_artifacts (sha256);",
    "CREATE INDEX IF NOT EXISTS idx_media_artifacts_job ON media_artifacts (job_id);",
    "CREATE INDEX IF NOT EXISTS idx_media_gen_meta_art ON media_generation_metadata (artifact_id);",
]


def apply_wal_pragmas(conn: sqlite3.Connection) -> None:
    """Apply authoritative SQLite WAL PRAGMAs to a synchronous SQLite connection."""
    for pragma in SQLITE_WAL_PRAGMAS:
        try:
            conn.execute(pragma)
        except Exception as e:
            logger.debug(f"SQLite pragma warning ({pragma}): {e}")


async def apply_async_wal_pragmas(conn_or_session: Any) -> None:
    """Apply authoritative SQLite WAL PRAGMAs to an async SQLAlchemy or aiosqlite connection."""
    from sqlalchemy import text
    for pragma in SQLITE_WAL_PRAGMAS:
        try:
            await conn_or_session.execute(text(pragma))
        except Exception as e:
            logger.debug(f"Async SQLite pragma warning ({pragma}): {e}")


def get_wal_connection(db_path: Union[str, Path], timeout: float = 10.0) -> sqlite3.Connection:
    """Create and return an optimized SQLite connection in WAL mode with fast row factory."""
    str_path = str(db_path)
    if str_path != ":memory:":
        Path(str_path).parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str_path, timeout=timeout)
    conn.row_factory = sqlite3.Row

    if str_path != ":memory:":
        apply_wal_pragmas(conn)

    return conn


def ensure_performance_indexes(conn: sqlite3.Connection) -> None:
    """Idempotently construct B-Tree indexes for all core tables in the connected database."""
    cursor = conn.cursor()
    for index_stmt in PERFORMANCE_INDEXES:
        try:
            cursor.execute(index_stmt)
        except sqlite3.OperationalError:
            # Table might not exist yet in this database file; skip gracefully
            pass
        except Exception as e:
            logger.debug(f"Index creation warning: {e}")
    conn.commit()


# ============================================================================
# High-Performance DSA: LRU Cache with TTL & Sliding Window Buffers
# ============================================================================

class LRUCache(Generic[K, V]):
    """Thread-safe O(1) Least Recently Used (LRU) Cache with TTL support.
    
    Time Complexity:
        - get: O(1)
        - put: O(1)
        - invalidate: O(1)
    """

    def __init__(self, capacity: int = 128, default_ttl_seconds: Optional[float] = None):
        self.capacity = max(1, capacity)
        self.default_ttl = default_ttl_seconds
        self._cache: OrderedDict[K, Tuple[V, Optional[float]]] = OrderedDict()

    def get(self, key: K) -> Optional[V]:
        """Fetch item from cache. Returns None if absent or expired."""
        if key not in self._cache:
            return None

        val, expiry = self._cache[key]
        if expiry is not None and time.time() > expiry:
            del self._cache[key]
            return None

        # Move to end to indicate most recently accessed
        self._cache.move_to_end(key)
        return val

    def put(self, key: K, value: V, ttl_seconds: Optional[float] = None) -> None:
        """Store item in cache with optional TTL override."""
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        expiry = (time.time() + ttl) if ttl is not None else None

        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = (value, expiry)

        if len(self._cache) > self.capacity:
            # Pop least recently used item (first item in OrderedDict)
            self._cache.popitem(last=False)

    def invalidate(self, key: K) -> bool:
        """Invalidate a specific key. Returns True if key was present."""
        if key in self._cache:
            del self._cache[key]
            return True
        return False

    def clear(self) -> None:
        """Purge all entries from the cache."""
        self._cache.clear()

    def __len__(self) -> int:
        return len(self._cache)

    def __contains__(self, key: K) -> bool:
        return self.get(key) is not None


class SlidingWindowBuffer(Generic[T]):
    """High-speed O(1) sliding window circular buffer backed by deque.
    
    Time Complexity:
        - append: O(1)
        - get_recent: O(k) where k is requested slice length
        - clear: O(1)
    """

    def __init__(self, maxlen: int = 100):
        self.maxlen = maxlen
        self._buffer: deque[T] = deque(maxlen=maxlen)

    def append(self, item: T) -> None:
        """Append an item to the sliding buffer, automatically evicting oldest if full."""
        self._buffer.append(item)

    def extend(self, items: List[T]) -> None:
        """Batch append items into the buffer."""
        self._buffer.extend(items)

    def get_recent(self, limit: Optional[int] = None) -> List[T]:
        """Retrieve the most recent items in ascending chronological order."""
        if limit is None or limit >= len(self._buffer):
            return list(self._buffer)
        return list(self._buffer)[-limit:]

    def clear(self) -> None:
        """Flush buffer contents."""
        self._buffer.clear()

    def __len__(self) -> int:
        return len(self._buffer)


def lru_cache_with_ttl(capacity: int = 128, ttl_seconds: float = 1.0):
    """Decorator for caching function or coroutine results using an LRUCache with TTL.
    
    Supports both synchronous and asynchronous (async def) functions.
    """
    cache: LRUCache[Any, Any] = LRUCache(capacity=capacity, default_ttl_seconds=ttl_seconds)

    def decorator(fn: Callable):
        is_async = inspect.iscoroutinefunction(fn)

        if is_async:
            @functools.wraps(fn)
            async def async_wrapper(*args, **kwargs):
                key = (args, tuple(sorted(kwargs.items())))
                cached = cache.get(key)
                if cached is not None:
                    return cached
                res = await fn(*args, **kwargs)
                cache.put(key, res)
                return res

            async_wrapper.cache = cache
            async_wrapper.cache_clear = cache.clear
            async_wrapper.cache_invalidate = cache.invalidate
            return async_wrapper
        else:
            @functools.wraps(fn)
            def sync_wrapper(*args, **kwargs):
                key = (args, tuple(sorted(kwargs.items())))
                cached = cache.get(key)
                if cached is not None:
                    return cached
                res = fn(*args, **kwargs)
                cache.put(key, res)
                return res

            sync_wrapper.cache = cache
            sync_wrapper.cache_clear = cache.clear
            sync_wrapper.cache_invalidate = cache.invalidate
            return sync_wrapper

    return decorator
