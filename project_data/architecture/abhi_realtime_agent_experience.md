# ABHI Real-Time Agent Experience & Telemetry Streaming (Phase 9 Stage 2)

## 1. Overview
The Real-Time Agent Experience translates raw backend system events into intuitive, live visual state updates without flooding the DOM or desynchronizing client state.

## 2. Telemetry Ingestion Architecture

```text
Backend Workflow Engine
       │
       ▼
Telemetry Broadcaster (WebSocket: /ws/telemetry)
       │
       ▼
Frontend TelemetryService (Singleton RxJS Subject)
       │
  ┌────┴───────────────────────────┬───────────────────────────────┐
  ▼                                ▼                               ▼
AgentExperienceService     AgentCommandService             Active Task Cards
(State projection & modes) (Task updates & result mapping) (Progress visualizer)
```

## 3. Real-Time Guarantees & Constraints
1. **Single Shared WebSocket**: One global singleton connection managed by `TelemetryService`. Component views subscribe to filtered RxJS observables rather than establishing independent socket instances.
2. **Reconnection & State Reconciliation**:
   - On socket disconnect, the client gracefully transitions to fallback HTTP polling (with exponential backoff).
   - Upon reconnection, `TaskService.getTasks()` reconciles the ground-truth state from the authoritative SQLite database.
3. **Optimistic UI Restrictions**:
   - Optimistic updates are strictly limited to non-destructive input states (e.g., focus aura, pending input placeholder).
   - Task completion, application launches, and media artifacts are NEVER optimistically marked as succeeded prior to backend verification.
4. **Performance & Change Detection**:
   - High-frequency particle animations and Three.js 3D background loops run completely outside Angular's `NgZone`.
   - UI bindings use granular Angular Signals (`computed()` and `signal()`) to prevent cascading top-level change detection cycles.
