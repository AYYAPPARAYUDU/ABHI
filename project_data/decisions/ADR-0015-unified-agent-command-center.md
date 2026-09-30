# ADR-0015: Unified Agent Command Center & Real-Time Automation Experience

## Status
**Accepted** (Phase 9 Stage 2)

## Context
In Phase 9 Stage 1, the 3D spatial shell, floating navigation, experience mode toggle, and spatial layout foundations were established. However, operating ABHI still required the user to manually browse across feature screens (Tasks, Applications, Browser, Media, Memory) to initiate automation workflows.

## Decision
1. Implement a **Unified Agent Command Center** (`AgentCommandCenterComponent`) embedded prominently on the Home screen and accessible globally.
2. Introduce `AgentCommandService` to handle multimodal commands (text, voice, multilingual: English, Telugu, Hindi, Tamil) and coordinate request routing to `POST /api/v1/tasks`.
3. Support direct mathematical evaluations locally via a safe, regex-validated calculation engine (`125 * 48 = 6000`), immediately surfacing `NUMBER_RESULT` cards.
4. Implement `UniversalResultSheetComponent` and `AgentTaskCardComponent` to project backend task outcomes directly in the command center without forcing screen transitions.
5. Retain backend Supervisor, SkillRuntime, and Policy as the authoritative runtime and security gates.

## Consequences
### Positive
- Users interact with ABHI as a true **Personal AI Computer** through natural language and voice.
- Zero navigation friction for everyday calculations, application launches, media searches, and automations.
- Strict security boundaries maintained; all high-tier operations trigger authoritative backend consent verification.

### Negative / Trade-offs
- Requires careful lifecycle synchronization between client signals and server WebSocket telemetry to prevent UI drift during network hiccups.
