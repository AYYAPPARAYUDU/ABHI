# Phase 6 Stage 6.5 — ABHI Runtime Lifecycle, Wake Word, Presence & Secure Activation Implementation Report

**Project:** Local-First Personal AI Computer Automation System  
**Branch:** `main`  
**Date:** 2026-09-28  
**Status:** COMPLETED & VERIFIED  

---

## 1. Executive Summary

Phase 6 Stage 6.5 implements the complete runtime lifecycle, on-device wake-word detection, multi-tiered presence gating, power throttling, and secure application activation for the ABHI platform.

The system delivers a seamless assistant experience following Windows user-session logon without ever bypassing or degrading Windows operating system security boundaries.

```
Laptop Power On
      ↓
Windows Authentication (Windows Hello / PIN / OS Login)
      ↓
Windows Desktop Session Established
      ↓
ABHI Auto Start (Scripts / User Session Task)
      ↓
Startup Health Checks (Docker, Backend, DB, Ollama, Perception, Workers)
      ↓
Lightweight ARMED State (Wake word active, CPU ~0.1%, GPU 0%, STT/LLM dormant)
      ↓
Acoustic "ABHI" Keyword Trigger (Local ONNX/Acoustic scoring, 2.0s debounce cooldown)
      ↓
ABHI LISTENING / ACTIVE (VAD -> Local STT -> Canonicalizer -> Supervisor)
```

---

## 2. Security Boundaries: Domain A vs. Domain B

### Domain A — Windows Operating System Login (Strict OS Ownership)
* **Zero Credential Interference:** ABHI never stores, replays, scrapes, captures, or injects credentials at the Windows lock/login screen.
* **Windows Hello Integration:** Windows Hello remains the authoritative OS authentication gate. No webcam or voice models are used to unlock the Windows OS.
* **No OS Bypass:** ABHI does not bypass Windows UAC, credential screens, or BitLocker/PIN mechanisms.

### Domain B — ABHI Application-Level Lifecycle & Activation
* **Application Lifecycle State Machine:** Governs operational modes (`STOPPED`, `STARTING`, `ARMED`, `LISTENING`, `PROCESSING`, `ACTIVE`, `RESTING`, `LOCKED`, `EMERGENCY_STOP`).
* **ABHI Local Authentication:** Memory-hard PBKDF2-HMAC-SHA256 salted PIN hashing with a cryptographic salt (100,000 rounds), rate-limiting (max 5 consecutive failures), and 60-second exponential lockout. Application state lock/unlock is completely separated from Windows login.

---

## 3. Five-Tier Identity Level Hierarchy

| Identity Level | Designation | Description & Permissions |
| :--- | :--- | :--- |
| **LEVEL 0** | `ANONYMOUS` | Unauthenticated / Locked state. No task dispatch permitted. Telemetry only. |
| **LEVEL 1** | `WAKE_WORD` | Activated via local acoustic `"ABHI"` detection. Read-only queries, navigation, and safe UI queries. |
| **LEVEL 2** | `LOCAL_AUTH` | Enrolled local user authenticated via salted PIN or verified presence. Standard automated workflows. |
| **LEVEL 3** | `OPERATOR_CONSENT` | High-impact actions gated by explicit operator confirmation dialog / gesture approval. |
| **LEVEL 4** | `ELEVATED_POLICY` | Critical system modification / lease authorization requiring verified OS-level authentication. |

---

## 4. Acoustic Wake-Word Engine & Lightweight Listening Mode

* **Keyword Target:** `"ABHI"` (multilingual activation aliases supported: `"ABHI wake"`, `"ABHI లేవు"`, `"ABHI जाग जाओ"`, `"ABHI விழி"`).
* **Lightweight CPU Execution:** Idle energy footprint uses minimal CPU cycles and zero GPU/VRAM allocation.
* **Debouncing & False-Positive Cooldown:** 2.0-second cooldown suppression prevents duplicate activations from reverberant audio or rapid repetitions.
* **Separation from Heavy STT/LLM:** Faster-Whisper and Ollama remain dormant until a valid wake trigger transitions the mode to `LISTENING`.

---

## 5. Multimodal Lifecycle Synchronization

Commands across Voice, Text, and Presence resolve to identical internal canonical intents:

