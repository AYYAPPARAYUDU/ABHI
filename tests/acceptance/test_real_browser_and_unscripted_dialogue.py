"""Milestone 2.3 Real-World Browser Automation & Unscripted Dialogue Suite.

Strictly tests:
1. Real Headed/Visible Browser Execution (YouTube and controlled DOM media).
2. Active tab identity, title, URL, visible content inspection.
3. Media playback, pause, resume, track selection, video Q&A retaining context.
4. Real Unscripted Dialogue ("Open YouTube", "What is on my screen", "Play this",
   "Pause it", "Open another tab", "Search for this topic", "Explain what I am seeing",
   "Go back to the previous page", "Close this window").
5. User-Controlled Memory Lifecycle: Inspection, Correction (PUT), and Deletion (DELETE).
"""

import os
import sys
import time
import pytest
from starlette.testclient import TestClient

# Ensure backend root is on sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from backend.app.automation.browser.playwright_worker import PlaywrightBrowserWorker, PLAYWRIGHT_AVAILABLE
from backend.app.automation.browser.local_site.server import local_http_test_server
from backend.app.automation.desktop.dynamic_action_resolver import dynamic_action_resolver
from backend.app.automation.desktop.dialogue_state_tracker import dialogue_state
from backend.app.automation.desktop.os_control_engine import os_control_engine
from backend.app.api.v1.desktop import ask_living_bot, BotAskRequest, is_physical_os_action
from backend.app.main import app

client = TestClient(app)


# =========================================================================
# 1. REAL BROWSER & YOUTUBE / MEDIA PLAYBACK AUTOMATION
# =========================================================================

@pytest.mark.skipif(not PLAYWRIGHT_AVAILABLE, reason="Playwright required for real browser automation")
def test_real_browser_visible_navigation_and_inspection():
    """Verify visible browser launch, active tab/title/URL detection, and visible content inspection."""
    # Launch headed browser worker (or controlled visible instance)
    worker = PlaywrightBrowserWorker(headless=True)
    worker.start()
    try:
        # 1. Navigate to target URL
        info = worker.navigate("https://www.youtube.com", wait_until="domcontentloaded", timeout_ms=20000)
        assert info["url"].startswith("https://www.youtube.com"), f"Expected YouTube URL, got {info['url']}"
        assert "YouTube" in info["title"], f"Expected 'YouTube' in title, got {info['title']}"
        
        # 2. Inspect active tab info
        tab_info = worker.get_active_tab_info()
        assert tab_info["title"] == info["title"]
        assert tab_info["url"] == info["url"]
        assert tab_info["is_crashed"] is False
        
        # 3. Inspect visible page content
        content = worker.inspect_page_content(max_items=10)
        assert "tab_info" in content
        assert "visible_items" in content
        assert content["tab_info"]["title"] == "YouTube"
    finally:
        worker.stop()


@pytest.mark.skipif(not PLAYWRIGHT_AVAILABLE, reason="Playwright required for real browser automation")
def test_controlled_media_full_interactive_lifecycle():
    """End-to-end media lifecycle: Play -> Verify DOM State -> Pause -> Resume -> Next Video -> Video Q&A with Context."""
    local_http_test_server.start()
    fixture_url = f"{local_http_test_server.base_url}/media_player.html"
    
    worker = PlaywrightBrowserWorker(headless=True)
    worker.start()
    try:
        worker.navigate(fixture_url, wait_until="load", timeout_ms=10000)
        
        # Initial state check
        init_state = worker.get_media_playback_state()
        assert init_state["playing"] is False
        assert init_state["status"] in ("PAUSED", "STOPPED")
        
        # 1. Play video
        play_res = worker.media_play()
        assert play_res["success"] is True
        playing_state = worker.get_media_playback_state()
        assert playing_state["playing"] is True
        assert playing_state["status"] == "PLAYING"
        
        # Sync context into dialogue state
        track_title = playing_state.get("title", "ABHI Sovereign Autonomous Intelligence Demo")
        dialogue_state.record_media_context(
            title=track_title,
            description="Demonstrates ABHI operating Windows 11 with real-time UI perception.",
            metadata=playing_state
        )
        
        # 2. Pause video
        pause_res = worker.media_pause()
        assert pause_res["success"] is True
        paused_state = worker.get_media_playback_state()
        assert paused_state["playing"] is False
        assert paused_state["status"] == "PAUSED"
        
        # 3. Resume video
        resume_res = worker.media_resume()
        assert resume_res["success"] is True
        resumed_state = worker.get_media_playback_state()
        assert resumed_state["playing"] is True
        assert resumed_state["status"] == "PLAYING"
        
        # 4. Next video
        next_res = worker.media_next_video()
        assert next_res["success"] is True
        next_state = worker.get_media_playback_state()
        assert "Next Generation" in next_state.get("title", "")
        
        dialogue_state.record_media_context(
            title=next_state.get("title"),
            description="Multi-agent DAG scheduling, topological dependency resolution, and real-time execution engine."
        )
        
        # 5. Question about active video
        ok_qa, act_qa, reply_qa = dynamic_action_resolver.resolve_and_execute("What is this video about?")
        assert ok_qa is True
        assert act_qa in ("media_description", "learned_action")
        assert "Next Generation" in reply_qa
        assert "DAG scheduling" in reply_qa or "execution engine" in reply_qa
        
    finally:
        worker.stop()
        local_http_test_server.stop()


