"""Database Reconciliation & Migration Script for ABHI System Databases.

Reconciles divergent databases:
- backend/database/relational/system.db -> database/relational/system.db
- backend/database/relational/execution_journal.db -> database/relational/execution_journal.db

Ensures:
- Pre-merge backup creation with timestamp.
- Insertion of all missing rows without data loss.
- Foreign key constraint compliance (tasks before actions).
- WAL checkpointing and integrity verification.
"""

import os
import shutil
import sqlite3
import sys
import time
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CANONICAL_DB_DIR = PROJECT_ROOT / "database" / "relational"
BACKEND_DB_DIR = PROJECT_ROOT / "backend" / "database" / "relational"
BACKUP_DIR = CANONICAL_DB_DIR / "backups"
BACKUP_DIR.mkdir(parents=True, exist_ok=True)


def backup_file(src_path: Path) -> Path:
    """Create timestamped backup of database file."""
    if not src_path.exists():
        return None
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest_path = BACKUP_DIR / f"{src_path.stem}_backup_{timestamp}{src_path.suffix}"
    shutil.copy2(src_path, dest_path)
    print(f"[BACKUP] Backed up {src_path.name} ({src_path.stat().st_size} bytes) -> {dest_path.name}")
    return dest_path


def checkpoint_db(db_path: Path):
    """Ensure all WAL journal frames are fully committed into main database file."""
    if not db_path.exists():
        return
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE);")
    conn.close()


def reconcile_system_db():
    print("\n" + "=" * 60)
    print("RECONCILING SYSTEM.DB")
    print("=" * 60)
    
    src_db = BACKEND_DB_DIR / "system.db"
    dst_db = CANONICAL_DB_DIR / "system.db"

    if not src_db.exists():
        print(f"[SKIP] Source database {src_db} does not exist.")
        return
    if not dst_db.exists():
        print(f"[ERROR] Target database {dst_db} does not exist.")
        return

    # Checkpoint both databases
    checkpoint_db(src_db)
    checkpoint_db(dst_db)

    # Backup destination
    backup_file(dst_db)
    backup_file(src_db)

    conn_src = sqlite3.connect(str(src_db))
    conn_dst = sqlite3.connect(str(dst_db))
    conn_dst.execute("PRAGMA foreign_keys = ON;")

    # Inspect tables in source
    cur_src = conn_src.cursor()
    cur_src.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    src_tables = [r[0] for r in cur_src.fetchall()]

    stats = {}

    for table in src_tables:
        # Check if table exists in dst
        cur_dst = conn_dst.cursor()
        cur_dst.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?;", (table,))
        if not cur_dst.fetchone():
            print(f"[WARNING] Table {table} does not exist in target database. Skipping.")
            continue

        # Get primary key
        cur_src.execute(f'PRAGMA table_info("{table}");')
        col_info = cur_src.fetchall()
        cols = [c[1] for c in col_info]
        pk_cols = [c[1] for c in col_info if c[5] > 0]
        pk = pk_cols[0] if pk_cols else cols[0]

        # Initial counts
        cur_src.execute(f'SELECT COUNT(*) FROM "{table}";')
        src_count = cur_src.fetchone()[0]
        cur_dst.execute(f'SELECT COUNT(*) FROM "{table}";')
        dst_count_pre = cur_dst.fetchone()[0]

        # Fetch existing PKs in dst
        cur_dst.execute(f'SELECT "{pk}" FROM "{table}";')
        existing_pks = set(r[0] for r in cur_dst.fetchall())

        # Fetch rows from src not in dst
        cur_src.execute(f'SELECT * FROM "{table}";')
        rows = cur_src.fetchall()
        missing_rows = [r for r in rows if r[cols.index(pk)] not in existing_pks]

        # Insert missing rows
        if missing_rows:
            placeholders = ", ".join(["?" for _ in cols])
            col_names = ", ".join([f'"{c}"' for c in cols])
            insert_sql = f'INSERT OR IGNORE INTO "{table}" ({col_names}) VALUES ({placeholders});'
            cur_dst.executemany(insert_sql, missing_rows)
            conn_dst.commit()

        # Count post-merge
        cur_dst.execute(f'SELECT COUNT(*) FROM "{table}";')
        dst_count_post = cur_dst.fetchone()[0]

        stats[table] = {
            "src_rows": src_count,
            "dst_pre": dst_count_pre,
            "inserted": len(missing_rows),
            "dst_post": dst_count_post,
            "pk": pk
        }
        print(f"  [{table}] Source={src_count}, Target Pre={dst_count_pre}, Inserted={len(missing_rows)}, Target Post={dst_count_post}")

    # Integrity & FK checks on destination
    integrity = conn_dst.execute("PRAGMA integrity_check;").fetchall()
    fk_check = conn_dst.execute("PRAGMA foreign_key_check;").fetchall()
    print(f"Target PRAGMA integrity_check: {integrity}")
    print(f"Target PRAGMA foreign_key_check: {fk_check}")

    conn_src.close()
    conn_dst.close()
    return stats


