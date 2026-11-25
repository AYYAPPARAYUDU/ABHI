import sqlite3
import json
import os

def audit_file_pair(name, p1, p2):
    print(f"\n=======================================================")
    print(f"AUDITING PAIR: {name}")
    print(f"File 1: {p1} (exists: {os.path.exists(p1)}, size: {os.path.getsize(p1) if os.path.exists(p1) else 0})")
    print(f"File 2: {p2} (exists: {os.path.exists(p2)}, size: {os.path.getsize(p2) if os.path.exists(p2) else 0})")

    if not os.path.exists(p1) or not os.path.exists(p2):
        return

    conn1 = sqlite3.connect(p1)
    conn2 = sqlite3.connect(p2)
    cur1 = conn1.cursor()
    cur2 = conn2.cursor()

    cur1.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    tables1 = [r[0] for r in cur1.fetchall()]

    cur2.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    tables2 = [r[0] for r in cur2.fetchall()]

    print(f"\nTables in DB1 ({len(tables1)}): {tables1}")
    print(f"Tables in DB2 ({len(tables2)}): {tables2}")

    all_tables = sorted(list(set(tables1) | set(tables2)))
    for t in all_tables:
        c1 = "MISSING"
        fks1 = []
        if t in tables1:
            cur1.execute(f'SELECT COUNT(*) FROM "{t}"')
            c1 = cur1.fetchone()[0]
            cur1.execute(f'PRAGMA foreign_key_list("{t}")')
            fks1 = cur1.fetchall()

        c2 = "MISSING"
        fks2 = []
        if t in tables2:
            cur2.execute(f'SELECT COUNT(*) FROM "{t}"')
            c2 = cur2.fetchone()[0]
            cur2.execute(f'PRAGMA foreign_key_list("{t}")')
            fks2 = cur2.fetchall()

        print(f"  Table '{t}': DB1 rows = {c1} (FKs: {len(fks1)}), DB2 rows = {c2} (FKs: {len(fks2)})")

    conn1.close()
    conn2.close()

audit_file_pair("system.db", r"backend/database/relational/system.db", r"database/relational/system.db")
audit_file_pair("execution_journal.db", r"backend/database/relational/execution_journal.db", r"database/relational/execution_journal.db")
