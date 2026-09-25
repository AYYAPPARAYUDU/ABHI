"""Unit tests for Local-First TTS Engine and Privacy Policy Enforcement."""

import pytest
from backend.app.perception.audio.tts import TextToSpeechEngine, SpeechSynthesisResult


@pytest.mark.asyncio
async def test_tts_local_default():
    engine = TextToSpeechEngine()
    result = await engine.synthesize("Local first AI architecture", voice="default_neutral")
    assert isinstance(result, SpeechSynthesisResult)
    assert result.engine_used == "piper"
    assert result.is_online_fallback is False
    assert len(result.audio_bytes) > 0


@pytest.mark.asyncio
async def test_tts_online_fallback_privacy_block():
    engine = TextToSpeechEngine()
    engine.allow_online_fallback = False  # Strict privacy mode

    # Requesting edge_tts_online should be intercepted and coerced to local piper
    result = await engine.synthesize(
        "Confidential local speech synthesis",
        force_backend="edge_tts_online"
    )
    assert result.engine_used == "piper"
    assert result.is_online_fallback is False
