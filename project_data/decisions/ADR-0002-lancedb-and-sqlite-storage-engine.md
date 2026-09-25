# ADR-0002: Dual Storage Engine Selection (SQLite + LanceDB)

**Status:** ACCEPTED  
**Date:** 2026-09-25  
**Author:** Software Engineering & Architecture Team  

## 1. Context & Problem Statement
The system requires persistent, ACID-compliant storage for system configuration, task execution logs, episodic memory, and user profiles, combined with high-performance vector retrieval for local RAG knowledge bases, all operating within a target dynamic storage capacity of ~50 GB.

## 2. Decision
Adopt a **Dual Embedded Storage Engine Architecture**:
1. **SQLite (with Write-Ahead Logging - WAL Mode):** Primary relational storage for settings, task execution DAG histories, episodic memory, and audit trails.
2. **LanceDB (Serverless Vector Database):** Primary dense and hybrid vector storage for local RAG knowledge bases, powered by Apache Arrow and disk-backed indexing.

## 3. Alternatives Considered
* **Alternative 1: PostgreSQL + pgvector:** Rejected due to heavy background daemon footprint (> 500 MB RAM idle) and external service management complexity for a local single-user system.
* **Alternative 2: ChromaDB / Qdrant:** Evaluated as strong alternatives; LanceDB was selected for its native Apache Arrow integration, disk-backed IVF-PQ indices that do not require loading all vectors into RAM, and zero background daemon overhead.

## 4. Rationale & Evidence
* SQLite WAL mode provides high concurrent read performance with zero daemon overhead.
* LanceDB serverless embedded C++/Rust core consumes < 100 MB RAM and provides sub-30ms hybrid search over 500,000+ chunks.

## 5. Consequences & Tradeoffs
* **Positive:** Zero standalone database services to maintain, instant startup, sub-5ms relational queries, dynamic on-disk growth.
* **Tradeoff:** Relational schema changes must be strictly managed using Alembic migration scripts.

## 6. References
* [Data Ownership Specification](file:///c:/Users/AYYAPPA%20RAYUDU/OneDrive/Desktop/ABHI/project_data/architecture/data_ownership.md)
* [Storage Budget & Capacity Estimation](file:///c:/Users/AYYAPPA%20RAYUDU/OneDrive/Desktop/ABHI/project_data/storage/storage_budget_and_estimation.md)
