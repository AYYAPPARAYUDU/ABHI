# Browser Skill Architecture — Phase 7 Stage 7.3

## 1. Executive Summary

Phase 7 Stage 7.3 establishes a comprehensive, secure, and extensible **Browser Skill Ecosystem** around the existing Playwright Browser Worker for the ABHI Local-First Personal AI Computer Automation System.

The fundamental security principle governing this stage is:
```text
WEB PAGE ≠ SYSTEM INSTRUCTION
```
Web pages, DOM trees, ARIA labels, visual tokens, and downloaded artifacts are treated strictly as **untrusted data** and can never authorize actions, alter risk levels, bypass consent gates, disable emergency stops, or execute arbitrary privileged commands.

---

## 2. Browser Skill Flow & Supervision

```text
User Goal
   ↓
Supervisor
   ↓
DAG Planner
   ↓
Skill Discovery (browser.<capability>@1.0.0)
   ↓
Policy & Risk Engine
   ↓
Execution Lease Validation
   ↓
Browser Session Isolation
   ↓
DOM / Accessibility Grounding (Level 1)
   ↓
Visual / OCR Fallback (Level 2 / 3)
   ↓
Browser Action Execution (Sandboxed Thread)
   ↓
Observation & Freshness Validation (PageIdentity)
   ↓
Postcondition Verification
   ↓
Checkpointing (Idempotent Journal)
   ↓
Recovery / Bounded Replan (if needed)
   ↓
Structured Result (Untrusted-Content Labeled)
```

---

## 3. Registered Browser Capabilities

The browser skill adapter registers 19 formal browser skills in `SkillRegistry` with exact schemas, risk tiers, and verification policies:

| Skill ID | Capability | Risk Tier | Default Permissions | Verification Policy |
|---|---|---|---|---|
| `browser.open_url@1.0.0` | `open_url` | LOW | `BROWSER_NAVIGATE` | `URL_ORIGIN_MATCH` |
| `browser.navigate@1.0.0` | `navigate` | LOW | `BROWSER_NAVIGATE` | `URL_ORIGIN_MATCH` |
| `browser.go_back@1.0.0` | `go_back` | LOW | `BROWSER_NAVIGATE` | `PAGE_STATE_CHANGED` |
| `browser.go_forward@1.0.0` | `go_forward` | LOW | `BROWSER_NAVIGATE` | `PAGE_STATE_CHANGED` |
| `browser.reload@1.0.0` | `reload` | LOW | `BROWSER_NAVIGATE` | `PAGE_RELOADED` |
| `browser.read_page@1.0.0` | `read_page` | READ_ONLY | `BROWSER_READ` | `PAGE_EXTRACTED` |
| `browser.find_element@1.0.0` | `find_element` | READ_ONLY | `BROWSER_READ` | `ELEMENT_LOCATED` |
| `browser.click@1.0.0` | `click` | LOW | `BROWSER_CONTROL` | `DOM_STATE_MUTATED` |
| `browser.type@1.0.0` | `type` | MEDIUM | `BROWSER_CONTROL` | `INPUT_VALUE_MATCH` |
| `browser.clear@1.0.0` | `clear` | LOW | `BROWSER_CONTROL` | `INPUT_CLEARED` |
| `browser.select_option@1.0.0` | `select_option` | LOW | `BROWSER_CONTROL` | `OPTION_SELECTED` |
| `browser.press_key@1.0.0` | `press_key` | LOW | `BROWSER_CONTROL` | `KEY_PROCESSED` |
| `browser.scroll@1.0.0` | `scroll` | LOW | `BROWSER_CONTROL` | `VIEWPORT_SCROLLED` |
| `browser.take_screenshot@1.0.0` | `take_screenshot` | READ_ONLY | `SCREEN_CAPTURE` | `SCREENSHOT_CAPTURED` |
| `browser.wait_for_condition@1.0.0` | `wait_for_condition` | LOW | `BROWSER_READ` | `CONDITION_MET` |
| `browser.extract_text@1.0.0` | `extract_text` | READ_ONLY | `BROWSER_READ` | `TEXT_EXTRACTED` |
| `browser.extract_links@1.0.0` | `extract_links` | READ_ONLY | `BROWSER_READ` | `LINKS_EXTRACTED` |
| `browser.download@1.0.0` | `download` | MEDIUM | `BROWSER_DOWNLOAD` | `FILE_DOWNLOADED_VERIFIED` |
| `browser.search@1.0.0` | `search` | LOW | `BROWSER_NAVIGATE`, `BROWSER_CONTROL` | `SEARCH_COMPLETED` |

---

## 4. Multi-Page & Session Isolation

1. **Task-Bound Sessions**: Each task execution generates an isolated `BrowserSession` identified by `session_id`, `task_id`, and `execution_id`.
2. **Deterministic Page Identity**: `PageIdentity` computes a cryptographic signature combining canonical URL, origin, title, and timestamp, issuing a unique `freshness_token` (`tok_<sig>_<ts>`).
3. **Stale Observation Defense**: If the page mutates materially between observation and action, `STALE_BROWSER_OBSERVATION` triggers a re-grounding and re-observation cycle rather than executing on stale element locators.
4. **No Privilege Boundary Leakage**: Neither `page.evaluate()` nor raw JavaScript injection are ever exposed to the LLM planner.

---

## 5. Grounding Hierarchy & Ambiguity Resolution

1. **Accessibility Semantics (Level 1)**: Primary resolution uses `role`, accessible name, and ARIA labels.
2. **Stable DOM Attributes (Level 2)**: Falls back to `test_id`, `id`, `name`, `placeholder`, and text locators.
3. **Visual / OCR Grounding (Level 3)**: Resolves coordinates via multimodal perception with `FallbackDecisionTrace`.
4. **Ambiguity Gate**: Multiple matching elements without unique disambiguation trigger `GROUNDING_AMBIGUOUS` and fail closed, preventing unintended side-effects.

---

## 6. Recovery & Checkpointing Integration

- **Dual-State Verification**: Every consequential browser action requires pre- and post-condition verification.
- **Incremental Checkpoints**: Checkpoints persist verified state, action IDs, and DAG node outputs into the execution journal.
- **Crash Reconciliation**: Upon worker fault, the session state is reconciled, relaunching the headless worker and re-observing the current state without replaying already verified side-effecting steps.
