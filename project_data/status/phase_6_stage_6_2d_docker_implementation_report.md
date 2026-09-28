# Phase 6 Stage 6.2-D — Docker & Local Deployment Foundation Implementation Report

**Project:** Local-First Personal AI Computer Automation System  
**Stage:** Phase 6 Stage 6.2-D — Docker & Local Deployment Foundation  
**Status:** COMPLETE  
**Git Commit Target:** `feat: phase 6 stage 6.2d docker local deployment foundation`  
**Repository Remote:** `https://github.com/AYYAPPARAYUDU/ABHI.git`  
**Branch:** `main`  

---

## 1. Docker & Hybrid Deployment Architecture

ABHI establishes a hybrid containerized + host-native deployment model:
* **Docker Compose Layer:** Encapsulates portable, platform-independent components (Angular 22 SPA served by Nginx, FastAPI Gateway & Cognitive Core API, SQLite WAL persistence, LanceDB vector storage).
* **Native Windows Host Layer:** Executes physical desktop accessibility actions (Windows UIA, pywinauto, foreground window verification, Win32 input hooks) on the bare-metal Windows host under strict time-bound `AutomationLease` tokens.

```text
One Command: .\scripts\abhi-up.ps1
    ↓
Docker Compose Stack (Frontend + Backend + Persistent DB)
    +
Native Windows Host Worker Daemon (UIA / pywinauto)
    ↓
Complete Local ABHI Runtime (READY)
```

---

## 2. Compose Services & Network Specification

Canonical definition in `compose.yaml`:
* **`backend` (FastAPI Gateway & Cognitive Core):** Python 3.12 non-root container running on port `127.0.0.1:8000`. Exposes REST API and WebSocket `/ws/telemetry`.
* **`frontend` (Angular 22 Operator Console):** Nginx 1.27 Alpine container on port `127.0.0.1:4200:80` with SPA routing and `/api/`, `/ws/` reverse proxy.
* **`ollama` (Optional LLM Service):** Profile `ollama-container` with NVIDIA GPU reservation.
* **`abhi-network`:** Isolated bridge network enabling deterministic inter-service routing.

---

## 3. Host-Native Services

* **Windows Host Worker Daemon:** `backend/app/workers/windows_host_worker_daemon.py` runs natively on Windows, tracking its active PID in `logs/windows_worker.pid`.
* **Host Ollama Service:** Bound to `http://127.0.0.1:11434` on the host, reachable from backend containers via `http://host.docker.internal:11434`.

---

## 4. Windows UIA Boundary

* Windows UIA automation is **never executed inside Linux containers**.
* The containerized backend sends structured execution requests; only the authenticated Windows host worker executes physical desktop actions after verifying foreground window context and checking the `AutomationLease`.

---

## 5. Browser Worker Boundary

* **Headless Containerized Chromium:** Supported for backend synthetic tests and isolated web grounding tasks.
* **Interactive Desktop Chromium:** Governed on the Windows Host for visible user session automation.

---

## 6. Frontend Container (Multi-Stage Nginx)

* **Stage 1 (Build):** `node:22-alpine` compiles Angular 22 production bundle with full tree-shaking and output hashing.
* **Stage 2 (Runtime):** `nginx:1.27-alpine` serves static files from `/usr/share/nginx/html`.
* **SPA Fallback:** `try_files $uri $uri/ /index.html;` ensures seamless browser navigation and refreshes across `/console`, `/tasks`, `/perception`, `/avatar`, and `/system`.
* **Caching & Compression:** Gzip enabled; 1-year immutable cache headers on hashed assets; `no-store` on `index.html`.
* **Health Check:** `http://127.0.0.1:80/health` returning HTTP 200 JSON.

---

## 7. Backend Container (Python 3.12 Non-Root)

* **Image:** `python:3.12-slim` with non-root user `abhiuser` (UID 10001).
* **Dependencies:** Clean, pinned requirements installation with OpenCV headless and SQLite extensions.
* **Readiness Check:** `http://127.0.0.1:8000/api/v1/health`.

---

## 8. Ollama Architecture Decision

* **Selected Strategy:** **Option A (Native Windows Host Ollama)** as default.
* **Rationale:**
  1. Direct native CUDA execution on NVIDIA RTX 5050 Laptop GPU (~8 GB VRAM) with zero virtualization overhead.
  2. Preserves already downloaded 5.2 GB model weights (`qwen3:8b`, `abhi:latest`), avoiding duplicate downloads.
  3. Prevents dual-engine VRAM contention and system memory pressure.
* **Container Bridge:** Connected via `extra_hosts: ["host.docker.internal:host-gateway"]`.

---

## 9. GPU Policy

* GPU is reserved **only** for LLM inference workloads.
* Docker Compose specifies explicit device reservations:
  ```yaml
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
  ```

---

## 10. CPU & RAM Resource Constraints

Host specifications: 24 GB RAM, 8 GB VRAM, 8 Cores / 16 Threads.
* **Backend:** Limit 4.0 CPUs, 4 GB RAM (Reservation: 0.5 CPU, 512 MB RAM).
* **Frontend:** Limit 1.0 CPU, 512 MB RAM (Reservation: 0.1 CPU, 64 MB RAM).
* **Ollama (when containerized):** Limit 4.0 CPUs, 8 GB RAM.

---

## 11. Persistent Storage

