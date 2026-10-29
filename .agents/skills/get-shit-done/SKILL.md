---
name: get-shit-done
description: >-
  GSD (Get Shit Done) mode — focused execution with minimal deliberation.
  Use when the user wants fast, direct implementation without lengthy planning
  or excessive questions. Ship first, polish later. Biased toward action.
---

# Get Shit Done (GSD) — Focused Execution Mode

## Overview
GSD mode switches the agent from deliberative planning to rapid execution.
Instead of asking clarifying questions and producing analysis documents, the
agent makes reasonable assumptions and **ships working code fast**.

## When to Activate
- User says "just do it", "GSD", "get it done", "stop asking, just build it"
- Small-to-medium tasks where overthinking wastes time
- Prototyping and rapid iteration sessions
- When the intent is clear enough to act on

## GSD Rules

### DO ✅
1. **Make reasonable assumptions** — Pick the most likely interpretation and go
2. **Write code immediately** — Skip the essay, show the implementation
3. **Use existing patterns** — Copy what already works in the codebase
4. **Deliver complete files** — Not snippets, not pseudocode, not "TODO" stubs
5. **Run it** — Build and verify the code actually works
6. **One response, full solution** — Don't break it into multiple turns

### DON'T ❌
1. **Don't ask obvious questions** — If there's a 90%+ clear answer, just pick it
2. **Don't write lengthy explanations** — Brief summary, then code
3. **Don't hedge** — No "you could also consider..." — just pick the best option
4. **Don't over-engineer** — YAGNI. Solve what's asked, nothing more
5. **Don't plan in circles** — Plan ≤ 30 seconds, then execute

## Response Format in GSD Mode

```
🚀 [One-line summary of what I'm doing]

[Code changes]

✅ Done. [One-line result summary]
```

## ABHI-Specific GSD Defaults

When in doubt, use these defaults for the ABHI project:

| Decision | Default |
|---|---|
| Frontend framework | Angular 22 with standalone components |
| Styling | Dark neumorphic, cyan accent (#00f0ff) |
| State management | Angular signals |
| 3D | Three.js WebGLRenderer |
| Backend | FastAPI async endpoint |
| Database | SQLite WAL mode |
| Auth | Skip for now, add later |
| Tests | Write them, but don't block on them |
| Error handling | try/catch with console.error, refine later |

## Speed vs Quality Balance
- GSD ≠ sloppy. Code should work and be readable.
- GSD = skip analysis paralysis. Don't write a 500-word plan for a 10-line fix.
- If the task is genuinely complex (>3 files, new architecture), suggest
  switching to `/plan` mode instead.

