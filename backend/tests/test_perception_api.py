"""Integration tests for FastAPI Perception API endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app


@pytest.mark.asyncio
async def test_perception_status():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/perception/status")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "OPERATIONAL"
        assert "audio" in data
        assert "vision" in data


@pytest.mark.asyncio
async def test_perception_transcribe():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/perception/transcribe",
            json={"language": "en"}
        )
        assert res.status_code == 200
        data = res.json()
        assert "text" in data
        assert data["confidence"] > 0.8


@pytest.mark.asyncio
async def test_perception_canonicalize():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/perception/canonicalize",
            json={"text": "ఓపెన్ బ్రౌజర్"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["detected_language"] == "te"
        assert "open" in data["canonical_intent"].lower()


@pytest.mark.asyncio
async def test_perception_vision_face_and_hand():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Face endpoint
        res_face = await client.post(
            "/api/v1/perception/vision/face",
            json={"frame_width": 640, "frame_height": 480}
        )
        assert res_face.status_code == 200
        face_data = res_face.json()
        assert face_data["face_detected"] is True
        assert face_data["landmarks_count"] == 468

        # Hand endpoint
        res_hand = await client.post(
            "/api/v1/perception/vision/hand",
            json={"frame_width": 640, "frame_height": 480}
        )
        assert res_hand.status_code == 200
        hand_data = res_hand.json()
        assert hand_data["hand_detected"] is True
        assert hand_data["landmarks_count"] == 21


@pytest.mark.asyncio
async def test_perception_screen_ocr():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post(
            "/api/v1/perception/vision/screen_ocr",
            json={"image_width": 1920, "image_height": 1080}
        )
        assert res.status_code == 200
        ocr_data = res.json()
        assert ocr_data["image_width"] == 1920
        assert len(ocr_data["detected_elements"]) > 0
