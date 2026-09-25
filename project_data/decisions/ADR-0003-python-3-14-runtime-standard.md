# ADR-0003: Python 3.14 Runtime Baseline and Dependency Standards

**Status:** ACCEPTED  
**Date:** 2026-09-25  
**Author:** Software Engineering & Architecture Team  

## 1. Context & Problem Statement
The development machine environment has Python 3.14.6 installed. Earlier preliminary documentation referenced Python 3.11/3.12 due to historical C-extension availability. We must establish a single authoritative runtime version for the project, verify dependency compatibility, and ensure deterministic reproducibility.

## 2. Decision
Formally establish **Python 3.14 (CPython 3.14.6)** as the active project runtime baseline across all backend components, virtual environments, configuration files (`pyproject.toml`), and documentation.

## 3. Alternatives Considered
* **Alternative 1: Force Downgrade to Python 3.11/3.12:** Evaluated and rejected because all core backend dependencies (`fastapi`, `uvicorn`, `pydantic`, `sqlalchemy`, `aiosqlite`, `greenlet`, `httpx`, `pytest`) have native precompiled Windows binary wheels that install and execute flawlessly on Python 3.14.6 with 100% test pass rate.
* **Alternative 2: Multi-version Ambiguity:** Rejected to avoid dependency resolution drift and developer confusion.

## 4. Rationale & Evidence
* Measured test execution on Python 3.14.6 virtualenv (`.venv`): 9 out of 9 unit and integration tests passed in 2.23s.
* Native Windows wheels for `greenlet-3.5.6-cp314`, `pydantic-core-2.46.5-cp314`, `httptools-0.8.0-cp314`, and `pyyaml-6.0.3-cp314` are verified stable.

## 5. Consequences & Tradeoffs
* **Positive:** Leverages latest CPython 3.14 performance improvements, modern typing syntax, and native host toolchain.
* **Tradeoff:** Future vision/ML libraries (e.g. MediaPipe, PyTorch) must be installed with compatible Python 3.14 binary wheels or isolated in specialized worker environments.

## 6. References
* [Backend pyproject.toml](file:///c:/Users/AYYAPPA%20RAYUDU/OneDrive/Desktop/ABHI/backend/pyproject.toml)
* [System Hardware Assessment](file:///c:/Users/AYYAPPA%20RAYUDU/OneDrive/Desktop/ABHI/project_data/hardware/system_hardware_assessment.md)
