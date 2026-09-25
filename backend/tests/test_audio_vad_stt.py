"""Unit tests for Audio VAD, Energy, STT, and TTS engines."""

import pytest
from app.perception.audio.vad import VoiceActivityDetector, AudioVADState
from app.perception.audio.stt import SpeechToTextEngine, TranscriptionResult
from app.perception.audio.tts import TextToSpeechEngine, SpeechSynthesisResult


def test_vad_energy_silence():
    vad = VoiceActivityDetector(sample_rate=16000, energy_threshold=-35.0)
    # 1 second of silence (zeros)
    silence_pcm = bytes(32000)
    state = vad.process_chunk(silence_pcm)
    assert not state.is_speech
    assert state.energy_db < -50.0
    assert state.speech_probability == 0.0


def test_vad_energy_synthetic_tone():
    vad = VoiceActivityDetector(sample_rate=16000, energy_threshold=-35.0)
    # 1 second of non-zero PCM audio
    synthetic_pcm = bytes([100, 200] * 16000)
    state = vad.process_chunk(synthetic_pcm)
    assert state.energy_db > -35.0
    assert state.is_speech
    assert state.speech_probability > 0.5


@pytest.mark.asyncio
async def test_stt_transcription():
    stt = SpeechToTextEngine()
    result = await stt.transcribe(audio_bytes=b"dummy_pcm", language="en")
    assert isinstance(result, TranscriptionResult)
    assert result.text != ""
    assert result.confidence > 0.8
    assert result.duration_s > 0.0


@pytest.mark.asyncio
async def test_tts_synthesis():
    tts = TextToSpeechEngine()
    result = await tts.synthesize("Hello world, Abhi is ready.", voice="default_neutral")
    assert isinstance(result, SpeechSynthesisResult)
    assert result.audio_format == "wav"
    assert len(result.audio_bytes) > 0
    assert result.duration_seconds > 0.0
