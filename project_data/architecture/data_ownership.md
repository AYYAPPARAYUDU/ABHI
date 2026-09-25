# Data Ownership & Storage Lifecycle Matrix

## 1. Single Source of Truth & Data Ownership Table

To eliminate data duplication, schema drift, and race conditions, every data entity has an explicit single owner and storage engine:

| Data Entity / Domain | Storage Engine | Physical Location | Single Subsystem Owner | Retention / Lifecycle Policy |
| :--- | :--- | :--- | :--- | :--- |
| **System Settings & Configuration** | `.env` / SQLite | Root / `database/relational/system.db` | FastAPI Gateway | Persistent; changes versioned via migration scripts. |
| **Task Execution History & DAGs** | SQLite (WAL Mode) | `database/relational/tasks.db` | Supervisor Subsystem | Persistent; auto-archived after 90 days. |
| **Episodic Long-Term Memory** | SQLite + Semantic Table | `database/memory/episodic.db` | Memory Agent | Persistent; periodic summarization and compaction. |
| **User Profile & Custom Shortcuts** | SQLite / Encrypted JSON | `database/memory/profile.db` | Memory Agent | Persistent; user-editable via UI settings. |
| **Vector Embeddings (RAG Knowledge)**| LanceDB (Apache Arrow) | `database/vector/` | RAG Subsystem | Dynamic; re-indexed upon source file modification. |
| **Ephemeral Session Cache & State** | In-Memory / Local Cache | In-Process Memory | Gateway Subsystem | Ephemeral; cleared on application restart. |
| **Generated Images & Media Files** | Local Filesystem | `database/media/` | Media Agent | Rolling user-managed storage; LRU cleanup when > 12 GB. |
| **Observability & Audit Logs** | Local Filesystem | `logs/` | Logging Subsystem | Rotating ring buffers (`50MB` cap, 14-day prune). |
| **Local LLM Weights & Checkpoints** | Ollama Blob Store | `~/.ollama/models` | Ollama Daemon | Persistent; managed via Ollama CLI/API. |

---

## 2. Storage Directory Topology (`database/`)

The persistent storage root `database/` is designed to grow dynamically up to the ~50 GB planning ceiling:

```
database/
├── relational/
│   ├── system.db             # System settings, user accounts, UI preferences
│   └── tasks.db              # Task execution logs, audit trails, DAG steps
├── memory/
│   ├── episodic.db           # Long-term interaction memory & episodic summaries
│   └── profile.db            # User profile, verified preferences, custom hotkeys
├── vector/                   # LanceDB serverless vector storage for local RAG
├── media/                    # Generated images, upscaled visuals, exported audio/video
└── migrations/               # Alembic SQL schema migration version scripts
```

---

## 3. Database Migration & Backup Policy

* **Relational Schema Migrations:** All SQLite relational databases use standard Alembic version-controlled migration scripts (`alembic/versions/`).
* **Automated SQLite Backup:** Database snapshot created automatically upon application startup (`.backup` API) stored in `database/backups/`.
* **Zero Preallocation:** Storage expands purely on-demand as data is written.
