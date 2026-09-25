"""Integration tests for FastAPI task dispatch and status endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app
from backend.app.services.memory.database import init_db


@pytest.mark.asyncio
async def test_submit_task_endpoint():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {"goal": "search architecture specifications"}
        res = await client.post("/api/v1/tasks", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "task_id" in data
        assert data["goal"] == "search architecture specifications"
        assert data["state"] in ["PLANNING", "DISPATCHING", "COMPLETED"]

        task_id = data["task_id"]
        # Fetch task status
        res_get = await client.get(f"/api/v1/tasks/{task_id}")
        assert res_get.status_code == 200
        data_get = res_get.json()
        assert data_get["task_id"] == task_id


@pytest.mark.asyncio
async def test_cancel_task_endpoint():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/tasks", json={"goal": "cancelable goal"})
        task_id = res.json()["task_id"]

        # Cancel endpoint
        res_cancel = await client.post(f"/api/v1/tasks/{task_id}/cancel")
        assert res_cancel.status_code == 200
        assert res_cancel.json()["status"] == "cancelled"
