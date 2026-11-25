import sqlite3
from pathlib import Path

def full_audit(db_name: str, db_path: Path):
    print("=" * 80)
    print(f"DATABASE AUDIT: {db_name}")
    print(f"File: {db_path.resolve()} (Size: {db_path.stat().st_size} bytes)")
    print("=" * 80)

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    # Tables
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
    tables = [r[0] for r in cur.fetchall()]
    print(f"Total Tables: {len(tables)}\n")

    total_rows = 0
    print(f"{'Table Name':<35} | {'Rows':<8} | {'FKs':<5} | {'Indexes':<8} | {'Columns':<8}")
    print("-" * 75)

    for t in tables:
        # Row count
        cur.execute(f'SELECT COUNT(*) FROM "{t}";')
        count = cur.fetchone()[0]
        total_rows += count

        # Foreign keys
        cur.execute(f'PRAGMA foreign_key_list("{t}");')
        fks = cur.fetchall()

        # Indexes
        cur.execute(f'PRAGMA index_list("{t}");')
        indexes = cur.fetchall()

        # Columns
        cur.execute(f'PRAGMA table_info("{t}");')
        cols = cur.fetchall()

        print(f"{t:<35} | {count:<8} | {len(fks):<5} | {len(indexes):<8} | {len(cols):<8}")

    print("-" * 75)
    print(f"{'TOTAL ROWS ACROSS ALL TABLES:':<35} | {total_rows:<8}")

    # PRAGMAs
    print("\nPRAGMA Verifications:")
    for pragma in ["journal_mode", "synchronous", "foreign_keys", "cache_size", "temp_store"]:
        cur.execute(f"PRAGMA {pragma};")
        val = cur.fetchone()[0]
        print(f"  PRAGMA {pragma}: {val}")

    integrity = cur.execute("PRAGMA integrity_check;").fetchall()
    fk_check = cur.execute("PRAGMA foreign_key_check;").fetchall()
    print(f"  PRAGMA integrity_check: {integrity[0][0] if integrity else 'EMPTY'}")
    print(f"  PRAGMA foreign_key_check violations: {len(fk_check)}")

    conn.close()

if __name__ == "__main__":
    canonical_dir = Path("database/relational")
    full_audit("system.db", canonical_dir / "system.db")
    full_audit("execution_journal.db", canonical_dir / "execution_journal.db")