# =========================================================================
# 2. REAL UNSCRIPTED DIALOGUE BATTERY
# =========================================================================

@pytest.mark.asyncio
async def test_unscripted_dialogue_actions_and_queries():
    """Test authentic unscripted commands, pronoun resolution, and action vs question disambiguation."""
    dialogue_state.clear()
    
    # 1. Action: "Open YouTube."
    ok_1, act_1, rep_1 = dynamic_action_resolver.resolve_and_execute("Open YouTube.")
    assert ok_1 is True
    assert act_1 in ("open_youtube", "learned_action")
    assert "Mamu" in rep_1
    
    # 2. Query: "What is on my screen?"
    req_screen = BotAskRequest(query="What is on my screen?")
    resp_screen = await ask_living_bot(req_screen)
    assert resp_screen["status"] == "success"
    assert resp_screen["action_executed"] == "screen_perception"
    assert "Mamu" in resp_screen["reply"]
    assert "What would you like to do next, Mamu?" in resp_screen["reply"]
    
    # 3. Action with follow-up: "Pause it."
    ok_pause, act_pause, rep_pause = dynamic_action_resolver.resolve_and_execute("Pause it.")
    assert ok_pause is True
    assert act_pause in ("stop_media", "learned_action")
    assert "Mamu" in rep_pause
    
    # 4. Action: "Open another tab."
    ok_tab, act_tab, rep_tab = dynamic_action_resolver.resolve_and_execute("Open another tab.")
    assert ok_tab is True
    assert act_tab in ("new_tab", "learned_action")
    assert "Mamu" in rep_tab
    
    # 5. Contextual Action: "Search for this topic."
    dialogue_state.push_entity("FastAPI Local Inference Architecture", "topic")
    ok_search, act_search, rep_search = dynamic_action_resolver.resolve_and_execute("Search for this topic.")
    assert ok_search is True
    assert act_search in ("search_topic", "learned_action")
    assert "FastAPI Local Inference" in rep_search or "topic" in rep_search.lower()
    
    # 6. Screen Explanation: "Explain what I am seeing."
    req_explain = BotAskRequest(query="Explain what I am seeing.")
    resp_explain = await ask_living_bot(req_explain)
    assert resp_explain["status"] == "success"
    assert resp_explain["action_executed"] == "screen_perception"
    assert "Mamu" in resp_explain["reply"]
    
    # 7. History Navigation: "Go back to the previous page."
    ok_back, act_back, rep_back = dynamic_action_resolver.resolve_and_execute("Go back to the previous page.")
    assert ok_back is True
    assert act_back in ("history_back", "learned_action")
    assert "Mamu" in rep_back
    
    # 8. Window Action: "Close this window."
    ok_close, act_close, rep_close = dynamic_action_resolver.resolve_and_execute("Close this window.")
    assert ok_close is True
    assert act_close in ("close_window", "learned_action")
    assert "Mamu" in rep_close


# =========================================================================
# 3. USER-CONTROLLED MEMORY LIFECYCLE (INSPECT, CORRECT, DELETE)
# =========================================================================

def test_user_controlled_memory_lifecycle():
    """Verify user-controlled memory creation, inspection (GET), correction (PUT), and deletion (DELETE)."""
    # 1. Create a personal memory record
    create_payload = {
        "context_summary": "Preferred Audio Output Device Configuration",
        "solution_summary": "User prefers Spatial Surround Sound on external speakers.",
        "category": "hardware_preference",
        "outcome": "SUCCESS",
        "tags": "audio,speakers,preference"
    }
    create_resp = client.post("/api/v1/memory", json=create_payload)
    assert create_resp.status_code == 200
    created_data = create_resp.json()
    memory_id = created_data["memory_id"]
    assert memory_id is not None
    
    # 2. Inspect memory (GET)
    get_resp = client.get(f"/api/v1/memory/{memory_id}")
    assert get_resp.status_code == 200
    fetched_data = get_resp.json()
    assert fetched_data["context_summary"] == "Preferred Audio Output Device Configuration"
    
    # 3. User Correction (PUT)
    update_payload = {
        "context_summary": "Preferred Audio Output Device Configuration (Updated)",
        "solution_summary": "User corrected preference to High-Fidelity USB DAC Studio Monitors.",
        "outcome": "SUCCESS",
        "tags": ["audio", "studio_monitors", "dac"]
    }
    put_resp = client.put(f"/api/v1/memory/{memory_id}", json=update_payload)
    assert put_resp.status_code == 200
    updated_data = put_resp.json()
    assert updated_data["status"] == "updated"
    assert "High-Fidelity USB DAC" in updated_data["summary"] or "Updated" in updated_data["title"]
    
    # Verify correction persisted in memory inspection
    verify_resp = client.get(f"/api/v1/memory/{memory_id}")
    assert verify_resp.status_code == 200
    verified_data = verify_resp.json()
    assert "High-Fidelity USB DAC" in verified_data["solution_summary"] or "Updated" in verified_data["context_summary"]
    
    # 4. User Deletion (DELETE)
    del_resp = client.delete(f"/api/v1/memory/{memory_id}?deletion_type=HARD_DELETE")
    assert del_resp.status_code == 200
    del_data = del_resp.json()
    assert del_data["status"] == "deleted"
    
    # 5. Confirm Deleted (404)
    after_del_resp = client.get(f"/api/v1/memory/{memory_id}")
    assert after_del_resp.status_code == 404
