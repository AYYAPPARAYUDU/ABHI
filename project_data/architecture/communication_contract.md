# Communication Contract & IPC Protocol Specifications

## 1. Communication Channels & Protocols

| Channel | Producer | Consumer | Protocol / Format | Latency Target | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **UI Telemetry & Events** | Gateway Subsystem | Angular Frontend | Bidirectional WebSocket (`/ws/telemetry`) (JSON) | < 10 ms | Real-time agent state, DAG step updates, live logs, 3D avatar pulse commands. |
| **User Commands & Queries** | Angular Frontend | Gateway Subsystem | WebSocket / REST POST (`/api/v1/agent/task`) (JSON) | < 15 ms | Submitting text/voice prompts, user consent approvals, emergency stop. |
| **Audio PCM Streaming** | Audio Daemon | Gateway / Frontend | WebSocket Binary Frames (Float32 / 16kHz PCM) | < 25 ms | Live microphone streaming for VAD and live speech waveform rendering. |
| **Vision Telemetry** | Perception Worker | Gateway / Frontend | IPC Queue / WebSocket (`JSON` landmarks) | < 15 ms | 3D Face rotation angles (yaw/pitch/roll), hand gesture trigger tokens. |
| **Model Inference Calls** | Gateway / Agents | Ollama Service | HTTP/1.1 REST (`http://localhost:11434/api/generate`) | < 50 ms TTFT | LLM generation, tool calls, and structured JSON parsing. |
| **Internal Worker IPC** | Gateway Core | Worker Subprocesses | Python `multiprocessing.Queue` / Anonymous Pipes (Pickle/JSON) | < 1 ms | Dispatching heavy OCR, media generation, and Playwright execution tasks. |

---

## 2. Standardized JSON Message Envelope Contract

All WebSocket and IPC message payloads MUST conform to the canonical typed message schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["message_id", "timestamp", "channel", "type", "payload"],
  "properties": {
    "message_id": { "type": "string", "format": "uuid" },
    "correlation_id": { "type": "string" },
    "timestamp": { "type": "integer", "description": "Unix timestamp in milliseconds" },
    "channel": { "type": "string", "enum": ["system", "telemetry", "agent", "audio", "vision", "safety"] },
    "type": { "type": "string" },
    "payload": { "type": "object" },
    "error": {
      "type": ["object", "null"],
      "properties": {
        "code": { "type": "string" },
        "message": { "type": "string" },
        "details": { "type": "object" }
      }
    }
  }
}
```

---

## 3. Resilience, Timeouts & Reconnection Policies

1. **WebSocket Heartbeat:** The Gateway issues a `PING` frame every 15 seconds; the Angular client must respond with `PONG` within 5 seconds. Reconnection uses exponential backoff (1s, 2s, 4s, max 10s).
2. **Model Call Timeouts:**
   * Ollama LLM queries: 30-second timeout per generation turn with streaming cancelation support.
   * Tool execution calls: Configurable timeout (5s for quick OS checks, 60s for browser page loads, 180s for image diffusion).
3. **Emergency Stop (E-Stop):** Dedicated high-priority WebSocket channel message `SAFETY_EMERGENCY_STOP` immediately forces worker process suspension without waiting for step completion.
