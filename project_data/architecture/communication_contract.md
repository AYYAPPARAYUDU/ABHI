# Communication Contract & IPC Protocol Specifications

**Status:** RECONCILED & HARDENED (Phase 2 Baseline)

## 1. IPC Mechanisms & Transport Rules

To eliminate serialization vulnerabilities and performance bottlenecks, the system enforces a strict transport separation based on data type:

| Data Type | Primary Transport | Format / Schema | Security & Serialization Rule |
| :--- | :--- | :--- | :--- |
| **Control & State Messages** | WebSocket (`/ws/telemetry`) & Subprocess Pipes | Versioned JSON-RPC 2.0 Envelopes | Strictly validated via Pydantic schemas. Unrestricted `pickle` is forbidden. |
| **Audio Stream (Real-Time)** | WebSocket Binary Frames | Float32 16kHz PCM Raw Buffer | Zero-copy binary frames with fixed header. |
| **Vision Telemetry** | Local IPC Queue / WebSocket | JSON (Landmarks & Angles) | Typed arrays of normalized float coordinates. |
| **Large Media / Artifacts** | Local Filesystem Exchange | File Paths in `database/media/` | Only file paths, checksums, and metadata pass through IPC; raw binaries are read on-demand from disk. |

---

## 2. Standardized JSON Message Envelope Contract

All control and telemetry messages MUST conform to the canonical JSON schema:

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

## 3. Measurable Engineering Service Level Objectives (SLOs)

The system defines concrete performance budgets and acceptable fallback behaviors:

| Metric | Target (p50) | Target (p95) | Timeout Limit | Measurement Method | Acceptable Fallback Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Frontend WebSocket Telemetry** | < 5 ms | < 15 ms | 50 ms | Round-trip client-server ping benchmark | Drop non-critical visual frame; maintain state synchronization. |
| **Perception Landmark Latency** | < 10 ms | < 15 ms | 30 ms | DirectShow frame capture to landmark emit | Skip frame; maintain current avatar pose. |
| **LLM Time to First Token (TTFT)** | < 350 ms | < 600 ms | 15.0 s | Ollama `/api/generate` first chunk arrival | Return cached intent or retry generation once. |
| **Database Query Latency** | < 2 ms | < 10 ms | 100 ms | Async SQLAlchemy SQLite execution timer | Retry SQLite transaction on busy lock (WAL mode). |
| **UI Automation Action Latency** | < 50 ms | < 200 ms | 5.0 s | Windows UIA element click confirmation | Fallback to visual OCR coordinate click. |
| **Browser Navigation Wait** | < 500 ms | < 2.5 s | 15.0 s | Playwright `networkidle` load event | Inspect DOM readiness; proceed if interactive. |
| **Image Generation (SDXL-Turbo)** | < 1.2 s | < 2.5 s | 10.0 s | PyTorch Diffusers pipeline execution | Terminate generation worker; report VRAM state. |