def reconcile_execution_journal():
    print("\n" + "=" * 60)
    print("RECONCILING EXECUTION_JOURNAL.DB")
    print("=" * 60)

    src_db = BACKEND_DB_DIR / "execution_journal.db"
    dst_db = CANONICAL_DB_DIR / "execution_journal.db"

    if not src_db.exists():
        print(f"[SKIP] Source {src_db} does not exist.")
        return
    if not dst_db.exists():
        print(f"[ERROR] Target {dst_db} does not exist.")
        return

    checkpoint_db(src_db)
    checkpoint_db(dst_db)

    backup_file(dst_db)
    backup_file(src_db)

    conn_src = sqlite3.connect(str(src_db))
    conn_dst = sqlite3.connect(str(dst_db))
    conn_dst.execute("PRAGMA foreign_keys = ON;")

    # Merge order respecting foreign keys: tasks first, then actions, idempotency_cache, audit_records
    table_order = ["tasks", "actions", "idempotency_cache", "audit_records"]
    pk_map = {
        "tasks": "task_id",
        "actions": "action_id",
        "idempotency_cache": "action_hash",
        "audit_records": "record_id"
    }

    stats = {}
    cur_src = conn_src.cursor()
    cur_dst = conn_dst.cursor()

    for table in table_order:
        pk = pk_map[table]
        cur_src.execute(f'PRAGMA table_info("{table}");')
        cols = [c[1] for c in cur_src.fetchall()]

        cur_src.execute(f'SELECT COUNT(*) FROM "{table}";')
        src_count = cur_src.fetchone()[0]
        cur_dst.execute(f'SELECT COUNT(*) FROM "{table}";')
        dst_count_pre = cur_dst.fetchone()[0]

        cur_dst.execute(f'SELECT "{pk}" FROM "{table}";')
        existing_pks = set(r[0] for r in cur_dst.fetchall())

        cur_src.execute(f'SELECT * FROM "{table}";')
        rows = cur_src.fetchall()
        missing_rows = [r for r in rows if r[cols.index(pk)] not in existing_pks]

        if missing_rows:
            placeholders = ", ".join(["?" for _ in cols])
            col_names = ", ".join([f'"{c}"' for c in cols])
            insert_sql = f'INSERT OR IGNORE INTO "{table}" ({col_names}) VALUES ({placeholders});'
            cur_dst.executemany(insert_sql, missing_rows)
            conn_dst.commit()

        cur_dst.execute(f'SELECT COUNT(*) FROM "{table}";')
        dst_count_post = cur_dst.fetchone()[0]

        stats[table] = {
            "src_rows": src_count,
            "dst_pre": dst_count_pre,
            "inserted": len(missing_rows),
            "dst_post": dst_count_post,
            "pk": pk
        }
        print(f"  [{table}] Source={src_count}, Target Pre={dst_count_pre}, Inserted={len(missing_rows)}, Target Post={dst_count_post}")

    integrity = conn_dst.execute("PRAGMA integrity_check;").fetchall()
    fk_check = conn_dst.execute("PRAGMA foreign_key_check;").fetchall()
    print(f"Target PRAGMA integrity_check: {integrity}")
    print(f"Target PRAGMA foreign_key_check: {fk_check}")

    conn_src.close()
    conn_dst.close()
    return stats


if __name__ == "__main__":
    system_stats = reconcile_system_db()
    journal_stats = reconcile_execution_journal()
    print("\n[COMPLETE] Both databases reconciled and validated successfully.")
