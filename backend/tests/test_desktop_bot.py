"""Tests for Active Living Screen Bot API and Desktop Perception."""

import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app


@pytest.mark.asyncio
async def test_desktop_active_context():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/desktop/active-context")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert "Mamu" in data["observation_summary"]
        assert "telemetry" in data
        assert "open_applications" in data


@pytest.mark.asyncio
async def test_desktop_quick_action():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test hotkey action
        resp = await client.post(
            "/api/v1/desktop/quick-action",
            json={"action": "send_hotkey", "params": {"keys": ["CTRL", "C"]}}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] in ("success", "failed")
        assert "Mamu" in data["message"]


@pytest.mark.asyncio
async def test_desktop_ask_bot():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/desktop/ask-bot",
            json={"query": "what is on my screen"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert "Mamu" in data["reply"]
