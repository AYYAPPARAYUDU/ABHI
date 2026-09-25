# Data Ownership & Storage Lifecycle Matrix

**Status:** RECONCILED & AUDITED (Phase 2 Baseline)

## 1. Single Source of Truth & Data Ownership Table

To eliminate data duplication, schema drift, and race conditions, every data entity has an explicit single owner, physical location, and lifecycle policy:

| Data Entity / Domain | Storage Engine | Physical Location | Single Subsystem Owner | Retention & Lifecycle Policy |
| :--- | :--- | :--- | :--- | :--- |
| **System Settings & Auth** | `.env` / SQLite | Root / `database/relational/system.db` | FastAPI Gateway | Persistent; versioned via Alembic migrations. |
| **Task Execution History & DAGs** | SQLite (WAL Mode) | `database/relational/tasks.db` | Supervisor Subsystem | Persistent; auto-archived after 90 days. |
| **Episodic Long-Term Memory** | SQLite + Semantic Table | `database/memory/episodic.db` | Memory Agent | Persistent; periodic summarization and compaction. |
| **User Profile & Custom Shortcuts** | SQLite / Encrypted JSON | `database/memory/profile.db` | Memory Agent | Persistent; user-editable via UI settings. |
| **Vector Embeddings (RAG Knowledge)**| LanceDB (Apache Arrow) | `database/vector/` | RAG Subsystem | Dynamic; re-indexed upon source file modification. |
| **Ephemeral Session Cache & State** | In-Memory / Local Cache | In-Process Memory | Gateway Subsystem | Ephemeral; cleared on application restart. |
| **Generated Images & Media Files** | Local Filesystem | `database/media/` | Media Agent | Rolling user-managed storage; LRU cleanup when > 12 GB. |
| **Observability & Audit Logs** | Local Filesystem | `logs/` | Logging Subsystem | Rotating ring buffers (`50MB` cap, 14-day prune). |
| **External LLM Weights & Checkpoints**| Ollama Blob Store | `~/.ollama/models` (Outside repo root)| Ollama Daemon | Managed externally via Ollama CLI (`5.2 GB` measured). |

---

## 2. Storage Budget Clarification (~50 GB Target Envelope)

* **Internal Workspace Root (`database/` + `logs/`):**
  * Soft Budget: **~35 GB** (Dynamic growth, zero preallocation).
  * Hard Quota: **45 GB** (Triggers automated LRU purge of generated media cache and log compaction).
* **External Host Model Storage (`~/.ollama/models` on Drive C:):**
  * Current Measured Footprint: **5.22 GB** (`qwen3:8b` & `abhi:latest`).
  * Allocated Model Ceiling: **~15 GB** (Allows primary 8B LLM + Vision VLM).
* **Aggregate System Storage:** Planned ceiling of **~50 GB combined** comfortably fits on the available **318 GB (C:) / 430 GB (E:) free space** without disk contention.
