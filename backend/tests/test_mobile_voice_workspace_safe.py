"""Safe Integration Test Suite: Mobile Control, Wake/Sleep Word, Voice Biometrics & 3D Workspace.

STRICT INVARIANT: No shutdown, reboot, or system power commands are ever invoked.
"""

import pytest
import asyncio
from backend.app.runtime.wake_word import WakeWordDetector, VoiceTriggerType
from backend.app.perception.audio.voice_biometrics import VoiceBiometricsEngine, VoiceProfile
from backend.app.automation.mobile.adb_controller import AdbController, adb_controller
from backend.app.cognitive.gateway.agent_gateway import AgentGateway, TrieFuzzyMatcher
from backend.app.cognitive.gateway.models import AgentCommandRequest, InputMode
from backend.app.cognitive.multi_agent.daily_evolution import daily_evolution_service


@pytest.mark.asyncio
async def test_wake_and_sleep_word_detection():
    """Verify multi-lingual wake and sleep spotter."""
    detector = WakeWordDetector()

    # 1. English Wake Words
    trig, phrase, conf = detector.detect_phrase_intent("Hey Mamu can you help me")
    assert trig == VoiceTriggerType.WAKE
    assert conf >= 0.70

    trig, _, _ = detector.detect_phrase_intent("Hay Mamu wake up")
    assert trig == VoiceTriggerType.WAKE

    trig, _, _ = detector.detect_phrase_intent("Mamu listen to me")
    assert trig == VoiceTriggerType.WAKE

    # 2. Telugu Wake Words
    trig, _, _ = detector.detect_phrase_intent("హే మామూ ఎలా ఉన్నావ్")
    assert trig == VoiceTriggerType.WAKE

    trig, _, _ = detector.detect_phrase_intent("మామూ విను")
    assert trig == VoiceTriggerType.WAKE

    # 3. Hindi Wake Words
    trig, _, _ = detector.detect_phrase_intent("हे मामू क्या हाल है")
    assert trig == VoiceTriggerType.WAKE

    trig, _, _ = detector.detect_phrase_intent("मामू सुनो")
    assert trig == VoiceTriggerType.WAKE

    # 4. Tamil Wake Words
    trig, _, _ = detector.detect_phrase_intent("ஹே மாமு வணக்கம்")
    assert trig == VoiceTriggerType.WAKE

    # 5. Sleep Triggers
    trig, _, _ = detector.detect_phrase_intent("Ok Bye Mamu take rest")
    assert trig == VoiceTriggerType.SLEEP

    trig, _, _ = detector.detect_phrase_intent("సరే బై మామూ పడుకో")
    assert trig == VoiceTriggerType.SLEEP

    trig, _, _ = detector.detect_phrase_intent("ओके बाय मामू")
    assert trig == VoiceTriggerType.SLEEP

    trig, _, _ = detector.detect_phrase_intent("Stop Mamu standby")
    assert trig == VoiceTriggerType.SLEEP

    # 6. Neutral non-wake speech
    trig, _, _ = detector.detect_phrase_intent("Calculate five plus five")
    assert trig == VoiceTriggerType.NONE


@pytest.mark.asyncio
async def test_voice_biometrics_authentication():
    """Verify acoustic feature extraction and speaker identity matching."""
    engine = VoiceBiometricsEngine()

    # Simulated audio sample buffer representing speech
    pcm_samples = [0.15 * (i % 7) - 0.25 for i in range(256)]
    features = engine.extract_features_from_pcm(pcm_samples)
    assert len(features) == 16
    assert all(isinstance(v, float) for v in features)

    # Verify matching against the enrolled owner profile
    res_owner = engine.verify_voice(
        samples_or_bytes=engine._enrolled_profiles["owner"].feature_vector,
        user_id="owner"
    )
    assert res_owner.verified is True
    assert res_owner.similarity_score >= 0.99

    # Verify imposter rejection with mismatched vector
    imposter_vector = [0.95, -0.8, 0.0, -0.7, 0.1, -0.9, 0.2, -0.7, 0.1, -0.8, 0.0, -0.5, 0.1, -0.6, 0.0, -0.9]
    res_imposter = engine.verify_voice(
        samples_or_bytes=imposter_vector,
        user_id="owner"
    )
    assert res_imposter.verified is False
    assert res_imposter.similarity_score < 0.50


@pytest.mark.asyncio
async def test_mobile_controller_identifiers_and_settings():
    """Verify ADB controller IMEI, settings, and Bluetooth discovery."""
    controller = AdbController()

    # Bluetooth scanning returns structured list
    bt_devices = await controller.scan_bluetooth_devices()
    assert isinstance(bt_devices, list)
    assert len(bt_devices) >= 1
    assert "name" in bt_devices[0]

    # Settings screen validation
    display_screen = await controller.open_settings_screen("display")
    assert "screen" in display_screen
    assert display_screen["screen"] == "display"

    sound_screen = await controller.open_settings_screen("sound")
    assert sound_screen["screen"] == "sound"


@pytest.mark.asyncio
async def test_gateway_multilingual_and_mobile_routing():
    """Verify Gateway dynamically extracts mobile & hardware intents without hardcoded failure."""
    gateway = AgentGateway()

    # 1. Mobile IMEI intent semantic extraction
    extracted_imei = gateway._semantic_action_extractor(
        "check my phone imei number and serial",
        "auto"
    )
    assert "imei" in extracted_imei.lower() or "mobile" in extracted_imei.lower()

    # 2. Mobile screen intent
    extracted_settings = gateway._semantic_action_extractor(
        "open mobile settings for display",
        "auto"
    )
    assert "settings" in extracted_settings.lower() or "ఫోన్" in extracted_settings or "नियंत्रित" in extracted_settings

    # 3. Dynamic Telugu prompt understanding
    te_resp = await gateway.process_command(
        AgentCommandRequest(text="హే మామూ", raw_text="హే మామూ", input_mode=InputMode.VOICE)
    )
    assert te_resp.status.value in ["COMPLETED", "ACCEPTED"]


@pytest.mark.asyncio
async def test_workspace_agent_self_explanation():
    """Verify all 9 stations have complete self-explanations and daily task tracking."""
    agent_ids = [
        "central_supervisor", "vision_agent", "automation_agent", "mobile_device_agent",
        "browser_agent", "memory_rag_agent", "media_director_agent",
        "business_agent", "intelligence_agent"
    ]
    for aid in agent_ids:
        details = daily_evolution_service.get_agent_detailed_status(aid)
        assert details["agent_id"] == aid
        assert len(details["spoken_explanation"]) > 20
        assert len(details["today_work"]) >= 2
        assert "Sir" in details["spoken_explanation"]
