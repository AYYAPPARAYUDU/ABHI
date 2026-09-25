# Multi-Agent Orchestration & Supervisor Design

## 1. Supervisor Orchestration Topology

```
                               ┌──────────────┐
                               │     USER     │
                               └──────┬───────┘
                                      │ (Voice / Chat / Gesture)
                                      ▼
                        ┌───────────────────────────┐
                        │   Multimodal Perception   │
                        │   (MediaPipe, VAD, STT)   │
                        └─────────────┬─────────────┘
                                      │ Canonicalized Intent
                                      ▼
                    ┌───────────────────────────────────┐
                    │     CENTRAL SUPERVISOR AGENT      │
                    │  (State Machine, Router, Verifier) │
                    └─┬───────────────┬───────────────┬─┘
                      │               │               │
        ┌─────────────┘               │               └─────────────┐
        ▼                             ▼                             ▼
┌───────────────┐             ┌───────────────┐             ┌───────────────┐
│ Planner Agent │             │ Memory Agent  │             │  RAG Agent    │
│ (DAG Creator) │             │ (Long/Short)  │             │ (Dense/Sparse)│
└───────┬───────┘             └───────────────┘             └───────────────┘
        │
        ▼ (Targeted Sub-task Dispatched to Specialized Worker)
┌───────────────────────────────────────────────────────────────────────────┐
│                         SPECIALIZED AGENT POOL                            │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌────────────┐  │
│  │ OS / Desktop  │  │    Browser    │  │    Coding     │  │   Media    │  │
│  │     Agent     │  │     Agent     │  │     Agent     │  │   Agent    │  │
│  │ (UIA/Win32)   │  │ (Playwright)  │  │ (Shell/Files) │  │ (Diffusers)│  │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘  └─────┬──────┘  │
└──────────┼──────────────────┼──────────────────┼────────────────┼─────────┘
           │                  │                  │                │
           └──────────────────┼──────────────────┴────────────────┘
                              ▼
                ┌───────────────────────────┐
                │    Verification Agent     │
                │  (Computer State vs Plan) │
                └─────────────┬─────────────┘
                              │ Verified Result / Correction Trigger
                              ▼
                ┌───────────────────────────┐
                │   Supervisor -> User UI   │
                └───────────────────────────┘
```

---

## 2. Core Agent Responsibilities

1. **Supervisor Agent:** Root coordinator; manages conversation turns, state transitions, security boundary checks, and error recovery.
2. **Planner Agent:** Decomposes complex multi-step user goals into executable DAG plans with explicit pre-conditions and post-conditions.
3. **OS / Desktop Agent:** Executes system tasks (window management, app launching, native UI clicks, keystrokes) using Windows UI Automation and Win32 APIs.
4. **Browser Agent:** Navigates websites, extracts DOM/accessibility snapshots, fills forms, and executes multi-tab web workflows via Playwright.
5. **Coding / Shell Agent:** Inspects directories, performs file operations, writes code, and runs sandboxed terminal commands.
6. **Media Agent:** Orchestrates image generation, super-resolution upscaling, audio/video editing, and format transformations.
7. **RAG & Memory Agent:** Retrieves relevant context from local files, codebases, and past episodic user interactions.
8. **Verification Agent:** Independently inspects physical system state after tool execution to ensure actions succeeded as intended.