* **SQLite Relational DB:** `./database/relational:/app/database/relational` (persists `system.db`, `system.db-wal`, `system.db-shm`).
* **LanceDB Vector Store:** `./database/vector:/app/database/vector`.
* **Generated Media:** `./database/media:/app/database/media`.
* **Audit & Telemetry Logs:** `./logs:/app/logs`.

---

## 12. SQLite WAL & Transaction Durability

* Database initialized with `PRAGMA journal_mode=WAL;` and `PRAGMA synchronous=NORMAL;`.
* Write-ahead logs persist across container recreations without database lock corruption.

---

## 13. LanceDB Persistence

* Embedded LanceDB tables mounted to persistent `./database/vector` storage. RAG vector indices survive complete environment restarts.

---

## 14. Network Architecture

* Explicit bridge network `abhi-network`.
* All host port bindings restricted to `127.0.0.1`.
* No external network exposure.

---

## 15. Environment Configuration

* Pydantic settings load from `.env` and Docker container environment variables.
* Template provided in `.env.example`.

---

## 16. Health Checks & Diagnostic Probes

* **Frontend:** `wget http://127.0.0.1:80/health`.
* **Backend:** `curl http://127.0.0.1:8000/api/v1/health`.
* **Ollama:** `ollama list` or `curl http://127.0.0.1:11434/api/tags`.
* **Host Worker:** PID validation and active foreground window polling.

---

## 17. Startup & Shutdown Orchestration

* **Startup (`.\scripts\abhi-up.ps1`):** Validates prerequisites -> starts Compose stack -> polls health endpoint -> spawns host worker -> prints formatted status matrix.
* **Shutdown (`.\scripts\abhi-down.ps1`):** Terminates host worker PID -> releases active leases -> halts Compose stack -> verifies complete port release.

---

## 18. Failure Recovery & Fault Isolation

* **Backend container crash:** Frontend displays reconnecting badge; host worker holds retry loop until backend recovers.
* **Host worker crash:** Backend flags worker as `DEGRADED`; tasks fail-closed; restart script restores worker PID.
* **Ollama unavailable:** Backend health reports `degraded` status with clear diagnostic message.

---

## 19. Security & Hardening Matrix

| Security Rule | Verification |
| :--- | :--- |
| **No Docker Socket** | `/var/run/docker.sock` is NOT mounted into any container. |
| **No Root Host Mounts** | `C:\`, `System32`, and user profile roots are strictly excluded. |
| **Non-Root Runtime** | Backend container runs under dedicated unprivileged user `abhiuser` (UID 10001). |
| **Localhost Binding** | All exposed ports bind strictly to `127.0.0.1`. |
| **Fail-Closed Leases** | Physical automation requires valid, non-expired tokens. |

---

## 20. Development vs Production Modes

* **Production Mode:** Minimal Nginx image, compiled Angular output, non-root Python container, persistent volume mounts.
* **Development Mode:** Supports native host execution with hot-reload via `ng serve` and `uvicorn --reload`.

---

## 21. Verification & Test Execution Matrix

* **Backend Unit & Integration Tests:** 131 / 131 PASSED (`pytest`).
* **Frontend Vitest Unit Tests:** 44 / 44 PASSED (`ng test --watch=false`).
* **Angular Production Build:** SUCCESS (`ng build` generated clean dist artifacts).
* **Compose Syntax Validation:** SUCCESS (`docker compose config` and `docker compose --profile ollama-container config`).
* **Status Script Verification:** SUCCESS (`.\scripts\abhi-status.ps1` executed cleanly).

---

## 22. Files Created & Modified

### Created:
1. `compose.yaml` — Canonical Docker Compose service orchestration file.
2. `.dockerignore` — Build context exclusion specification.
3. `docker/frontend/Dockerfile` — Multi-stage Angular 22 Nginx production build.
4. `docker/frontend/nginx.conf` — Production Nginx web server & reverse proxy configuration.
5. `docker/backend/Dockerfile` — Non-root Python 3.12 FastAPI production image.
6. `docker/ollama/README.md` — Architectural guide for local LLM deployment and GPU policy.
7. `backend/app/workers/windows_host_worker_daemon.py` — Host-native Windows UIA automation daemon.
8. `backend/tests/test_docker_deployment_and_host_worker.py` — Deployment & worker daemon test suite.
9. `scripts/abhi-up.ps1` — One-command startup orchestrator.
10. `scripts/abhi-down.ps1` — One-command graceful shutdown orchestrator.
11. `scripts/abhi-status.ps1` — Health & diagnostic status dashboard.
12. `scripts/abhi-logs.ps1` — Unified log streaming utility.
13. `project_data/architecture/docker_and_deployment_architecture.md` — Deployment architecture document.
14. `project_data/status/phase_6_stage_6_2d_docker_implementation_report.md` — Comprehensive implementation report.

### Updated:
1. `.env.example` — Documented Docker hybrid environment variables and port mappings.

---

## 23. Git Status & Remote Push

* **Commit Message:** `feat: phase 6 stage 6.2d docker local deployment foundation`
* **Branch:** `main`
* **Target Remote:** `https://github.com/AYYAPPARAYUDU/ABHI.git`

---

## 24. Limitations & Proposed Next Stage

* **Current Limitation:** Stage 6.2-D establishes the deployment and container foundation. Continuous audio/video perception streaming over WebSocket will be expanded in Stage 6.3.
* **Proposed Next Stage:** **Phase 6 Stage 6.3 — Multimodal Voice, Vision & Live Telemetry Console**.
