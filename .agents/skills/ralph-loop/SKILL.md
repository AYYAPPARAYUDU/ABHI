---
name: ralph-loop
description: >-
  Iterative refinement loop that keeps improving code until a quality bar is met.
  Use when the user wants code to be polished, debugged, or refined through
  multiple autonomous passes. Inspired by the "Ralph Loop" methodology:
  Write → Run → Assess → Loop until Perfect → Hand off.
---

# Ralph Loop — Iterative Refinement Skill

## Overview
The Ralph Loop is an autonomous iterative refinement cycle. Instead of writing
code once and hoping it works, the agent enters a **tight feedback loop** of
writing, running, assessing, and repairing until the output meets a strict
quality bar.

## When to Activate
- User says "make it perfect", "keep going until it works", "polish this"
- Complex multi-file changes that need verification
- Bug fixes that require iterative debugging
- Any task where first-pass code is unlikely to be production-ready

## The Loop Protocol

```
┌──────────────────────────────────────────────┐
│  1. WRITE   — Implement the change           │
│  2. BUILD   — Run build/compile/lint          │
│  3. TEST    — Run tests or manual verify      │
│  4. ASSESS  — Score quality 1-10              │
│  5. DECIDE  — Score ≥ 8? → EXIT : → REPAIR   │
│  6. REPAIR  — Fix issues found in assessment  │
│  └────────── Loop back to step 2 ────────────┘
└──────────────────────────────────────────────┘
```

## Quality Assessment Criteria (Score 1-10)

| Category | Weight | Check |
|---|---|---|
| **Correctness** | 30% | Does it do what was asked? |
| **Build** | 20% | Zero build errors and warnings? |
| **Tests** | 20% | All tests pass? |
| **Style** | 15% | Follows project conventions? |
| **Edge Cases** | 15% | Handles nulls, errors, boundaries? |

## Rules
1. **Maximum 5 iterations** — If quality bar not met after 5 loops, report
   status and remaining issues to the user.
2. **Each iteration must make measurable progress** — If the same error appears
   twice, change strategy.
3. **Log every iteration** — Track what was tried and what score was achieved.
4. **Never silently pass** — Every assessment must be honest. No fake passes.

## ABHI-Specific Integration
- **Frontend loops**: Run `npm run build` and check for Angular compilation errors.
- **Backend loops**: Run `pytest` and verify FastAPI endpoints.
- **3D/Three.js loops**: Visually verify the scene renders in browser at
  `http://127.0.0.1:4200/`.
- **Dual-State Verification**: Aligns with the ABHI mandatory verification flow —
  actions must physically succeed before marking COMPLETED.

## Example Usage
```
User: "Fix the particle system flickering and make it smooth"

Ralph Loop Iteration 1:
  WRITE  → Adjusted particle buffer swap timing
  BUILD  → npm run build → 0 errors
  TEST   → Visual check → Still flickering on resize
  SCORE  → 4/10
  REPAIR → Add debounced resize handler

Ralph Loop Iteration 2:
  WRITE  → Added ResizeObserver with 16ms debounce
  BUILD  → npm run build → 0 errors
  TEST   → Visual check → Smooth, no flicker
  SCORE  → 9/10
  EXIT   → ✅ Quality bar met
```

