"""FastAPI API endpoints for Multimodal Perception (Voice, Vision, OCR)."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, status, Response
from pydantic import BaseModel, Field

from backend.app.perception.audio.vad import VoiceActivityDetector, AudioVADState
from backend.app.perception.audio.stt import speech_to_text, TranscriptionResult
from backend.app.perception.audio.tts import text_to_speech, SpeechSynthesisResult
from backend.app.perception.audio.canonicalizer import language_canonicalizer, CanonicalCommand
from backend.app.perception.audio.voice_biometrics import voice_biometrics, VoiceVerificationResult
from backend.app.runtime.wake_word import wake_word_detector, VoiceTriggerType
from backend.app.perception.vision.face_tracker import face_tracker, FaceLandmarksResult
from backend.app.perception.vision.hand_tracker import hand_tracker, HandLandmarksResult
from backend.app.perception.vision.screen_ocr import screen_ocr, ScreenOCRResult, DetectedUIElement

router = APIRouter(prefix="/perception", tags=["Perception"])


class TranscribeRequest(BaseModel):
    audio_base64: Optional[str] = None
    sample_rate: int = 16000
    language: Optional[str] = None


class SynthesizeRequest(BaseModel):
    text: str
    voice: str = "default_neutral"
    rate: float = 1.0


class CanonicalizeRequest(BaseModel):
    text: str
    source_language: Optional[str] = None


class VisionFrameRequest(BaseModel):
    frame_width: int = 640
    frame_height: int = 480
    image_base64: Optional[str] = None


class ScreenOCRRequest(BaseModel):
    image_width: int = 1920
    image_height: int = 1080
    target_query: Optional[str] = None


class CommandPreviewRequest(BaseModel):
    raw_input: str = Field(..., description="Raw text, voice transcription, or gesture command")
    source: str = Field(default="text", description="Input source: text, voice, gesture, face")
    source_language: Optional[str] = Field(default=None, description="Optional explicit language code")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class CommandPreviewResponse(BaseModel):
    command: str
    interpreted_action: str
    target: str
    source: str
    language: str
    confidence: float
    status: str
    requires_consent: bool
    slots: Dict[str, Any]


@router.post("/transcribe", response_model=TranscriptionResult)
async def transcribe_audio(request: TranscribeRequest) -> TranscriptionResult:
    """Transcribe audio stream/buffer into text."""
    audio_bytes = request.audio_base64.encode("utf-8") if request.audio_base64 else None
    return await speech_to_text.transcribe(audio_bytes, language=request.language)


@router.post("/synthesize", response_model=SpeechSynthesisResult)
async def synthesize_speech(request: SynthesizeRequest) -> SpeechSynthesisResult:
    """Convert response text into speech audio."""
    return await text_to_speech.synthesize(request.text, voice=request.voice, rate=request.rate)


@router.get("/tts/stream")
async def stream_speech(text: str, voice: str = "en-GB-RyanNeural", rate: float = 1.0) -> Response:
    """Stream authentic, realistic human neural audio (MP3 or WAV), or 204 for client TTS delegation."""
    audio_bytes = await text_to_speech.synthesize_stream(text=text, voice=voice, rate=rate)
    if not audio_bytes:
        return Response(status_code=204)
    is_wav = audio_bytes.startswith(b"RIFF")
    media_type = "audio/wav" if is_wav else "audio/mpeg"
    filename = "speech.wav" if is_wav else "speech.mp3"
    return Response(
        content=audio_bytes,
        media_type=media_type,
        headers={
            "Cache-Control": "public, max-age=86400",
            "Content-Disposition": f"inline; filename={filename}"
        }
    )


@router.post("/canonicalize", response_model=CanonicalCommand)
async def canonicalize_text(request: CanonicalizeRequest) -> CanonicalCommand:
    """Canonicalize multilingual human instruction into standard structured command."""
    return language_canonicalizer.canonicalize(request.text, source_language=request.source_language)


@router.post("/preview", response_model=CommandPreviewResponse)
async def preview_command(request: CommandPreviewRequest) -> CommandPreviewResponse:
    """Generate structured command preview and intent validation before execution."""
    canonical = language_canonicalizer.canonicalize(
        request.raw_input,
        source_language=request.source_language
    )
    
    # Evaluate risk tier and consent requirements
    raw_lower = request.raw_input.lower()
    critical_keywords = ["delete", "remove", "drop", "format", "shutdown", "erase", "kill", "terminate"]
    requires_consent = any(kw in raw_lower for kw in critical_keywords)
    
    # Extract target slot or fallback
    target_slot = canonical.slots.get("target") or canonical.slots.get("query") or request.raw_input
    action_label = canonical.canonical_intent.split(":")[0].upper().replace(" ", "_") if ":" in canonical.canonical_intent else "EXECUTE_GOAL"
    
    return CommandPreviewResponse(
        command=request.raw_input,
        interpreted_action=action_label,
        target=str(target_slot),
        source=request.source.upper(),
        language=canonical.detected_language or "en",
        confidence=round(canonical.confidence * request.confidence, 2),
        status="Awaiting Operator Confirmation" if requires_consent else "Ready for Dispatch",
        requires_consent=requires_consent,
        slots=canonical.slots
    )


@router.post("/vision/face", response_model=FaceLandmarksResult)
async def process_face(request: VisionFrameRequest) -> FaceLandmarksResult:
    """Extract face landmarks, gaze orientation, and 3D head pose."""
    raw_pixels = request.image_base64.encode("utf-8") if request.image_base64 else None
    return face_tracker.process_frame(request.frame_width, request.frame_height, raw_pixels)


@router.post("/vision/hand", response_model=HandLandmarksResult)
async def process_hand(request: VisionFrameRequest) -> HandLandmarksResult:
    """Extract 21 3D hand keypoints and classify spatial gestures."""
    raw_pixels = request.image_base64.encode("utf-8") if request.image_base64 else None
    return hand_tracker.process_frame(raw_pixels)


@router.post("/vision/screen_ocr", response_model=ScreenOCRResult)
async def process_screen_ocr(request: ScreenOCRRequest) -> ScreenOCRResult:
    """Extract text and bounding box groundings from screen capture."""
    return screen_ocr.parse_screen(width=request.image_width, height=request.image_height)


@router.get("/status")
async def get_perception_status() -> Dict[str, Any]:
    """Return health and capabilities of all perception engines."""
    return {
        "audio": {
            "vad_available": True,
            "stt_engine": "Faster-Whisper (Local Int8/FP16)",
            "tts_engine": "Piper TTS / EdgeTTS (Local)",
            "canonicalizer_supported_languages": ["en", "te", "hi", "ta", "es", "auto"],
            "wake_word_support": ["Hey Mamu", "Abhi", "హే మామూ", "हे मामू", "ஹே மாமு"],
            "sleep_word_support": ["Ok Bye Mamu", "Bye Mamu", "Stop Mamu", "సరే బై మామూ", "ओके बाय मामू"],
            "voice_biometrics_enrolled": len(voice_biometrics.get_enrolled_profiles()),
        },
        "vision": {
            "face_tracking": True,
            "landmarks_count": 468,
            "head_pose_estimation": True,
            "hand_tracking": True,
            "gestures_supported": [
                "THUMBS_UP", "PEACE", "POINTING", "OPEN_PALM", "PINCH", "SWIPE_LEFT", "SWIPE_RIGHT"
            ],
            "screen_ocr_grounding": True,
        },
        "status": "OPERATIONAL",
    }


class WakePhraseCheckRequest(BaseModel):
    text: str


class VoiceVerifyRequest(BaseModel):
    audio_base64: Optional[str] = None
    sample_features: Optional[List[float]] = None
    user_id: str = "owner"
    min_threshold: Optional[float] = 0.70


class VoiceEnrollRequest(BaseModel):
    user_id: str
    user_name: str
    audio_base64: Optional[str] = None


@router.post("/wake-word/detect")
async def detect_wake_word(request: WakePhraseCheckRequest) -> Dict[str, Any]:
    """Detect whether spoken text contains 'Hey Mamu' wake activation or 'Ok Bye Mamu' sleep deactivation."""
    intent_type, matched_phrase, conf = wake_word_detector.detect_phrase_intent(request.text)
    return {
        "text": request.text,
        "intent_type": intent_type.value,
        "matched_phrase": matched_phrase,
        "confidence": conf,
        "action": (
            "ACTIVATE_LISTENING"
            if intent_type == VoiceTriggerType.WAKE
            else ("DEACTIVATE_LISTENING" if intent_type == VoiceTriggerType.SLEEP else "IGNORE")
        ),
        "spoken_reply": (
            "Yes Sir, I am listening."
            if intent_type == VoiceTriggerType.WAKE
            else ("Standing by, Sir. Conversation paused." if intent_type == VoiceTriggerType.SLEEP else None)
        ),
    }


@router.post("/voice-biometrics/verify")
async def verify_speaker_voice(request: VoiceVerifyRequest) -> Dict[str, Any]:
    """Verify speaker voice biometric identity against operator profile."""
    import base64
    if request.sample_features:
        result = voice_biometrics.verify_voice(request.sample_features, user_id=request.user_id, min_threshold=request.min_threshold)
    else:
        audio_bytes = base64.b64decode(request.audio_base64) if request.audio_base64 else None
        result = voice_biometrics.verify_voice(audio_bytes, user_id=request.user_id, min_threshold=request.min_threshold)
    return result.model_dump()


@router.post("/voice-biometrics/enroll")
async def enroll_speaker_voice(request: VoiceEnrollRequest) -> Dict[str, Any]:
    """Enroll or adapt operator voice profile."""
    import base64
    audio_bytes = base64.b64decode(request.audio_base64) if request.audio_base64 else None
    profile = voice_biometrics.enroll_voice(user_id=request.user_id, user_name=request.user_name, samples_or_bytes=audio_bytes)
    return profile.model_dump()


@router.get("/voice-biometrics/profiles")
async def get_voice_profiles() -> List[Dict[str, Any]]:
    """List enrolled voice biometric profiles."""
    return voice_biometrics.get_enrolled_profiles()

