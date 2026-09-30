# ADR-0017: Bounded Agent Context and Conversation Threads

## Status
**Accepted** (Phase 9 Stage 3)

## Context
Operators require multi-turn conversational follow-ups (such as *"make it darker"* after generating an image, or *"calculate 25 * 19"* after launching Calculator). Unbounded context accumulation risks state explosion, memory leaks, and permission escalation.

## Decision
1. Define a strongly-typed `AgentContext` with an authoritative 300-second (5 minute) TTL.
2. Store bounded conversational threads (`AgentThread`) with recent sanitized command and result references.
3. Treat context strictly as informational data. Any subsequent action must re-evaluate policy, permissions, and consent.
4. Enforce explicit ambiguity handling: if an operator prompt references an ambiguous context candidate, prompt for clarification rather than guessing.

## Consequences
### Positive
- Natural conversational follow-ups without loss of precision.
- Zero state bloat or unbounded context memory growth.
- Hardened permission boundary preventing context injection attacks.
