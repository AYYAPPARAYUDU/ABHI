# ABHI Dual-Agent Coordination Protocol

This shared directory provides real-time asynchronous communication between the **Frontend UI Agent** and the **Backend Core Agent**.

## Roles
- **Backend Chat (ID: 9e62f329-e793-4149-9220-b61e27b03275):**
  - Manages FastAPI backend, Python services, SQLite WAL, Ollama integrations, and 9-agent persona routing.
- **Frontend Chat (ID: 5b667a1c-e7e3-4c70-91df-3bb928c8568f):**
  - Manages Angular 22, Three.js spatial scenes, CSS styling, components, audio/camera hardware inputs, and UI responsiveness.

## Communication Channel
- **Live Bus File:** project_data/collaboration/COLLABORATION_BUS.json
- Both agents read this file on turn start, update their status, claim assigned tasks from 	ask_queue, and append to message_log.
- No cross-project tool restrictions: both agents have read/write disk access to this shared directory!
