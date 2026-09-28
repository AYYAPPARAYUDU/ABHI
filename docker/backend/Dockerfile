# ==============================================================================
# ABHI BACKEND DOCKERFILE - FASTAPI GATEWAY & COGNITIVE CORE
# Minimal, secure, non-root Python 3.12 production container
# ==============================================================================

FROM python:3.12-slim AS runtime

# Set deterministic Python runtime variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    APP_ENV=production \
    APP_DEBUG=false \
    APP_HOST=0.0.0.0 \
    APP_PORT=8000

WORKDIR /app

# Install minimal OS dependencies for SQLite, OpenCV headless, LanceDB and Healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root runtime user and group for security compliance
RUN groupadd -g 10001 abhi && \
    useradd -u 10001 -g abhi -s /bin/bash -m abhiuser

# Install pinned Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application codebase
COPY backend /app/backend

# Create required persistent storage and log directories with appropriate non-root ownership
RUN mkdir -p /app/database/relational /app/database/vector /app/database/media /app/database/memory /app/database/migrations /app/logs && \
    chown -R abhiuser:abhi /app

# Switch to non-root user
USER abhiuser

# Expose backend REST & WebSocket port
EXPOSE 8000

# Health check verifying API Gateway and database readiness
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://127.0.0.1:8000/api/v1/health || exit 1

# Graceful startup via uvicorn ASGI server
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
