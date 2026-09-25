# Local-First Personal AI Computer Automation System

A private, local-first artificial intelligence platform designed to operate and automate the host computer environment through natural human interaction (voice, vision, face tracking, gestures, and natural language).

---

## System Architecture

The system operates as a **Multi-Process Modular Hybrid Architecture**:
* **Frontend:** Angular 22 Single Page Application + Three.js 3D WebGL Cognitive Core.
* **Backend Gateway:** FastAPI / Asyncio Gateway hosting the Supervisor, DAG planner, verification engine, and Ollama adapter.
* **Perception Workers:** MediaPipe (face mesh, hands, gestures) + Silero VAD / faster-whisper.
* **Persistence:** SQLite WAL relational storage + LanceDB serverless vector engine.

---

## Project Structure

```
├── project_data/       # Permanent project research, ADRs, specifications & hardware profiles
├── backend/            # Python FastAPI core, supervisor, services & workers
├── frontend/           # Angular 22 & Three.js 3D interactive user interface
├── shared/             # Canonical JSON message contracts & IPC schemas
├── database/           # Persistent runtime storage (relational, vector, memory, media)
└── logs/               # Rotating structured audit logs
```

---

## Quick Start (Development)

### Backend
```bash
# Start FastAPI Gateway
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm start
```
