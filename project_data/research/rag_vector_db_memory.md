# Research Record: RAG, Vector Search, Redis & Memory Hierarchy

## 1. Segmented Memory Architecture

To prevent memory pollution and token explosion, the system strictly separates memory into distinct functional domains:

```
                                [Supervisor Core]
                                       │
      ┌─────────────────┬──────────────┼──────────────┬─────────────────┐
      ▼                 ▼              ▼              ▼                 ▼
[Short-Term Context] [Session State] [Episodic Memory] [User Preferences] [Domain Knowledge RAG]
 (Sliding Window /    (Active DAG /   (SQLite Vector /  (Structured JSON / (LanceDB / ChromaDB
  Token Buffer)        Redis Cache)    Summaries)        Key-Value Profile) Hybrid Search)
```

| Memory Domain | Persistence Mechanism | Access Latency | Content / Responsibility |
| :--- | :--- | :--- | :--- |
| **Short-Term Context** | In-Memory Token Buffer | < 1 ms | Active conversational turns and immediate agent scratchpad. |
| **Session State** | Redis / SQLite WAL | < 5 ms | Current task execution DAG, step checkpoints, and retry counters. |
| **Episodic Long-Term Memory** | SQLite + Semantic Embeddings | < 25 ms | Past completed tasks, solutions, error post-mortems, user interactions. |
| **User Preferences & Profile** | SQLite / Encrypted JSON Store | < 5 ms | User habitual settings, default apps, authorized paths, voice preferences. |
| **Knowledge Base (RAG)** | LanceDB (Vector) + BM25 (Sparse) | < 35 ms | Indexed local files, documents, manuals, project code, and system notes. |

---

## 2. Vector Database & RAG Technology Evaluation

### 2.1 Vector Database Comparison

| Vector Engine | Architecture | Storage Engine | Hybrid Search (BM25 + Dense) | Memory Footprint | Decision Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LanceDB** | Serverless / Embedded (C++ / Rust core) | Apache Arrow / Lance format | Native full-text + vector search | **Minimal (< 100 MB RAM)** | **RECOMMENDED PRIMARY** |
| **ChromaDB** | Embedded / Client-Server (Python/Rust) | SQLite + DuckDB / HNSW | Requires third-party sparse plugin | Moderate (~250 MB RAM) | Strong Alternative |
| **Qdrant (Embedded)** | Embedded Rust core | RocksDB / Custom Mmap | Native hybrid sparse/dense vectors | Low-Moderate (~200 MB RAM) | Strong Alternative |
| **pgvector** | PostgreSQL extension | Postgres engine | Via pg_trgm + pgvector | High (> 500 MB daemon) | Overkill for local laptop |

* **LanceDB Official Repository:** https://github.com/lancedb/lancedb (Apache 2.0).  
  *Why LanceDB:* Serverless in-process execution with zero separate daemon overhead, blazing fast disk-backed vector retrieval powered by Apache Arrow, disk-based vector indexing (IVF-PQ) that doesn't need to load all vectors into RAM.

### 2.2 Embedding & Reranking Models
* **Dense Embeddings:** `BAAI/bge-m3` or `nomic-ai/nomic-embed-text-v1.5` (512–1024 dimensions, 8192 token context window, multi-lingual support for 100+ languages).
* **Cross-Encoder Reranker:** `BAAI/bge-reranker-v2-m3` (Lightweight INT8 cross-encoder to rerank top-20 retrieved chunks down to top-5 high-relevance chunks for grounding).

---

## 3. Redis Role & Scope

* **Official Documentation:** https://redis.io/ & https://github.com/redis/redis
* **Appropriate Local Use Cases:**
  - Fast pub/sub event bus between backend worker processes and WebSocket server.
  - Ephemeral task queue (`LPUSH` / `RPOP` / Redis Streams) for agent subtask scheduling.
  - Fast LRU caching for expensive OCR/image hashing results.
* **Inappropriate Use Cases (Anti-Patterns):**
  - Storing primary long-term relational data or vector datasets (use SQLite and LanceDB instead).
