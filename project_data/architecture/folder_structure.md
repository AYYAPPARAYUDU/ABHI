# Final Proposed Project Directory Structure

```
ABHI/
├── project_data/                 # PERMANENT PROJECT KNOWLEDGE BASE (Phase 1 & Future Records)
│   ├── architecture/             # Architecture contracts, boundaries, topology
│   ├── hardware/                 # Hardware specs, benchmarks, resource policies
│   ├── requirements/             # Functional, non-functional, implicit requirements
│   ├── research/                 # Deep domain research records (AI, Vision, Speech, OS)
│   ├── security/                 # Security frameworks, permission boundaries
│   ├── status/                   # Roadmaps, risk register, open decisions, git/env policies
│   ├── storage/                  # Storage budgets, capacity estimates, lifecycle
│   ├── technologies/             # Technology inventory, dependency policies
│   └── decisions/                # Architecture Decision Records (ADRs)
│
├── backend/                      # PYTHON AI CORE & FASTAPI GATEWAY
│   ├── app/
│   │   ├── api/                  # REST routers & WebSocket endpoints
│   │   │   ├── v1/
│   │   │   │   ├── health.py     # System diagnostics & health check
│   │   │   │   ├── models.py     # Model discovery & status
│   │   │   │   └── tasks.py      # Task dispatch & control
│   │   │   └── websockets/       # Real-time telemetry & audio channels
│   │   ├── core/                 # App config, structured logging, security guards
│   │   │   ├── config.py         # Pydantic Settings (.env validator)
│   │   │   ├── logging.py        # Structured JSON logger & redactor
│   │   │   └── security.py       # Permission gates & token checks
│   │   ├── cognitive/            # Multi-agent cognitive subsystem (Future Phases)
│   │   │   ├── supervisor/       # Master state machine & router
│   │   │   ├── planner/          # Task DAG generator & scheduler
│   │   │   └── verification/     # State ground-truth verification
│   │   ├── services/             # Service adapters & hardware drivers
│   │   │   ├── llm/              # Ollama client & structured grammar engine
│   │   │   ├── memory/           # Relational SQLite repository
│   │   │   └── rag/              # LanceDB vector search adapter
│   │   └── workers/              # Isolated worker process entry points
│   │       ├── perception_daemon.py  # MediaPipe vision & WASAPI audio loop
│   │       └── media_worker.py       # Diffusers & FFmpeg GPU worker
│   ├── tests/                    # Pytest unit & integration suites
│   ├── pyproject.toml            # Python project definition & dependencies
│   └── requirements.txt          # Pinned dependency locks
│
├── frontend/                     # ANGULAR 22 SPA & THREE.JS VISUAL VIEWPORT
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/             # Singleton services (WebSocket, Audio, State)
│   │   │   ├── features/         # Modular feature UI components
│   │   │   │   ├── avatar-viewport/  # Three.js 3D Interactive AI Core
│   │   │   │   ├── agent-dag-viewer/ # Live task execution DAG
│   │   │   │   └── voice-hud/        # Audio visualizer & VAD indicator
│   │   │   └── shared/           # Reusable UI widgets & design tokens
│   │   ├── assets/               # Static icons, 3D shaders, fonts
│   │   └── styles/               # Bespoke Dark Theme CSS & Bootstrap overrides
│   ├── angular.json              # Angular workspace configuration
│   ├── package.json              # Frontend npm dependencies
│   └── tsconfig.json             # Strict TypeScript configuration
│
├── shared/                       # SHARED SCHEMAS & CONTRACTS
│   ├── contracts/                # JSON Schema definitions for WebSocket & IPC
│   └── types/                    # Generated TypeScript / Python schema bridges
│
├── database/                     # PERSISTENT LOCAL STORAGE ROOT (~50 GB Ceiling)
│   ├── relational/               # SQLite WAL database files (system.db, tasks.db)
│   ├── memory/                   # Long-term episodic memory & user profile
│   ├── vector/                   # LanceDB serverless vector storage for local RAG
│   ├── media/                    # Rolling generated media artifacts (images/videos)
│   └── migrations/               # Alembic database migration scripts
│
├── logs/                         # ROTATING AUDIT & OBSERVABILITY LOGS
│
├── .env.example                  # Documented environment variable template
├── .gitignore                    # Strict Git ignore policy
└── README.md                     # Project overview & architectural guide
```

---

## Folder Responsibilities & Governance Rules

| Folder | Primary Owner | What Belongs Inside | What MUST NOT Belong Inside |
| :--- | :--- | :--- | :--- |
| `project_data/` | Architecture & Research | Permanent project documentation, research papers, ADRs, risk registers, hardware specs. | Source code, build artifacts, temporary logs, node_modules. |
| `backend/` | Backend Engineering | Python API gateway, supervisor, services, worker entry points, unit tests. | Frontend TypeScript code, large binary model checkpoints, runtime database files. |
| `frontend/` | Frontend Engineering | Angular components, Three.js shaders, TypeScript services, CSS design system. | Python scripts, heavy AI model weights, backend secrets. |
| `shared/` | Shared Contracts | Canonical JSON Schemas, message type definitions. | Application business logic, runtime state. |
| `database/` | Runtime Storage | SQLite database files, LanceDB tables, generated media artifacts. | Python code, Git-tracked repository files (except migrations). |
| `logs/` | System Observability | Rotating log files (`.log`). | Unredacted user passwords, secrets, permanent databases. |
