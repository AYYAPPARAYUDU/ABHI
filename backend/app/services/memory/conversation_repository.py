"""Async SQLite WAL Conversation & Message Repository Service."""

import asyncio
import json
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import aiosqlite

from backend.app.core.config import settings
from backend.app.core.logging import logger


def _get_system_db_path() -> str:
    """Resolve physical SQLite WAL database path from configuration."""
    url = getattr(settings, "DATABASE_SQLITE_URL", "")
    if ":///" in url:
        return url.split(":///")[-1]
    return os.path.join(settings.DATABASE_DIR, "relational", "system.db")


def _iso_now() -> str:
    """Return ISO-8601 UTC timestamp string."""
    return datetime.now(timezone.utc).isoformat()


class ConversationRepository:
    """Sovereign Conversation & Message Repository backed by SQLite WAL."""

    def __init__(self, db_path: Optional[str] = None):
        self._db_path = db_path or _get_system_db_path()
        self._lock = asyncio.Lock()
        self._initialized = False

    async def _ensure_initialized(self) -> None:
        """Ensure SQLite schema exists and auto-seed if database is empty."""
        if self._initialized:
            return

        async with self._lock:
            if self._initialized:
                return

            os.makedirs(os.path.dirname(self._db_path), exist_ok=True)
            async with aiosqlite.connect(self._db_path, timeout=10.0) as db:
                await db.execute("PRAGMA journal_mode = WAL;")
                await db.execute("PRAGMA synchronous = NORMAL;")
                await db.execute("PRAGMA busy_timeout = 10000;")
                await db.execute("PRAGMA foreign_keys = ON;")

                # Table: conversations
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS conversations (
                        id TEXT PRIMARY KEY,
                        title TEXT NOT NULL,
                        model TEXT NOT NULL,
                        is_archived INTEGER NOT NULL DEFAULT 0,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        message_count INTEGER NOT NULL DEFAULT 0
                    );
                """)
                await db.execute(
                    "CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations (updated_at DESC);"
                )
                await db.execute(
                    "CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations (is_archived);"
                )

                # Table: conversation_messages
                await db.execute("""
                    CREATE TABLE IF NOT EXISTS conversation_messages (
                        id TEXT PRIMARY KEY,
                        conversation_id TEXT NOT NULL,
                        role TEXT NOT NULL,
                        content TEXT NOT NULL,
                        model TEXT,
                        tokens INTEGER DEFAULT 0,
                        created_at TEXT NOT NULL,
                        status TEXT DEFAULT 'completed',
                        tool_invocations TEXT,
                        metadata TEXT,
                        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
                    );
                """)
                await db.execute(
                    "CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON conversation_messages (conversation_id, created_at ASC);"
                )
                await db.commit()

                # Check if seeding is needed
                async with db.execute("SELECT COUNT(*) FROM conversations;") as cursor:
                    row = await cursor.fetchone()
                    count = row[0] if row else 0

                if count == 0:
                    await self._seed_initial_conversation(db)

            self._initialized = True
            logger.info("ConversationRepository initialized successfully with SQLite WAL mode.")

    async def _seed_initial_conversation(self, db: aiosqlite.Connection) -> None:
        """Seed initial welcome conversation with authentic sovereign guidance."""
        conv_id = f"conv_welcome_{uuid.uuid4().hex[:8]}"
        now = _iso_now()
        model_name = getattr(settings, "OLLAMA_DEFAULT_MODEL", "abhi:latest")
        title = "Welcome to ABHI Sovereign AI"

        welcome_content = (
            f"Namaste {settings.OPERATOR_CALLSIGN}! I am ABHI (Autonomous Behavioral & Humanoid Intelligence), "
            "your sovereign local-first personal AI computer automation system.\n\n"
            "Here is how I serve you on this workstation:\n"
            "• **100% Local Inference & Privacy:** All reasoning runs via local Ollama models with zero external cloud telemetry.\n"
            "• **Windows Desktop Automation:** Native UIAutomation, Win32 HWND targeting, mouse, keyboard, and application control.\n"
            "• **Playwright Web Automation:** Sandboxed browser navigation, media playback, scraping, and research.\n"
            "• **22 Cognitive Specialists:** Commander, OS desktop, browser, coding, researcher, perception, and self-healing swarms.\n"
            "• **Living Spatial Intelligence:** Dual-state physical verification ensures every action succeeds in real physical OS state.\n\n"
            "How can I assist you right now, Mamu?"
        )

        msg_id = f"msg_{uuid.uuid4().hex[:12]}"
        await db.execute(
            """
            INSERT INTO conversations (id, title, model, is_archived, created_at, updated_at, message_count)
            VALUES (?, ?, ?, 0, ?, ?, 1);
            """,
            (conv_id, title, model_name, now, now),
        )

        metadata_json = json.dumps({"is_welcome": True, "source": "system_bootstrap"})
        await db.execute(
            """
            INSERT INTO conversation_messages (id, conversation_id, role, content, model, tokens, created_at, status, tool_invocations, metadata)
            VALUES (?, ?, 'assistant', ?, ?, 120, ?, 'completed', NULL, ?);
            """,
            (msg_id, conv_id, welcome_content, model_name, now, metadata_json),
        )
        await db.commit()
        logger.info(f"Seeded initial conversation '{conv_id}' ({title}).")

    async def create_conversation(
        self,
        title: Optional[str] = None,
        model: Optional[str] = None,
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new conversation thread."""
        await self._ensure_initialized()
        conv_id = conversation_id or f"conv_{uuid.uuid4().hex[:12]}"
        now = _iso_now()
        target_model = model or getattr(settings, "OLLAMA_DEFAULT_MODEL", "abhi:latest")
        conv_title = (title or "New Conversation").strip()

        async with aiosqlite.connect(self._db_path, timeout=10.0) as db:
            await db.execute(
                """
                INSERT INTO conversations (id, title, model, is_archived, created_at, updated_at, message_count)
                VALUES (?, ?, ?, 0, ?, ?, 0);
                """,
                (conv_id, conv_title, target_model, now, now),
            )
            await db.commit()

        return {
            "id": conv_id,
            "title": conv_title,
            "model": target_model,
            "is_archived": False,
            "created_at": now,
            "updated_at": now,
            "message_count": 0,
            "messages": [],
        }

    async def list_conversations(
        self,
        include_archived: bool = False,
        search_query: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List conversations with optional archive filter and keyword search."""
        await self._ensure_initialized()
        query = "SELECT id, title, model, is_archived, created_at, updated_at, message_count FROM conversations WHERE 1=1"
        params: List[Any] = []

        if not include_archived:
            query += " AND is_archived = 0"

        if search_query and search_query.strip():
            query += " AND (title LIKE ? OR id IN (SELECT conversation_id FROM conversation_messages WHERE content LIKE ?))"
            pattern = f"%{search_query.strip()}%"
            params.extend([pattern, pattern])

        query += " ORDER BY updated_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        results: List[Dict[str, Any]] = []
        async with aiosqlite.connect(self._db_path, timeout=10.0) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
                for r in rows:
                    results.append({
                        "id": r["id"],
                        "title": r["title"],
                        "model": r["model"],
                        "is_archived": bool(r["is_archived"]),
                        "created_at": r["created_at"],
                        "updated_at": r["updated_at"],
                        "message_count": r["message_count"],
                    })

        return results

    async def get_conversation(self, conv_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve conversation record and all associated messages ordered chronologically."""
        await self._ensure_initialized()
        async with aiosqlite.connect(self._db_path, timeout=10.0) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT id, title, model, is_archived, created_at, updated_at, message_count FROM conversations WHERE id = ?;",
                (conv_id,),
            ) as cursor:
                conv_row = await cursor.fetchone()
                if not conv_row:
                    return None

            conv_data = {
                "id": conv_row["id"],
                "title": conv_row["title"],
                "model": conv_row["model"],
                "is_archived": bool(conv_row["is_archived"]),
                "created_at": conv_row["created_at"],
                "updated_at": conv_row["updated_at"],
                "message_count": conv_row["message_count"],
                "messages": [],
            }

            async with db.execute(
                """
                SELECT id, conversation_id, role, content, model, tokens, created_at, status, tool_invocations, metadata
                FROM conversation_messages
                WHERE conversation_id = ?
                ORDER BY created_at ASC;
                """,
                (conv_id,),
            ) as cursor:
                msg_rows = await cursor.fetchall()
                for m in msg_rows:
                    tools = None
                    if m["tool_invocations"]:
                        try:
                            tools = json.loads(m["tool_invocations"])
                        except Exception:
                            tools = m["tool_invocations"]

                    meta = None
                    if m["metadata"]:
                        try:
                            meta = json.loads(m["metadata"])
                        except Exception:
                            meta = m["metadata"]

                    conv_data["messages"].append({
                        "id": m["id"],
                        "conversation_id": m["conversation_id"],
                        "role": m["role"],
                        "content": m["content"],
                        "model": m["model"],
                        "tokens": m["tokens"],
                        "created_at": m["created_at"],
                        "status": m["status"],
                        "tool_invocations": tools,
                        "metadata": meta,
                    })

        return conv_data

    async def update_conversation(
        self,
        conv_id: str,
        title: Optional[str] = None,
        is_archived: Optional[bool] = None
    ) -> Optional[Dict[str, Any]]:
        """Update conversation title or archive state."""
        await self._ensure_initialized()
        clauses = []
        params = []

        if title is not None:
            clauses.append("title = ?")
            params.append(title.strip())

        if is_archived is not None:
            clauses.append("is_archived = ?")
            params.append(1 if is_archived else 0)

        if not clauses:
            return await self.get_conversation(conv_id)

        now = _iso_now()
        clauses.append("updated_at = ?")
        params.append(now)
        params.append(conv_id)

        sql = f"UPDATE conversations SET {', '.join(clauses)} WHERE id = ?;"

        async with aiosqlite.connect(self._db_path, timeout=10.0) as db:
            cursor = await db.execute(sql, params)
            await db.commit()
            if cursor.rowcount == 0:
                return None

        return await self.get_conversation(conv_id)

    async def delete_conversation(self, conv_id: str) -> bool:
        """Delete conversation and cascade delete its messages."""
        await self._ensure_initialized()
        async with aiosqlite.connect(self._db_path, timeout=10.0) as db:
            await db.execute("PRAGMA foreign_keys = ON;")
            cursor = await db.execute("DELETE FROM conversations WHERE id = ?;", (conv_id,))
            await db.execute("DELETE FROM conversation_messages WHERE conversation_id = ?;", (conv_id,))
            await db.commit()
            return cursor.rowcount > 0

    async def add_message(
        self,
        conv_id: str,
        role: str,
        content: str,
        model: Optional[str] = None,
        tokens: int = 0,
        status: str = "completed",
        tool_invocations: Optional[Any] = None,
        metadata: Optional[Dict[str, Any]] = None,
        message_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Add a message to a conversation thread and increment message count."""
        await self._ensure_initialized()
        msg_id = message_id or f"msg_{uuid.uuid4().hex[:12]}"
        now = _iso_now()

        tools_json = json.dumps(tool_invocations) if tool_invocations is not None else None
        meta_json = json.dumps(metadata) if metadata is not None else None

        async with aiosqlite.connect(self._db_path, timeout=10.0) as db:
            # Ensure conversation exists
            async with db.execute("SELECT id FROM conversations WHERE id = ?;", (conv_id,)) as cursor:
                conv = await cursor.fetchone()
                if not conv:
                    # Auto-create if missing
                    default_model = model or getattr(settings, "OLLAMA_DEFAULT_MODEL", "abhi:latest")
                    auto_title = content[:40].replace("\n", " ").strip() or "New Conversation"
                    await db.execute(
                        """
                        INSERT INTO conversations (id, title, model, is_archived, created_at, updated_at, message_count)
                        VALUES (?, ?, ?, 0, ?, ?, 0);
                        """,
                        (conv_id, auto_title, default_model, now, now),
                    )

            # Insert message
            await db.execute(
                """
                INSERT INTO conversation_messages (
                    id, conversation_id, role, content, model, tokens, created_at, status, tool_invocations, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (msg_id, conv_id, role, content, model, tokens, now, status, tools_json, meta_json),
            )

            # Update conversation updated_at and message_count
            await db.execute(
                """
                UPDATE conversations
                SET updated_at = ?, message_count = message_count + 1
                WHERE id = ?;
                """,
                (now, conv_id),
            )
            await db.commit()

        return {
            "id": msg_id,
            "conversation_id": conv_id,
            "role": role,
            "content": content,
            "model": model,
            "tokens": tokens,
            "created_at": now,
            "status": status,
            "tool_invocations": tool_invocations,
            "metadata": metadata,
        }

    async def get_messages(self, conv_id: str) -> List[Dict[str, Any]]:
        """Retrieve all messages for a specific conversation."""
        await self._ensure_initialized()
        messages: List[Dict[str, Any]] = []
        async with aiosqlite.connect(self._db_path, timeout=10.0) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                """
                SELECT id, conversation_id, role, content, model, tokens, created_at, status, tool_invocations, metadata
                FROM conversation_messages
                WHERE conversation_id = ?
                ORDER BY created_at ASC;
                """,
                (conv_id,),
            ) as cursor:
                rows = await cursor.fetchall()
                for m in rows:
                    tools = None
                    if m["tool_invocations"]:
                        try:
                            tools = json.loads(m["tool_invocations"])
                        except Exception:
                            tools = m["tool_invocations"]
                    meta = None
                    if m["metadata"]:
                        try:
                            meta = json.loads(m["metadata"])
                        except Exception:
                            meta = m["metadata"]

                    messages.append({
                        "id": m["id"],
                        "conversation_id": m["conversation_id"],
                        "role": m["role"],
                        "content": m["content"],
                        "model": m["model"],
                        "tokens": m["tokens"],
                        "created_at": m["created_at"],
                        "status": m["status"],
                        "tool_invocations": tools,
                        "metadata": meta,
                    })

        return messages


# Global Singleton Instance
conversation_repository = ConversationRepository()
