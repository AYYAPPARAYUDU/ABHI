"""ABHI Unified Shared Event Bus.

Central event backbone connecting:
- Perception (mic, screen, gestures)
- Shared conversation pipeline
- LLM council & model negotiation
- CentralSupervisor & DAG execution
- Agent swarm & worker lifecycles
- Frontend real-time telemetry & SSE
"""

import asyncio
import json
import os
import sqlite3
import time
import uuid
from collections import deque
from enum import Enum
from typing import Any, Callable, Coroutine, Dict, List, Optional, Set
from pydantic import BaseModel, Field

from backend.app.core.logging import logger
from backend.app.core.config import settings

# Categories that MUST persist durably to SQLite WAL across process restarts
DURABLE_CATEGORIES = {
    "CONVERSATION",
    "MODEL",
    "AGENT",
    "DAG",
    "AUTOMATION",
    "VERIFICATION",
    "SECURITY"
}


def _get_system_db_path() -> str:
    """Resolve physical SQLite WAL database path from settings."""
    url = getattr(settings, "DATABASE_SQLITE_URL", "")
    if ":///" in url:
        return url.split(":///")[-1]
    return os.path.join(os.getcwd(), "database", "relational", "system.db")


def _init_events_table_sync(db_path: str) -> None:
    """Ensure events table and indexes exist in SQLite WAL mode."""
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    with sqlite3.connect(db_path, timeout=10.0) as conn:
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                event_id TEXT PRIMARY KEY,
                category TEXT NOT NULL,
                event_type TEXT NOT NULL,
                source TEXT NOT NULL,
                timestamp REAL NOT NULL,
                correlation_id TEXT,
                payload_json TEXT NOT NULL DEFAULT '{}',
                is_persisted INTEGER NOT NULL DEFAULT 1
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_events_cat_ts ON events (category, timestamp DESC);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_events_ts ON events (timestamp DESC);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_events_corr ON events (correlation_id) WHERE correlation_id IS NOT NULL;")


