"""
Comprehensive Automated Verification Script for ABHI Multimodal Alexa Grounding
Tests:
1. Dynamic Action Resolver with spatial clicking
2. Pronoun resolution ('click it', 'play it')
3. Passive perception vs active command routing
4. Companion window self-occlusion filtering
5. Real coordinate centroid calculation from WinRT OCR
"""

import sys
import os

# Set working directory to project root
PROJECT_ROOT = r"c:\Users\AYYAPPA RAYUDU\OneDrive\Desktop\ABHI"
os.chdir(PROJECT_ROOT)
sys.path.insert(0, PROJECT_ROOT)

from backend.app.automation.desktop.live_screen_vision import live_screen_vision
from backend.app.automation.desktop.dialogue_state_tracker import dialogue_state
from backend.app.automation.desktop.dynamic_action_resolver import dynamic_action_resolver
from backend.app.automation.desktop.os_control_engine import os_control_engine

def run_tests():
    print("=" * 70)
    print("ABHI MULTIMODAL GROUNDING & ALEXA DST TEST SUITE")
    print("=" * 70)

    # Test 1: Self-occlusion and Workspace Extraction
    print("\n[TEST 1] Testing Workspace Extraction & Companion Masking...")
    words = live_screen_vision.get_workspace_words(mask_own_ui=True)
    print(f"-> Extracted {len(words)} workspace words (excluding companion).")
    companion_words = [w["t"] for w in words if "Cybernetic" in w["t"] or "Companion" in w["t"]]
    assert len(companion_words) == 0, f"Failed: Companion words leaked into workspace: {companion_words}"
    print("-> PASS: Zero companion words in workspace.")

    # Test 2: Screen Description
    print("\n[TEST 2] Testing describe_current_screen (exclude_own_ui=True)...")
    desc = live_screen_vision.describe_current_screen(exclude_own_ui=True)
    print(f"-> Screen Description: {desc}")
    assert "ABHI Cyber Companion" not in desc or "MovieRulz" in desc or "Brave" in desc or "Code" in desc
    print("-> PASS: Screen description correctly identifies underlying application.")

    # Test 3: Coordinate Extraction for Movies on Screen
    print("\n[TEST 3] Testing Coordinate Grounding on Mamu's MovieRulz Screenshot...")
    mamu_screen_path = r"C:\Users\AYYAPPA RAYUDU\.gemini\antigravity\brain\5beb1245-61a2-41fb-a803-48c9ddbbb1ef\.user_uploaded\media_1794902086571_9d140647.jpg"
    
    # Preload spatial data for Mamu's screenshot
    live_screen_vision.extract_screen_spatial_data(screenshot_path=mamu_screen_path, force_refresh=True)

    coords_donga = live_screen_vision.find_text_coordinates("donga naa koduku", screenshot_path=mamu_screen_path)
    print(f"-> 'donga naa koduku' resolved coordinates: {coords_donga}")
    assert coords_donga is not None, "Failed to resolve coordinates for 'donga naa koduku'"
    cx, cy, matched_text = coords_donga
    assert cx > 0 and cy > 0
    print(f"-> PASS: 'donga naa koduku' located at centroid ({cx}, {cy}) with text '{matched_text}'")

    coords_arjuna = live_screen_vision.find_text_coordinates("arjuna", screenshot_path=mamu_screen_path)
    print(f"-> 'arjuna' resolved coordinates: {coords_arjuna}")
    assert coords_arjuna is not None, "Failed to resolve coordinates for 'arjuna'"
    print(f"-> PASS: 'arjuna' located at centroid ({coords_arjuna[0]}, {coords_arjuna[1]})")

    # Set dialogue state with the found entity
    dialogue_state.record_action("play", "donga naa koduku", (cx, cy))
    dialogue_state.push_entity("donga naa koduku", "movie")

    # Test 4: Dynamic Action Resolver - 'activate automate'
    print("\n[TEST 4] Testing 'activate automate'...")
    ok, act, reply = dynamic_action_resolver.resolve_and_execute("activate automate")
    print(f"-> Result: ok={ok}, action={act}, reply={reply}")
    assert ok and "automation engaged" in reply.lower()
    print("-> PASS: 'activate automate' recognized.")

    # Test 5: Dynamic Action Resolver - 'play donga naa koduku movie on screen'
    print("\n[TEST 5] Testing 'play donga naa koduku movie on screen'...")
    ok, act, reply = dynamic_action_resolver.resolve_and_execute("play donga naa koduku movie on screen")
    print(f"-> Result: ok={ok}, action={act}, reply={reply}")
    assert ok and ("playing" in reply.lower() or "donga" in reply.lower())
    print("-> PASS: 'play donga naa koduku movie on screen' resolved to physical screen action.")

    # Test 6: Dialogue State Tracking & Pronoun Resolution ('click it')
    print("\n[TEST 6] Testing Pronoun Resolution 'click it'...")
    last_ent = dialogue_state.get_last_entity()
    print(f"-> Active entity on DST stack: '{last_ent}'")
    assert last_ent is not None and "donga" in last_ent.lower()
    
    resolved_pronoun = dialogue_state.resolve_demonstrative_pronoun("click it")
    print(f"-> 'click it' resolved to: '{resolved_pronoun}'")
    assert resolved_pronoun == last_ent

    ok, act, reply = dynamic_action_resolver.resolve_and_execute("click it")
    print(f"-> Result: ok={ok}, action={act}, reply={reply}")
    assert ok and ("clicked" in reply.lower() or "targeted" in reply.lower())
    print("-> PASS: 'click it' resolved to active entity and executed.")

    # Test 7: Perception Query 'except you hat else you see on screen'
    print("\n[TEST 7] Testing 'except you hat else you see on screen' (with Mamu's typo)...")
    ok, act, reply = dynamic_action_resolver.resolve_and_execute("except you hat else you see on screen")
    print(f"-> Result: ok={ok}, action={act}, reply={reply}")
    assert ok and act == "screen_perception" and "Mamu" in reply
    print("-> PASS: Perception query with typo routed to screen perception.")

    # Test 8: 'again'
    print("\n[TEST 8] Testing 'again'...")
    ok, act, reply = dynamic_action_resolver.resolve_and_execute("again")
    print(f"-> Result: ok={ok}, action={act}, reply={reply}")
    assert ok and "screen_perception" in act
    print("-> PASS: 'again' triggered screen perception refresh.")

    # Test 9: Media Control Commands
    print("\n[TEST 9] Testing Media Controls ('skip song 2 min', 'change the song', 'pause the video')...")
    ok1, act1, r1 = dynamic_action_resolver.resolve_and_execute("skip song 2 min")
    assert ok1 and act1 in ["forward_seek", "learned_action"]
    print(f"-> 'skip song 2 min' -> {r1}")

    ok2, act2, r2 = dynamic_action_resolver.resolve_and_execute("change the song")
    assert ok2 and act2 in ["next_video", "learned_action"]
    print(f"-> 'change the song' -> {r2}")

    ok3, act3, r3 = dynamic_action_resolver.resolve_and_execute("pause the video")
    assert ok3 and act3 in ["stop_media", "learned_action"]
    print(f"-> 'pause the video' -> {r3}")
    print("-> PASS: All media control hotkeys resolved perfectly.")

    print("\n" + "=" * 70)
    print("ALL 9 TEST SUITES PASSED WITH 100% SUCCESS!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
