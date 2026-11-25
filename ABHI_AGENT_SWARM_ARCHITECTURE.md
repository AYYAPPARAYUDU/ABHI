# ABHI Event-Driven Agent Swarm Architecture

**Project:** ABHI — Local-First Personal AI Computer Automation System  
**Document:** `ABHI_AGENT_SWARM_ARCHITECTURE.md`  
**Status:** **AUTHORITATIVE & INTEGRATED**  
**Date:** 2026-11-24  

---

## 1. Swarm Governance & Communication

The ABHI Agent Swarm operates on an asynchronous pub/sub model backed by `backend/app/core/event_bus.py`. Instead of tight inter-process coupling, agents react to published event categories:

| Event Category | Primary Sources | Typical Subscribers |
| :--- | :--- | :--- |
| `CONVERSATION` | SharedPerceptionPipeline | Master LLM, DialogueStateTracker |
| `PERCEPTION` | LiveScreenVision, Camera VAD | Aura-Vision, PerceptionDaemon |
| `MODEL` | MultiModelNegotiator, Council | CentralSupervisor, WebSocket Telemetry |
| `DAG` | TaskPlanner, CentralSupervisor | AgentRegistry, WorkerLifecycleManager |
| `AUTOMATION` | OSControlEngine, PlaywrightWorker | DualStateVerifier, Timeline Service |
| `VERIFICATION` | DualStateVerifier | CentralSupervisor, Audit Logs |
| `SECURITY` | Sentinel-X, ProactivityEngine | WorkerLifecycleManager (Killswitch) |
| `TELEMETRY` | ModelScheduler, psutil, nvidia-smi | WebSocket Hub, Frontend HUD |

---

## 2. Worker Lifecycle & Cooperative Cancellation

Implemented in `backend/app/automation/orchestration/worker_lifecycle.py`:

- **Worker Registration & Heartbeat:**
  Every worker process registers its PID, capabilities, and maximum heartbeat timeout (30.0s). If a worker misses its deadline, it is flagged as `UNHEALTHY`.
- **CancellationToken:**
  Allows cooperative interruption at step boundaries. Workers call `token.throw_if_cancelled()` before dispatching native OS clicks or API requests.
- **Emergency Stop:**
  Invoking `worker_lifecycle_manager.emergency_stop_all()` immediately cancels all active tokens, marks running workers `STOPPED`, and terminates child processes via `psutil`.

---

## 3. Dynamic Topological Wavefront Execution

- `TaskPlanner` generates a `TaskDAG` with explicit node dependencies.
- Kahn's topological sort groups nodes into parallel execution wavefronts:
  - *Wave 0:* Independent nodes execute concurrently using `asyncio.gather`.
  - *Wave 1:* Downstream nodes execute only after all parent nodes transition to `COMPLETED`.
- Nodes assign tasks to specialized agents (Desktop Agent, Browser Agent, RAG Agent) and bind target LLMs (`all-minilm:latest`, `abhi:latest`, `qwen3:8b`).
