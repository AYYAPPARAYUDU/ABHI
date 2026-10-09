# ABHI Multi-Agent Network Architecture
**Phase 9 Stage 3 Specification & Technical Documentation**

## 1. Network Topology & Registered Capabilities
The Multi-Agent Network workspace (`/network`) visualizes the real underlying agent ecosystem. No imaginary or synthetic agents are rendered. The topology derives from `MultiAgentNetworkService` exposing 9 registered capabilities:

| Node ID | Agent Name | Primary Responsibility | Registered Capabilities |
| :--- | :--- | :--- | :--- |
| `supervisor` | Authoritative Supervisor | Central goal resolution, planning, arbitration & recovery | `plan_dag`, `arbitrate_resources`, `verify_result`, `recover_workflow` |
| `rag_agent` | RAG Knowledge Agent | Vector similarity retrieval & document indexing | `vector_search`, `document_chunking`, `hybrid_search`, `lancedb_query` |
| `memory_agent` | Episodic Memory Agent | Long-term episodic summaries & procedural memory | `store_episodic`, `retrieve_context`, `update_profile`, `sqlite_wal_sync` |
| `coding_agent` | Coding & File Agent | Sandboxed file ops, syntax validation & AST inspection | `safe_read`, `safe_write`, `ast_inspect`, `syntax_validate` |
| `os_desktop_agent` | OS & Desktop Automation | Windows UIA, window focus & application control | `launch_app`, `focus_window`, `send_keys`, `click_ui_element` |
| `browser_agent` | Browser Automation Agent | Web navigation & DOM data extraction via Playwright | `navigate_url`, `dom_query`, `extract_text`, `fill_form` |
| `media_studio_agent`| Media & Creative Production | Local image editing, video composition & audio TTS | `generate_image`, `edit_image`, `compose_video`, `render_audio` |
| `perception_agent` | Perception & Vision Agent | Real-time OCR screen grounding & gesture tracking | `ocr_screen`, `ground_coordinates`, `detect_face`, `track_hands` |
| `evaluation_agent` | Model Evolution & Verification| Daily benchmark testing & candidate attestation | `benchmark_run`, `evaluate_candidate`, `detect_regression`, `attest_lineage` |

---

## 2. Directed Dependency Graph
Nodes communicate via authoritative workflow handoffs:
- `supervisor` → `rag_agent`
- `supervisor` → `memory_agent`
- `supervisor` → `coding_agent`
- `supervisor` → `os_desktop_agent`
- `supervisor` → `browser_agent`
- `supervisor` → `media_studio_agent`
- `supervisor` → `perception_agent`
- `supervisor` → `evaluation_agent`
- `os_desktop_agent` → `perception_agent`
- `media_studio_agent` → `evaluation_agent`

---

## 3. Node State Machine & Inspector
Each node reflects one of the authoritative lifecycle states:
`IDLE`, `READY`, `ACTIVE`, `WAITING`, `RESOURCE_BLOCKED`, `VERIFYING`, `COMPLETED`, `FAILED`, `DISABLED`.

Selecting any node in the 3D canvas reveals the Node Inspector with verified outcomes, live resource consumption, and actionable diagnostics without exposing low-level internal IDs in User Mode.
