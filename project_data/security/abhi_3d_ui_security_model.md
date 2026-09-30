# ABHI 3D UI Security Model

## 1. Principles
1. **Presentation Separation**: The Angular 3D frontend is strictly a presentation and input layer. It possesses zero ambient privileges to execute system calls, arbitrary shell commands, or raw process spawns.
2. **Authoritative Backend Validation**: All intents, actions, and queries pass through FastAPI input schemas, Pydantic data validation, and the Central Safety Policy Engine.
3. **No Direct OS Process Access**: The browser client cannot bypass the Supervisor, ResourceManager, or Verification engines.
4. **Consent Gate Integrity**: High-tier actions require explicit operator sign-off via cryptographic/session-bound consent tokens.

---

## 2. WebGL & Canvas Security
- WebGL contexts are created with `alpha: true` and `powerPreference: 'high-performance'`.
- Shader sources and particle geometries are bounded and created using safe mathematical distributions without external code evaluation (`eval` or dynamic JS scripts).
- WebGL contexts are explicitly torn down on component unmount, preventing GPU memory exhaustion attacks.

---

## 3. Communication Security
- WebSocket telemetry adheres to bounded message buffer sizes (maximum 100 historical items in UI memory) to eliminate memory consumption vectors from rapid telemetry floods.
- All HTTP requests use strict CORS restrictions configured for local development (`127.0.0.1`, `localhost`).
