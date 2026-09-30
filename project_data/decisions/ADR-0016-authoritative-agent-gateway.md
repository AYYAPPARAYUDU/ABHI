# ADR-0016: Authoritative Multimodal Agent Gateway

## Status
**Accepted** (Phase 9 Stage 3)

## Context
In previous implementations, natural language evaluation and arithmetic shortcuts were partially evaluated on the client side. This introduced the risk of semantic drift and bifurcated execution authority between Angular and Python.

## Decision
1. Establish `backend/app/cognitive/gateway/agent_gateway.py` as the sole authoritative gateway for natural language, voice, and system event commands.
2. Relocate all arithmetic computation and intent dispatching to backend endpoints (`POST /api/v1/agent/command`).
3. Maintain the frontend Angular layer strictly as an **Experience Projection** handling UI state, focus auras, and result rendering.
4. Route all autonomous execution requests directly through the authoritative `CentralSupervisor`.

## Consequences
### Positive
- Single authoritative point of truth for semantic understanding, security boundaries, and telemetry.
- Prevents frontend execution bypass and eliminates client-side arithmetic vulnerabilities.
- Uniform telemetry streaming and thread persistence across all channels (Web, CLI, Voice).

### Negative / Trade-offs
- Every command requires a roundtrip to the backend gateway, adding a minor network latency (~5-15ms locally), which is negligible for local-first operations.
