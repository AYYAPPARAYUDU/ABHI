# Version Control & Git Strategy

## 1. Repository Scope & Ignored Assets

The Git repository tracks source code, schemas, configuration templates, tests, and documentation. Large binary assets, runtime databases, environment secrets, and virtual environments are strictly excluded.

### Core `.gitignore` Template Specification

```gitignore
# Virtual Environments & Python Cache
.venv/
venv/
env/
__pycache__/
*.py[cod]
*$py.class
.pytest_cache/
.coverage
htmlcov/

# Node & Frontend Build Artifacts
node_modules/
dist/
.angular/
.npm/

# Environment Secrets & Local Configurations
.env
.env.local
*.pem
*.key

# Runtime Databases & Media Storage
database/relational/*.db
database/relational/*.db-wal
database/relational/*.db-shm
database/memory/*.db
database/vector/
database/media/
database/backups/

# System Logs & Observability
logs/
*.log

# Operating System & IDE Artifacts
.vscode/
.idea/
Thumbs.db
Desktop.ini
.DS_Store
```

---

## 2. Branching & Commit Standards

* **Main Branch:** `main` (Production-grade, passing all tests).
* **Feature Branches:** `feature/<domain>-<description>` (e.g. `feature/phase2-fastapi-gateway`).
* **Conventional Commits:**
  - `feat:` New capability or endpoint.
  - `fix:` Bug fix or error resolution.
  - `docs:` Documentation or ADR addition in `project_data/`.
  - `test:` Adding or updating unit/integration tests.
  - `refactor:` Code refactoring without behavior modification.
