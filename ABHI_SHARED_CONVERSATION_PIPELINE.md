# ABHI Shared Voice & Multimodal Conversation Pipeline

**Project:** ABHI — Local-First Personal AI Computer Automation System  
**Document:** `ABHI_SHARED_CONVERSATION_PIPELINE.md`  
**Status:** **AUTHORITATIVE & INTEGRATED**  
**Date:** 2026-11-24  

---

## 1. The Single Input Authority Principle

In previous iterations, isolated listeners created competing transcriptions and uncoordinated audio captures.

The **Shared Conversation Pipeline** enforces a single entry point for all human inputs:
```
Microphone (Web Audio) / Text (CLI/Chat) / Screen OCR / Hand Gestures
                             │
                             ▼
              Shared Input Gateway (shared_pipeline.py)
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   Language Canonicalizer           Pronoun Resolution
   (TE, HI, TA, EN script)          (DialogueStateTracker)
            │                                 │
            └────────────────┬────────────────┘
                             ▼
                    Perception Event Bus
                    (backend/app/core/event_bus.py)
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
     Master LLM         LLM Council      Frontend Telemetry
    (abhi:latest)      (Deliberation)     (/ws/telemetry)
```

---

## 2. Multilingual Support & Canonical Intent Mapping

Implemented in `backend/app/perception/audio/canonicalizer.py`:

- **Script Block Auto-Detection:**
  - Telugu: `0x0C00` – `0x0C7F` (`te`)
  - Hindi / Devanagari: `0x0900` – `0x097F` (`hi`)
  - Tamil: `0x0B80` – `0x0BFF` (`ta`)
  - English / Latin: ASCII (`en`)
- **Normalized Intent Envelope:**
  Regardless of whether Mamu speaks *"Open notepad"*, *"నోట్‌పాడ్ ఓపెన్ చేయి"*, *"खोलो नोटपैड"*, or *"நோட்பேட் திற"*, the pipeline normalizes the command into `OPEN_APPLICATION: notepad` with slot extraction.

---

## 3. Conversational Continuity & Pronoun Grounding

- **8-Second Follow-Up Window:**
  `DialogueStateTracker` retains the active entity stack.
- **Demonstrative Pronoun Resolution:**
  Phrases like *"Pause it"*, *"Click that"*, *"Play this"* resolve immediately to the entity active on screen or in media playback (e.g., resolving *"pause it"* -> *"Devara Trailer"*).
- **Continuous Barge-In:**
  New incoming user speech triggers an event that cancels running voice playback or dispatches a cooperative `CancellationToken` to non-essential background processes.
