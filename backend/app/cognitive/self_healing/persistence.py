"""Persistence repository for Self-Healing defect and repair records."""

import aiosqlite
import json
from pathlib import Path
from typing import List, Optional
from datetime import datetime
from backend.app.cognitive.self_healing.models import RepairRecord, RepairStatus, RepairRiskTier, CodePatch
from backend.app.core.logging import logger


class SelfHealingRepository:
    """Stores defect reports, patches, and verification histories in SQLite."""

    def __init__(self, db_path: Optional[Path] = None):
        root = Path(__file__).resolve().parent.parent.parent.parent.parent
        self.db_path = db_path or (root / "project_data" / "self_healing.db")
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialized = False

    async def initialize(self):
        """Create tables and enable WAL mode."""
        if self._initialized:
            return
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("PRAGMA journal_mode=WAL;")
            await db.execute("""
                CREATE TABLE IF NOT EXISTS repair_records (
                    repair_id TEXT PRIMARY KEY,
                    defect_id TEXT NOT NULL,
                    status TEXT NOT NULL,
                    risk_tier TEXT NOT NULL,
                    defect_summary TEXT NOT NULL,
                    affected_files TEXT NOT NULL,
                    patches TEXT NOT NULL,
                    test_results TEXT NOT NULL,
                    rollback_available INTEGER NOT NULL,
                    backup_paths TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    resolved_at TEXT,
                    error_message TEXT
                );
            """)
            await db.commit()
        self._initialized = True
        logger.info(f"Initialized Self-Healing DB at {self.db_path}")

    async def save_record(self, record: RepairRecord):
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT OR REPLACE INTO repair_records (
                    repair_id, defect_id, status, risk_tier, defect_summary,
                    affected_files, patches, test_results, rollback_available,
                    backup_paths, created_at, resolved_at, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record.repair_id,
                record.defect_id,
                record.status.value,
                record.risk_tier.value,
                record.defect_summary,
                json.dumps(record.affected_files),
                json.dumps([p.model_dump() for p in record.patches]),
                json.dumps(record.test_results),
                1 if record.rollback_available else 0,
                json.dumps(record.backup_paths),
                record.created_at.isoformat(),
                record.resolved_at.isoformat() if record.resolved_at else None,
                record.error_message
            ))
            await db.commit()

    async def get_record(self, repair_id: str) -> Optional[RepairRecord]:
        await self.initialize()
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("SELECT * FROM repair_records WHERE repair_id = ?", (repair_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                return self._row_to_record(row)

    async def list_records(self, limit: int = 50) -> List[RepairRecord]:
        await self.initialize()
        records = []
        async with aiosqlite.connect(self.db_path) as db:
            async with db.execute("SELECT * FROM repair_records ORDER BY created_at DESC LIMIT ?", (limit,)) as cursor:
                async for row in cursor:
                    records.append(self._row_to_record(row))
        return records

    def _row_to_record(self, row) -> RepairRecord:
        patches_data = json.loads(row[6])
        patches = [CodePatch(**p) for p in patches_data]
        return RepairRecord(
            repair_id=row[0],
            defect_id=row[1],
            status=RepairStatus(row[2]),
            risk_tier=RepairRiskTier(row[3]),
            defect_summary=row[4],
            affected_files=json.loads(row[5]),
            patches=patches,
            test_results=json.loads(row[7]),
            rollback_available=bool(row[8]),
            backup_paths=json.loads(row[9]),
            created_at=datetime.fromisoformat(row[10]),
            resolved_at=datetime.fromisoformat(row[11]) if row[11] else None,
            error_message=row[12]
        )


self_healing_repo = SelfHealingRepository()
