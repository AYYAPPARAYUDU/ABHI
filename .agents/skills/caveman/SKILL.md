---
name: caveman
description: >-
  Caveman debugging skill — systematic print/log-based debugging when sophisticated
  debuggers are overkill or unavailable. Add strategic console.log, print(), and
  trace statements to isolate bugs by observing program state at runtime.
  Use when the user is stuck on a bug and needs to trace execution flow.
---

# Caveman — Strategic Print Debugging Skill

## Overview
Sometimes the best debugger is `console.log`. Caveman debugging is the art of
placing **strategic trace statements** to observe program flow, variable state,
and timing — then systematically narrowing down the root cause.

## When to Activate
- User says "I can't figure out why...", "debug this", "what's happening here?"
- Runtime bugs that don't show in static analysis
- Async/timing issues that breakpoints alter
- Three.js render loop issues (can't breakpoint at 60fps)
- Cross-system bugs (frontend ↔ backend communication)

## Caveman Protocol

### Phase 1: Instrument 🔍
Add trace points at strategic locations:

```typescript
// 🦴 CAVEMAN: [component] [what we're checking]
console.log('🦴 CAVEMAN: ThreeScene.animate() — frame:', this.frameCount,
  'particles:', this.particles.length,
  'deltaTime:', clock.getDelta());
```

```python
# 🦴 CAVEMAN: [module] [what we're checking]
print(f"🦴 CAVEMAN: gateway.process — intent={intent}, "
      f"confidence={confidence}, agent={selected_agent}")
```

### Phase 2: Observe 👀
Run the code and read the output:
- Is the function being called at all?
- Are the values what you expect?
- Is the order correct?
- How many times is it called?

### Phase 3: Narrow 🎯
Based on observations, add more targeted traces:
- Binary search the code path (trace halfway, then quarter)
- Add traces around the suspicious area
- Log inputs AND outputs of functions

### Phase 4: Fix 🔧
Once the root cause is found:
1. Fix the actual bug
2. Verify with the trace points still in
3. **Remove ALL caveman traces** (search for `🦴 CAVEMAN`)

### Phase 5: Clean 🧹
```bash
# Verify all traces removed
grep -rn "🦴 CAVEMAN" frontend/src/ backend/app/
# Should return: nothing
```

## Trace Patterns

### Lifecycle Tracing
```typescript
console.log('🦴 CAVEMAN: MyComponent INIT');
console.log('🦴 CAVEMAN: MyComponent INPUT changed:', changes);
console.log('🦴 CAVEMAN: MyComponent DESTROY');
```

### Async Flow Tracing
```typescript
console.log('🦴 CAVEMAN: API call START', url);
console.log('🦴 CAVEMAN: API call RESPONSE', status, data?.length);
console.log('🦴 CAVEMAN: API call ERROR', error.message);
```

### Three.js Render Loop
```typescript
// Only log every 60th frame to avoid console flood
if (this.frameCount % 60 === 0) {
  console.log('🦴 CAVEMAN: render loop',
    'fps:', Math.round(1 / delta),
    'objects:', scene.children.length,
    'memory:', renderer.info.memory);
}
```

### FastAPI Request Tracing
```python
@app.middleware("http")
async def caveman_trace(request, call_next):
    print(f"🦴 CAVEMAN: {request.method} {request.url.path} "
          f"body={await request.body()}")
    response = await call_next(request)
    print(f"🦴 CAVEMAN: → {response.status_code}")
    return response
```

## Rules
1. **Always use the 🦴 CAVEMAN prefix** — Makes traces easy to find and remove
2. **Never leave traces in committed code** — Clean up before committing
3. **Log values, not just "here"** — `console.log('here')` tells you nothing
4. **Rate-limit render loop traces** — Don't log 60 times per second
5. **Trace both success AND failure paths** — The bug might be in the happy path

## ABHI-Specific Trace Points

| System | Key Trace Locations |
|---|---|
| **Agent Gateway** | Request entry, supervisor dispatch, adapter call, result |
| **Three.js Scene** | animate() loop, particle updates, resize handler |
| **Speech/Voice** | Recognition start/result/error, TTS queue/play |
| **Theme Service** | Theme switch, CSS variable application, Three.js sync |
| **SQLite WAL** | Write operations, WAL checkpoint, concurrent reads |
| **Ollama** | Inference request/response/timing, token streaming |

