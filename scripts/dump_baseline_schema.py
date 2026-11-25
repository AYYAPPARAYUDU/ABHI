import sqlite3
from pathlib import Path

db_path = Path("database/relational/system.db")
output_path = Path("database/migrations/001_initial_baseline_schema.sql")
output_path.parent.mkdir(parents=True, exist_ok=True)

conn = sqlite3.connect(str(db_path))
cur = conn.cursor()

cur.execute("""
    SELECT type, name, sql 
    FROM sqlite_master 
    WHERE type IN ('table', 'index', 'view', 'trigger') 
      AND name NOT LIKE 'sqlite_%' 
      AND sql IS NOT NULL 
    ORDER BY CASE type WHEN 'table' THEN 1 WHEN 'index' THEN 2 WHEN 'view' THEN 3 ELSE 4 END, name;
""")
rows = cur.fetchall()

lines = [
    "-- ==========================================================================",
    "-- ABHI System Relational Database - Initial Baseline Schema (Version 001)",
    f"-- Generated from canonical: {db_path.as_posix()}",
    "-- Engine: SQLite WAL Mode (WAL, synchronous=NORMAL, foreign_keys=ON)",
    "-- ==========================================================================\n"
]

table_count = 0
index_count = 0

for obj_type, name, sql in rows:
    clean_sql = sql.strip()
    if not clean_sql.endswith(";"):
        clean_sql += ";"
    lines.append(f"-- [{obj_type.upper()}] {name}")
    lines.append(clean_sql + "\n")
    if obj_type == "table":
        table_count += 1
    elif obj_type == "index":
        index_count += 1

output_path.write_text("\n".join(lines), encoding="utf-8")
print(f"[SUCCESS] Exported baseline schema to {output_path}: {table_count} tables, {index_count} indices.")
conn.close()