| Input Modality | Utterance / Trigger | Canonical Intent | Target Mode |
| :--- | :--- | :--- | :--- |
| **Voice** | *"ABHI sleep"* / *"ABHI rest"* / *"ABHI take rest"* | `ABHI_REST` | `RESTING` |
| **Voice** | *"ABHI wake up"* / *"ABHI activate"* / *"ABHI I'm back"* | `ABHI_WAKE` | `LISTENING` / `ARMED` |
| **Voice** | *"ABHI lock"* / *"ABHI lock assistant"* | `ABHI_LOCK` | `LOCKED` |
| **Text** | `ABHI sleep` / `ABHI rest` | `ABHI_REST` | `RESTING` |
| **Text** | `ABHI wake` / `ABHI activate` | `ABHI_WAKE` | `LISTENING` / `ARMED` |
| **Text** | `ABHI lock` | `ABHI_LOCK` | `LOCKED` |
| **Presence** | Face detected & attention engaged | `PRESENCE_ENGAGED` | `ARMED` (Hint only, no auto-exec) |

---

## 6. Power & Perception Resource Throttling

* **RESTING State:** Camera perception throttled to `DORMANT`, microphone to `LOW_POWER` (wake-word scoring only), TTS disabled, LLM/STT offline.
* **ARMED State:** Camera set to `LOW_POWER` (coarse presence detection only), microphone active for keyword spotting.
* **ACTIVE / LISTENING State:** Full STT, active gesture recognition, gaze tracking, and avatar telemetry engaged.
* **No Continuous Retention:** Audio and camera buffers are strictly ephemeral; zero raw audio/video frames are persisted to disk.

---

## 7. Frontend Angular Architecture (`features/runtime`)

A dedicated, lazy-loaded feature module is implemented under `src/app/features/runtime/`:

```
frontend/src/app/features/runtime/
├── components/
│   ├── runtime-status/        # Mode badge, power policies, quick lifecycle controls
│   ├── wake-word-status/      # Keyword spotter telemetry, cooldown meter, test trigger
│   ├── runtime-mode/          # State machine card matrix (ARMED, RESTING, LISTENING, LOCKED)
│   ├── identity-status/       # 5-tier identity levels & memory-hard PIN unlock box
│   └── startup-status/        # Windows session startup health matrix (7 critical services)
├── models/
│   └── runtime.model.ts       # Typed TypeScript interfaces matching backend models
├── services/
│   └── runtime.service.ts     # Reactive Angular Signal store integrated with WebSocket telemetry
└── pages/
    └── runtime-page/          # Composite operator view with 3D avatar viewport & telemetry panel
```

---

## 8. Verification & Test Matrix

### Backend Test Suite (Pytest)
* `backend/tests/test_runtime_lifecycle.py`
  - `test_runtime_state_and_mode_transitions`: Validates state machine rules.
  - `test_wake_word_debouncing_and_cooldown`: Validates 2.0s debounce suppression.
  - `test_local_pin_auth_and_lockout`: Validates PBKDF2 hashing, rate-limiting, and 60s lockout.
  - `test_runtime_api_endpoints`: Validates REST contracts for `/state`, `/mode`, `/wake`, `/auth/pin`, `/startup-health`.
  - `test_lifecycle_canonical_intents`: Validates multilingual keyword canonicalization across EN/TE/HI/TA.
* **Backend Suite Result:** `141 passed in 320.06s (100% pass rate)`

### Frontend Test Suite (Vitest)
* `app.routes.ts`: Verified `/runtime` lazy route.
* `app-navigation.component.spec.ts`: Verified 7 primary navigation tabs.
* `runtime-status.component.spec.ts`, `wake-word-status.component.spec.ts`, `runtime-mode.component.spec.ts`, `identity-status.component.spec.ts`, `startup-status.component.spec.ts`, `runtime-page.component.spec.ts`.
* **Frontend Suite Result:** `42 test files passed (42), 72 tests passed (72)`
* **Angular Build:** `Application bundle generation complete` (Zero errors, optimized chunking).

### Docker & Infrastructure Configuration
* `compose.yaml`: Config validated successfully via `docker compose -f compose.yaml config`.
* `scripts/abhi-status.ps1`: Enhanced with section [6] for live runtime mode and identity level reporting.

---

## 9. Deliverables & Git Details

* **Branch:** `main`
* **Commit Message:** `feat: phase 6 stage 6.5 abhi runtime lifecycle and secure activation`
* **Commit Scope:** Runtime state machine, acoustic wake word engine, PBKDF2 PIN authentication, power policies, multilingual canonicalizer rules, Angular runtime console suite, and deployment script updates.
