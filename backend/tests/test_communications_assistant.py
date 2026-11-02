"""Integration & Unit Tests for Human-Brain Assistant & Communications Subsystem."""

import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app


@pytest.mark.asyncio
async def test_communications_profile_lifecycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch initial profile
        res_get = await client.get("/api/v1/assistant/profile")
        assert res_get.status_code == 200
        get_data = res_get.json()
        assert get_data["success"] is True
        assert "profile" in get_data

        # 2. Save profile
        payload = {
            "email": "operator.lead@abhi-systems.internal",
            "phone_number": "+1 (555) 789-0123",
            "whatsapp_enabled": True,
            "auto_reply_mode": "HUMAN_CONFIRMATION",
            "monitored_threads": ["vip_client", "project_alpha"]
        }
        res_post = await client.post("/api/v1/assistant/profile", json=payload)
        assert res_post.status_code == 200
        post_data = res_post.json()
        assert post_data["success"] is True
        assert post_data["is_configured"] is True
        assert post_data["profile"]["email"] == payload["email"]
        assert post_data["profile"]["phone_number"] == payload["phone_number"]

        # 3. Verify persistence
        res_check = await client.get("/api/v1/assistant/profile")
        assert res_check.status_code == 200
        check_data = res_check.json()
        assert check_data["is_configured"] is True
        assert check_data["profile"]["email"] == payload["email"]


@pytest.mark.asyncio
async def test_messages_inbox_and_reply_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch inbox
        res_inbox = await client.get("/api/v1/assistant/messages/inbox")
        assert res_inbox.status_code == 200
        inbox_data = res_inbox.json()
        assert inbox_data["success"] is True
        assert "messages" in inbox_data
        assert len(inbox_data["messages"]) > 0

        first_msg = inbox_data["messages"][0]

        # 2. Generate 3 human-like context-aware reply suggestions
        suggest_req = {
            "message_id": first_msg["message_id"],
            "sender": first_msg["sender"],
            "content": first_msg["body"],
            "channel": first_msg["channel"],
            "context": "Active system deployment in progress"
        }
        res_suggest = await client.post("/api/v1/assistant/messages/suggest-reply", json=suggest_req)
        assert res_suggest.status_code == 200
        suggest_data = res_suggest.json()
        assert suggest_data["success"] is True
        assert len(suggest_data["replies"]) == 3

        categories = [r["category"] for r in suggest_data["replies"]]
        assert any("Professional" in c or "Polite" in c for c in categories)
        assert any("Direct" in c or "Concise" in c for c in categories)
        assert any("Friendly" in c or "Warm" in c for c in categories)

        # 3. Dispatch chosen reply
        send_req = {
            "message_id": first_msg["message_id"],
            "channel": first_msg["channel"],
            "recipient": first_msg["sender"],
            "message": suggest_data["replies"][0]["text"],
            "subject": "Re: " + (first_msg.get("subject") or "System Update")
        }
        res_send = await client.post("/api/v1/assistant/messages/send", json=send_req)
        assert res_send.status_code == 200
        send_data = res_send.json()
        assert send_data["success"] is True
        assert send_data["recipient"] == first_msg["sender"]


@pytest.mark.asyncio
async def test_brain_meta_evaluation_and_upgrade():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Check brain status
        res_status = await client.get("/api/v1/assistant/brain/status")
        assert res_status.status_code == 200
        status_data = res_status.json()
        assert status_data["success"] is True
        assert "active_brain" in status_data

        # 2. Trigger evaluate and upgrade loop
        upgrade_req = {
            "forced_target_version": "v1.1-Self-Tuned",
            "eval_window_hours": 12
        }
        res_upg = await client.post("/api/v1/assistant/brain/evaluate-and-upgrade", json=upgrade_req)
        assert res_upg.status_code == 200
        upg_data = res_upg.json()
        assert upg_data["success"] is True
        assert upg_data["to_version"] == "v1.1-Self-Tuned"
        assert upg_data["alignment_score"] >= 0.60
        assert "parameter_diff" in upg_data

        # 3. Verify upgraded status
        res_after = await client.get("/api/v1/assistant/brain/status")
        assert res_after.status_code == 200
        after_data = res_after.json()
        assert after_data["active_brain"]["version"] == "v1.1-Self-Tuned"
        assert len(after_data["upgrade_history"]) >= 1
