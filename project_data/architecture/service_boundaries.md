# Service Boundaries & Subsystem Responsibilities

## 1. Subsystem Architecture Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          1. FASTAPI GATEWAY SUBSYSTEM                       │
│  • HTTP REST Endpoints (/api/v1/health, /api/v1/system, /api/v1/models)    │
│  • WebSocket Telemetry Hub (/ws/telemetry)                                  │
│  • Request Validation & Error Interceptor                                   │
│  • CORS, Security Headers & Rate Limiting                                   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Direct Async Function Calls
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       2. SUPERVISOR & COGNITIVE SUBSYSTEM                   │
│  • Root State Machine (IDLE -> PERCEIVING -> PLANNING -> EXECUTING -> ...)  │
│  • Execution DAG Management & Step Rollback                                 │
│  • Human-in-the-Loop Consent Interceptors (Tier 3 Critical Gates)          │
│  • Dual-State Verification Dispatcher                                       │
└──────────────────┬───────────────────┬───────────────────┬──────────────────┘
                   │                   │                   │
                   ▼                   ▼                   ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌─────────────────────────┐
│ 3. MEMORY & RAG       │ │ 4. MODEL ADAPTER      │ │ 5. SPECIALIZED AGENTS   │
│ • SQLite Repository   │ │ • Ollama Client       │ │ • OS / UIA Agent        │
│ • LanceDB Vector Store│ │ • Structured Grammars │ │ • Browser Agent (CDP)   │
│ • Episodic Summaries  │ │ • Model Hot-Swapping  │ │ • Shell / Coding Agent  │
│ • User Preferences    │ │ • VRAM Arbiter        │ │ • Media Agent           │
└───────────────────────┘ └───────────────────────┘ └─────────────────────────┘
```

---

## 2. Explicit Subsystem Responsibilities & Anti-Responsibilities

### Subsystem 1: FastAPI Gateway
* **Owns:** Network ingress, WebSocket client connection management, authentication/token validation, payload deserialization, HTTP response formatting, structured logging of inbound/outbound payloads.
* **Must NOT Own:** Complex agent planning logic, direct OS/mouse automation calls, long-running blocking loops.

### Subsystem 2: Supervisor & Cognitive Core
* **Owns:** Master state machine, task decomposition, agent routing, permission gate enforcement, error retry strategy, step verification aggregation.
* **Must NOT Own:** Raw pixel rendering, low-level OS Win32 API calls, direct neural network weight manipulation.

### Subsystem 3: Model Adapter (LLM Engine)
* **Owns:** Connection pooling to Ollama API (`localhost:11434`), JSON schema constrained decoding, model health checks, latency tracking, fallback logic.
* **Must NOT Own:** Prompt formatting business logic of specific agents.

### Subsystem 4: Automation Agents & Tools
* **Owns:** Deterministic execution of individual domain actions (clicking UIA button, navigating browser tab, executing shell command, running diffusion pipeline).
* **Must NOT Own:** Unchecked decision-making without Supervisor validation.
