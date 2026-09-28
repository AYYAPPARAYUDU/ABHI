# Phase 6 Stage 6.2-D — Docker & Local Deployment Architecture

## 1. Executive Summary & Core Principle

ABHI operates as a **hybrid Windows + Docker architecture**. The system orchestrates portable services (Angular 22 SPA served by Nginx, FastAPI Gateway & Multi-Agent Cognitive Core, SQLite/LanceDB persistence) within Docker containers while strictly retaining Windows-specific physical UI automation (Windows UIA, pywinauto, foreground window verification, native OS input) as native Windows Host worker processes.

```text
================================================================================
                               ABHI LOCAL RUNTIME
================================================================================
+------------------------------------------------------------------------------+
| DOCKER COMPOSE STACK (abhi-network)                                          |
|                                                                              |
|  +-----------------------------+        +---------------------------------+  |
|  | Frontend Container (Nginx)  |        | Backend Container (Python 3.12) |  |
|  | - Angular 22 SPA Artifacts  |        | - FastAPI Gateway / REST API    |  |
|  | - SPA Fallback Routing      |        | - WebSocket Telemetry Hub       |  |
|  | - Static Asset Caching      |        | - Supervisor & Multi-Agent Core |  |
|  | - Port: 127.0.0.1:4200:80   |        | - Port: 127.0.0.1:8000:8000     |  |
|  +--------------+--------------+        +----------------+----------------+  |
|                 | (Reverse Proxy /api/, /ws/)            |                   |
|                 +----------------------------------------+                   |
|                                                          |                   |
|  +-------------------------------------------------------+----------------+  |
|  | Persistent Storage Mounts                                              |  |
|  | - ./database:/app/database (SQLite WAL system.db, LanceDB vector store)|  |
|  | - ./logs:/app/logs         (Rotating security and audit log files)     |  |
|  +------------------------------------------------------------------------+  |
+------------------------------------------------------------------------------+
                                        ▲
                                        │ (host.docker.internal / 127.0.0.1)
+---------------------------------------▼--------------------------------------+
| WINDOWS HOST ENVIRONMENT                                                     |
|                                                                              |
|  +-----------------------------+        +---------------------------------+  |
|  | Native Ollama LLM Service   |        | Windows UIA Automation Worker   |  |
|  | - Port: 127.0.0.1:11434     |        | - pywinauto / Win32 API access  |  |
|  | - NVIDIA RTX 5050 CUDA GPU  |        | - Foreground window validation  |  |
|  | - qwen3:8b, abhi:latest     |        | - Fail-closed safety leases     |  |
|  +-----------------------------+        +---------------------------------+  |
+------------------------------------------------------------------------------+
```

---

## 2. Critical Process & Security Boundaries

1. **No Docker Daemon Control in Containers:** Application containers do not mount `/var/run/docker.sock`.
2. **No Broad Host Mounts:** Containers only mount `./database` and `./logs`. Root host disks (`C:\`, `System32`, user home) are strictly forbidden from container bind mounts.
3. **Fail-Closed Execution Authority:** The Windows host worker executes physical actions only upon valid, unexpired `AutomationLease` tokens issued by the Supervisor.
4. **Localhost-Only Exposure:** All public ports bind strictly to `127.0.0.1` (`127.0.0.1:4200`, `127.0.0.1:8000`, `127.0.0.1:11434`), preventing external LAN exposure.

---

## 3. Ollama & GPU Acceleration Strategy

* **Hardware Target:** NVIDIA GeForce RTX 5050 Laptop GPU (~8 GB VRAM), 24 GB Host RAM, 8 Cores / 16 Threads.
* **Option A (Default & Recommended):** Native Windows Host Ollama service (`http://127.0.0.1:11434`). This provides direct CUDA kernel execution without WSL2 virtualization overhead, preserves existing 5.2 GB local model weights (`qwen3:8b`, `abhi:latest`), and avoids duplicate disk/VRAM consumption.
* **Option B (Containerized Profile):** Activated on-demand via `docker compose --profile ollama-container up -d` with explicit Compose NVIDIA device reservations.

---

## 4. One-Command Developer Workflow

| Command | Action |
| :--- | :--- |
| `.\scripts\abhi-up.ps1` | Validates prerequisites, starts Docker Compose stack, verifies backend health, spawns native Windows Host worker, prints health matrix. |
| `.\scripts\abhi-down.ps1` | Stops host worker PID cleanly, releases automation leases, executes `docker compose down`. |
| `.\scripts\abhi-status.ps1` | Queries Docker containers, Backend Health API, Ollama engine, and Host Worker PID diagnostics. |
| `.\scripts\abhi-logs.ps1` | Streams live logs from containers or host worker (`-Service backend/frontend/ollama/worker`, `-Follow`). |
