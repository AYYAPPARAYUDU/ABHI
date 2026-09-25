# Dependency Policy & Package Governance

## 1. Principles for Dependency Inclusion

To avoid dependency bloat, security vulnerabilities, and conflicting C++ extensions on Windows:

1. **Strict Justification Mandate:** Every dependency must solve a concrete architectural requirement that cannot be cleanly achieved using Python/TypeScript standard libraries.
2. **Authoritative & Maintained Sources Only:** Only packages with active maintenance, clear permissive licenses (MIT, Apache 2.0, BSD), and verified Windows binary wheels are permitted.
3. **Zero Redundancy:** No duplicate libraries performing the same function (e.g. do not mix `httpx` and `requests` unless explicitly required; use `httpx` for async and standard client).

---

## 2. Phase 2 Approved Initial Dependency Manifest

### Backend Python Packages (Isolated `.venv`)

| Package Name | Pinned Version Range | Purpose | License | Authoritative Link |
| :--- | :--- | :--- | :--- | :--- |
| `fastapi` | `~=0.115.0` | High-performance async API gateway & WebSocket hub | MIT | https://fastapi.tiangolo.com/ |
| `uvicorn[standard]`| `~=0.32.0` | Production ASGI web server with uvloop/httptools | BSD-3 | https://www.uvicorn.org/ |
| `pydantic` | `~=2.9.0` | Schema validation, type safety, and settings management | MIT | https://docs.pydantic.dev/ |
| `pydantic-settings`| `~=2.5.0` | Environment variable parsing and `.env` loading | MIT | https://docs.pydantic.dev/latest/concepts/pydantic_settings/ |
| `sqlalchemy` | `~=2.0.35` | Async/sync ORM & core SQL query engine for SQLite | MIT | https://www.sqlalchemy.org/ |
| `alembic` | `~=1.13.0` | Relational database schema migrations | MIT | https://alembic.sqlalchemy.org/ |
| `httpx` | `~=0.27.0` | Async HTTP client for Ollama API communication | BSD-3 | https://www.python-httpx.org/ |
| `pytest` | `~=8.3.0` | Unit and integration test runner | MIT | https://docs.pytest.org/ |
| `pytest-asyncio` | `~=0.24.0` | Async testing support for FastAPI endpoints | Apache 2.0 | https://github.com/pytest-dev/pytest-asyncio |

### Frontend Node Packages (`package.json`)

| Package Name | Pinned Version Range | Purpose | License | Authoritative Link |
| :--- | :--- | :--- | :--- | :--- |
| `@angular/core` | `~22.0.0` | Modern reactive UI framework with Signals | MIT | https://angular.dev/ |
| `three` | `~0.170.0` | WebGL/WebGPU 3D graphics engine | MIT | https://threejs.org/ |
| `@types/three` | `~0.170.0` | TypeScript definitions for Three.js | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped |
| `bootstrap` | `~5.3.3` | Responsive layout grid and baseline utilities | MIT | https://getbootstrap.com/ |
