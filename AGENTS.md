# ABHI — Autonomous Engineering Workspace Rules

**Repository Root:** `C:\Users\AYYAPPA RAYUDU\OneDrive\Desktop\ABHI`  
**Core Stack:** Angular 22, Three.js, FastAPI, Python 3.14, Ollama, SQLite WAL, Windows UI Automation, Playwright.  

---

## 1. Core Architectural Laws & Flow
1. **Local-First & Safety:** All inference, memory, RAG, perception, and OS execution operate locally.
2. **Approved Execution Chain:**  
   `User Voice/Text -> Gateway (/api/v1/agent-gateway/) -> CentralSupervisor -> TaskPlanner -> AgentRegistry -> Adapters -> Windows OS Action -> DualStateVerifier -> SQLite WAL -> Telemetry -> Reactive UI`
3. **Dual-State Physical Verification:** Actions must physically succeed in observed system state before marking tasks `COMPLETED`. No fake success, simulated passes, or synthetic metrics are permitted.

---

## 2. Main Agent UI & Visual Direction
1. **Zero Permanent Sidebar on Main Agent:** The Main Agent screen (`/home`) is a full-viewport spatial 3D workspace. Secondary workspaces (`/network`, `/intelligence`, `/business`, `/media`) are accessed contextually.
2. **Real Three.js WebGL Scene:** The main visual subject is the living 3D intelligence core with rotating orbital rings, 750+ spatial particles, and dynamic neural synapse interconnects.
3. **Dark Neumorphic Controls:** Interactive DOM surfaces use soft dual shadows, inset text inputs, fine borders, tactile buttons, and controlled cyan/amethyst glow.
4. **Two Full Themes + Customizer:** Obsidian Cyan (default) and Midnight Amethyst presets with synchronized Three.js scene colors and persistent local storage.

---

## 3. Mandatory Engineering Workflow
1. **Iteration Loop:** `INSPECT -> DESIGN -> IMPLEMENT -> BUILD -> RUN -> OBSERVE -> TEST -> SCORE -> REPAIR -> RETEST`.
2. **Continuous Verification:** After every major component change:
   - Run unit/integration tests (`npm test` and `pytest`).
   - Run production build (`npm run build`).
   - Open and inspect the running app (`http://127.0.0.1:4200/`).
3. **Preserve User Code & History:** Never use destructive Git commands (`git reset --hard`, force push, blanket deletions).
4. **Memory Continuity:** Keep `project_data/status/ABHI_IMPLEMENTATION_MEMORY.md` and `project_data/status/ABHI_IMPLEMENTATION_QUEUE.md` updated at every milestone.
