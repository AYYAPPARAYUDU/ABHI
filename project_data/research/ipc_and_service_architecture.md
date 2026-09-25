# Research Record: IPC Protocols, Backend Architecture & Process Model

## 1. Local Process Architecture Options Comparison

| Architecture Pattern | Description | Pros on Local Laptop | Cons / Tradeoffs | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **A. Distributed Microservices (15+ Docker containers)** | Every agent and tool running in separate containers with HTTP/gRPC. | Extreme process isolation. | Huge memory overhead (> 4-6 GB idle RAM), high startup latency, complex container management on Windows Home. | **REJECTED (Unnecessary Complexity)** |
| **B. Monolithic Single Process** | Everything (UI, AI models, automation, audio) in one Python process. | Simple single runtime. | UI freezes during heavy AI inference; GIL contention; crash in vision worker crashes whole app. | **REJECTED (Fragile & Blocking)** |
| **C. Multi-Process Hybrid Architecture (Engineered Core)** | Dedicated Python Core process with isolated worker subprocesses for Vision and Heavy Media, communicating via Fast WebSocket + Async IPC with the Angular UI. | High resilience; non-blocking UI; shared memory where needed; clean separation; low idle RAM (~1.2 GB). | Requires structured IPC protocol. | **SELECTED & RECOMMENDED** |

---

## 2. Selected Process Topology

```
┌────────────────────────────────────────────────────────┐
│                   Angular Frontend                      │
│   (UI, Signal State, Three.js 3D Viewport, Web Audio)  │
└───────────────────────────▲────────────────────────────┘
                            │ Bidirectional WebSocket (JSON-RPC / SSE)
                            │ + REST for heavy binary payloads
┌───────────────────────────▼────────────────────────────┐
│              FastAPI / Asyncio AI Core Gateway         │
│  (Supervisor, Router, Planner, State Machine, SQLite)  │
└───────┬───────────────────┬───────────────────┬────────┘
        │ Thread / Subprocess│ Process Pipe       │ Worker Process
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌────────────────────────┐
│ Audio Worker  │   │ Vision Worker │   │ Media Generation Pool  │
│ (VAD + Whisper│   │ (MediaPipe +  │   │ (Diffusers / FFmpeg    │
│  + Piper TTS) │   │  Screen OCR)  │   │  Time-Multiplexed GPU) │
└───────────────┘   └───────────────┘   └────────────────────────┘
```

---

## 3. IPC Protocol Standards

* **Control Plane & Streaming:** WebSockets (`ws://127.0.0.1:8000/ws/agent`) transmitting typed JSON envelopes:
  ```json
  {
    "event_id": "evt_982341",
    "timestamp": 1758778954000,
    "source": "supervisor",
    "type": "AGENT_STATE_CHANGE",
    "payload": {
      "state": "EXECUTING",
      "active_agent": "BrowserAgent",
      "current_action": "Clicking button '#submit-order'",
      "step_index": 3,
      "total_steps": 5
    }
  }
  ```
* **Binary Streams:** Audio PCM chunks streamed via dedicated WebSocket binary channel; camera frames processed directly in local OpenCV/MediaPipe worker with telemetry sent to frontend.