def _persist_event_sync(db_path: str, event_dict: Dict[str, Any]) -> None:
    """Synchronous worker thread insertion into SQLite WAL."""
    with sqlite3.connect(db_path, timeout=5.0) as conn:
        conn.execute("""
            INSERT OR REPLACE INTO events (
                event_id, category, event_type, source, timestamp, correlation_id, payload_json, is_persisted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            event_dict["event_id"],
            event_dict["category"],
            event_dict["event_type"],
            event_dict["source"],
            event_dict["timestamp"],
            event_dict.get("correlation_id"),
            json.dumps(event_dict.get("data", {}))
        ))


class EventCategory(str, Enum):
    CONVERSATION = "CONVERSATION"
    PERCEPTION = "PERCEPTION"
    AGENT = "AGENT"
    MODEL = "MODEL"
    DAG = "DAG"
    AUTOMATION = "AUTOMATION"
    VERIFICATION = "VERIFICATION"
    SECURITY = "SECURITY"
    TELEMETRY = "TELEMETRY"


class ABHIEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:12]}")
    category: EventCategory
    event_type: str
    source: str
    timestamp: float = Field(default_factory=time.time)
    correlation_id: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    ephemeral: bool = False  # If True, not kept in durable ring buffer


EventHandler = Callable[[ABHIEvent], Coroutine[Any, Any, None]]


class SharedEventBus:
    """Sovereign asynchronous event bus supporting category subscriptions and ring buffer replay."""

    def __init__(self, buffer_size: int = 500):
        self._handlers: Dict[EventCategory, Set[EventHandler]] = {cat: set() for cat in EventCategory}
        self._global_handlers: Set[EventHandler] = set()
        self._buffer: deque = deque(maxlen=buffer_size)
        self._lock = asyncio.Lock()
        self._active_subscriptions: int = 0
        self._db_path: str = _get_system_db_path()
        try:
            _init_events_table_sync(self._db_path)
        except Exception as e:
            logger.debug(f"EventBus SQLite table init notice: {e}")

    def subscribe(self, category: Optional[EventCategory], handler: EventHandler) -> None:
        """Subscribe an async handler to a category or globally."""
        if category:
            self._handlers[category].add(handler)
        else:
            self._global_handlers.add(handler)
        self._active_subscriptions += 1

    def unsubscribe(self, category: Optional[EventCategory], handler: EventHandler) -> None:
        """Unsubscribe a handler."""
        if category and handler in self._handlers[category]:
            self._handlers[category].remove(handler)
            self._active_subscriptions = max(0, self._active_subscriptions - 1)
        elif not category and handler in self._global_handlers:
            self._global_handlers.remove(handler)
            self._active_subscriptions = max(0, self._active_subscriptions - 1)

    async def publish(self, event: ABHIEvent) -> None:
        """Publish an event to all matching subscribers and buffer if durable."""
        if not event.ephemeral:
            self._buffer.append(event)
            cat_val = event.category.value if hasattr(event.category, "value") else str(event.category)
            if cat_val in DURABLE_CATEGORIES:
                try:
                    evt_dict = {
                        "event_id": event.event_id,
                        "category": cat_val,
                        "event_type": event.event_type,
                        "source": event.source,
                        "timestamp": event.timestamp,
                        "correlation_id": event.correlation_id,
                        "data": event.data
                    }
                    asyncio.create_task(asyncio.to_thread(_persist_event_sync, self._db_path, evt_dict))
                except Exception as e:
                    logger.error(f"Failed to schedule event persistence: {e}")

        # Notify category handlers
        target_handlers = list(self._handlers.get(event.category, [])) + list(self._global_handlers)
        if not target_handlers:
            return

        tasks = []
        for handler in target_handlers:
            try:
                tasks.append(asyncio.create_task(handler(event)))
            except Exception as e:
                logger.error(f"EventBus handler dispatch failed: {e}")

        if tasks:
            # Shield execution so individual handler failures don't drop other handlers
            await asyncio.gather(*tasks, return_exceptions=True)

    def get_recent_events(
        self,
        category: Optional[EventCategory] = None,
        limit: int = 50,
        correlation_id: Optional[str] = None
    ) -> List[ABHIEvent]:
        """Query historical durable events from in-memory ring buffer."""
        res = []
        for evt in reversed(self._buffer):
            if category and evt.category != category:
                continue
            if correlation_id and evt.correlation_id != correlation_id:
                continue
            res.append(evt)
            if len(res) >= limit:
                break
        return list(reversed(res))

    def query_persisted_events(
        self,
        category: Optional[str] = None,
        correlation_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Query durable events from SQLite WAL disk table."""
        try:
            with sqlite3.connect(self._db_path, timeout=5.0) as conn:
                conn.row_factory = sqlite3.Row
                query = "SELECT event_id, category, event_type, source, timestamp, correlation_id, payload_json FROM events WHERE 1=1"
                params = []
                if category:
                    query += " AND category = ?"
                    params.append(category)
                if correlation_id:
                    query += " AND correlation_id = ?"
                    params.append(correlation_id)
                query += " ORDER BY timestamp DESC LIMIT ?"
                params.append(limit)
                rows = conn.execute(query, params).fetchall()
                res = []
                for r in rows:
                    res.append({
                        "event_id": r["event_id"],
                        "category": r["category"],
                        "event_type": r["event_type"],
                        "source": r["source"],
                        "timestamp": r["timestamp"],
                        "correlation_id": r["correlation_id"],
                        "data": json.loads(r["payload_json"] or "{}")
                    })
                return res
        except Exception as e:
            logger.error(f"Error querying persisted events: {e}")
            return []

    def clear(self) -> None:
        """Clear memory buffer for clean testing."""
        self._buffer.clear()


# Global singleton instance
event_bus = SharedEventBus()
